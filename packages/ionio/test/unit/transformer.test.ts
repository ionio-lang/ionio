import { AssetHash } from 'liquidjs-lib';
import {
  replaceArtifactConstructorWithArguments,
  templateString,
  encodeArgument,
  PrimitiveType,
} from '../../src';

const transferWithKey = require('../fixtures/transfer_with_key.json');
const synth = require('../fixtures/synthetic_asset.json');

describe('transformArtifact', () => {
  it('should rename constructor input name and asm tokens if TemplateString()', () => {
    const artifact = replaceArtifactConstructorWithArguments(transferWithKey, [
      templateString('customName'),
    ]);
    expect(artifact.constructorInputs[0].name).toBe('customName');
    expect(artifact.functions[0].asm).toEqual(['$customName', 'OP_CHECKSIG']);
  });

  it('should encode constructor input and asm tokens if Argument', () => {
    const artifact = replaceArtifactConstructorWithArguments(synth, [
      AssetHash.fromHex(
        '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225'
      ).hex,
      AssetHash.fromHex(
        '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225'
      ).hex,
      templateString('borrowAmount2'),
      templateString('payoutAmount2'),
      templateString('borrowePk'),
      templateString('oraclePk'),
      templateString('payoutPk'),
      templateString('issuerScriptProgram'),
      templateString('priceLevel'),
      templateString('setupTimestamp'),
    ]);

    expect(artifact.constructorInputs[0].name).toStrictEqual('borrowAmount2');

    expect(artifact.functions[0].asm[4]).toEqual(
      encodeArgument(
        AssetHash.fromHex(
          '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225'
        ).hex,
        PrimitiveType.Asset
      ).toString('hex')
    );
  });
});
