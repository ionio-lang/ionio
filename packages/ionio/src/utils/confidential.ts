import { EMPTY_NONCE } from '../constants';
import { Output, UnblindedOutput } from '../types';

export function isUnblindedOutput(output: Output): output is UnblindedOutput {
  return (output as UnblindedOutput).unblindData !== undefined;
}

function bufferNotEmptyOrNull(buffer?: Buffer): boolean {
  return buffer != null && buffer.length > 0;
}

/**
 * Checks if a given output is a confidential one.
 * @param output the ouput to check.
 */
export function isConfidentialOutput({
  rangeProof,
  surjectionProof,
  nonce,
}: any): boolean {
  return (
    bufferNotEmptyOrNull(rangeProof) &&
    bufferNotEmptyOrNull(surjectionProof) &&
    nonce !== EMPTY_NONCE
  );
}
