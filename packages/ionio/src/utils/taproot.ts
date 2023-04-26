import { bip341, crypto, Ecc } from 'liquidjs-lib';

export function tweakPublicKey(
  publicKey: Buffer,
  hash: Buffer,
  ecc: Ecc
): bip341.XOnlyPointAddTweakResult {
  const XOnlyPubKey = publicKey.slice(1, 33);
  const toTweak = Buffer.concat([XOnlyPubKey, hash]);
  const tweakHash = crypto.taggedHash('TapTweak/elements', toTweak);
  const tweaked = ecc.xOnlyPointAddTweak(XOnlyPubKey, tweakHash);
  if (!tweaked) throw new Error('Invalid tweaked key');
  return tweaked;
}
