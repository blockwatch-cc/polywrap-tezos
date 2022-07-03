import { 
  getString,
  encodeToHex,
  decodeFromHex,
  getConnection
} from "../common";
import {
  Network,
  Tezos_Query,
  Input_resolveAddress,
  Input_resolveDomain,
  DomainInfo
} from "./w3";

import { JSON } from "@web3api/wasm-as"; 

export function encodeCommitment(label: string, owner: string, nonce: i32): string {
  const commitValue = JSON.Value.Object(); 
  commitValue.set("label", <JSON.Str>JSON.from(label));
  commitValue.set("owner", <JSON.Str>JSON.from(owner));
  commitValue.set("nonce", <JSON.Integer>JSON.from<i32>(nonce));
  const bytes = Tezos_Query.encodeMichelsonExpressionToBytes({
    expression: `{"prim":"pair","args":[{"prim":"pair","args":[{"annots":["%label"],"prim":"bytes"},{"annots":["%owner"],"prim":"address"}]},{"annots":["%nonce"],"prim":"nat"}]}`,
    value: commitValue.stringify(),
  }).unwrap();
  return bytes;
}

export function resolveAddress(input: Input_resolveAddress): DomainInfo | null {
  if (input.network == Network.custom && input.custom === null) {
    throw new Error(`custom network should have a valid connection and contract address`);
  }
  const address = getConnection(input.network, "NameRegistry", input.custom);
  const record = Tezos_Query.executeTzip16View({
    address: address.contractAddress,
    connection: address.connection, 
    viewName: "resolve-address",
    args: '["' + input.address + '"]'
  }).unwrap();
  if (record.length === 0) {
    return null;
  }
  const domainInfo = <JSON.Obj>JSON.parse(record);
  return {
    Name: decodeFromHex(getString(domainInfo, "name")),
    Address: getString(domainInfo, "address"),
    Data: getString(domainInfo, "data"),
    Expiry: getString(domainInfo, "expiry")
  };
} 

export function resolveDomain(input: Input_resolveDomain): DomainInfo | null {
  if (input.network == Network.custom && input.custom === null) {
    throw new Error(`custom network should have a valid connection and contract address`);
  }
  const address = getConnection(input.network, "NameRegistry", input.custom);
  const domain = encodeToHex(input.domain);
  const record = Tezos_Query.executeTzip16View({
    address: address.contractAddress,
    connection: address.connection, 
    viewName: "resolve-name",
    args: '["' + domain + '"]'
  }).unwrap();
  if (record.length === 0) {
    return null
  }
  const domainInfo = <JSON.Obj>JSON.parse(record);
  return {
    Name: input.domain,
    Address: getString(domainInfo, "address"),
    Data: getString(domainInfo, "data"),
    Expiry: getString(domainInfo, "expiry")
  };
}