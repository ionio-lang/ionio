import { Artifact, Function } from './Artifact';
import { H_POINT } from './constants';

const H_POINT_XONLY_HEX = H_POINT.slice(1).toString('hex');

export function toDescriptor(artifact: Artifact) {
  const { functions } = artifact;
  const leaves = functions.map(toASMstring);
  const tree = reduceLeaves(leaves);

  return `eltr(${H_POINT_XONLY_HEX}, ${tree})`;
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

function toASMstring(f: Function): string {
  return `asm(${f.asm.join(' ')})`;
}
