import { script } from 'ldk';
import { isSigner, Signer } from './Signer';
import { Value } from './utils/value';

export type Argument = number | boolean | string | Buffer | Signer;

export enum PrimitiveType {
  Number = 'number',
  Bytes = 'bytes',
  Boolean = 'bool',
  Asset = 'asset',
  Value = 'value',
  Signature = 'sig',
  DataSignature = 'datasig',
  PublicKey = 'pubkey',
  XOnlyPublicKey = 'xonlypubkey',
}

export function encodeArgument(
  value: Argument,
  typeStr: PrimitiveType
): Buffer | Signer {
  switch (typeStr) {
    case PrimitiveType.Bytes:
      if (typeof value === 'string' && value.startsWith('0x')) {
        value = Buffer.from(value.slice(2), 'hex');
      }

      if (!Buffer.isBuffer(value)) {
        throw new TypeError(typeof value, typeStr);
      }

      return value;

    case PrimitiveType.Number:
      if (typeof value !== 'number') {
        throw new TypeError(typeof value, typeStr);
      }
      return script.number.encode(value);

    case PrimitiveType.XOnlyPublicKey:
      if (typeof value === 'string' && value.startsWith('0x')) {
        value = Buffer.from(value.slice(2), 'hex');
      }

      if (!Buffer.isBuffer(value)) {
        throw new TypeError(typeof value, typeStr);
      }
      if (value.length !== 32) {
        throw new Error('Invalid x-only public key length');
      }
      return value;

    case PrimitiveType.PublicKey:
      if (typeof value === 'string' && value.startsWith('0x')) {
        value = Buffer.from(value.slice(2), 'hex');
      }

      if (!Buffer.isBuffer(value)) {
        throw new TypeError(typeof value, typeStr);
      }
      if (value.length !== 33) {
        throw new Error('Invalid public key length');
      }
      return value;

    case PrimitiveType.Boolean:
      if (typeof value !== 'boolean') {
        throw new TypeError(typeof value, typeStr);
      }
      return script.number.encode(value ? 1 : 0);

    case PrimitiveType.Asset:
      if (typeof value !== 'string') {
        throw new TypeError(typeof value, typeStr);
      }
      const assetBuffer = Buffer.from(value, 'hex');
      const reversedAssetBuffer = assetBuffer.reverse() as Buffer;
      return reversedAssetBuffer;

    case PrimitiveType.Value:
      if (typeof value !== 'number') {
        throw new TypeError(typeof value, typeStr);
      }
      const valueBuffer = Value.fromSatoshis(value).bytes;
      const reversedValueBuffer = valueBuffer.slice(1).reverse() as Buffer;
      return reversedValueBuffer;

    case PrimitiveType.Signature:
      if (!isSigner(value)) {
        throw new TypeError(typeof value, typeStr);
      }
      return value;

    case PrimitiveType.DataSignature:
      if (typeof value === 'string' && value.startsWith('0x')) {
        value = Buffer.from(value.slice(2), 'hex');
      }

      if (!Buffer.isBuffer(value)) {
        throw new TypeError(typeof value, typeStr);
      }
      return value;

    default:
      throw new Error(`Unsupported type ${typeStr}`);
  }
}

export class TypeError extends Error {
  constructor(actual: string, expected: PrimitiveType) {
    super(
      `Found type '${actual}' where type '${expected.toString()}' was expected`
    );
  }
}
