<script type="ts">

  import Connect from 'svelte-marina-button';

  import Unlock from './Unlock.svelte';



</script>

<div class="container is-widescreen">
  <div class="box">
    <h1 class="title">Hello World!</h1>
    <Connect cssClass={'button'} />
    <hr />
    <Unlock />
  </div>
</div>

<style src="./scss/main.scss" lang="scss" global>
</style>