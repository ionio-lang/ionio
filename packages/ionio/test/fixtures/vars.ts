import { networks } from 'liquidjs-lib';
import ECPairFactory from 'ecpair';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';

export const network = networks.regtest;
const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

const rootSeed = bip32.fromSeed(
  Buffer.from('awesome awesome awesome'),
  network
);

export const alice = rootSeed.derivePath("m/0'/0/0");
export const bob = rootSeed.derivePath("m/0'/0/1");
export const oracle = rootSeed.derivePath("m/0'/0/2");

export const alicePk = ECPair.fromPrivateKey(alice.privateKey!, { network });
export const bobPk = ECPair.fromPrivateKey(bob.privateKey!, { network });
export const oraclePk = ECPair.fromPrivateKey(oracle.privateKey!, { network });
