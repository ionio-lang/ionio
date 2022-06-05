<script type="ts">
  import { Artifact, Contract } from '@ionio-lang/ionio';
  import { networks, confidential, address, AssetHash } from 'liquidjs-lib';
  import * as ecc from 'tiny-secp256k1';
  import artifact from './artifacts/single_hop_vault.json';

  let contractAddress = '';

  const hotAddr =
    'tlq1qqg0axuht0t2qgz586pklg68zv2wwucrlk9ndfzsvz5ydcw7qzwkhz2mfu7ewrlcxdh4gxgaxly79l8vzyy80wjh2kmt77mpg8';
  const hotScriptProgram = address.toOutputScript(hotAddr).slice(2);

  const coldAddr =
    'tlq1qqfyktjwd5adg574jusjnjcqtvhvml06n4ehtsqz5raglt2s6pevqpuuewm7pxttdm9ygqkmwal2psrzs9d6n7drz4l5tss3np';
  const coldScriptProgram = address.toOutputScript(coldAddr).slice(2);

  const sats = 100000;
  const fee = 100;

  const contract = new Contract(
    artifact as Artifact,
    [
      coldScriptProgram,
      hotScriptProgram,
      sats - fee,
      networks.testnet.assetHash,
      1,
    ],
    networks.testnet,
    ecc
  );
  contractAddress = contract.address;

  // attach to the funded contract using the utxo
  const instance = contract.from(
    '1dcbd6b3591257d5518d151de9edf43b135783a8b4eaa81b142cbc4199a659cc',
    1,
    {
      script: address.toOutputScript(contractAddress),
      value: confidential.satoshiToConfidentialValue(sats),
      asset: AssetHash.fromHex(networks.testnet.assetHash, false).bytes,
      nonce: Buffer.alloc(0),
    }
  );

  const onCold = async () => {
    const tx = await instance.functions
      .coldSweep()
      .withRecipient(coldAddr, sats - fee, networks.testnet.assetHash)
      .withFeeOutput(fee)
      .unlock();

    // extract and broadcast
    const txHex = tx.psbt.extractTransaction().toHex();
    console.log(txHex);
  };

  const onHot = async () => {
    const tx = await instance.functions
      .delayedHotSpend()
      .withRecipient(hotAddr, sats - fee, networks.testnet.assetHash)
      .withFeeOutput(fee)
      .unlock();

    // extract and broadcast
    const txHex = tx.psbt.extractTransaction().toHex();
    console.log(txHex);
  }
</script>

<div class="box">
  <h1 class="title">James O'Beirne Vault</h1>
  <p class="has-text-weight-bold">
    {contractAddress}
  </p>
  <hr />
  <button class="button is-primary" on:click={onCold}> Cold spend </button>
  <button class="button is-primary" on:click={onHot}> Hot spend </button>
</div>
