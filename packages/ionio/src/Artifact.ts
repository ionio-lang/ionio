import fs from 'fs';
import { PrimitiveType } from './interfaces';

export interface Parameter {
  name: string;
  type: PrimitiveType;
}

export interface Requirement {
  type: RequirementType;
  expected: Input | Output | number | string | undefined;
  atIndex?: number; // for input* or output* requirements only
}

export enum RequirementType {
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
  After = 'after',
  Older = 'older',
}

export interface Input {
  hash: string;
  index: number;
  script: string;
  value: number;
  asset: string;
}

export interface Output {
  script: string;
  value: string;
  asset: string;
  nonce: string;
}

export interface Function {
  name: string;
  functionInputs: Parameter[];
  require: Requirement[];
  asm: string[];
}

export interface Artifact {
  contractName: string;
  functions: Function[];
  constructorInputs: Parameter[];
}

export function importArtifact(artifactFile: string): Artifact {
  return JSON.parse(fs.readFileSync(artifactFile, { encoding: 'utf-8' }));
}

export function exportArtifact(artifact: Artifact, targetFile: string): void {
  const jsonString = JSON.stringify(artifact, null, 2);
  fs.writeFileSync(targetFile, jsonString);
}
