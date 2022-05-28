import {
  address,
  AssetHash,
  confidential,
  Psbt,
  script,
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
import { Function, Output, Parameter } from './Artifact';
import { H_POINT, LEAF_VERSION_TAPSCRIPT } from './constants';
import { Utxo } from './interfaces';
import { isSigner } from './Signer';
import { replaceTemplateWithConstructorArg } from './utils/template';

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
      // do the checks on introspection)
      switch (type) {
        case 'input':
          if (atIndex === undefined)
            throw new Error(
              `atIndex field is required for requirement of type ${type}`
            );
          if (atIndex >= this.psbt.data.inputs.length)
            throw new Error(`${type} is required at index ${atIndex}`);
          break;
        case 'output':
          if (atIndex === undefined)
            throw new Error(
              `atIndex field is required for requirement of type ${type}`
            );
          if (atIndex >= this.psbt.data.outputs.length)
            throw new Error(`${type} is required at index ${atIndex}`);
          if (!expected)
            throw new Error(
              `expected field of type ${type} is required at index ${atIndex}`
            );
          const expectedProperties = ['script', 'value', 'asset', 'nonce'];
          if (
            !expectedProperties.every(
              property => property in (expected as Output)
            )
          ) {
            throw new Error('Invalid or incomplete artifact provided');
          }
          const expectedScriptProperties = ['version', 'program'];
          if (
            !expectedScriptProperties.every(
              property => property in (expected as Output).script
            )
          ) {
            throw new Error('Invalid or incomplete artifact provided');
          }
          const outputAtIndex = this.psbt.TX.outs[atIndex];
          // check the script
          const { script, value } = expected as Output;
          const scriptProgramBuffer = Buffer.from(
            replaceTemplateWithConstructorArg(
              script.program,
              this.constructorInputs,
              this.constructorArgs
            ),
            'hex'
          );
          const outputScript =
            script.version < 0
              ? outputAtIndex.script
              : outputAtIndex.script.slice(2);
          if (!scriptProgramBuffer.equals(outputScript))
            throw new Error(
              `required ${type} script does not match the transaction ${type} index ${atIndex}`
            );
          // check the value
          const valueBuffer = Buffer.from(
            replaceTemplateWithConstructorArg(
              value,
              this.constructorInputs,
              this.constructorArgs
            ),
            'hex'
          );
          const outputValue = Buffer.from(outputAtIndex.value);
          const reversedOutputValue = outputValue.slice(1).reverse();
          if (!valueBuffer.equals(reversedOutputValue))
            throw new Error(
              `required ${type} value does not match the transaction ${type} index ${atIndex}`
            );
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
