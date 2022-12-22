import { crypto } from "liquidjs-lib";
import { ElectrumWS } from "./ws";

export interface ChainSource {
    subscribeScriptStatus(script: Buffer, callback: (scripthash: string, status: string | null) => void): Promise<void>;
    unsubscribeScriptStatus(script: Buffer): Promise<void>;
    fetchHistories(scripts: Buffer[]): Promise<GetHistoryResponse[]>;
    fetchTransactions(txids: string[]): Promise<{ txID: string; hex: string }[]>;
    fetchUnspentOutputs(scripts: Buffer[]): Promise<ListUnspentResponse[]>;
}

export type GetHistoryResponse = Array<{
    tx_hash: string;
    height: number;
}>

export type ListUnspentResponse = Array<{
    tx_hash: string;
    tx_pos: number;
    height: number; // if 0 = unconfirmed
}>

const BroadcastMethod = 'blockchain.transaction.broadcast'
const GetHistoryMethod = 'blockchain.scripthash.get_history'
const GetTransactionMethod = 'blockchain.transaction.get' // returns hex string
const ListUnspentMethod = 'blockchain.scripthash.listunspent' // returns array of Outpoint
const SubscribeStatusMethod = 'blockchain.scripthash' // ElectrumWS automatically adds '.subscribe'

export class WsElectrumChainSource implements ChainSource {
    static ElectrumBlockstreamLiquid = "wss://blockstream.info/liquid/electrum-websocket/api";
    static ElectrumBlockstreamTestnet = "wss://blockstream.info/liquidtestnet/electrum-websocket/api";
    static NigiriRegtest = "ws://localhost:1234"

    constructor(private ws: ElectrumWS) { }

    async fetchUnspentOutputs(scripts: Buffer[]): Promise<ListUnspentResponse[]> {
        const scriptsHashes = scripts.map(toScriptHash);
        return this.ws.batchRequest<ListUnspentResponse[]>(...scriptsHashes.map(s => ({ method: ListUnspentMethod, params: [s] })));
    }

    async fetchTransactions(txids: string[]): Promise<{ txID: string; hex: string }[]> {
        const responses = await this.ws.batchRequest<string[]>(...txids.map(txid => ({ method: GetTransactionMethod, params: [txid] })));
        return responses.map((hex, i) => ({ txID: txids[i], hex }));
    }

    async unsubscribeScriptStatus(script: Buffer): Promise<void> {
        this.ws.unsubscribe(SubscribeStatusMethod, toScriptHash(script)).catch();
    }

    static fromNetwork(network: string): WsElectrumChainSource {
        return new WsElectrumChainSource(
            new ElectrumWS(
                network === 'liquid' ? WsElectrumChainSource.ElectrumBlockstreamLiquid :
                    network === 'testnet' ? WsElectrumChainSource.ElectrumBlockstreamTestnet
                        : WsElectrumChainSource.NigiriRegtest
            )
        );
    }

    async subscribeScriptStatus(script: Buffer, callback: (scripthash: string, status: string | null) => void) {
        const scriptHash = toScriptHash(script);
        await this.ws.subscribe(SubscribeStatusMethod, callback, scriptHash);
    }

    async fetchHistories(scripts: Buffer[]): Promise<GetHistoryResponse[]> {
        const scriptsHashes = scripts.map(toScriptHash);
        const responses = await this.ws.batchRequest<GetHistoryResponse[]>(...scriptsHashes.map(s => ({ method: GetHistoryMethod, params: [s] })));
        return responses;
    }

    async broadcast(tx: string): Promise<string> {
        return this.ws.request(BroadcastMethod, [tx]);
    }
}

function toScriptHash(script: Buffer): string {
    return crypto.sha256(script).reverse().toString('hex');
}