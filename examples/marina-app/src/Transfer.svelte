<script type="ts">
  import { detectProvider } from 'marina-provider';
  import {
    replaceArtifactConstructorWithArguments,
    templateString,
    toDescriptor,
  } from '@ionio-lang/ionio';
  import {address} from 'liquidjs-lib';
  import { onMount } from 'svelte';

  let accountID = '';
  let contractAddress = '';

  onMount(async () => {
    const artifact = require('./transfer_with_captcha.json');

    const namespace = 'marina-captcha2';
    const artifactWithData = replaceArtifactConstructorWithArguments(artifact, [
      3,
      templateString(namespace),
    ]);
    const marinaDescriptor = toDescriptor(artifactWithData);

    // safely get the window.marina provider
    const marina = await detectProvider('marina');

    // check namespace if already available
    try {
      const accountInfo = await marina.getAccountInfo(namespace);
      accountID = accountInfo.accountID;
      if (accountInfo.isReady) return;

      await marina.useAccount(namespace);
      await marina.importTemplate({
        type: 'marina-descriptors',
        template: marinaDescriptor,
      });
    } catch (ignore) {
      console.log(ignore);
      await marina.createAccount(namespace);
      await marina.useAccount(namespace);
      await marina.importTemplate({
        type: 'marina-descriptors',
        template: marinaDescriptor,
      });
    }

    contractAddress = address.fromConfidential((await marina.getNextAddress()).confidentialAddress).unconfidentialAddress;
  });


  const onTransfer = async () => {
    // safely get the window.marina provider
    const marina = await detectProvider('marina');
  }
</script>

<div class="container">
  <div class="box">
    <h1 class="title">Transfer</h1>
    <p class="subtitle">
      AccountID: {accountID}
    </p>
    <p class="subtitle">
      Address: {accountID}
    </p>
    <button class="button" on:click={console.log}>Transfer</button>
  </div>
</div>
