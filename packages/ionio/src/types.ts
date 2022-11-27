import { confidential, TxOutput } from 'liquidjs-lib';

export interface Outpoint {
  txid: string;
  vout: number;
}
export declare type Output = Outpoint & {
  prevout: TxOutput;
};
export declare type UnblindedOutput = Output & {
  unblindData: confidential.UnblindOutputResult;
};
