import { Argument } from './Argument';
import { Parameter } from './Artifact';
import { RequirementType, ScriptPubKey } from './Requirement';
import { replaceTemplateWithConstructorArg } from './utils/template';

export class Introspect {
  public constructor(
    private atIndex: number,
    private type: RequirementType,
    private constructorInputs: Parameter[],
    private constructorArgs: Argument[]
  ) {}

  checkOutputScript(script: ScriptPubKey, expectedScript: Buffer) {
    const scriptProgramBuffer = Buffer.from(
      replaceTemplateWithConstructorArg(
        script.program,
        this.constructorInputs,
        this.constructorArgs
      ),
      'hex'
    );
    const outputScript =
      script.version < 0 ? expectedScript : expectedScript.slice(2);
    if (!scriptProgramBuffer.equals(outputScript))
      throw new Error(
        `required ${this.type} script does not match the transaction ${this.type} index ${this.atIndex}`
      );
  }

  checkOutputValue(value: string, expectedValue: Buffer): void {
    const valueBuffer = Buffer.from(
      replaceTemplateWithConstructorArg(
        value,
        this.constructorInputs,
        this.constructorArgs
      ),
      'hex'
    );
    const outputValue = Buffer.from(expectedValue);
    const reversedOutputValue = outputValue.slice(1).reverse();
    if (!valueBuffer.equals(reversedOutputValue))
      throw new Error(
        `required ${this.type} value does not match the transaction ${this.type} index ${this.atIndex}`
      );
  }

  checkOutputAsset(asset: string, expectedAsset: Buffer): void {
    const assetBuffer = Buffer.from(
      replaceTemplateWithConstructorArg(
        asset,
        this.constructorInputs,
        this.constructorArgs
      ),
      'hex'
    );
    const outputAsset = Buffer.from(expectedAsset);
    const slicedOutputAsset = outputAsset.slice(1);
    if (!assetBuffer.equals(slicedOutputAsset))
      throw new Error(
        `required ${this.type} asset does not match the transaction ${this.type} index ${this.atIndex}`
      );
  }

  checkOutputNonce(nonce: string, expectedNonce: Buffer): void {
    if (nonce === '' && expectedNonce.equals(Buffer.of(0x00))) return;

    const nonceBuffer = Buffer.from(
      replaceTemplateWithConstructorArg(
        nonce,
        this.constructorInputs,
        this.constructorArgs
      ),
      'hex'
    );
    const outputNonce = Buffer.from(expectedNonce);
    if (!nonceBuffer.equals(outputNonce))
      throw new Error(
        `required ${this.type} nonce does not match the transaction ${this.type} index ${this.atIndex}`
      );
  }
}
