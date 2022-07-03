import { 
  Tezos_Connection,
  Tezos_Query,
  Tezos_TransferParams
} from "../query/w3";
import { getString } from "./utils";

import { JSON } from "@web3api/wasm-as";

export function isFA2(parsedToken: JSON.Value): boolean {
  if (parsedToken.isObj) {
    const parsedObjToken = <JSON.Obj>parsedToken;
    if (parsedObjToken.has("token_id") && parsedObjToken.has("token_address")) {
      return true;
    }
  }
  return false;
}

export function generateFA2UpdateOperationArg(operation: string, owner: string, operator: string, tokenId: u32): string {
  return '[[{ "'+  operation +'": {"owner": "'+ owner +'","operator":"'+ operator +'", "token_id":'+ tokenId.toString() +' }}]]';
}

export class FA2 {
  tokenId: u32;
  address: string;

  constructor(contractTokenId: u32, contractAddress: string) {
    this.tokenId =  contractTokenId;
    this.address =  contractAddress;
  }
  
  static parse(token: JSON.Value): FA2 {
    if (!isFA2(token)) {
      throw new Error(`value '${token.stringify()}' is not a valid FA2 Token`);
    }
    const parsedToken = (<JSON.Obj>token);
    const tokenId: u32 = <u32>parseInt(getString(parsedToken, "token_id"));
    const tokenAddress = getString(parsedToken, "token_address");
    return new FA2(tokenId, tokenAddress);
  }

  generateAddOperation(connection: Tezos_Connection, owner: string, operator: string): Tezos_TransferParams {
    return Tezos_Query.getContractCallTransferParams({
      address: this.address,
      method: "update_operators",
      args: generateFA2UpdateOperationArg('add_operator', owner, operator, this.tokenId),
      params: null,
      connection: connection
    }).unwrap();
  }

  generateRemoveOperation(connection: Tezos_Connection, owner: string, operator: string): Tezos_TransferParams {
    return Tezos_Query.getContractCallTransferParams({
      address: this.address,
      method: "update_operators",
      args: generateFA2UpdateOperationArg('remove_operator', owner, operator, this.tokenId),
      params: null,
      connection: connection
    }).unwrap();
  }
}