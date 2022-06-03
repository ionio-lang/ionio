import fs from 'fs';
import { Argument, encodeArgument, PrimitiveType } from './Argument';
import { Requirement } from './Requirement';

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

function replaceASMtoken(
  toreplace: string,
  by: string
): (f: Function) => Function {
  return (f: Function): Function => ({
    ...f,
    asm: f.asm.map(token => {
      if (token === toreplace) {
        return by;
      }
      return token;
    }),
  });
}

function renameConstructorInput(
  artifact: Artifact,
  inputIndex: number,
  newName: string
): Artifact {
  const constructorInputToRename = artifact.constructorInputs[inputIndex];
  if (!constructorInputToRename) {
    throw new Error(`Constructor input #${inputIndex} not found`);
  }
  return {
    ...artifact,
    constructorInputs: artifact.constructorInputs.map(p =>
      p.name === constructorInputToRename.name ? { ...p, name: newName } : p
    ),
    functions: artifact.functions.map(
      replaceASMtoken('$' + constructorInputToRename.name, '$' + newName)
    ),
  };
}

function encodeConstructorArg(
  artifact: Artifact,
  inputName: string,
  arg: Argument
): Artifact {
  // compile the constructor input
  const constructorInputToRemove = artifact.constructorInputs.find(
    i => i.name === inputName
  );
  if (!constructorInputToRemove) {
    throw new Error(`Constructor input ${inputName} not found`);
  }
  const argEncoded = encodeArgument(arg, constructorInputToRemove.type);

  return {
    ...artifact,
    // remove compiled constructor input
    constructorInputs: artifact.constructorInputs.filter(
      p => p.name !== constructorInputToRemove.name
    ),
    functions: artifact.functions.map(
      replaceASMtoken(
        '$' + constructorInputToRemove.name,
        argEncoded.toString('hex')
      )
    ),
  };
}

interface TemplateStringI {
  newName: string;
}

function isTemplateStringI(arg: any): arg is TemplateStringI {
  return arg.newName !== undefined;
}

function TemplateString(newName: string): TemplateStringI {
  return { newName };
}

function transformArtifact(
  artifact: Artifact,
  args: (Argument | TemplateStringI)[]
): Artifact {
  let newArtifact = { ...artifact };
  artifact.constructorInputs.forEach((input, i) => {
    const arg = args[i];
    if (arg) {
      if (isTemplateStringI(arg)) {
        newArtifact = renameConstructorInput(newArtifact, i, arg.newName);
      } else {
        newArtifact = encodeConstructorArg(newArtifact, input.name, arg);
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

export {
  Artifact,
  Function,
  Requirement,
  Parameter,
  exportArtifact,
  importArtifact,
  transformArtifact,
  TemplateString,
};
