<script type="ts">
  import * as ecc from 'tiny-secp256k1';

  import { bob, network } from '../../../packages/ionio/test/fixtures/vars';
  import { Contract, H_POINT } from '@ionio-lang/ionio';
  import type { AddressInterface } from 'ldk';
  import {payments, address} from 'liquidjs-lib';
  import { broadcast, faucetComplex, sleep } from '../../../packages/ionio/test/utils';

  $: contractAddress = '';
  $: txid = '';

  const artifact = require('../../../packages/ionio/test/fixtures/transfer_with_key.json');
  const onGenerate = async () => {
    const namespace = 'tiero';
    const template = `eltr(${(H_POINT).slice(1).toString('hex')}, { asm($${namespace} OP_CHECKSIG), asm(OP_TRUE) })`;
    try {
      await window.marina.useAccount(namespace);
    } catch (err) {
      console.error(err)
      await window.marina.createAccount(namespace);
      await window.marina.useAccount(namespace);
      await window.marina.importTemplate({
        type: 'marina-descriptors',
        template,
      });
      await window.marina.useAccount(namespace);
    }

    try {
      const { taprootInternalKey, derivationPath, confidentialAddress } =
        (await window.marina.getNextAddress()) as AddressInterface & {
          taprootInternalKey: string;
        };


      const contract = new Contract(
        artifact,
        [Buffer.from(taprootInternalKey, 'hex')],
        network,
        ecc
      );

      console.log(derivationPath, contract.address, address.fromConfidential(confidentialAddress).unconfidentialAddress);
      contractAddress = contract.address;

      console.log('sending funds to ' + contractAddress)
      const { utxo, prevout } = await faucetComplex(contract.address, 0.0001);
      console.log('utxo at index ' + utxo.vout + 'txid: ' + utxo.txid)


      let foundCoins = false;
      while (!foundCoins) {
        await window.marina.reloadCoins([namespace]);
        const coins = await window.marina.getCoins();
        foundCoins = coins.some(
          (coin) => coin.txid === utxo.txid && coin.vout === utxo.vout
        );
        console.log('waiting for coins to be found...');
        await sleep(1000);
      }

      const to = payments.p2wpkh({ pubkey: bob.publicKey }).address!;
      const amount = 9900;
      const feeAmount = 100;

      // lets instantiare the contract using the funding transacton
      const instance = contract.from(utxo.txid, utxo.vout, prevout);

      const tx = instance.functions
        .transfer({
          signTransaction: (b64) => window.marina.signTransaction(b64)
        })
        .withRecipient(to, amount, network.assetHash)
        .withFeeOutput(feeAmount);

      const signedTx = await tx.unlock();
      const hex = signedTx.psbt.extractTransaction().toHex();
      txid = await broadcast(hex);
    } catch (err) {
      console.error(err);
    }
  };
</script>

<button class="button is-primary" on:click={onGenerate}
  >Generate & Unlock</button
>
<p class="subtitle">{contractAddress}</p>
<p class="subtitle">🔗 {txid}</p>

