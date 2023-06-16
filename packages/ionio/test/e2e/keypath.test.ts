import secp256k1 from '@vulpemventures/secp256k1-zkp';
import { Contract } from '../../src';
import {
  BIP371SigningData,
  Creator,
  Extractor,
  Finalizer,
  Pset,
  Signer,
  Transaction,
  Updater,
  networks,
} from 'liquidjs-lib';
import { ECPairFactory } from 'ecpair';
import { faucetComplex } from '../utils';
import { broadcast } from '../utils';

describe('Contract key-path spend', () => {
  it('should be able to spend a contract using taproot key-path', async () => {
    const zkp = await secp256k1();
    const internalKeyPair = ECPairFactory(zkp.ecc).makeRandom();
    // eslint-disable-next-line global-require
    const artifact = require('../fixtures/calculator.json');
    const contract = new Contract(
      artifact,
      [3],
      networks.regtest,
      zkp,
      internalKeyPair.publicKey
    );
    const response = await faucetComplex(contract.address, 1);
    const prevout = response.prevout;
    const utxo = response.utxo;

    const pset = Creator.newPset();

    const updater = new Updater(pset);
    updater.addInputs([
      {
        txid: utxo.txid,
        txIndex: utxo.vout,
        witnessUtxo: prevout,
        tapInternalKey: contract.internalPublicKey.subarray(1), // Pset expects x-only internal key
        sighashType: Transaction.SIGHASH_DEFAULT,
      },
    ]);

    updater.addOutputs([
      {
        asset: utxo.asset,
        amount: 1_0000_0000 - 500,
        script: contract.scriptPubKey,
      },
      {
        asset: utxo.asset,
        amount: 500,
      },
    ]);

    const signer = new Signer(pset);

    const preimage = signer.pset.getInputPreimage(
      0,
      Transaction.SIGHASH_DEFAULT,
      networks.regtest.genesisBlockHash
    );

    const signature = Buffer.from(
      zkp.ecc.signSchnorr(
        preimage,
        contract.tweakInternalKey(internalKeyPair.privateKey!)
      )
    );

    const partialSig: BIP371SigningData = {
      genesisBlockHash: networks.regtest.genesisBlockHash,
      tapKeySig: signature,
    };

    signer.addSignature(0, partialSig, Pset.SchnorrSigValidator(zkp.ecc));

    const finalizer = new Finalizer(pset);
    finalizer.finalize();

    const tx = Extractor.extract(pset);
    await broadcast(tx.toHex());
  });
});
