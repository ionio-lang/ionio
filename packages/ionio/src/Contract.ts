import { ECPairFactory } from 'ecpair';
import { Transaction } from './Transaction';
import { Argument, encodeArgument } from './Argument';
import { Artifact, ArtifactFunction, validateArtifact } from './Artifact';
import {
  address,
  script,
  networks,
  TxOutput,
  bip341,
  confidential,
  Secp256k1Interface,
  crypto,
} from 'liquidjs-lib';
import { H_POINT } from './constants';
import { tweakPublicKey } from './utils/taproot';
import { replaceTemplateWithConstructorArg } from './utils/template';
import { isSigner } from './Signer';
import { checkRequirements } from './Requirement';
import { Output, UnblindedOutput } from './types';

export interface ContractInterface {
  name: string;
  address: string;
  fundingUtxo: Output | UnblindedOutput | undefined;
  unblindDataFundingUtxo: confidential.UnblindOutputResult | undefined;
  bytesize: number;
  functions: {
    [name: string]: ContractFunction;
  };
  leaves: { scriptHex: string }[];
  scriptPubKey: Buffer;
  from(txid: string, vout: number, prevout: TxOutput): ContractInterface;
  taprootTree: bip341.HashTree;
  contractParameters: { [name: string]: Argument };
  internalPublicKey: Buffer; // default is H_POINT
  tweakInternalKey(prvKey: Buffer): Buffer;
}

export class Contract implements ContractInterface {
  name: string;
  address: string;
  fundingUtxo: Output | UnblindedOutput | undefined;
  unblindDataFundingUtxo: confidential.UnblindOutputResult | undefined;
  // TODO add bytesize calculation
  bytesize: number = 0;
  functions: {
    [name: string]: ContractFunction;
  };
  contractParams: { [name: string]: Argument } = {};
  leaves: bip341.TaprootLeaf[];
  scriptPubKey: Buffer;
  parity: number;

  constructor(
    private artifact: Artifact,
    private constructorArgs: Argument[],
    private network: networks.Network,
    private secp256k1ZKP: Secp256k1Interface,
    public internalPublicKey = H_POINT
  ) {
    validateArtifact(artifact, constructorArgs);

    this.leaves = [];
    this.functions = {};
    // Populate the functions object with the contract's functions
    // (with a special case for single function, which has no "function selector")
    this.artifact.functions.forEach((f, i) => {
      const expectedProperties = ['name', 'functionInputs', 'require', 'asm'];
      if (!expectedProperties.every(property => property in f)) {
        throw new Error(
          `Invalid or incomplete function provided at index ${i}`
        );
      }
      this.functions[f.name] = this.createFunction(f, i);

      // check for constructor inputs to replace template strings starting with $ or strip 0x from hex encoded strings
      const asm = f.asm.map(op =>
        replaceTemplateWithConstructorArg(
          op,
          artifact.constructorInputs,
          constructorArgs
        )
      );

      this.leaves.push({
        scriptHex: script.fromASM(asm.join(' ')).toString('hex'),
      });
    });

    // name
    this.name = artifact.contractName;

    // contract parameters by name
    this.artifact.constructorInputs.forEach((input, index) => {
      this.contractParams[input.name] = constructorArgs[index];
    });

    const bip341API = bip341.BIP341Factory(secp256k1ZKP.ecc);
    const hashTree = bip341.toHashTree(this.leaves);

    // scriptPubKey & address
    this.scriptPubKey = bip341API.taprootOutputScript(
      this.internalPublicKey,
      hashTree
    );
    this.address = address.fromOutputScript(this.scriptPubKey, this.network);

    // parity bit
    const { parity } = tweakPublicKey(
      this.internalPublicKey,
      hashTree.hash,
      this.secp256k1ZKP.ecc
    );
    this.parity = parity;
    // TODO add bytesize calculation
    //this.bytesize = calculateBytesize(this.leaves);
  }

  get taprootTree(): bip341.HashTree {
    return bip341.toHashTree(this.leaves, true);
  }

  get contractParameters(): { [name: string]: Argument } {
    return this.contractParams;
  }

  tweakInternalKey(prvKey: Buffer): Buffer {
    // check if not H_POINT
    if (this.internalPublicKey.equals(H_POINT)) {
      throw new Error('H_POINT is unspendable');
    }

    const signingEcPair = ECPairFactory(this.secp256k1ZKP.ecc).fromPrivateKey(
      prvKey
    );

    const taprootTreeRoot = this.taprootTree.hash;

    const privateKey =
      signingEcPair.publicKey[0] === 2
        ? signingEcPair.privateKey
        : this.secp256k1ZKP.ecc.privateNegate(prvKey);

    if (!privateKey) throw new Error('Invalid Private Key');

    const tweakHash = crypto.taggedHash(
      'TapTweak/elements',
      Buffer.concat([this.internalPublicKey.subarray(1, 33), taprootTreeRoot])
    );
    const newPrivateKey = this.secp256k1ZKP.ecc.privateAdd(
      privateKey,
      tweakHash
    );
    if (newPrivateKey === null) throw new Error('Invalid Tweak');
    return Buffer.from(newPrivateKey);
  }

  from(
    txid: string,
    vout: number,
    prevout: TxOutput,
    unblindData?: confidential.UnblindOutputResult
  ): this {
    // check we are using an actual funding outpoint for the script of the contract
    if (!prevout.script.equals(this.scriptPubKey))
      throw new Error(
        'given prevout script does not match contract scriptPubKey'
      );

    this.fundingUtxo = {
      txid,
      vout,
      prevout,
    };

    if (unblindData) {
      this.unblindDataFundingUtxo = unblindData;
    }

    return this;
  }

  private createFunction(
    artifactFunction: ArtifactFunction,
    selector: number
  ): ContractFunction {
    return (...functionArgs: Argument[]) => {
      if (artifactFunction.functionInputs.length !== functionArgs.length) {
        throw new Error(
          `Incorrect number of arguments passed to function ${artifactFunction.name}`
        );
      }

      // Encode passed args: this performs type checking
      functionArgs.forEach((arg, index) => {
        if (isSigner(arg)) return;
        encodeArgument(arg, artifactFunction.functionInputs[index].type);
        return;
      });

      // check requirements
      checkRequirements(artifactFunction.require);

      return new Transaction(
        this.artifact.constructorInputs,
        this.constructorArgs,
        artifactFunction,
        functionArgs,
        selector,
        this.fundingUtxo,
        this.unblindDataFundingUtxo,
        {
          leaves: this.leaves,
          parity: this.parity,
        },
        this.network,
        this.secp256k1ZKP,
        this.internalPublicKey
      );
    };
  }
}

export type ContractFunction = (...args: Argument[]) => Transaction;
