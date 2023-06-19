import { Artifact, ArtifactFunction } from './Artifact';
import { H_POINT } from './constants';

const H_POINT_XONLY_HEX = H_POINT.subarray(1).toString('hex');

/**
 * build the marina custom descriptor for a given artifact
 * token "$" are not replaced in the asm string, consider using transformArtifact to replace them
 * @param artifact the artifact to build the descriptor for
 */
export function toDescriptor(
  artifact: Artifact,
  internalPublicKey = H_POINT_XONLY_HEX
): string {
  const { functions } = artifact;
  const leaves = functions.map(toASMstring);
  const tree = reduceLeaves(leaves);

  return `eltr(${internalPublicKey}, ${tree})`;
}

function reduceLeaves(array: string[]): string {
  switch (array.length) {
    case 0:
      return '';
    case 1:
      return `{ ${array[0]} }`;
    case 2:
      return `{ ${array[0]}, ${array[1]}}`;
    default:
      // > 2
      return reduceLeaves([
        reduceLeaves(array.slice(0, 2)),
        reduceLeaves(array.slice(2)),
      ]);
  }
}

function toASMstring(f: ArtifactFunction): string {
  return `asm(${f.asm.join(' ')})`;
}
