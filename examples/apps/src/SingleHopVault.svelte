<script type="ts">
  import { Artifact, Contract } from '@ionio-lang/ionio';
  import { networks, confidential, address, AssetHash, script} from 'liquidjs-lib';
  import * as ecc from 'tiny-secp256k1';
  import artifact from './artifacts/single_hop_vault.json';
  import { broadcast } from './somewhere'

  const network = networks.regtest;
  let txhex = '';

  const hotAddr = 'ert1q4u8ggsxgehpzejvq9c84n3xgel3kwjfpwls20f';
  const hotScriptProgram = address.toOutputScript(hotAddr).slice(2);

  const coldAddr = 'ert1qg73wv8vnq9g0kd4fuqft4rjcgf02h4845wcmqx';
  const coldScriptProgram = address.toOutputScript(coldAddr).slice(2);

  const sats = 100000;
  const fee = 100;
  const contract = new Contract(
    artifact as Artifact,
    [
      coldScriptProgram,
      hotScriptProgram,
      sats - fee,
      network.assetHash,
      2,
    ],
    network,
    ecc
  );
  const contractAddress = contract.address;

  const contractInstance: () => Contract = () => {
    const txid = prompt(
      'Enter a transaction hash',
      'ef1b0e2940987d06b2d8809fee085898cde762e9e8b90178804deed8722962b8'
    );
    const vout = prompt('Enter the vout', '1');

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

    return instance;
  }

  const onCold = async () => {
    const tx = await contractInstance().functions
      .coldSweep()
      .withRecipient(coldAddr, sats - fee, network.assetHash)
      .withFeeOutput(fee)
      .unlock();

    // extract and broadcast
    txhex = tx.psbt.extractTransaction().toHex();
    const txid = await broadcast(txhex);
  };

  const onHot = async () => {
    const tx = await contractInstance().functions
      .delayedHotSpend()
      .withRecipient(hotAddr, sats - fee, network.assetHash)
      .withFeeOutput(fee)
      .unlock();

    // extract and broadcast
    txhex = tx.psbt.extractTransaction().toHex();
    const txid = await broadcast(txhex);
  };
</script>

<div class="box">
  <h1 class="title">James O'Beirne Vault</h1>
  <p class="has-text-weight-bold">
    {contractAddress}
  </p>
  <hr />
  <button class="button is-primary" on:click={onCold}> Cold spend </button>
  <button class="button is-primary" on:click={onHot}> Hot spend </button>
  {#if txhex.length > 0}
    <hr />
    <p class="subtitle">Raw transaction</p>
    <input class="input" value={txhex} />
  {/if}
</div>
