<script type="ts">
  import { Artifact, Contract } from '@ionio-lang/ionio';
  import { networks, confidential, address, AssetHash } from 'liquidjs-lib';
  import * as ecc from 'tiny-secp256k1';
  import artifact from './artifacts/calculator.json';
  import { broadcast } from './somewhere'

  const network = networks.regtest;
  let txhex = '';

  const sats = 1000000;
  const fee = 100;

  const contract = new Contract(artifact as Artifact, [3], network, ecc);
  const contractAddress = contract.address;

  const onClick = async () => {


    const txid = prompt('Enter a transaction hash', '49158cdfd93bdcf711becefe12d8387c10ec974e4b6c8f62a99a15e324565089');
    const vout = prompt('Enter the vout', "1");

    // attach to the funded contract using the utxo
    const instance = contract.from(
      txid,
      parseInt(vout),
      {
        script: address.toOutputScript(contractAddress),
        value: confidential.satoshiToConfidentialValue(sats),
        asset: AssetHash.fromHex(network.assetHash, false).bytes,
        nonce: Buffer.alloc(0),
      }
    );

    const recipient = prompt('Enter a recipient to send funds to', "ert1qzqpsk9jtgwtyh96se48j9v99klh796wgly0xjk")
    const tx = await instance.functions
      .sumMustBeThree(1,2)
      .withRecipient(
        recipient,
        sats - fee,
        network.assetHash
      )
      .withFeeOutput(fee)
      .unlock();

    // extract and broadcast
    txhex = tx.psbt.extractTransaction().toHex();
    const txid = await broadcast(txhex);
  };
</script>

<div class="box">
  <h1 class="title">Calculator</h1>
  <p class="has-text-weight-bold">
    {contractAddress}
  </p>
  <hr />
  <button class="button is-primary" on:click={onClick}> Sum must be 3 </button>
  {#if txhex.length > 0}
    <hr />
    <p class="subtitle">Raw transaction</p>
    <input class="input" value={txhex} />
  {/if}
</div>
