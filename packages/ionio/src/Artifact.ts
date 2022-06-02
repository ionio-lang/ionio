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

type ArtifactMapper = (artifact: Artifact) => Artifact;

/**
 * compile one of the constructor input
 * @param name name of the input to compile
 * @param arg argument value as input
 */
function withConstructorInput(name: string, arg: Argument): ArtifactMapper {
  return (artifact: Artifact): Artifact => {
    // compile the constructor input
    const constructorInputToRemove = artifact.constructorInputs.find(
      p => p.name === name
    );
    if (!constructorInputToRemove) {
      throw new Error(`Constructor input ${name} not found`);
    }
    const argEncoded = encodeArgument(arg, constructorInputToRemove.type);

    return {
      ...artifact,
      // remove compiled constructor input
      constructorInputs: artifact.constructorInputs.filter(
        p => p.name !== name
      ),
      functions: artifact.functions.map(
        replaceASMtoken(name, argEncoded.toString('hex'))
      ),
    };
  };
}

/**
 * change the name of one of the constructor input
 * @param toreplace name of the input name to replace
 * @param replaceby new name of the input
 */
function withCustomConstructorInputName(
  toreplace: string,
  replaceby: string
): ArtifactMapper {
  return (artifact: Artifact): Artifact => {
    return {
      ...artifact,
      constructorInputs: artifact.constructorInputs.map(p =>
        p.name === toreplace ? { ...p, name: replaceby } : p
      ),
      functions: artifact.functions.map(
        replaceASMtoken(toreplace, `$${replaceby}`)
      ),
    };
  };
}

function replaceASMtoken(
  toreplace: string,
  by: string
): (f: Function) => Function {
  return (f: Function): Function => ({
    ...f,
    asm: f.asm.map(token => {
      if (token.slice(1) === toreplace) {
        return by;
      }
      return token;
    }),
  });
}

function composeMappers(...mappers: ArtifactMapper[]): ArtifactMapper {
  return (artifact: Artifact): Artifact => {
    return mappers.reduce((acc, mapper) => mapper(acc), artifact);
  };
}
/**
 * Apply a set of mappers to an artifact
 */
function transformArtifact(
  artifact: Artifact,
  ...mappers: ArtifactMapper[]
): Artifact {
  return composeMappers(...mappers)(artifact);
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
  ArtifactMapper,
  exportArtifact,
  importArtifact,
  transformArtifact,
  withConstructorInput,
  withCustomConstructorInputName,
};
