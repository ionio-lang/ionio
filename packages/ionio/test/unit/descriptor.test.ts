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
    name: 'transferWithKey',
    fixture: 'transfer_with_key.json',
    expected:
      'eltr(50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0, { asm($pubKey OP_CHECKSIG), asm(OP_TRUE)})',
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
