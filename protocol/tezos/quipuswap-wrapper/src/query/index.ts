import {
  Tezos_Query,
  Input_listTokenPairs,
  Input_getTokenSupply,
  Input_getLPTokenBalance,
  Input_getTokenPair,
  GetTokenSupplyResponse
} from "./w3";
import { getString, getConnection, parseTokenType } from "../common/utils";

import { JSON } from "@web3api/wasm-as"; 
import { Address } from "../common";

export function getTokenPair(input: Input_getTokenPair): JSON.Obj {
  const connection = getConnection(input.network, input.custom);
  return getPair(input.pairId, connection);
}

export function listTokenPairs(input: Input_listTokenPairs): JSON.Arr {
  const connection = getConnection(input.network, input.custom);
  const pairsCount = Tezos_Query.getContractStorage({
    address: connection.contractAddress,
    connection: connection.connection,
    key: "storage",
    field: "pairs_count"
  }).unwrap();
  const tokenPairs = JSON.Value.Array();
  for (let i = 0; i < parseInt(pairsCount); i++) {
    const tokenPair = getPair(i.toString(), connection);
    tokenPairs.push(tokenPair);
  }
  return tokenPairs;
}

export function getTokenSupply(input: Input_getTokenSupply): GetTokenSupplyResponse{
  const connection = getConnection(input.network, input.custom);
  const storage = Tezos_Query.getContractStorage({
    address: connection.contractAddress,
    connection: connection.connection,
    key: "storage.pairs",
    field: input.pairId
  }).unwrap();
  const assetData = <JSON.Obj>JSON.parse(storage);
  return {
    token_a_pool: getString(assetData, "token_a_pool"),
    token_b_pool: getString(assetData, "token_b_pool"),
    total_supply: getString(assetData, "total_supply")
  };
}


export function getLPTokenBalance(input: Input_getLPTokenBalance): string {
  const connection = getConnection(input.network, input.custom);
  return Tezos_Query.getContractStorage({
    address: connection.contractAddress,
    connection: connection.connection,
    key: 'storage.ledger.["' + input.owner + '",' + input.pairId + '].balance',
    field: ""
  }).unwrap();
}

export function getPair(pairId: string, connection: Address): JSON.Obj {
  const token = Tezos_Query.getContractStorage({
    address: connection.contractAddress,
    connection: connection.connection,
    key: `storage.tokens`,
    field: pairId
  }).unwrap();
  if (token == "") {
    throw new Error(`invalid pair id "${pairId}"`);
  }
  const parsedToken = <JSON.Obj>JSON.parse(token);
  const parsedTokenA = parseTokenType(parsedToken, "token_a_type");
  const parsedTokenB = parseTokenType(parsedToken, "token_b_type");
  const tokenObj = JSON.Value.Object();
  tokenObj.set("pair_id", pairId);
  tokenObj.set("token_a", parsedTokenA);
  tokenObj.set("token_b", parsedTokenB);
  return tokenObj;
}