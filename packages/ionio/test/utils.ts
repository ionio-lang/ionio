import axios from 'axios';
import { ECPairInterface } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import {
  confidential,
  Pset,
  Transaction,
  TxOutput,
  NetworkExtended as Network,
  bip341,
} from 'liquidjs-lib';
import { Signer } from '../src/Signer';
import { Signer as PsetSigner } from 'liquidjs-lib/src/psetv2';
const APIURL = process.env.APIURL || 'http://localhost:3001';

export function sleep(ms: number): Promise<any> {
  return new Promise((res: any): any => setTimeout(res, ms));
}

export async function faucetComplex(
  address: string,
  amountFractional: number,
  asset?: string,
  blindingKey?: Buffer
): Promise<{
  utxo: { value: number; asset: string; txid: string; vout: number };
  prevout: TxOutput;
  unblindData?: confidential.UnblindOutputResult;
}> {
  const utxo = await faucet(address, amountFractional, asset);
  const txhex = await fetchTx(utxo.txid);
  const prevout = Transaction.fromHex(txhex).outs[utxo.vout];

  if (blindingKey) {
    const unblindData = await confidential.unblindOutputWithKey(
      prevout,
      blindingKey
    );
    return { utxo, prevout, unblindData };
  }

  return { utxo, prevout };
}

export async function mintComplex(
  address: string,
  amountFractional: number
): Promise<{
  utxo: { value: number; asset: string; txid: string; vout: number };
  prevout: TxOutput;
}> {
  const utxo = await mint(address, amountFractional);
  const txhex = await fetchTx(utxo.txid);

  const prevout = Transaction.fromHex(txhex).outs[utxo.vout];
  return {
    utxo,
    prevout,
  };
}

export async function getNewAddress(): Promise<string> {
  const response = await axios.get(`${APIURL}/getnewaddress`);
  return response.data.address;
}

export async function faucet(
  address: string,
  amount: number,
  asset?: string
): Promise<any> {
  try {
    const resp = await axios.post(`${APIURL}/faucet`, {
      address,
      amount,
      asset,
    });
    if (resp.status !== 200) {
      throw new Error('Invalid address');
    }
    const { txId } = resp.data;

    let rr = { data: [] };
    const filter = (): any => rr.data.filter((x: any) => x.txid === txId);
    while (!rr.data.length || !filter().length) {
      sleep(100);
      rr = await axios.get(`${APIURL}/address/${address}/utxo`);
    }

    return filter()[0];
  } catch (e) {
    console.error(e);
    throw e;
  }
}

export async function mint(address: string, quantity: number): Promise<any> {
  try {
    const { status, data } = await axios.post(`${APIURL}/mint`, {
      address,
      quantity,
    });
    if (status !== 200) {
      throw new Error('Invalid address');
    }

    while (true) {
      sleep(100);
      try {
        const utxos = await fetchUtxos(address, data.txId);
        if (utxos.length > 0) {
          return utxos[0];
        }
      } catch (ignore) {}
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
}

export async function fetchUtxos(
  address: string,
  txid?: string
): Promise<any[]> {
  try {
    let utxos = (await axios.get(`${APIURL}/address/${address}/utxo`)).data;
    if (utxos && utxos.length > 0 && txid) {
      utxos = utxos.filter((u: any) => u.txid === txid);
    }
    return utxos;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

export async function fetchTx(txId: string): Promise<string> {
  const resp = await axios.get(`${APIURL}/tx/${txId}/hex`);
  return resp.data;
}

export async function fetchUtxo(txId: string): Promise<any> {
  const txHex = await fetchTx(txId);
  const resp = await axios.get(`${APIURL}/tx/${txId}`);
  return { txHex, ...resp.data };
}

export async function broadcast(
  txHex: string,
  verbose = true,
  api: string = APIURL
): Promise<string> {
  try {
    const resp = await axios.post(`${api}/tx`, txHex);
    return resp.data;
  } catch (e) {
    if (verbose) console.error(e);
    throw e;
  }
}

export function getSignerWithECPair(
  keyPair: ECPairInterface,
  network: Network
): Signer {
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
          network.genesisBlockHash,
          leafHash
        );

        // sign it
        const hashTypeBuffer =
          hashType !== 0x00 ? Buffer.of(hashType) : Buffer.alloc(0);
        // notice third parameted MUST have Buffer.alloc(32)
        const signatureBuffer = Buffer.from(
          ecc.signSchnorr(sighashForSig, keyPair.privateKey!, Buffer.alloc(32))
        );

        const signatureWithHashType = Buffer.concat([
          signatureBuffer,
          hashTypeBuffer,
        ]);

        const taprootData = {
          tapScriptSigs: [
            {
              signature: signatureWithHashType,
              pubkey: keyPair.publicKey.subarray(1),
              leafHash,
            },
          ],
          genesisBlockHash: network.genesisBlockHash,
        };

        signer.addSignature(index, taprootData, Pset.SchnorrSigValidator(ecc));
      }

      return pset.toBase64();
    },
  };
}
