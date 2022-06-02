import fs from 'fs';
import { PrimitiveType } from './Argument';
import { Requirement } from './Requirement';

interface Artifact {
  contractName: string;
  constructorInputs: Parameter[];
  functions: ContractFunction[];
}

interface Parameter {
  name: string;
  type: PrimitiveType;
}

interface ContractFunction {
  name: string;
  functionInputs: Parameter[];
  require: Requirement[];
  asm: string[];
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
  ContractFunction,
  Requirement,
  Parameter,
  exportArtifact,
  importArtifact,
};
