import * as ecc from 'tiny-secp256k1';
import secp256k1 from '@vulpemventures/secp256k1-zkp';

import { alicePk, network } from '../fixtures/vars';
import { Contract } from '../../src';

const transferWithKey = require('../fixtures/transfer_with_key.json');

describe('contract', () => {
  
  it('should have contractParams not empty and with the same keys as constructorInputs', async () => {
    const zkp = await secp256k1();

    const pubkey = `0x${alicePk.publicKey.slice(1).toString('hex')}`;
    const contract = new Contract(
      transferWithKey,
      [pubkey],
      network,
      {
        zkp,
        ecc
      }
    );

    expect(contract.contractParams['pubKey']).toStrictEqual(pubkey);
  });
});