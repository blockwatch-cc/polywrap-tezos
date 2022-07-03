import { OperationStatus } from "../query/w3";

import axios from "axios"

const IndexerConfig: Record<string, string> = {
    "mainnet": "https://api.tzstats.com",
    "ghostnet": "https://api.ghost.tzstats.com"
}

const indexerClient = axios.create({
    headers: {
        "Content-Type": "application/json"
    }
})

function isValidOperationHash(hash: string): boolean {
    return hash.length === 51 && hash.startsWith('o');
}

export async function getOperation(network: string, hash: string): Promise<OperationStatus> {
    if (!isValidOperationHash(hash)) {
        throw new Error(`invalid hash '${hash}'`)
    }
    if(!Object.keys(IndexerConfig).includes(network)) {
        throw new Error(`network "${network}" is not supported`);
    }
    const url = `${IndexerConfig[network]}/explorer/op/${hash}`;
    const response = await indexerClient.get(url);
    return <OperationStatus>response.data[0];
}
