"use strict";(self.webpackChunkionio_website=self.webpackChunkionio_website||[]).push([[80],{3905:function(t,e,n){n.d(e,{Zo:function(){return p},kt:function(){return m}});var a=n(7294);function r(t,e,n){return e in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}function o(t,e){var n=Object.keys(t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(t);e&&(a=a.filter((function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable}))),n.push.apply(n,a)}return n}function i(t){for(var e=1;e<arguments.length;e++){var n=null!=arguments[e]?arguments[e]:{};e%2?o(Object(n),!0).forEach((function(e){r(t,e,n[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(n)):o(Object(n)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(n,e))}))}return t}function c(t,e){if(null==t)return{};var n,a,r=function(t,e){if(null==t)return{};var n,a,r={},o=Object.keys(t);for(a=0;a<o.length;a++)n=o[a],e.indexOf(n)>=0||(r[n]=t[n]);return r}(t,e);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(t);for(a=0;a<o.length;a++)n=o[a],e.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(t,n)&&(r[n]=t[n])}return r}var s=a.createContext({}),l=function(t){var e=a.useContext(s),n=e;return t&&(n="function"==typeof t?t(e):i(i({},e),t)),n},p=function(t){var e=l(t.components);return a.createElement(s.Provider,{value:e},t.children)},u={inlineCode:"code",wrapper:function(t){var e=t.children;return a.createElement(a.Fragment,{},e)}},d=a.forwardRef((function(t,e){var n=t.components,r=t.mdxType,o=t.originalType,s=t.parentName,p=c(t,["components","mdxType","originalType","parentName"]),d=l(n),m=r,f=d["".concat(s,".").concat(m)]||d[m]||u[m]||o;return n?a.createElement(f,i(i({ref:e},p),{},{components:n})):a.createElement(f,i({ref:e},p))}));function m(t,e){var n=arguments,r=e&&e.mdxType;if("string"==typeof t||r){var o=n.length,i=new Array(o);i[0]=d;var c={};for(var s in e)hasOwnProperty.call(e,s)&&(c[s]=e[s]);c.originalType=t,c.mdxType="string"==typeof t?t:r,i[1]=c;for(var l=2;l<o;l++)i[l]=n[l];return a.createElement.apply(null,i)}return a.createElement.apply(null,n)}d.displayName="MDXCreateElement"},4295:function(t,e,n){n.r(e),n.d(e,{frontMatter:function(){return c},contentTitle:function(){return s},metadata:function(){return l},toc:function(){return p},default:function(){return d}});var a=n(7462),r=n(3366),o=(n(7294),n(3905)),i=["components"],c={title:"Contract Instantiation"},s=void 0,l={unversionedId:"SDK/instantiation",id:"SDK/instantiation",title:"Contract Instantiation",description:"Before interacting with smart contracts on the Elements network, the Ionio SDK needs to instantiate a Contract object. This is done by providing the contract's information and constructor arguments. After this instantiation, the Ionio SDK can interact with Elements contracts.",source:"@site/docs/SDK/instantiation.md",sourceDirName:"SDK",slug:"/SDK/instantiation",permalink:"/docs/SDK/instantiation",editUrl:"https://github.com/ionio-lang/ionio/tree/main/website/docs/SDK/instantiation.md",tags:[],version:"current",frontMatter:{title:"Contract Instantiation"},sidebar:"docsSidebar",previous:{title:"Ionio Language",permalink:"/docs/Language/Intro"},next:{title:"Spending Contracts",permalink:"/docs/SDK/transactions"}},p=[{value:"Contract class",id:"contract-class",children:[{value:"Constructor",id:"constructor",children:[{value:"Example",id:"example",children:[],level:4}],level:3},{value:"address",id:"address",children:[{value:"Example",id:"example-1",children:[],level:4}],level:3},{value:"bytesize",id:"bytesize",children:[{value:"Example",id:"example-2",children:[],level:4}],level:3},{value:"Contract functions",id:"contract-functions",children:[{value:"Example",id:"example-3",children:[],level:4}],level:3}],level:2}],u={toc:p};function d(t){var e=t.components,n=(0,r.Z)(t,i);return(0,o.kt)("wrapper",(0,a.Z)({},u,n,{components:e,mdxType:"MDXLayout"}),(0,o.kt)("p",null,"Before interacting with smart contracts on the Elements network, the Ionio SDK needs to instantiate a ",(0,o.kt)("inlineCode",{parentName:"p"},"Contract")," object. This is done by providing the contract's information and constructor arguments. After this instantiation, the Ionio SDK can interact with Elements contracts."),(0,o.kt)("h2",{id:"contract-class"},"Contract class"),(0,o.kt)("p",null,"The ",(0,o.kt)("inlineCode",{parentName:"p"},"Contract")," class is used to represent a Ionio contract in a JavaScript object. These objects can be used to retrieve information such as the contract's address and balance. They can be used to interact with the contract by calling the contract's functions."),(0,o.kt)("h3",{id:"constructor"},"Constructor"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-ts"},"new Contract(\n  artifact: Artifact,\n  constructorInputs: Argument[]\n  network: Network\n  eccLib: TinySecp256k1Interface\n)\n")),(0,o.kt)("p",null,"A Ionio contract can be instantiated by providing an ",(0,o.kt)("inlineCode",{parentName:"p"},"Artifact")," object, the list of hardcoded arguments ",(0,o.kt)("inlineCode",{parentName:"p"},"Argument[]"),", a ",(0,o.kt)("inlineCode",{parentName:"p"},"Network"),", a ",(0,o.kt)("inlineCode",{parentName:"p"},"TinySecp256k1Interface")," and a ",(0,o.kt)("inlineCode",{parentName:"p"},"ZKPInterface")),(0,o.kt)("p",null,"An ",(0,o.kt)("inlineCode",{parentName:"p"},"Artifact")," object is the result of compiling a Ionio contract with Ionio compiler. Compilation ",(0,o.kt)("del",{parentName:"p"},"can")," will be done using the standalone ",(0,o.kt)("inlineCode",{parentName:"p"},"ionioc")," CLI or programmatically with the ",(0,o.kt)("inlineCode",{parentName:"p"},"ionioc")," NPM package."),(0,o.kt)("h4",{id:"example"},"Example"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-ts"},'import { Contract, networks } from \'@ionio-lang/ionio\';\nimport * as ecc from \'tiny-secp256k1\';\nimport secp256k1 from \'@vulpemventures/secp256k1-zkp\';\n\nconst zkp = await secp256k1();\n\nconst artifact = {\n  "contractName": "Calculator",\n  "constructorInputs": [\n    {\n      "name": "sum",\n      "type": "number"\n    }\n  ],\n  "functions": [\n    {\n      "name": "sumMustBeThree",\n      "functionInputs": [\n        {\n          "name": "a",\n          "type": "number"\n        },\n        {\n          "name": "b",\n          "type": "number"\n        }\n      ],\n      "require": [],\n      "asm": [\n        "OP_ADD",\n        "$sum",\n        "OP_EQUAL"\n      ]\n    }\n  ]\n};\n\n\nconst contract = new Contract(artifact, [3], networks.regtest, { ecc, zkp });\n')),(0,o.kt)("h3",{id:"address"},"address"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-ts"},"contract.address: string\n")),(0,o.kt)("p",null,"A contract's address can be retrieved through the ",(0,o.kt)("inlineCode",{parentName:"p"},"address")," member field."),(0,o.kt)("h4",{id:"example-1"},"Example"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-ts"},"console.log(contract.address)\n")),(0,o.kt)("h3",{id:"bytesize"},"bytesize"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-ts"},"contract.bytesize: number\n")),(0,o.kt)("p",null,"The size of the contract's in bytes can be retrieved through the ",(0,o.kt)("inlineCode",{parentName:"p"},"bytesize")," member field. This is useful to ensure that the contract is not too big, since Elements smart contracts can be 520 bytes at most."),(0,o.kt)("h4",{id:"example-2"},"Example"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-ts"},"console.log(contract.bytesize)\n")),(0,o.kt)("h3",{id:"contract-functions"},"Contract functions"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-ts"},"contract.functions.<functionName>(...args: Argument[]): Transaction\n")),(0,o.kt)("p",null,"The main way to use smart contracts once they have been instantiated is through the functions defined in the Ionio ",(0,o.kt)("del",{parentName:"p"},"source code")," artifact. These functions can be found by their name under ",(0,o.kt)("inlineCode",{parentName:"p"},"functions")," member field of a contract object. To call these functions, the parameters need to match the ones defined in the Ionio artifact."),(0,o.kt)("p",null,"These contract functions return an incomplete ",(0,o.kt)("inlineCode",{parentName:"p"},"Transaction")," object, which needs to be completed by providing outputs to the transaction. More information about sending transactions is found on the ",(0,o.kt)("a",{parentName:"p",href:"/docs/sdk/transactions"},(0,o.kt)("em",{parentName:"a"},"Spending Contracts"))," page."),(0,o.kt)("h4",{id:"example-3"},"Example"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-ts"},"import * as ecc from 'tiny-secp256k1';\nimport secp256k1 from '@vulpemventures/secp256k1-zkp';\nimport { Contract, networks } from '@ionio-lang/ionio';\nimport { artifact, myself, to, amount, fundingUtxo, prevout, broadcast } from './somewhere';\nconst zkp = await secp256k1();\n\nconst feeAmount = 100;\n\nconst contract = new Contract(artifact, [3], networks.regtest, { ecc, zkp });\n\n// attach to the funded contract using the utxo\nconst instance = contract.from(\n  fundingUtxo.txid,\n  fundingUtxo.vout,\n  fundingUtxo.prevout\n);\n\nconst tx = instance.functions\n  .sumMustBeThree(1, 2)\n  .withRecipient(to, amount, networks.regtest)\n  .withRecipient(\n    myself,\n    utxo.value - amount - feeAmount,\n    network.assetHash\n  )\n  .withFeeOutput(feeAmount);\n\n\n// Finalize the transaction, checking for all requirements to be satisfied.\n// In this case we do not need a signature to unlock the funds\n// In case of signature needed, unlock accepts an optional parameter of Signer interface\nconst signedTx = await tx.unlock();\n\n// extract and broadcast\nconst extractedTx = signedTx.psbt.extractTransaction().toHex();\nconst txid = await broadcast(extractedTx);\n")))}d.isMDXComponent=!0}}]);