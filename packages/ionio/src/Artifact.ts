import fs from 'fs';
import { PrimitiveType } from './interfaces';

interface Artifact {
  contractName: string;
  constructorInputs: Parameter[];
  functions: Function[];
}

interface Parameter {
  name: string;
  type: PrimitiveType;
}

interface Function {
  name: string;
  functionInputs: Parameter[];
  require: Requirement[];
  asm: string[];
}

interface Requirement {
  type: RequirementType;
  expected: Input | Output | number | string | undefined;
  atIndex?: number; // for input* or output* requirements only
}

enum RequirementType {
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
  // Timelocks
  After = 'after', // CHECKLOCKTIMEVERIFY
  Older = 'older', // CHECKSEQUENCEVERIFY
}

interface ScriptPubKey {
  version: -1 | 0 | 1;
  program: string;
}

interface Input {
  hash: string;
  index: number;
  script: ScriptPubKey;
  value: number;
  asset: string;
}

interface Output {
  script: ScriptPubKey;
  value: string;
  asset: string;
  nonce: string;
}

function importArtifact(artifactFile: string): Artifact {
  return JSON.parse(fs.readFileSync(artifactFile, { encoding: 'utf-8' }));
}

function exportArtifact(artifact: Artifact, targetFile: string): void {
  const jsonString = JSON.stringify(artifact, null, 2);
  fs.writeFileSync(targetFile, jsonString);
}

export {
  Artifact,
  Function,
  Requirement,
  RequirementType,
  Parameter,
  Input,
  Output,
  ScriptPubKey,
  exportArtifact,
  importArtifact,
};
