import { JSON, Nullable } from "@web3api/wasm-as"
import { Address } from ".";
import { CustomConnection, Network, Tezos_Connection } from "../query/w3";
import { TezosDomainsPlugin_Query, SendParams, Tezos_SendParams } from "../mutation/w3"

export function getString(object: JSON.Obj, key: string): string {
    let initValue = <JSON.Str>object.getString(key)
    let value = ""
    if (initValue != null) {
      value = initValue.valueOf()
    }
    return value
}

export function generateNonce(): number {
    return crypto.getRandomValues(new Uint8Array(1))[0];
}

export function encodeToHex(data: string): string {
  const array = Uint8Array.wrap(String.UTF8.encode(data));
  let hex = '';
  for (let i = 0; i < array.length; i++) {
      hex += array[i].toString(16);
  };
  return hex;
}

export function decodeFromHex(data: string): string {
  let array = new Uint8Array(data.length >>> 1);
  for (let i = 0; i < data.length >>> 1; ++i) {
    array.fill(i32(parseInt('0x' + data.substr(i * 2, 2), 16)), i, i + 1);
  }
  return String.UTF8.decode(array.buffer);
}

export function getConnection(network: Network, action: string, custom: CustomConnection | null): Address {
  let address: Address;
  if (network == Network.custom) {
    address = new Address(<Tezos_Connection>custom!.connection, custom!.contractAddress);
  } else {
    address = Address.getAddress(network, action);
  }
  return address;
}

export function parseDomainMetadata(value: JSON.Obj): JSON.Obj {
  const parsed: JSON.Obj = JSON.Value.Object();
  const parsedValues: JSON.Arr = JSON.Value.Array();
  for (let i = 0; i < value.keys.length; i++) {
    const key = value.keys[0];
    const keyValue = getString(value, key);
    if (keyValue !== "") {
      continue;
    }
    const val: JSON.Obj = JSON.Value.Object();
    const byteValue = TezosDomainsPlugin_Query.char2Bytes({
      text: getString(value, key)
    });
    val.set("key", key);
    val.set("value", byteValue);
    parsedValues.push(val);
  }
  parsed.set("isMichelsonMap", true);
  parsed.set("values", parsedValues);
  return parsed;
}

export function getSendParams(input: SendParams | null, address: string): Tezos_SendParams {
  const params: Tezos_SendParams = {
    to: address,
    amount: 0,
    source: "",
    fee: new Nullable<u32>(),
    gasLimit: new Nullable<u32>(),
    storageLimit: new Nullable<u32>(),
    mutez: new Nullable<boolean>()
  };
  if (!!input) {
    params.amount = input.amount.isNull ? 0 : input.amount.value;
    params.source = input.source ? input.source : "";
    params.fee = input.fee;
    params.gasLimit = input.gasLimit;
    params.storageLimit = input.storageLimit;
    params.mutez = input.mutez;
  };
  return params;
}