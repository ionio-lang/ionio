import { Contract, Signer } from '../../src';
import * as ecc from 'tiny-secp256k1';
import { ECPairInterface } from 'ecpair';
import { alicePk, bobPk, oraclePk, network } from '../fixtures/vars';
import {
  payments,
  address,
  script as bscript,
  TxOutput,
  Transaction as LiquidTransaction,
  Finalizer,
  Pset,
} from 'liquidjs-lib';
import crypto from 'crypto';
import { writeUInt64LE } from 'liquidjs-lib/src/bufferutils';
import {
  BIP174SigningData,
  Extractor,
  Signer as PsetSigner,
} from 'liquidjs-lib/src/psetv2';
import {
  broadcast,
  faucetComplex,
  getNewAddress,
  getSignerWithECPair,
  mintComplex,
} from '../utils';

const numberToBytesLE64 = (x: number): Buffer => {
  const buffer = Buffer.alloc(8);
  writeUInt64LE(buffer, x, 0);
  return buffer;
};

describe('SyntheticAsset', () => {
  const issuer = payments.p2wpkh({ pubkey: alicePk.publicKey, network })!;
  const issuerSigner: Signer = getSignerWithECPair(alicePk, network);

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
  let synthMintUtxo: {
    txid: string;
    vout: number;
    value: number;
    asset: string;
  };
  let instance: Contract;
  const borrowAmount = 500000;
  const payoutAmount = 500;
  const feeAmount = 100;

  // 40k BTCUSD
  const priceLevel = 40000;
  const priceLevelBytes = numberToBytesLE64(priceLevel);
  //Tue Jun 28 2022 16:31:52 GMT+0200 (Central European Summer Time)
  const timestamp = 1656426712;
  const timestampBytes = numberToBytesLE64(timestamp);

  beforeAll(async () => {
    // mint synthetic asset
    // NOTICE: this should happen as atomic swap, now we are simulating it
    // giving the borrower the asset before having him to lock collateral
    const nigiriAddressConfidential = await getNewAddress();
    const mintResponse = await mintComplex(
      // we send to nigiri so we faucet for each test
      address.fromConfidential(nigiriAddressConfidential).unconfidentialAddress,
      // we mint three times the borrow amount for each test
      (borrowAmount * 3) / 10 ** 8
    );
    synthMintUtxo = mintResponse.utxo;
  });

  beforeEach(async () => {
    try {
      const artifact = require('../fixtures/synthetic_asset.json');
      contract = new Contract(
        artifact,
        [
          // borrow asset
          synthMintUtxo.asset,
          // collateral asset
          network.assetHash,
          // borrow amount
          borrowAmount,
          // payout on redeem amount for issuer
          payoutAmount,
          borrower.pubkey!.slice(1),
          oraclePk.publicKey.slice(1),
          issuer.pubkey!.slice(1),
          issuer.output!.slice(2), // segwit program
          priceLevelBytes,
          timestampBytes,
        ],
        network,
        ecc
      );
    } catch (e) {
      console.error(e);
    }

    // 1. send synthetic asset to borrower
    const faucetSynthResponse = await faucetComplex(
      borrower.address!,
      borrowAmount / 10 ** 8,
      synthMintUtxo.asset
    );
    borrowUtxo = faucetSynthResponse.utxo;
    borrowPrevout = faucetSynthResponse.prevout;

    // 2. fund our contract with collateral
    const faucetCollateralResponse = await faucetComplex(
      contract.address,
      0.0001
    );
    covenantPrevout = faucetCollateralResponse.prevout;
    covenantUtxo = faucetCollateralResponse.utxo;

    // 3. lets instantiate the contract using the funding transacton
    instance = contract.from(
      covenantUtxo.txid,
      covenantUtxo.vout,
      covenantPrevout
    );
  });

  it('should redeem with burnt output', async () => {
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

    //const signedTx = await partialSignedTx.psbt.signInput(1, bobPk);
    const signedPset = signInput(partialSignedTx.pset, 1, bobPk);

    const finalizer = new Finalizer(signedPset);
    finalizer.finalize();

    const finalTx = Extractor.extract(signedPset);
    const hex = finalTx.toHex();

    const txid = await broadcast(hex);
    expect(txid).toBeDefined();
  });

  it('should liquidate with oracle attestation', async () => {
    // 30k BTCUSD
    const underwaterPrice = 30000;
    const underwaterPriceBytes = numberToBytesLE64(underwaterPrice);

    // Tue Jun 28 2022 17:11:55 GMT+0200 (Central European Summer Time)
    const timestampNow = 1656429115;
    const timestampNowBytes = numberToBytesLE64(timestampNow);

    const message = Buffer.from([
      ...timestampNowBytes,
      ...underwaterPriceBytes,
    ]);
    const hash = crypto
      .createHash('sha256')
      .update(message)
      .digest();
    const oracleDataSig = oraclePk.signSchnorr(hash);

    const tx = instance.functions
      .liquidate(
        underwaterPriceBytes,
        timestampNowBytes,
        oracleDataSig,
        issuerSigner
      )
      // spend an asset
      .withUtxo({
        txid: borrowUtxo.txid,
        vout: borrowUtxo.vout,
        prevout: borrowPrevout,
      })
      // burn asset
      .withOpReturn(borrowUtxo.value, borrowUtxo.asset)
      // confiscate collateral
      .withRecipient(
        issuer.address!,
        covenantUtxo.value - feeAmount,
        network.assetHash
      )
      .withFeeOutput(feeAmount);

    const partialSignedTx = await tx.unlock();

    // sign and finalize the synth asset input
    //const signedTx = await partialSignedTx.psbt.signInput(1, bobPk);
    const signedPset = signInput(partialSignedTx.pset, 1, bobPk);

    const finalizer = new Finalizer(signedPset);
    finalizer.finalize();

    const finalTx = Extractor.extract(signedPset);
    const hex = finalTx.toHex();

    const txid = await broadcast(hex);
    expect(txid).toBeDefined();
  });
});

function signInput(pset: Pset, index: number, keyPair: ECPairInterface) {
  const signer = new PsetSigner(pset);
  // segwit v0 input
  const sigHashType =
    pset.inputs[index].sighashType ?? LiquidTransaction.SIGHASH_ALL;
  const preimage = pset.getInputPreimage(index, sigHashType);

  const partialSig: BIP174SigningData = {
    partialSig: {
      pubkey: keyPair.publicKey,
      signature: bscript.signature.encode(keyPair.sign(preimage), sigHashType),
    },
  };
  signer.addSignature(index, partialSig, Pset.ECDSASigValidator(ecc));

  return pset;
}
