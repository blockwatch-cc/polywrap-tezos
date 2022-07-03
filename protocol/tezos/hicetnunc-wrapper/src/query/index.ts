import {
  Network,
  Tezos_Query,
  Tezos_Connection,
  Input_getBalanceOf,
  Input_getTokenMetadata,
  Input_getTokenCountData,
  Input_getSwapData,
  CustomConnection,
  TokenBalance,
  TokenMetadata,
  SwapData
} from "./w3";
import { getString } from "../utils/common"

import { JSON } from "assemblyscript-json"; 

class ConnectionDetails {
  connection: Tezos_Connection;
  contractAddress: string;
}

export function getBalanceOf(input: Input_getBalanceOf): TokenBalance {
  if (input.network == Network.custom && input.custom === null) {
    throw new Error(`custom network should have a valid connection and contract address`);
  }
  const connectionDetails = getConnectionDetails(input.network, input.custom, false);
  const balance = Tezos_Query.getContractStorage({
    address: connectionDetails.contractAddress,
    connection: connectionDetails.connection,
    key: "ledger",
    field: '["' + input.owner + '",' + input.tokenId + ']',
  }).unwrap();
  return {
      owner: input.owner,
      tokenId: input.tokenId,
      balance: balance
  };
} 

export function getTokenMetadata(input: Input_getTokenMetadata): TokenMetadata {
  const connectionDetails = getConnectionDetails(input.network, input.custom, false);
  const storage = Tezos_Query.getContractStorage({
    address: connectionDetails.contractAddress,
    connection: connectionDetails.connection,
    key: "token_metadata",
    field: input.tokenId
  }).unwrap();
  const metadata = <JSON.Obj>JSON.parse(storage);
  const hash = <JSON.Obj>JSON.parse(getString(metadata, "token_info"));
  return {
      tokenId: getString(metadata, "token_id"),
      ipfsHash: getString(hash, "")
  };
}

export function getTokenCountData(input: Input_getTokenCountData): string {
  const connectionDetails = getConnectionDetails(input.network, input.custom, false);
  return Tezos_Query.getContractStorage({
    address: connectionDetails.contractAddress,
    connection: connectionDetails.connection,
    key: "all_tokens",
    field: ""
  }).unwrap();
}

export function getSwapData(input: Input_getSwapData): SwapData {
  const connectionDetails = getConnectionDetails(input.network, input.custom, true);
  const storage = Tezos_Query.getContractStorage({
    address: connectionDetails.contractAddress,
    connection: connectionDetails.connection,
    key: "swaps",
    field: input.swapId
  }).unwrap();
  const swap = <JSON.Obj>JSON.parse(storage);
  return {
    creator: getString(swap, "creator"),
    issuer: getString(swap, "issuer"),
    objktAmount: getString(swap, "objkt_amount"),
    objktId: getString(swap, "objkt_id"),
    royalties: getString(swap, "royalties"),
  };
}

function getConnectionDetails(network: Network, custom: CustomConnection | null, isMarketPlace: boolean): ConnectionDetails {
  if (network == Network.custom && custom === null) {
    throw new Error(`custom network should have a valid connection and oracle contract address `)
  }
  let address: string = "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton";
  if(isMarketPlace) {
    address = "KT1HbQepzV1nVGg8QVznG7z4RcHseD5kwqBn"
  }
  let connection: Tezos_Connection = {
    provider: "https://rpc.tzstats.com",
    networkNameOrChainId: "mainnet"
  };
  if (network == Network.custom) {
    connection = custom!.connection;
    address = custom!.contractAddress;
  }
  return {
    connection: connection,
    contractAddress: address,
  }
}