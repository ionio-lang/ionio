import secp256k1 from '@vulpemventures/secp256k1-zkp';

import { Contract } from '../../src';
import { alicePk, network } from '../fixtures/vars';
import { address, payments, Secp256k1Interface, TxOutput } from 'liquidjs-lib';
import { broadcast, faucetComplex } from '../utils';
import { Artifact } from '../../src/Artifact';

describe('SingleHopVault', () => {
  let contract: Contract;
  let zkp: Secp256k1Interface;
  let prevout: TxOutput;
  let utxo: { txid: string; vout: number; value: number; asset: string };

  const hotAddr = 'ert1q4u8ggsxgehpzejvq9c84n3xgel3kwjfpwls20f';
  const hotScriptProgram = address.toOutputScript(hotAddr).slice(2);

  const coldAddr = 'ert1qg73wv8vnq9g0kd4fuqft4rjcgf02h4845wcmqx';
  const coldScriptProgram = address.toOutputScript(coldAddr).slice(2);

  const sats = 100000;
  const fee = 100;

  const someoneElse = payments.p2wpkh({ pubkey: alicePk.publicKey, network })
    .address!;

  beforeAll(async () => {
    zkp = await secp256k1();
  });
  beforeEach(async () => {
    
    // eslint-disable-next-line global-require
    const artifact: Artifact = require('../fixtures/single_hop_vault.json');
    contract = new Contract(
      artifact,
      [coldScriptProgram, hotScriptProgram, sats - fee, network.assetHash, 2],
      network,
      zkp
    );
    const response = await faucetComplex(contract.address, sats / 10 ** 8);

    prevout = response.prevout;
    utxo = response.utxo;
  });

  describe('hot spend', () => {
    it('should not transfer before locktime', async () => {
      const amount = sats - fee;

      // lets instantiare the contract using the funding transacton
      const instance = contract.from(utxo.txid, utxo.vout, prevout);

      const tx = instance.functions
        .delayedHotSpend()
        .withRecipient(hotAddr, amount, network.assetHash)
        .withFeeOutput(fee);

      const signedTx = await tx.unlock();
      const hex = signedTx.toHex();
      await expect(broadcast(hex, false)).rejects.toThrow();
    });

    it('should not transfer to someone else', async () => {
      const amount = sats - fee;

      // lets instantiare the contract using the funding transacton
      const instance = contract.from(utxo.txid, utxo.vout, prevout);

      // we just faucet to mint a block
      await faucetComplex(someoneElse, sats / 10 ** 8);

      const tx = instance.functions
        .delayedHotSpend()
        .withRecipient(someoneElse, amount, network.assetHash)
        .withFeeOutput(fee);

      await expect(tx.unlock()).rejects.toThrow();
    });

    it('should transfer to hot wallet after a block', async () => {
      const amount = sats - fee;

      // lets instantiare the contract using the funding transacton
      const instance = contract.from(utxo.txid, utxo.vout, prevout);

      // we just faucet to mint a block
      await faucetComplex(someoneElse, sats / 10 ** 8);

      const tx = instance.functions
        .delayedHotSpend()
        .withRecipient(hotAddr, amount, network.assetHash)
        .withFeeOutput(fee);

      const signedTx = await tx.unlock();
      const hex = signedTx.toHex();
      const txid = await broadcast(hex);
      expect(txid).toBeDefined();
    });
  });
});
