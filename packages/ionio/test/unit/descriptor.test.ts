import { validate } from 'ldk';
import { toDescriptor } from '../../src';

const tests = [
  {
    name: 'calculator',
    fixture: 'calculator.json',
    expected:
      'eltr(50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0, { asm(OP_ADD $sum OP_EQUAL) })',
  },
  {
    name: 'syntheticAsset',
    fixture: 'synthetic_asset.json',
    expected:
      'eltr(50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0, { asm(OP_0 OP_INSPECTOUTPUTASSET OP_1 OP_EQUALVERIFY $borrowAsset OP_EQUALVERIFY OP_0 OP_INSPECTOUTPUTVALUE OP_1 OP_EQUALVERIFY $borrowAmount OP_EQUALVERIFY OP_0 OP_INSPECTOUTPUTSCRIPTPUBKEY OP_1NEGATE OP_EQUALVERIFY 0x6a OP_SHA256 OP_EQUALVERIFY OP_0 OP_INSPECTOUTPUTNONCE OP_0 OP_EQUALVERIFY OP_1 OP_INSPECTOUTPUTASSET OP_1 OP_EQUALVERIFY $collateralAsset OP_EQUALVERIFY OP_1 OP_INSPECTOUTPUTVALUE OP_1 OP_EQUALVERIFY $payoutAmount OP_EQUALVERIFY OP_1 OP_INSPECTOUTPUTSCRIPTPUBKEY OP_0 OP_EQUALVERIFY $issuerScriptProgram OP_EQUALVERIFY OP_1 OP_INSPECTOUTPUTNONCE OP_0 OP_EQUALVERIFY $borrowePk OP_CHECKSIG) })',
  },
  {
    name: 'transferWithKey',
    fixture: 'transfer_with_key.json',
    expected:
      'eltr(50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0, { asm($pubKey OP_CHECKSIG) })',
  },
];

describe('toDescriptor', () => {
  for (const t of tests) {
    it(t.name, () => {
      const artifact = require(`../fixtures/${t.fixture}`);
      const descriptor = toDescriptor(artifact);
      expect(descriptor).toEqual(t.expected);
      validate(descriptor);
    });
  }
});
