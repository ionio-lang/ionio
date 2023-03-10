---
title: Build your first Liquid smart contract with Ionio SDK
description: Build a calculator smart contract with Elements Tapscript to be deployed on the Liquid Network
slug: ionio-calculator
authors:
  - name: Marco Argentieri
    title: Ionio contributor
    url: https://github.com/tiero
    image_url: https://github.com/tiero.png
tags: [ionio, sdk, tutorial, smart contract, workshop, liquid network]
hide_table_of_contents: false
---

You got your faboulos script with all those cute opcodes, and now what? **Ionio SDK FTW!**

<!--truncate-->


## Context

In the Bitcoin world, most of the possible scripts are *de-facto* standards all wallets follow, set in stone by the wallet developer.

In a **post-Simplicty** world, Bitcoin (tap)scripts will introduce much more capabilities, but 
stadardize all possible combination in all wallets becomes impossibile, will be the user (or any external app he's interacting with) to instruct the wallet what to do at runtime.


**Output Descriptors** and **Miniscript** could be a good candidate on how to generalize a way to import script, but i) lack of extensibility in cooperative script building scenarios ii) need to write a parser/compiler for each language makes it a bit [cumbersome for wallet/libraries to work with](/docs/Artifact#alternatives), plus the "policy oriented" nature does not well fit the introspection (ie. covenants) paradigm Simplicity will allow.

The feature to import a **script template** is fundamental for the wallet to **track balances** and to know **how spend** those coins in the future.

The **Ionio Artifact** it's a JSON file that fully describe how a **Pay to Taproot** address is constructed, how the contract behaves and what it should be expected to do spend it in the future. The documentation fot the data structure can be found [here](/docs/Artifact#structure)

# 🧮 You first "calculator"
 

## Dev Environment 

- [Docker Linux](https://docs.docker.com/desktop/linux/install) or [Docker Desktop for Mac](https://docs.docker.com/desktop/mac/install)
- [Nigiri](https://nigiri.vulpem.com)
- nodejs
- yarn (optional, you can use npm)


### Nigiri

Install Nigiri

```sh
curl https://getnigiri.vulpem.com | bash
```

2. Run a Liquid box

```sh
nigiri start --liquid
```

### Install dependencies & config

1. Project setup


Pull a Svelte starter app

```sh
npx degit "tiero/svelte-webpack-bulma" ionio-app
```

Enter the folder 
```
cd ionio-app
```

Install depenendencies 
```
yarn add @ionio-lang/ionio tiny-secp256k1
```


2. Create a `calculator.json` file in `src`

```json
{
  "contractName": "Calculator",
  "constructorInputs": [
    {
      "name": "sum",
      "type": "number"
    }
  ],
  "functions": [
    {
      "name": "sumMustBeThree",
      "functionInputs": [
        {
          "name": "a",
          "type": "number"
        },
        {
          "name": "b",
          "type": "number"
        }
      ],
      "require": [],
      "asm": [
        "OP_ADD",
        "$sum",
        "OP_EQUAL"
      ]
    }
  ]
}
```

### Add Layout and state

1. Open `App.svelte` in your editor

2. Add layout after the title box 

```html
<div class="box">
  <h1 class="title">Calculator</h1>
  <p class="has-text-weight-bold">
    {contractAddress}
  </p>
  <hr />

  {#if txhex.length > 0} 
    <hr />
    <p class="subtitle">Raw transaction</p>
    <input class="input" value={txhex} />
  {/if}
</div>
```

4. Add script section on top

```ts
<script type="ts">
  import { Artifact, Contract } from '@ionio-lang/ionio';
  import { networks, address, ElementsValue, AssetHash } from 'liquidjs-lib';
  import * as ecc from 'tiny-secp256k1';
  import artifact from './calculator.json';

  // instantiate the secp256-zkp wasm library
  // define the network we going to work
  const network = networks.regtest;
  // create empty state
  let txhex = '';
  // amounts to use for spending
  const sats = 100000;
  const fee = 100;

  // 📚 Let's compile the script
  const contract = new Contract(
    // our JSON artifact file
    artifact as Artifact,
    // our constructor to replace template strings
    [3],
    // network for address encoding
    network,
    // injectable secp256k1 libraries
    { ecc, zkp: null }
  );
  const contractAddress = contract.address;
</script>
```


### 💰 Fund 

Run the app with `yarn dev` to see the address for your calculator

```sh
# send 100k sats to the contract
# this will auto-mine a block
nigiri faucet --liquid <contract_address> 0.001
```

You can open the exploer at `http://localhost:5001` and copy/paste address to check utxos

Track down the `txid` and `vout` of the new unspent output that locks coin in the calculator

### 💸 Spend

1. Add a `onClick` function to be triggered by button


```ts
  const onClick = async () => {
    const txid = prompt('Enter a transaction hash');
    const vout = prompt('Enter the vout');

    // attach to the funded contract using the utxo
    const instance = contract.from(
      // tranaction ID
      txid,
      // previous output index
      parseInt(vout),
      // the full previous output
      {
        script: address.toOutputScript(contractAddress),
        value: ElementsValue.fromNumber(sats).bytes,
        asset: AssetHash.fromHex(network.assetHash).bytes,
        nonce: Buffer.alloc(0),
      }
    );

    const recipient = prompt('Enter a recipient to send funds to');

    const tx = await instance.functions
      .sumMustBeThree(1, 2)
      .withRecipient(recipient, sats - fee, network.assetHash)
      .withFeeOutput(fee)
      .unlock();

    // extract and broadcast
    txhex = tx.toHex();
  };
```

2. Add the `onClick` to the `on:click` Svelte directive of the button
```html
<button class="button is-primary" on:click={onClick}> Sum must be 3 </button>
```


3. 🚀 push the transaction

Run the app and click on the button `Sum must be 3`

It will ask you to enter a transaction hash and vout and an recipient address.

Get a fresh unconfidential address

```sh 
nigiri rpc --liquid validateaddress `nigiri rpc --liquid getnewaddress`
```

Broadcast 
```sh
nigiri push --liquid <txhex>
```







