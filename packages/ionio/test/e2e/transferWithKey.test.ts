import { Contract } from '../../src';
import * as ecc from 'tiny-secp256k1';
import { alicePk, network } from '../fixtures/vars';
import { payments, TxOutput } from 'ldk';
import { broadcast, faucetComplex, getSignerWithECPair } from '../utils';
import { Signer } from '../../src/Signer';
import { Artifact } from '../../src/Artifact';

describe('TransferWithKey', () => {
  let contract: Contract;
  let prevout: TxOutput;
  let utxo: { txid: string; vout: number; value: number; asset: string };
  const signer: Signer = getSignerWithECPair(alicePk, network);

  beforeAll(async () => {
    // eslint-disable-next-line global-require
    const artifact: Artifact = require('../fixtures/transfer_with_key.json');
    contract = new Contract(
      artifact,
      [
        `0x${alicePk.publicKey.slice(1).toString('hex')}`
      ],
      network,
      ecc
    );
    const response = await faucetComplex(contract.address, 0.0001);

    prevout = response.prevout;
    utxo = response.utxo;
  });

  describe('transfer', () => {
    it('should transfer with signature', async () => {
      const to = payments.p2wpkh({ pubkey: alicePk.publicKey }).address!;
      const amount = 9900;
      const feeAmount = 100;

      // lets instantiare the contract using the funding transacton
      const instance = contract.from(utxo.txid, utxo.vout, prevout);

      const tx = instance.functions
        .transfer(signer)
        .withRecipient(to, amount, network.assetHash)
        .withFeeOutput(feeAmount);

      const signedTx = await tx.unlock();
      const hex = signedTx.psbt.extractTransaction().toHex();
      const txid = await broadcast(hex);
      expect(txid).toBeDefined();
    });
  });
});
