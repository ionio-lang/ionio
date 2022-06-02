import {
  Artifact,
  ArtifactMapper,
  withConstructorInput,
  withCustomConstructorInputName,
} from '../../src';

interface Test {
  name: string;
  artifact: Artifact;
  mapper: ArtifactMapper;
  expected: Artifact;
}

const transferWithKey = require('../fixtures/transfer_with_key.json');

const tests: Test[] = [
  {
    name: 'withConstructorInput',
    artifact: transferWithKey,
    mapper: withConstructorInput(
      'pubKey',
      Buffer.from(
        'c6d0c728b8e8fd24cf1a6022578f73820ba22e44fbc6de3a4b1a8b7f397fdbd1',
        'hex'
      )
    ),
    expected: {
      ...transferWithKey,
      constructorInputs: [],
      functions: [
        {
          ...transferWithKey.functions[0],
          asm: [
            'c6d0c728b8e8fd24cf1a6022578f73820ba22e44fbc6de3a4b1a8b7f397fdbd1',
            'OP_CHECKSIG',
          ],
        },
      ],
    },
  },
  {
    name: 'withCustomConstructorInputName',
    artifact: transferWithKey,
    mapper: withCustomConstructorInputName('pubKey', 'pubkeycustomname'),
    expected: {
      ...transferWithKey,
      constructorInputs: [
        {
          ...transferWithKey.constructorInputs[0],
          name: 'pubkeycustomname',
        },
      ],
      functions: [
        {
          ...transferWithKey.functions[0],
          asm: ['$pubkeycustomname', 'OP_CHECKSIG'],
        },
      ],
    },
  },
];

describe('transformArtifact', () => {
  for (const t of tests) {
    it(`should transform artifact with ${t.name}`, () => {
      const transformed = t.mapper(t.artifact);
      expect(transformed).toEqual(t.expected);
    });
  }
});
