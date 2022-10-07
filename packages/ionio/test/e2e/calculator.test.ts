import { Contract } from '../../src';
import * as ecc from 'tiny-secp256k1';
import { bob, network } from '../fixtures/vars';
import { payments, TxOutput } from 'liquidjs-lib';
import { broadcast, faucetComplex } from '../utils';

describe('Calculator', () => {
  let contract: Contract;
  let prevout: TxOutput;
  let utxo: { txid: string; vout: number; value: number; asset: string };

  beforeAll(async () => {
    // eslint-disable-next-line global-require
    const artifact = require('../fixtures/calculator.json');
    contract = new Contract(artifact, [3], network, ecc);
    const response = await faucetComplex(contract.address, 0.0001);

    prevout = response.prevout;
    utxo = response.utxo;
  });

  describe('sumMustBeThree', () => {
    it('should succeed when the sum of a and b is correct', async () => {
      const to = payments.p2wpkh({ pubkey: bob.publicKey }).address!;
      const amount = 9900;
      const feeAmount = 100;

      // lets instantiate the contract using the funding transacton
      const instance = contract.from(utxo.txid, utxo.vout, prevout);

      const tx = instance.functions
        .sumMustBeThree(1, 2)
        .withRecipient(to, amount, network.assetHash)
        .withFeeOutput(feeAmount);

      const signedTx = await tx.unlock();

      const hex = signedTx.toHex();

      const txid = await broadcast(hex);
      expect(txid).toBeDefined();
    });
  });
});
