<script type="ts">
  import { onDestroy } from 'svelte';
  import Connect, { marinaStore, MarinaStore } from 'svelte-marina-button';

  import Transfer from './Transfer.svelte';

  // You can subscribe to marina status changes
  const unsubscribe = marinaStore.subscribe((s: MarinaStore) => {
    console.log(`Marina is attached to the ${s.network} network`);
  });

  onDestroy(() => {
    unsubscribe();
  });
</script>

<div class="container is-widescreen">
  <div class="box">
    <h1 class="title">Hello fren!</h1>
    <Connect cssClass={'button'} />
  </div>
  {#if $marinaStore.enabled}
    <Transfer />
  {/if}
</div>

<style src="./scss/main.scss" lang="scss" global>
</style>
