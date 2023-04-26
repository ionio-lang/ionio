import secp256k1 from '@vulpemventures/secp256k1-zkp';

import { Contract } from '../../src';
import { alicePk, network } from '../fixtures/vars';
import { payments, TxOutput } from 'liquidjs-lib';
import { broadcast, faucetComplex, getSignerWithECPair } from '../utils';
import { Signer } from '../../src/Signer';
import { Artifact } from '../../src/Artifact';

describe('TransferWithKey', () => {
  let contract: Contract;
  let prevout: TxOutput;
  let utxo: { txid: string; vout: number; value: number; asset: string };
  //let unblindData: confidential.UnblindOutputResult | undefined;
  let signer: Signer;

  beforeAll(async () => {
    const zkp = await secp256k1();
    signer = getSignerWithECPair(alicePk, network, zkp.ecc);
    // eslint-disable-next-line global-require
    const artifact: Artifact = require('../fixtures/transfer_with_key.json');
    contract = new Contract(
      artifact,
      [`0x${alicePk.publicKey.slice(1).toString('hex')}`],
      network,
      zkp
    );

    const response = await faucetComplex(
      contract.address,
      0.0001,
      network.assetHash
      //alicePk.privateKey
    );

    prevout = response.prevout;
    utxo = response.utxo;
  });

  describe('transfer', () => {
    it('should transfer with signature', async () => {
      const to = payments.p2wpkh({ pubkey: alicePk.publicKey }).address!;
      //const toConfidential = address.toConfidential(to, alicePk.publicKey);
      const amount = 9900;
      const feeAmount = 100;

      // lets instantiare the contract using the funding transacton
      const instance = contract.from(
        utxo.txid,
        utxo.vout,
        prevout
        //unblindData
      );

      const tx = instance.functions
        .transfer(signer)
        .withRecipient(to, amount, network.assetHash)
        .withFeeOutput(feeAmount);

      const signedTx = await tx.unlock();
      const hex = signedTx.toHex();
      const txid = await broadcast(hex);
      expect(txid).toBeDefined();
    });
  });
});
