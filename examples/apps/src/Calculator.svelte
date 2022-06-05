<script type="ts">
  import { Artifact, Contract } from '@ionio-lang/ionio';
  import { networks, confidential, address, AssetHash } from 'liquidjs-lib';
  import * as ecc from 'tiny-secp256k1';
  import artifact from './artifacts/calculator.json';

  let contractAddress = '';

  const sats = 100000;
  const contract = new Contract(artifact as Artifact, [3], networks.testnet, ecc);
  contractAddress = contract.address;

  const onClick = async () => {

    const fee = 100;

    // attach to the funded contract using the utxo
    const instance = contract.from(
      "6ffff978d47a564d5f6cdf9684d6482f49c1abd064d2047b50cc3ffcf4841bf5",
      0,
      {
        script: address.toOutputScript(contractAddress),
        value: confidential.satoshiToConfidentialValue(sats),
        asset: AssetHash.fromHex(networks.testnet.assetHash, false).bytes,
        nonce: Buffer.alloc(0),
      }
    );

    const tx = await instance.functions
      .sumMustBeThree(5454,2)
      .withRecipient(
        "vjTyPZRBt2WVo8nnFrkQSp4x6xRHt5DVmdtvNaHbMaierD41uz7fk4Jr9V9vgsPHD74WA61Ne67popRQ",
        sats - fee,
        networks.testnet.assetHash
      )
      .withFeeOutput(fee)
      .unlock();

    // extract and broadcast
    const txHex = tx.psbt.extractTransaction().toHex();
    console.log(txHex);
  };
</script>

<div class="box">
  <h1 class="title">Calculator</h1>
  <p class="has-text-weight-bold">
    {contractAddress}
  </p>
  <hr />
  <button class="button is-primary" on:click={onClick}> Sum must be 3 </button>
</div>