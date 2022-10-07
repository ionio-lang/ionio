import {
  address,
  confidential,
  script,
  bip341,
  NetworkExtended as Network,
  Pset,
  Creator,
  Updater,
  PsetOutput,
  OwnedInput,
  Blinder,
  Finalizer,
  Extractor,
  Transaction as LiquidTransaction,
  witnessStackToScriptWitness,
} from 'liquidjs-lib';
import { Argument, encodeArgument } from './Argument';
import { ArtifactFunction, Parameter } from './Artifact';
import { H_POINT, LEAF_VERSION_TAPSCRIPT } from './constants';
import { isSigner } from './Signer';
import { Introspect } from './Introspect';
import { RequiredOutput, RequirementType, ScriptPubKey } from './Requirement';
import { replaceTemplateWithConstructorArg } from './utils/template';
import {
  isUnblindedOutput,
  Output,
  UnblindedOutput,
  isConfidentialOutput,
} from 'ldk';
import { ZKPGenerator, ZKPValidator } from 'liquidjs-lib/src/confidential';
import { TapLeafScript } from 'liquidjs-lib/src/psetv2/interfaces';

export interface TransactionInterface {
  pset: Pset;
  withUtxo(outpoint: Output | UnblindedOutput): TransactionInterface;
  withRecipient(
    addressOrScript: string | Buffer,
    amount: number,
    assetID: string
  ): TransactionInterface;
  withOpReturn(
    value: number,
    assetID: string,
    hexChunks: string[],
    blindingPublicKeyHex?: string
  ): TransactionInterface;
  withFeeOutput(fee: number): TransactionInterface;
  unlock(): Promise<TransactionInterface>;
}

export interface TaprootData {
  leaves: bip341.TaprootLeaf[];
  parity: number;
}

export class Transaction implements TransactionInterface {
  public pset: Pset;

  private fundingUtxoIndex: number = 0;
  private inputBlinders: OwnedInput[] = [] as any;

  constructor(
    private constructorInputs: Parameter[],
    private constructorArgs: Argument[],
    private artifactFunction: ArtifactFunction,
    private functionArgs: Argument[],
    private selector: number,
    private fundingUtxo: Output | UnblindedOutput | undefined,
    unblindDataFundingUtxo: confidential.UnblindOutputResult | undefined,
    private taprootData: TaprootData,
    private network: Network,
    private ecclib: bip341.TinySecp256k1Interface
  ) {
    this.pset = Creator.newPset();

    if (!this.fundingUtxo) return;

    const leafToSpend = this.taprootData.leaves[this.selector];
    const leafVersion = leafToSpend.version || LEAF_VERSION_TAPSCRIPT;
    const leafHash = bip341.tapLeafHash(leafToSpend);
    const hashTree = bip341.toHashTree(this.taprootData.leaves);
    const path = bip341.findScriptPath(hashTree, leafHash);

    const parityBit = Buffer.of(leafVersion + this.taprootData.parity);

    const controlBlock = Buffer.concat([parityBit, H_POINT.slice(1), ...path]);

    let sequence;
    this.artifactFunction.require.forEach(requirement => {
      if (requirement.type === RequirementType.After) {
        const valueBuffer = Buffer.from(
          replaceTemplateWithConstructorArg(
            requirement.expected as string,
            this.constructorInputs,
            this.constructorArgs
          ),
          'hex'
        );
        this.pset = Creator.newPset({
          locktime: script.number.decode(valueBuffer),
        });
        // Note: nSequence MUST be <= 0xfffffffe otherwise LockTime is ignored, and is immediately spendable.
        sequence = 0xfffffffe;
        return;
      }

      if (requirement.type === RequirementType.Older) {
        const valueBuffer = Buffer.from(
          replaceTemplateWithConstructorArg(
            requirement.expected as string,
            this.constructorInputs,
            this.constructorArgs
          ),
          'hex'
        );
        sequence = script.number.decode(valueBuffer);
        return;
      }
    });

    const updater = new Updater(this.pset);
    updater.addInputs([
      {
        txid: this.fundingUtxo.txid,
        txIndex: this.fundingUtxo.vout,
        sequence,
        witnessUtxo: this.fundingUtxo.prevout,
        tapLeafScript: {
          controlBlock,
          leafVersion,
          script: Buffer.from(leafToSpend.scriptHex, 'hex'),
        },
        sighashType: LiquidTransaction.SIGHASH_DEFAULT,
      },
    ]);
    // only add unblind data if the prevout of the input is confidential
    if (unblindDataFundingUtxo) {
      this.inputBlinders.push({
        index: this.fundingUtxoIndex,
        ...unblindDataFundingUtxo,
      });
    }
  }

