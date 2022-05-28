import {
  address,
  AssetHash,
  confidential,
  Psbt,
  script,
  TxOutput,
  witnessStackToScriptWitness,
} from 'liquidjs-lib';
import {
  findScriptPath,
  tapLeafHash,
  TaprootLeaf,
  toHashTree,
} from 'liquidjs-lib/src/bip341';
import { Network } from 'liquidjs-lib/src/networks';
import { Argument, encodeArgument } from './Argument';
import { Function, Parameter } from './Artifact';
import { H_POINT, LEAF_VERSION_TAPSCRIPT } from './constants';
import { isSigner } from './Signer';
import { Introspect } from './Introspect';
import { RequiredOutput } from './Requirement';

export interface TransactionInterface {
  psbt: Psbt;
  withUtxo(outpoint: Utxo): TransactionInterface;
  withRecipient(
    addressOrScript: string | Buffer,
    amount: number,
    assetID: string
  ): TransactionInterface;
  withOpReturn(
    value: number,
    assetID: string,
    hexChunks: string[]
  ): TransactionInterface;
  withFeeOutput(fee: number): TransactionInterface;
  unlock(): Promise<TransactionInterface>;
}

export interface TaprootData {
  leaves: TaprootLeaf[];
  parity: number;
}

export interface Utxo {
  txid: string;
  vout: number;
  prevout: TxOutput;
}

export class Transaction implements TransactionInterface {
  public psbt: Psbt;

  private fundingUtxoIndex: number = 0;

  constructor(
    private constructorInputs: Parameter[],
    private constructorArgs: Argument[],
    private artifactFunction: Function,
    private functionArgs: Argument[],
    private selector: number,
    private fundingUtxo: Utxo | undefined,
    private taprootData: TaprootData,
    private network: Network
  ) {
    this.psbt = new Psbt({ network: this.network });
    if (this.fundingUtxo) {
      const leafToSpend = this.taprootData.leaves[this.selector];
      const leafVersion = leafToSpend.version || LEAF_VERSION_TAPSCRIPT;
      const leafHash = tapLeafHash(leafToSpend);
      const hashTree = toHashTree(this.taprootData.leaves);
      const path = findScriptPath(hashTree, leafHash);

      const parityBit = Buffer.of(leafVersion + this.taprootData.parity);

      const controlBlock = Buffer.concat([
        parityBit,
        H_POINT.slice(1),
        ...path,
      ]);

      this.psbt.addInput({
        hash: this.fundingUtxo.txid,
        index: this.fundingUtxo.vout,
        witnessUtxo: this.fundingUtxo.prevout,
        tapLeafScript: [
          {
            leafVersion: leafVersion,
            script: Buffer.from(leafToSpend.scriptHex, 'hex'),
            controlBlock,
          },
        ],
      });
      this.fundingUtxoIndex = this.psbt.data.inputs.length - 1;
    }
  }

  withUtxo(outpoint: Utxo): this {
    this.psbt.addInput({
      hash: outpoint.txid,
      index: outpoint.vout,
      witnessUtxo: outpoint.prevout,
    });
    return this;
  }

  withRecipient(
    addressOrScript: string | Buffer,
    value: number,
    assetID: string = this.network.assetHash
  ): this {
    let script = addressOrScript as Buffer;
    if (typeof addressOrScript === 'string') {
      script = address.toOutputScript(addressOrScript);
    }

    this.psbt.addOutput({
      script,
      value: confidential.satoshiToConfidentialValue(value),
      asset: AssetHash.fromHex(assetID, false).bytes,
      nonce: Buffer.alloc(0),
    });

    return this;
  }

  withOpReturn(
    value: number = 0,
    assetID: string = this.network.assetHash,
    hexChunks: string[] = []
  ): this {
    this.psbt.addOutput({
      script: script.compile([
        script.OPS.OP_RETURN,
        ...hexChunks.map(chunk => Buffer.from(chunk, 'hex')),
      ]),
      value: confidential.satoshiToConfidentialValue(value),
      asset: AssetHash.fromHex(assetID, false).bytes,
      nonce: Buffer.alloc(0),
    });
    return this;
  }

  withFeeOutput(value: number): this {
    this.psbt.addOutput({
      script: Buffer.alloc(0),
      value: confidential.satoshiToConfidentialValue(value),
      asset: AssetHash.fromHex(this.network.assetHash, false).bytes,
      nonce: Buffer.alloc(0),
    });
    return this;
  }

  async unlock(): Promise<this> {
    let witnessStack: Buffer[] = [];

    // check for signature to be made
    for (const arg of this.functionArgs) {
      if (!isSigner(arg)) continue;

      const signedPtxBase64 = await arg.signTransaction(this.psbt.toBase64());
      const signedPtx = Psbt.fromBase64(signedPtxBase64);
      this.psbt = signedPtx;

      const { tapKeySig, tapScriptSig } = this.psbt.data.inputs[
        this.fundingUtxoIndex
      ];
      if (tapScriptSig && tapScriptSig.length > 0) {
        witnessStack = [...tapScriptSig.map(s => s.signature), ...witnessStack];
      } else if (tapKeySig) {
        witnessStack = [tapKeySig, ...witnessStack];
      }
    }

    for (const { type, atIndex, expected } of this.artifactFunction.require) {
      // do the checks
      switch (type) {
        case 'input':
          if (atIndex! >= this.psbt.data.inputs.length)
            throw new Error(`${type} is required at index ${atIndex}`);
          break;
        case 'output':
          if (atIndex! >= this.psbt.data.outputs.length)
            throw new Error(`${type} is required at index ${atIndex}`);

          const outputAtIndex = this.psbt.TX.outs[atIndex!];
          const { script, value, nonce, asset } = expected as RequiredOutput;

          const introspect = new Introspect(
            atIndex!,
            type,
            this.constructorInputs,
            this.constructorArgs
          );
          introspect.checkOutputValue(value, outputAtIndex.value);
          introspect.checkOutputScript(script, outputAtIndex.script);
          introspect.checkOutputAsset(asset, outputAtIndex.asset);
          introspect.checkOutputNonce(nonce, outputAtIndex.nonce);
          break;
        case 'after':
        case 'older':
        default:
          break;
      }
    }

    const encodedArgs = this.functionArgs
      .filter(arg => !isSigner(arg))
      .map((arg, index) => {
        // Encode passed args (this also performs type checking)
        return encodeArgument(
          arg,
          this.artifactFunction.functionInputs[index].type
        );
      });

    this.psbt.finalizeInput(this.fundingUtxoIndex!, (_, input) => {
      return {
        finalScriptSig: undefined,
        finalScriptWitness: witnessStackToScriptWitness([
          ...witnessStack,
          ...(encodedArgs as Buffer[]),
          input.tapLeafScript![0].script,
          input.tapLeafScript![0].controlBlock,
        ]),
      };
    });
    return this;
  }
}
