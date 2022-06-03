import { Contract, Signer } from '../../src';
import * as ecc from 'tiny-secp256k1';
import { alicePk, bobPk, network } from '../fixtures/vars';
import { payments, TxOutput } from 'ldk';
import {
  broadcast,
  faucetComplex,
  getSignerWithECPair,
  mintComplex,
} from '../utils';

describe('SyntheticAsset', () => {
  const issuer = payments.p2wpkh({ pubkey: alicePk.publicKey, network })!;
  const borrower = payments.p2wpkh({ pubkey: bobPk.publicKey, network })!;
  const borrowerSigner: Signer = getSignerWithECPair(bobPk, network);

  let contract: Contract;
  let covenantPrevout: TxOutput;
  let borrowPrevout: TxOutput;
  let covenantUtxo: {
    txid: string;
    vout: number;
    value: number;
    asset: string;
  };
  let borrowUtxo: { txid: string; vout: number; value: number; asset: string };
  const borrowAmount = 500000;
  const payoutAmount = 500;

  beforeAll(async () => {
    // eslint-disable-next-line global-require

    // mint synthetic asset
    // NOTICE: this should happen as atomic swap, now we are simulating it
    // giving the borrower the asset before having him to lock collateral
    try {
      const mintResponse = await mintComplex(
        borrower.address!,
        borrowAmount / 10 ** 8
      );
      borrowUtxo = mintResponse.utxo;
      borrowPrevout = mintResponse.prevout;
      // instantiate Contract
      const artifact = require('../fixtures/synthetic_asset.json');
      contract = new Contract(
        artifact,
        [
          // borrow asset
          borrowUtxo.asset,
          // collateral asset
          network.assetHash,
          // borrow amount
          borrowAmount,
          // payout on redeem amount for issuer
          payoutAmount,
          borrower.pubkey!.slice(1),
          issuer.pubkey!.slice(1),
          issuer.output!.slice(2), // segwit program
        ],
        network,
        ecc
      );

      // fund our contract
      const faucetResponse = await faucetComplex(contract.address, 0.0001);
      covenantPrevout = faucetResponse.prevout;
      covenantUtxo = faucetResponse.utxo;
    } catch (e) {
      console.error(e);
    }
  });

  describe('redeem', () => {
    it('should redeem with burnt output', async () => {
      const feeAmount = 100;

      // lets instantiate the contract using the funding transacton
      const instance = contract.from(
        covenantUtxo.txid,
        covenantUtxo.vout,
        covenantPrevout
      );

      const tx = instance.functions
        .redeem(borrowerSigner)
        // spend an asset
        .withUtxo({
          txid: borrowUtxo.txid,
          vout: borrowUtxo.vout,
          prevout: borrowPrevout,
        })
        // burn asset
        .withOpReturn(borrowUtxo.value, borrowUtxo.asset)
        // payout to issuer
        .withRecipient(issuer.address!, payoutAmount, network.assetHash)
        // collateral
        .withRecipient(
          borrower.address!,
          covenantUtxo.value - payoutAmount - feeAmount,
          network.assetHash
        )
        .withFeeOutput(feeAmount);

      const partialSignedTx = await tx.unlock();

      const signedTx = await partialSignedTx.psbt.signInput(1, bobPk);
      const finalizedTx = await signedTx.finalizeInput(1);

      const hex = finalizedTx.extractTransaction().toHex();
      const txid = await broadcast(hex);
      expect(txid).toBeDefined();
    });
  });
});
