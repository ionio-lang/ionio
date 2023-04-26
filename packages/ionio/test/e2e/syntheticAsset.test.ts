import * as ecc from 'tiny-secp256k1';
import secp256k1ZKP from '@vulpemventures/secp256k1-zkp';

import { Artifact, Contract, Signer } from '../../src';
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
  Ecc,
  Secp256k1Interface,
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

const artifact = require('../fixtures/synthetic_asset.json');

describe('SyntheticAsset', () => {
  const issuer = payments.p2wpkh({ pubkey: alicePk.publicKey, network })!;
  let issuerSigner: Signer;

  const borrower = payments.p2wpkh({
    pubkey: bobPk.publicKey,
    network,
    blindkey: bobPk.publicKey,
  })!;
  let borrowerSigner: Signer;

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
  let zkp: Secp256k1Interface;
  const borrowAmount = 500000;
  const collateralAmount = 100000;
  const feeAmount = 500;

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
    zkp = await secp256k1ZKP();
    issuerSigner = getSignerWithECPair(alicePk, network, zkp.ecc);
    borrowerSigner = getSignerWithECPair(bobPk, network, zkp.ecc);
  });

  beforeEach(async () => {
    try {
      contract = new Contract(
        artifact,
        [
          synthMintUtxo.asset,
          borrowAmount,
          borrower.pubkey!.slice(1),
          oraclePk.publicKey.slice(1),
          issuer.pubkey!.slice(1),
          priceLevelBytes,
          timestampBytes,
        ],
        network,
        {
          ...zkp,
          ecc: {
            ...zkp.ecc,
            xOnlyPointAddTweak: (pubkey: Uint8Array, tweak: Uint8Array) => {
              try {
                const tweaked = zkp.ecc.xOnlyPointAddTweak(pubkey, tweak);
                return tweaked;
              } catch (e) {
                console.log(pubkey, tweak)
                console.log(zkp.ecc.xOnlyPointAddTweak)
                throw e;
              }
            }
          }
        },
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
      collateralAmount / 10 ** 8
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
      // collateral
      .withRecipient(
        borrower.address!,
        collateralAmount - feeAmount,
        network.assetHash
      )
      .withFeeOutput(feeAmount);

    const partialSignedTx = await tx.unlock();

    
    const signedPset = signInput(partialSignedTx.pset, 1, bobPk, ecc as unknown as Ecc);

    const finalizer = new Finalizer(signedPset);
    finalizer.finalize();

    const finalTx = Extractor.extract(signedPset);
    const hex = finalTx.toHex();

    const txid = await broadcast(hex);
    expect(txid).toBeDefined();
  });

  it('should topup burning & reissuing', async () => {
    const newCollateralCoinAmount = 300000;
    const newCollateralCoin = await faucetComplex(
      borrower.confidentialAddress!,
      newCollateralCoinAmount / 10 ** 8,
      network.assetHash,
      bobPk.privateKey
    );
    const newCollateralAmount = 200000;
    const newPriceLevel = priceLevel * 2;
    const newTimestamp = 1669599853; // Mon Nov 28 01:44:13 2022 UTC

    const newContract = new Contract(
      artifact as Artifact,
      [
        synthMintUtxo.asset,
        borrowAmount,
        borrower.pubkey!.slice(1),
        oraclePk.publicKey.slice(1),
        issuer.pubkey!.slice(1),
        numberToBytesLE64(newPriceLevel),
        numberToBytesLE64(newTimestamp),
      ],
      network,
      zkp
    );

    const tx = instance.functions
      .redeem(borrowerSigner) // 100k btc
      // spend an asset 500k synth
      .withUtxo({
        txid: borrowUtxo.txid,
        vout: borrowUtxo.vout,
        prevout: borrowPrevout,
      })
      // add more collateral 300k btc
      .withUtxo({
        txid: newCollateralCoin.utxo.txid,
        vout: newCollateralCoin.utxo.vout,
        prevout: newCollateralCoin.prevout,
        unblindData: newCollateralCoin.unblindData,
      })
      // burn asset 500k synth
      .withOpReturn(borrowUtxo.value, borrowUtxo.asset)
      // new contract with more collateral 200k
      .withRecipient(
        newContract.address,
        newCollateralAmount,
        network.assetHash
      )
      // utxo collateral change. 200k miuns fee
      // We use the second input as blinder index
      .withRecipient(
        borrower.confidentialAddress!,
        collateralAmount +
          newCollateralCoinAmount -
          newCollateralAmount -
          feeAmount,
        network.assetHash,
        2
      )
      .withFeeOutput(feeAmount);

    const ptx = await tx.unlock();

    // sign and finalize the synth asset input
    signInput(ptx.pset, 1, bobPk, zkp.ecc);
    signInput(ptx.pset, 2, bobPk, zkp.ecc);

    const finalizer = new Finalizer(ptx.pset);
    finalizer.finalize();

    const finalTx = Extractor.extract(ptx.pset);
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
    const signedPset = signInput(partialSignedTx.pset, 1, bobPk, ecc as unknown as Ecc);

    const finalizer = new Finalizer(signedPset);
    finalizer.finalize();

    const finalTx = Extractor.extract(signedPset);
    const hex = finalTx.toHex();

    const txid = await broadcast(hex);
    expect(txid).toBeDefined();
  });
});

function signInput(pset: Pset, index: number, keyPair: ECPairInterface, ecc: Ecc) {
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
