import { Address } from ".";
import { CustomConnection, Network, Tezos_Connection } from "../query/w3";

import { JSON } from "@web3api/wasm-as";

export function getString(object: JSON.Obj, key: string): string {
  let value = ""
  const initValue = <JSON.Str>object.getString(key);
  if (initValue != null) {
    value = initValue.valueOf();
  }
  return value;
}

export function parseTokenType(token: JSON.Obj, field: string): JSON.Obj {
  const parsedToken = <JSON.Obj>JSON.parse(getString(token, field));
  if (parsedToken.has('fa2')) {
    const fa2 = <JSON.Obj>JSON.parse(getString(parsedToken, "fa2"))
    parsedToken.set("fa2", fa2);
  }
  return parsedToken;
}

export function getConnection(network: Network, custom: CustomConnection | null): Address {
  if (network == Network.custom && custom == null) {
    throw new Error(`custom network should have a valid connection and contract address.`)
  }
  if (network == Network.custom) {
    return new Address(<Tezos_Connection>custom!.connection, custom!.contractAddress);
  }
  return Address.getAddress(network);
}