  withUtxo(utxo: Output | UnblindedOutput): this {
    // instantiate Updater
    const updater = new Updater(this.pset);
    // add a new input
    updater.addInputs([
      {
        txid: utxo.txid,
        txIndex: utxo.vout,
        witnessUtxo: utxo.prevout,
        sighashType: LiquidTransaction.SIGHASH_ALL
      },
    ]);

    // get the index of last added input
    const index = this.pset.inputs.length - 1;

    // only add unblind data if the prevout of the input is confidential
    if (utxo && isUnblindedOutput(utxo) && isConfidentialOutput(utxo.prevout)) {
      this.inputBlinders.push({
        index,
        ...utxo.unblindData,
      });
    }

    return this;
  }

  withRecipient(
    recipientAddress: string,
    value: number,
    assetID: string = this.network.assetHash,
    blinderIndex: number = 0
  ): this {
    const script = address.toOutputScript(recipientAddress);
    const blindingKey = address.isConfidential(recipientAddress)
      ? address.fromConfidential(recipientAddress).blindingKey
      : undefined;

    // instantiate Updater
    const updater = new Updater(this.pset);

    // add a new outout.
    // TODO Check if we should assume the contract owner also shoudl blind all outputs added via withRecipient?
    updater.addOutputs([
      {
        script,
        asset: assetID,
        amount: value,
        blinderIndex,
        blindingPublicKey: blindingKey,
      },
    ]);

    return this;
  }

  withOpReturn(
    value: number = 0,
    assetID: string = this.network.assetHash,
    hexChunks: string[] = [],
    blindingPublicKeyHex?: string,
    blinderIndex: number = 0
  ): this {
    const opRetScript = script.compile([
      script.OPS.OP_RETURN,
      ...hexChunks.map(chunk => Buffer.from(chunk, 'hex')),
    ]);
    const blindingKey = blindingPublicKeyHex
      ? Buffer.from(blindingPublicKeyHex, 'hex')
      : undefined;

    // instantiate Updater
    const updater = new Updater(this.pset);

    // add a new outout.
    // TODO Check if we should assume the contract owner also shoudl blind all outputs added via withRecipient?
    updater.addOutputs([
      {
        script: opRetScript,
        asset: assetID,
        amount: value,
        blinderIndex,
        blindingPublicKey: blindingKey,
      },
    ]);

    return this;
  }

  withFeeOutput(value: number): this {
    // instantiate Updater
    const updater = new Updater(this.pset);

    updater.addOutputs([
      {
        asset: this.network.assetHash,
        amount: value,
      },
    ]);

    return this;
  }

