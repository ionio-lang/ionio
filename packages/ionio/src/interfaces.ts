import { TxOutput } from 'liquidjs-lib';

export interface Utxo {
  txid: string;
  vout: number;
  prevout: TxOutput;
}

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
