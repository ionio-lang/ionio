---
id: artifact
title: Artifact
sidebar_label: Artifact
---

Compiled contracts can be represented by so-called `artifacts`. These artifacts contain all information that is needed to interact with the smart contracts on-chain. Artifacts are stored in `.json` files so they can be shared and stored for later usage without having to recompile the contract.

:::tip
Artifacts allow any third-party SDKs to be developed, since these SDKs only need to import and use an artifact file, while the compilation of the contract is done with external tools such as the [Ionio Compiler (not available yet)](/docs/language/intro) or [Script Wizard IDE](https://ide.scriptwiz.app).
:::

### Example

**TransferWithTimelock**

```json
{
  "contractName": "TransferWithTimelock",
  "constructorInputs": [
    {
      "name": "delay",
      "type": "number"
    },
    {
      "name": "pubKey",
      "type": "xonlypubkey"
    },
  ],
  "functions": [
    {
      "name": "transfer",
      "functionInputs": [
        {
          "name": "ownerSignature",
          "type": "sig"
        }
      ],
      "require": [
        {
          "type": "older",
          "expected": "$delay",
        }
      ],
      ],
      "asm": [
        "$delay",
        "OP_CHECKSEQUENCEVERIFY",
        "OP_DROP",

        "$pubKey",
        "OP_CHECKSIG"
      ]
    }
  ]
}
```

## Structure

Each **Artifact** JSON file contains the following information:

- `contractName` it's a label to reference the compiled contract.
- `constructorInputs` it's a list of values to parametrize the final script. Each input must have a `type` and a `name` to allow the `asm` list of opcodes to make use of [template](#template-strings) strings to replace them with actual inputs and to allow libraries and SDKs to do type checking and sanitizations.
- `functions` it's a list of all possible [Taproot script path spend](https://bitcoin.stackexchange.com/a/111100)s that can be used to *unlock* the coins held by the contract on the blockchain. 

Each **Function** contains the following information:

- `name` it's a label to reference the function.
- `functionInputs` it's a list of values that must be passed on the witness stack to satisfy the execution of the script. Each input must have a `type` and a `name` to allow the `asm` list of opcodes to make use of [$template](#template-strings) strings to replace them with inputs and to allow libraries and SDKs to do type checking and sanitizations.
- `require` it's a list of all possibile covenants than encumber the execution of the script. Each `Requirement` must have a `type` and an `expected` value for **timelocks** covenants and also an `atIndex` for **introspection** ones.
- `asm` it'a a list of opcodes that will be executed by the script on the blockchain. Hex-encoded bytes must be prefixed with **`0x`** and to make use of the `constructorInputs` and `functionInputs` parameters you can use [$template](#template-strings) strings to replace them in final script compilation


## Types

Each item in `constructorInputs` and `functionInputs` must have a `type` that defines the type of the input. The following types are available:

- **number** it's an integer used and transaltes to **CScriptNum** type in Bitcoin Core.
- **bool** it's a boolean value used and translates to **OP_TRUE** and **OP_FALSE**.
- **asset** it's a Elements asset hash
- **value** it's an Elements value 
- **bytes** it's a LE64 bytes
- **xonlypubkey** it's a x-only public key of exactly 32 bytes. 
- **pubkey** it's a public key with pre of exactly 33 bytes.
- **sig** it's a Schnorr signature of exactly 65 bytes.
- **datasig** it's a signature of exactly 64 bytes.


## Template strings

In order to parametrize the list of opcodes in a script you can use template strings. These strings are prefixed with `$` and are replaced with the values of the `constructorInputs` and `functionInputs` parameters during the final script compilation to generate the actual blockchain address. 


```hack
OP_DUP OP_HASH160 $myPubKey OP_EQUALVERIFY OP_CHECKSIG
```

## Alternatives

**Why not Output Descriptors/Miniscript?**

There are many reasons why Output Descriptors and Miniscript are not suitable for the purpose of Ionio:

- Miniscript provides the tools to easily define spending rules using a number of standardized components that can be combined together in predefined ways. The advantage of the Policy Language is at the same time its weakness. It provides great clarity when your spending conditions can be defined using its restricted set of expressions. It is not applicable otherwise, and cannot be used to define custom covenants.

- Output descriptors are *for humans* meaning that to be able to be parsed by softwares and other languages, a custom parser must be developed for each of them. `JSON` on the other hand it's a standard with libraries to parse/serialize present in every programming language.
 



## Advanced Example

**Single Hop Vault** 

```json
{
  "contractName": "SingleHopVault",
  "constructorInputs": [
    {
      "name": "coldScriptProgram",
      "type": "bytes"
    },
    {
      "name": "hotScriptProgram",
      "type": "bytes"
    },
    {
      "name": "amount",
      "type" : "value"
    },
    {
      "name": "assetID",
      "type" : "asset"
    },
    {
      "name": "delay",
      "type": "number"
    }
  ],
  "functions": [
    {
      "name": "coldSweep",
      "functionInputs": [],
      "require": [
        {
          "type": "output",
          "atIndex": 0,
          "expected": {
            "script" : {
              "version": 0,
              "program": "$coldScriptProgram"
            },
            "value": "$amount",
            "asset": "$assetHash",
            "nonce": ""
          }
        }
      ],
      "asm": [
        "OP_0",
        "OP_INSPECTOUTPUTSCRIPTPUBKEY",
        "OP_0",
        "OP_EQUALVERIFY",
        "$coldScriptProgram",
        "OP_EQUALVERIFY",

        "OP_0",
        "OP_INSPECTOUTPUTVALUE",
        "OP_1",
        "OP_EQUALVERIFY",
        "$amount",
        "OP_EQUALVERIFY",

        "OP_0",
        "OP_INSPECTOUTPUTASSET",
        "OP_1",
        "OP_EQUALVERIFY",
        "$assetHash",
        "OP_EQUALVERIFY",

        "OP_0",
        "OP_INSPECTOUTPUTNONCE",
        "OP_0",
        "OP_EQUALVERIFY",
      ]
    },
    {
      "name": "delayedHotSpend",
      "functionInputs": [],
      "require": [
        {
          "type": "older",
          "expected": "$delay"
        },
        {
          "type": "outputscript",
          "atIndex": 0,
          "expected": {
            "script" : {
              "version": 0,
              "program": "$hotScriptProgram"
            },
            "value": "$amount",
            "asset": "$assetID",
            "nonce": ""
          }
        }
      ],
      "asm": [
        "$delay",
        "OP_CHECKSEQUENCEVERIFY",
        "OP_DROP",

        "OP_0",
        "OP_INSPECTOUTPUTSCRIPTPUBKEY",
        "OP_0",
        "OP_EQUALVERIFY",
        "$hotScriptProgram",
        "OP_EQUALVERIFY",

        "OP_0",
        "OP_INSPECTOUTPUTVALUE",
        "OP_1",
        "OP_EQUALVERIFY",
        "$amount",
        "OP_EQUALVERIFY",

        "OP_0",
        "OP_INSPECTOUTPUTASSET",
        "OP_1",
        "OP_EQUALVERIFY",
        "$assetHash",
        "OP_EQUALVERIFY",

        "OP_0",
        "OP_INSPECTOUTPUTNONCE",
        "OP_0",
        "OP_EQUALVERIFY",
      ]
    }
  ]
}
```

## TypeScript Specification


```typescript

interface Artifact {
  contractName: string;
  constructorInputs: Parameter[];
  functions: Function[];
}

interface Parameter {
  name: string;
  type: PrimitiveType;
}

interface Function {
  name: string;
  functionInputs: Parameter[];
  require: Requirement[];
  asm: string[];
}

interface Requirement {
  type: RequirementType;
  expected: RequiredInput | RequiredOutput | number | string | undefined;
  atIndex?: number; // for input* or output* requirements only
}

enum RequirementType {
  // Timelocks
  After = 'after', // CHECKLOCKTIMEVERIFY
  Older = 'older', // CHECKSEQUENCEVERIFY
  // Input
  Input = 'input',
  Output = 'output',
  // Inputs: granular fields
  InputValue = 'inputvalue',
  InputScript = 'inputscript',
  InputAsset = 'inputasset',
  InputHash = 'inputhash',
  InputIndex = 'inputindex',
  // Outputs: granular fields
  OutputValue = 'outputvalue',
  OutputScript = 'outputscript',
  OutputAsset = 'outputasset',
  OutputNonce = 'outputnonce',
}

interface ScriptPubKey {
  version: -1 | 0 | 1;
  program: string;
}

interface RequiredInput {
  hash: string;
  index: number;
  script: ScriptPubKey;
  value: number;
  asset: string;
}

interface RequiredOutput {
  script: ScriptPubKey;
  value: string;
  asset: string;
  nonce: string;
}
```

