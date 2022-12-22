import * as ecc from 'tiny-secp256k1';
import secp256k1 from '@vulpemventures/secp256k1-zkp';

import { alicePk, network } from '../fixtures/vars';
import { Contract, encodeArgument, PrimitiveType } from '../../src';
import { ZKPInterface } from 'liquidjs-lib/src/confidential';

const transferWithKey = require('../fixtures/transfer_with_key.json');

describe('contract', () => {
  let zkp: ZKPInterface;
  beforeAll(async () => {
    zkp = await secp256k1();
  });

  it('should have contractParams not empty and with the same keys as constructorInputs', async () => {
    const pubkey = `0x${alicePk.publicKey.slice(1).toString('hex')}`;
    const contract = new Contract(transferWithKey, [pubkey], network, {
      zkp,
      ecc,
    });

    expect(contract.contractParams['pubKey']).toStrictEqual(pubkey);
  });

  it('should encode a number of type Uint64 as Buffer of 8 bytes lenght', async () => {
    // 500 in hex is 0x01f4
    const amountLE64 = Buffer.from('f401000000000000', 'hex');
    const encoded = encodeArgument(500, PrimitiveType.UInt64);
    expect(encoded).toStrictEqual(amountLE64);
  });
});
