import {
  TinySecp256k1Interface,
  XOnlyPointAddTweakResult,
} from 'liquidjs-lib/src/bip341';
import { taggedHash } from 'liquidjs-lib/src/crypto';

export function tweakPublicKey(
  publicKey: Buffer,
  hash: Buffer,
  ecc: TinySecp256k1Interface
): XOnlyPointAddTweakResult {
  const XOnlyPubKey = publicKey.slice(1, 33);
  const toTweak = Buffer.concat([XOnlyPubKey, hash]);
  const tweakHash = taggedHash('TapTweak/elements', toTweak);
  const tweaked = ecc.xOnlyPointAddTweak(XOnlyPubKey, tweakHash);
  if (!tweaked) throw new Error('Invalid tweaked key');
  return tweaked;
}