  async unlock(): Promise<this> {
    let witnessStack: Buffer[] = [];

    for (const { type, atIndex, expected } of this.artifactFunction.require) {
      const checkInputAtIndex = () => {
        if (atIndex! >= this.pset.inputs.length)
          throw new Error(`${type} is required at index ${atIndex}`);
      };
      const checkOutputAtIndex = () => {
        if (atIndex! >= this.pset.outputs.length)
          throw new Error(`${type} is required at index ${atIndex}`);
      };
      const introspect = new Introspect(
        atIndex!,
        type,
        this.constructorInputs,
        this.constructorArgs
      );
      // do the checks
      switch (type) {
        case 'input':
          checkInputAtIndex();
          break;

        case 'outputscript': {
          checkOutputAtIndex();
          const outputAtIndex = this.pset.unsignedTx().outs[atIndex!];
          const script = expected as ScriptPubKey;
          introspect.checkOutputScript(script, outputAtIndex.script);
          break;
        }

        case 'outputvalue': {
          checkOutputAtIndex();
          const outputAtIndex = this.pset.unsignedTx().outs[atIndex!];
          const value = expected as string;
          introspect.checkOutputValue(value, outputAtIndex.value);
          break;
        }

        case 'outputasset': {
          checkOutputAtIndex();
          const outputAtIndex = this.pset.unsignedTx().outs[atIndex!];
          const asset = expected as string;
          introspect.checkOutputValue(asset, outputAtIndex.asset);
          break;
        }

        case 'outputnonce': {
          checkOutputAtIndex();
          const outputAtIndex = this.pset.unsignedTx().outs[atIndex!];
          const nonce = expected as string;
          introspect.checkOutputNonce(nonce, outputAtIndex.nonce);
          break;
        }

        case 'output': {
          checkOutputAtIndex();

          const outputAtIndex = this.pset.unsignedTx().outs[atIndex!];
          const { script, value, nonce, asset } = expected as RequiredOutput;

          introspect.checkOutputValue(value, outputAtIndex.value);
          introspect.checkOutputScript(script, outputAtIndex.script);
          introspect.checkOutputAsset(asset, outputAtIndex.asset);
          introspect.checkOutputNonce(nonce, outputAtIndex.nonce);
          break;
        }
        case 'after':
        case 'older':
        default:
          break;
      }
    }

    // check for blinding to be made
    if (this.inputBlinders.length > 0) {
      const needsBlinding = this.pset.outputs.some((o: PsetOutput) =>
        o.needsBlinding()
      );
      if (!needsBlinding)
        throw new Error(
          'if one confidential input is spent, at least one of the outputs must be blinded'
        );

      const zkpValidator = new ZKPValidator();
      const zkpGenerator = ZKPGenerator.fromOwnedInputs(this.inputBlinders);
      const ownedInputs = await zkpGenerator.unblindInputs(this.pset);
      const outputBlindingArgs = await zkpGenerator.blindOutputs(
        this.pset,
        ZKPGenerator.ECCKeysGenerator(this.ecclib)
      );

      const blinder = new Blinder(
        this.pset,
        ownedInputs,
        zkpValidator,
        zkpGenerator
      );

      await blinder.blindLast({ outputBlindingArgs });
    }

    // check for a signature to be made
    for (const [index, arg] of this.functionArgs.entries()) {
      if (!isSigner(arg)) {
        const encodedArgument = encodeArgument(
          arg,
          this.artifactFunction.functionInputs[index].type
        );
        witnessStack.push(encodedArgument as Buffer);
        continue;
      }

      const signedPtxBase64 = await arg.signTransaction(this.pset.toBase64());
      const signedPtx = Pset.fromBase64(signedPtxBase64);
      this.pset = signedPtx;

      // add witness stack elements from function arguments
      const { tapKeySig, tapScriptSig } = this.pset.inputs[
        this.fundingUtxoIndex
      ];
      if (tapScriptSig && tapScriptSig.length > 0) {
        for (const s of tapScriptSig) {
          witnessStack.push(s.signature);
        }
      } else if (tapKeySig) {
        // is the key-path spend always first element of stack?
        witnessStack = [tapKeySig, ...witnessStack];
      }
    }

    // finalize the transaction
    const finalizer = new Finalizer(this.pset);

    finalizer.finalizeInput(this.fundingUtxoIndex, (index, pset: Pset) => {
      const tapLeafScript = pset.inputs[index]
        .tapLeafScript![0] as TapLeafScript;
      return {
        finalScriptSig: undefined,
        finalScriptWitness: witnessStackToScriptWitness([
          ...witnessStack.reverse(),
          tapLeafScript.script,
          tapLeafScript.controlBlock,
        ]),
      };
    });
    return this;
  }

  toHex(): string {
    const tx = Extractor.extract(this.pset);
    const hex = tx.toHex();
    return hex;
  }
}
