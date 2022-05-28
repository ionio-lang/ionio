---
title: Spending Contracts
---

When calling a contract function on a Contract object, an incomplete Transaction object is returned. This transaction can be completed by providing a number of outputs using the [`withRecipient()`][withRecipient()] or [`withOpReturn()`][withOpReturn()] functions. Other chained functions are included to set other transaction parameters.

Most of the available transaction options are only useful in very specific use cases, but the functions [`withRecipient()`][withRecipient()], [`withOpReturn()`][withOpReturn()] and [`unlock()`][unlock()] are commonly used.

## Transaction options

### withRecipient()
```ts
transaction.withRecipient(addressOrScript: string | Buffer, amount: number, assetID: string): TransactionInterface;
```

The `withRecipient()` function allows you to add outputs to the transaction. This function can be called any number of times, and the provided outputs will be added to the list of earlier added outputs. The `amount` parameter is the amount of the output in satoshis. The `assetID` parameter is the asset hash, if not provided, the Bitcoin asset hash for the selected network will be used.

#### Example
```ts
.withRecipient('ert1q5sshvz2rhwuvktrqckfxkere5p5a57ng76l9u3', 500000)
```

### withOpReturn()
```ts
transaction.withOpReturn(hexChunks: string[], value: number, assetID: string): TransactionInterface;
```

The `withOpReturn()` function allows you to add `OP_RETURN` outputs to the transaction. The `hexChunks` parameter include hex strings. The `amount` parameter is the amount of the output in satoshis. The `assetID` parameter is the asset hash, if not provided, the Bitcoin asset hash for the selected network will be used.

#### Example
```ts
.withOpReturn(['6d02'])
```

### withUtxo()
```ts
transaction.withUtxo(outpoint: Outpoint): TransactionInterface;
```

The `withUtxo()` function allows you to provide one or many UTXOs to be used in the transaction. This function can be called any number of times, and the provided UTXOs will be added to the list of earlier added UTXOs.

#### Example
```ts
.withUtxo({
  txid: utxo.txid, 
  vout: utxo.vout,
  prevout: utxo.prevout
})
```

## Transaction finalization

### unlock()
```ts
async transaction.unlock(signer?: Signer): Promise<TransactionInterface>;
```

After completing a transaction, the `unlock()` function can be used to finalize the transaction. An incomplete transaction cannot be sent.

If the contract needs a signature to be sent (ie. a `CHECKSIG` opcode), the `unlock()` function can be called with an optional `signer` parameter. This parameter is an `Signer` interface, which can be used to provide the signature.


```ts
export interface Signer {
  signTransaction(psetBase64: string): Promise<string>;
}
```


#### Example
```ts
import { alice } from './somewhere';

const tx = await instance.functions
    .transfer()
    .withRecipient(to, amount, network.assetHash)
    .withFeeOutput(feeAmount)
    .unlock();
```

[withRecipient()]: /docs/sdk/transactions#withrecipient
[withOpReturn()]: /docs/sdk/transactions#withopreturn
[unlock()]: /docs/sdk/transactions#unlock
