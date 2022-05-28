export type Signer = {
  signTransaction(psetBase64: string): Promise<string>;
};

export const isSigner = (x: any): x is Signer =>
  Object.keys(x).includes('signTransaction');
