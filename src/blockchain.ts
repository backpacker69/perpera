
import { Buffer } from 'buffer';
import * as _ from 'lodash';

import * as bitcore from 'bitcore-lib';
export import Address = bitcore.Address;
export import NetworkData = bitcore.Networks.Network;
export import Transaction = bitcore.Transaction;
export import HashFn = bitcore.crypto.Hash;
export import UnspentOutput = bitcore.Transaction.UnspentOutput;

export enum Coin {
  Btc = 'bitcoin',
  Ppc = 'peercoin'
}

export class Network {
  constructor(
    public readonly coin: Coin,
    public readonly data: NetworkData,
    public readonly testnet?: boolean
  ) {}

  pkhAddress(pubkeyHash: Buffer): string {
    const address = new Address(pubkeyHash, this.data, 'pubkeyhash');
    return address.toString();
  }

  transaction(serialized?: Buffer): Transaction {
    return new Transaction(serialized);
  }

  static find(data: NetworkData): Network|null {
    return _.find(net => matchNetwork(data, net.data)) || null;
  }
}

export let networks: {[name: string]: Network} = {
  'bitcoin': new Network(Coin.Btc, bitcore.Networks.mainnet),
  'bitcoin-testnet': new Network(Coin.Btc, bitcore.Networks.testnet, true)
};

function matchNetwork(d1: any, d2: any): boolean {
  return d1 == d2 ||
    d1.pubkeyhash == d2.pubkeyhash &&
    d1.privatekey == d2.privatekey &&
    d1.scripthash == d2.scripthash &&
    d1.xpubkey == d2.xpubkey &&
    d1.xprivkey == d2.xprivkey;
}

//

class PpcTransaction extends Transaction {
  toBufferWriter(writer) {
    let t: any = this;

    writer.writeUInt32LE(t.version);
    writer.writeUInt32LE(t.timestamp || new Date().getTime()/1000);

    writer.writeVarintNum(t.inputs.length);
    for (let input of t.inputs) {
      input.toBufferWriter(writer);
    }

    writer.writeVarintNum(t.outputs.length);
    for (let output of t.outputs) {
      output.toBufferWriter(writer);
    }

    writer.writeUInt32LE(t.nLockTime);

    return writer;
  }

  fromBufferReader(reader) {
    if (reader.finished())
      throw new Error('No transaction data received');

    let t: any = this;

    t.version   = reader.readUInt32LE();
    t.timestamp = reader.readUInt32LE();

    const sizeTxIns = reader.readVarintNum();
    const Input: any = bitcore.Transaction.Input;
    for (let i = 0; i < sizeTxIns; i++) {
      t.inputs.push(Input.fromBufferReader(reader));
    }

    const sizeTxOuts = reader.readVarintNum();
    const Output: any = bitcore.Transaction.Output;
    for (let i = 0; i < sizeTxOuts; i++) {
      t.outputs.push(Output.fromBufferReader(reader));
    }

    t.nLockTime = reader.readUInt32LE();

    return this;
  }
}

class PpcNetwork extends Network {
  transaction(serialized?: Buffer): Transaction {
    return new PpcTransaction(serialized);
  }
}

networks['peercoin'] = new Network(Coin.Ppc, bitcore.Networks.add({
  name: 'peercoin',
  alias: 'ppcoin',
  pubkeyhash: 0x37,
  privatekey: 0xb7,
  scripthash: 0x75,
  xpubkey: 0x0488b21e,
  xprivkey: 0x0488ade4,
}));

networks['peercoin-testnet'] = new Network(Coin.Ppc, bitcore.Networks.add({
  name: 'peercoin-testnet',
  alias: 'ppcoin-test',
  pubkeyhash: 0x6f,
  privatekey: 0xef,
  scripthash: 0xc4,
  xpubkey: 0x043587cf,
  xprivkey: 0x04358394,
}), true);

