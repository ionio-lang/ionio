import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import { Pset, Signer as PsetSigner, bip341, Transaction } from 'liquidjs-lib';

const ECPair = ECPairFactory(ecc);


export function ionioSigner(pubKey: Buffer, signSchnorr: (sigHash: Buffer) => Promise<Buffer>, genesisBlockHash: Buffer) {
  return {
    signTransaction: async (base64: string): Promise<string> => {
      const pset = Pset.fromBase64(base64);
      const signer = new PsetSigner(pset);

      for (let index = 0; index < pset.inputs.length; index++) {
        const input = pset.inputs[index];
        // skip if does not contain the tapLeafScript field
        if (input && !input.tapLeafScript) continue;

        // here we assume to spend the first leaf always in case more than one is provided
        const script = input.tapLeafScript![0].script;
        if (!script) continue;

        const leafHash = bip341.tapLeafHash({
          scriptHex: script.toString('hex'),
        });

        const hashType = input.sighashType ?? Transaction.SIGHASH_ALL;
        const sighashForSig = pset.getInputPreimage(
          index,
          hashType,
          genesisBlockHash,
          leafHash
        );

        // sign it
        const hashTypeBuffer =
          hashType !== 0x00 ? Buffer.of(hashType) : Buffer.alloc(0);

        const signatureBuffer = await signSchnorr(sighashForSig);
        /* Buffer.from(
          ecc.signSchnorr(sighashForSig, keyPair.privateKey!, Buffer.alloc(32))
        ); */

        const signatureWithHashType = Buffer.concat([
          signatureBuffer,
          hashTypeBuffer,
        ]);

        const taprootData = {
          tapScriptSigs: [
            {
              signature: signatureWithHashType,
              pubkey: pubKey,
              leafHash,
            },
          ],
          genesisBlockHash: genesisBlockHash,
        };

        signer.addSignature(index, taprootData, Pset.SchnorrSigValidator(ecc));
      }

      return pset.toBase64();
    }
  }
}