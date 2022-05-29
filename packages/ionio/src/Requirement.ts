interface Requirement {
  type: RequirementType;
  expected: RequiredInput | RequiredOutput | number | string | undefined;
  atIndex?: number; // for input* or output* requirements only
}

enum RequirementType {
  // Timelocks
  After = 'after', // CHECKLOCKTIMEVERIFY
  Older = 'older', // CHECKSEQUENCEVERIFY
  // Input
  Input = 'input',
  Output = 'output',
  // Inputs: granular fields
  InputValue = 'inputvalue',
  InputScript = 'inputscript',
  InputAsset = 'inputasset',
  InputHash = 'inputhash',
  InputIndex = 'inputindex',
  // Outputs: granular fields
  OutputValue = 'outputvalue',
  OutputScript = 'outputscript',
  OutputAsset = 'outputasset',
  OutputNonce = 'outputnonce',
}

interface ScriptPubKey {
  version: -1 | 0 | 1;
  program: string;
}

interface RequiredInput {
  hash: string;
  index: number;
  script: ScriptPubKey;
  value: number;
  asset: string;
}

interface RequiredOutput {
  script: ScriptPubKey;
  value: string;
  asset: string;
  nonce: string;
}

function checkRequirements(require: Requirement[]) {
  for (const { type, atIndex, expected } of require) {
    switch (type) {
      case 'input':
        if (atIndex === undefined)
          throw new Error(
            `atIndex field is required for requirement of type ${type}`
          );
        if (!expected)
          throw new Error(
            `expected field of type ${type} is required at index ${atIndex}`
          );
        break;

      case 'output':
        if (atIndex === undefined)
          throw new Error(
            `atIndex field is required for requirement of type ${type}`
          );
        if (!expected)
          throw new Error(
            `expected field of type ${type} is required at index ${atIndex}`
          );
        const expectedProperties = ['script', 'value', 'asset', 'nonce'];
        if (
          !expectedProperties.every(
            property => property in (expected as RequiredOutput)
          )
        ) {
          throw new Error('Invalid or incomplete artifact provided');
        }
        const expectedScriptProperties = ['version', 'program'];
        if (
          !expectedScriptProperties.every(
            property => property in (expected as RequiredOutput).script
          )
        ) {
          throw new Error('Invalid or incomplete artifact provided');
        }
        break;
      case 'after':
      case 'older':
      default:
        break;
    }
  }
}

export {
  Requirement,
  RequirementType,
  RequiredInput,
  RequiredOutput,
  ScriptPubKey,
  checkRequirements,
};
