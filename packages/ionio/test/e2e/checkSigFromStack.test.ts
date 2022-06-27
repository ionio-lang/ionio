import { Contract } from '../../src';
import * as ecc from 'tiny-secp256k1';
import { bob, network } from '../fixtures/vars';
import { broadcast, faucetComplex } from '../utils';
import { payments, TxOutput } from 'liquidjs-lib';

describe('CheckSigFromStack', () => {
  let contract: Contract;
  let prevout: TxOutput;
  let utxo: { txid: string; vout: number; value: number; asset: string };

  beforeAll(async () => {
    // eslint-disable-next-line global-require
    const artifact = require('../fixtures/checksigfromstack.json');
    contract = new Contract(
      artifact,
      [
        '0x68656c6c6f',
        '0xf09f8c8e',
        '0x25d1dff95105f5253c4022f628a996ad3a0d95fbf21d468a1b33f8c160d8f517',
      ],
      network,
      ecc
    );

    const response = await faucetComplex(contract.address, 0.0001);
    prevout = response.prevout;
    utxo = response.utxo;
  });

  describe('csfs', () => {
    it('should generate the right address', async () => {
      expect(contract.address).toStrictEqual(
        'ert1pmdmu2kdjg2zepzjdzmefjqytk7jr7cwqfnzgpsdz925803vatkgshnjpn3'
      );
    });

    it('should be able to unlock funds with data signature', async () => {
      const to = payments.p2wpkh({ pubkey: bob.publicKey }).address!;
      const amount = 9900;
      const feeAmount = 100;

      const datasig = '0x22b284224b4e1d4a943d5a911a259b00cc737c19e371eff98dd045e385a8e8d4c24137188c07add25ccf0f930f36360e2ecf06b4ffeee3a1bd4e2f37911d7c6d';

      // lets instantiate the contract using the funding transacton
      const instance = contract.from(utxo.txid, utxo.vout, prevout);

      const tx = await instance.functions
        .myFunction(datasig)
        .withRecipient(to, amount)
        .withFeeOutput(feeAmount)
        .unlock();

      const hex = tx.psbt.extractTransaction().toHex();
      const txid = await broadcast(hex);
      expect(txid).toBeDefined();
    });
  });
});
