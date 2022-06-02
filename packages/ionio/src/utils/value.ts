import { confidential } from 'ldk';

export class Value {
  private value: Buffer;

  constructor(value: Buffer) {
    this.value = value;
  }

  static fromSatoshis(sats: number) {
    return new Value(confidential.satoshiToConfidentialValue(sats));
  }

  static fromBytes(bytes: Buffer) {
    return new Value(bytes);
  }

  get satoshis(): number {
    return confidential.confidentialValueToSatoshi(this.value);
  }

  get bytes(): Buffer {
    return this.value;
  }
}
