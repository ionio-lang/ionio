import { Contract } from '../../src';
import * as ecc from 'tiny-secp256k1';
import { network } from '../fixtures/vars';

describe('CheckSigFromStack', () => {
  let contract: Contract;

  beforeAll(async () => {
    // eslint-disable-next-line global-require
    const artifact = require('../fixtures/checksigfromstack.json');
    contract = new Contract(
      artifact, 
      [
        Buffer.from("68656c6c6f", "hex"),
        Buffer.from("f09f8c8e", "hex"), 
        Buffer.from("25d1dff95105f5253c4022f628a996ad3a0d95fbf21d468a1b33f8c160d8f517", "hex")
      ], 
      network, 
      ecc
    );

  
    //const response = await faucetComplex(contract.address, 0.0001);
    //prevout = response.prevout;
    //utxo = response.utxo;
  });

  describe('csfs', () => {
    it('should get the address', async () => {
    console.log(contract.address);
    });
  });

});
