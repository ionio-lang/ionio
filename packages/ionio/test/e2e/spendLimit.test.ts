import * as ecc from 'tiny-secp256k1';
import secp256k1 from '@vulpemventures/secp256k1-zkp';

import { Contract } from '../../src';
import { alicePk, network } from '../fixtures/vars';
import { payments, TxOutput } from 'liquidjs-lib';
import { broadcast, faucetComplex } from '../utils';
import { Artifact } from '../../src/Artifact';

describe('SpendLimit', () => {
  let contract: Contract;
  let prevout: TxOutput;
  let utxo: { txid: string; vout: number; value: number; asset: string };

  beforeEach(async () => {
    const zkp = await secp256k1();
    // eslint-disable-next-line global-require
    const artifact: Artifact = require('../fixtures/spend_limit.json');
    contract = new Contract(artifact, [5000], network, { ecc, zkp });

    const response = await faucetComplex(
      contract.address,
      0.0001,
      network.assetHash
    );

    prevout = response.prevout;
    utxo = response.utxo;
  });

  describe('spendLessThanLimit', () => {
    it('should spend if passed amount < limit', async () => {
      const to = payments.p2wpkh({ pubkey: alicePk.publicKey }).address!;
      const amount = 3000;
      const feeAmount = 100;

      // lets instantiare the contract using the funding transacton
      const instance = contract.from(
        utxo.txid,
        utxo.vout,
        prevout
      );

      const tx = instance.functions
        .spendLessThanLimit(amount)
        .withRecipient(to, amount, network.assetHash)
        .withRecipient(contract.address, 10000 - amount - feeAmount, network.assetHash)
        .withFeeOutput(feeAmount);

      const signedTx = await tx.unlock();
      const hex = signedTx.toHex();
      const txid = await broadcast(hex);
      expect(txid).toBeDefined();
    });

    it('should NOT spend if passed amount > limit', async () => {
      const to = payments.p2wpkh({ pubkey: alicePk.publicKey }).address!;
      const feeAmount = 100;
      const amount = 10000 - feeAmount;

      // lets instantiare the contract using the funding transacton
      const instance = contract.from(
        utxo.txid,
        utxo.vout,
        prevout
      );

      const tx = instance.functions
        .spendLessThanLimit(amount)
        .withRecipient(to, amount, network.assetHash)
        .withFeeOutput(feeAmount);

      const signedTx = await tx.unlock();
      const hex = signedTx.toHex();
      await expect(broadcast(hex, false)).rejects.toThrow();
    });
  });
});
