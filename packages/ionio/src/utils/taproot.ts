import { bip341, crypto } from 'ldk';

export function tweakPublicKey(
  publicKey: Buffer,
  hash: Buffer,
  ecc: bip341.TinySecp256k1Interface
): bip341.XOnlyPointAddTweakResult {
  const XOnlyPubKey = publicKey.slice(1, 33);
  const toTweak = Buffer.concat([XOnlyPubKey, hash]);
  const tweakHash = crypto.taggedHash('TapTweak/elements', toTweak);
  const tweaked = ecc.xOnlyPointAddTweak(XOnlyPubKey, tweakHash);
  if (!tweaked) throw new Error('Invalid tweaked key');
  return tweaked;
}
