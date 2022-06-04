import fs from 'fs';
import { Argument, encodeArgument, PrimitiveType } from './Argument';
import { Requirement } from './Requirement';

interface Artifact {
  contractName: string;
  constructorInputs: Parameter[];
  functions: ArtifactFunction[];
}

interface Parameter {
  name: string;
  type: PrimitiveType;
}

interface ArtifactFunction {
  name: string;
  functionInputs: Parameter[];
  require: Requirement[];
  asm: string[];
}

interface TemplateString {
  newName: string;
}

function isTemplateString(arg: any): arg is TemplateString {
  return Object.keys(arg).includes('newName');
}

function templateString(newName: string): TemplateString {
  return { newName };
}

function replaceArtifactConstructorWithArguments(
  artifact: Artifact,
  args: (Argument | TemplateString)[]
): Artifact {
  validateArtifact(artifact, args);
  // let's cleanup the constructor inputs to be replace
  let newArtifact: Artifact = { ...artifact, constructorInputs: [] };
  artifact.constructorInputs.forEach((input, i) => {
    const arg = args[i];
    if (arg) {
      if (isTemplateString(arg)) {
        newArtifact.constructorInputs.push({
          name: arg.newName,
          type: input.type,
        });
        newArtifact.functions.forEach(f => {
          f.asm = f.asm.map(token => {
            if (token === '$' + input.name) {
              return '$' + arg.newName;
            }
            return token;
          });
        });
      } else {
        newArtifact.functions.forEach(f => {
          f.asm = f.asm.map(token => {
            if (token === '$' + input.name) {
              return encodeArgument(arg, input.type).toString('hex');
            }
            return token;
          });
        });
      }
    }
  });
  return newArtifact;
}

function importArtifact(artifactFile: string): Artifact {
  return JSON.parse(fs.readFileSync(artifactFile, { encoding: 'utf-8' }));
}

function exportArtifact(artifact: Artifact, targetFile: string): void {
  const jsonString = JSON.stringify(artifact, null, 2);
  fs.writeFileSync(targetFile, jsonString);
}

function validateArtifact(
  artifact: Artifact,
  constructorArgs: (Argument | TemplateString)[]
): void {
  const expectedProperties = ['contractName', 'functions', 'constructorInputs'];
  if (!expectedProperties.every(property => property in artifact)) {
    throw new Error('Invalid or incomplete artifact provided');
  }

  if (artifact.constructorInputs.length !== constructorArgs.length) {
    throw new Error(
      `Incorrect number of arguments passed to ${artifact.contractName} constructor`
    );
  }

  // Encode arguments
  constructorArgs.forEach((arg, i) => {
    if (isTemplateString(arg)) return;
    // this performs type checking
    encodeArgument(arg, artifact.constructorInputs[i].type);
  });
}

export {
  Artifact,
  ArtifactFunction,
  TemplateString,
  Requirement,
  Parameter,
  exportArtifact,
  importArtifact,
  validateArtifact,
  templateString,
  replaceArtifactConstructorWithArguments,
};
