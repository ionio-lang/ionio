import { useState } from 'react';
import Head from 'next/head'
import * as ecc from 'tiny-secp256k1';
import secp256k1zkp from '@vulpemventures/secp256k1-zkp';
import * as noble from '@noble/secp256k1';
import { Contract, Artifact, Signer } from '@ionio-lang/ionio';
import { networks, Transaction } from 'liquidjs-lib';

import artifact from '../transfer_with_key.json';
import { ionioSigner } from '../utils/signer';


const privateKeyHex = '826dd029c1e569e68e36543d182dd10475e50d33646a79a264a9837d8ccd32f5';
const privateKey = noble.utils.hexToBytes(privateKeyHex);

// window.alby.getPublicKey()
const getPublicKey = () => {
  const xonlypub = noble.schnorr.getPublicKey(privateKey);
  return xonlypub;
}
// window.alby.signSchnorr()
const signSchnorr = async (sigHash: Buffer): Promise<Buffer> => {
  const sig = await noble.schnorr.sign(sigHash, privateKey);
  return Buffer.from(sig.buffer);
}

const signer: Signer = ionioSigner(
  Buffer.from(getPublicKey().buffer), 
  signSchnorr, 
  networks.testnet.genesisBlockHash
)



export default function Home() {
  
  const [txID, setTxID] = useState<string | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  
  const compileContract = async () => {
    
    const pubkey = getPublicKey();
    const pubkeyBuffer = Buffer.from(pubkey.buffer)

    const contract = new Contract(artifact as Artifact, [ pubkeyBuffer ], networks.testnet, { ecc, zkp: await secp256k1zkp()})

    setContract(contract);
  }

  const burn = async () => {
    if (!contract) {
      return;
    }

    const sats = 100000;
    const txid = prompt("Enter txid")
    const vout = prompt("Enter vout", "0")
    if (!txid || !vout) {
      return;
    }

    // fetch prevout
    const response = await fetch('https://blockstream.info/liquidtestnet/api/tx/' + txid + '/hex')
    const prevoutHex = await response.text()
    const prevTx = Transaction.fromHex(prevoutHex)
    const prevout = prevTx.outs[parseInt(vout)]

    // create instance of live contract funded on the blockchain
    const instance = contract.from(txid, parseInt(vout), prevout)

    // create a transaction that burns the contract
    const tx = instance.functions.transfer(signer);
      
    // add the burn output where we burn all the coins minus 100 sats for the network fee
    tx.withOpReturn(sats - 100, networks.testnet.assetHash)
    tx.withFeeOutput(100)
      
    // blind, sign and finalize the transaction 
    // NOTICE: the Ionio signer invokes the passed window.alby.signSchnorr method 
    try {
      await tx.unlock();
    } catch(e) {
      console.error(e)
      return;
    }

    // extract the raw hex of the transaction
    const hex = tx.toHex()


    // broadcast to network
    const response2 = await fetch('https://blockstream.info/liquidtestnet/api/tx', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: hex
    });
    const txidBurn = await response2.text();
    setTxID(txidBurn)

    // open the transaction in a new tab
    window.open('https://blockstream.info/liquidtestnet/tx/' + txidBurn, '_blank');
  }


  return (
    <>
      <Head>
        <title>⚡️ Alby Demo</title>
        <meta
          name="description"
          content="Alby Demo"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <section className="hero is-medium is-primary">
        <div className="hero-body">
          <h1 className="title">🐝 Alby x 🌊 Ionio</h1>
          <p className="subtitle">
            Interact with Liquid smart contracts using an Alby extension
          </p>
        </div>
      </section>
      <section className="section">
        <h1 className="title">Transfer with key</h1>
        <p className="subtitle">Simple taproot output with unspendable key-path and a CHECKSIG in a script-path </p>
        <p className='subtitle'>⚠️ Fund it with exactly <b>100k sats</b> </p>
        <div className="columns">
          <div className="column is-8">
            <div className="card">
              <div className="card-content">
                <div className='content'>
                  <h3 className="title">Public Key</h3>
                  <p className="subtitle">{contract ? (contract?.contractParams.pubKey as Buffer).toString('hex') : "Not set"}</p>
                </div>
                <div className="content">
                  <h3 className="title">Address</h3>
                  <p className="subtitle">{contract ? contract.address : "Not set"}</p>
                </div>
              </div>
              <div className='card-footer'>
                <div className='card-footer-item'>
                  <div className='buttons'>
                    <button onClick={compileContract} className='button is-primary'>Compile Contract</button>
                    <button onClick={burn} className='button is-primary'>Burn</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}