import {
  Tezos_Connection,
  CustomConnection,
  Network
} from "../query/w3"

import { JSON } from "assemblyscript-json"; 

export class ConnectionDetails {
  connection: Tezos_Connection;
  contractAddress: string;
};

export function getString(object: JSON.Obj, key: string): string {
    let initValue = <JSON.Str>object.getString(key)
    let value = ""
    if (initValue != null) {
      value = initValue.valueOf()
    }
    return value
}

export function normalizeValue(input: f64): string {
    const scale = Math.pow(10, 6)
    const output = input / scale
    return output.toString()
}

export function getConnection(network: Network, providerAddress: string, custom: CustomConnection | null): ConnectionDetails {
  if (network == Network.custom && custom == null) {
    throw new Error(`custom network should have a valid connection and contract address.`)
  } 
  let connectionDetails: ConnectionDetails;
  switch (network) {
    case Network.mainnet: 
      connectionDetails = {
        connection: <Tezos_Connection> {
          provider: "https://rpc.tzstats.com",
          networkNameOrChainId: "mainnet"  
        },
        contractAddress: providerAddress,
      }
      break;
    case Network.ghostnet: 
      connectionDetails = {
        connection: <Tezos_Connection> {
          provider: "https://rpc.ghost.tzstats.com",
          networkNameOrChainId: "ghostnet"  
        },
        contractAddress: providerAddress,
      }
      break
    case Network.custom: 
      connectionDetails = {
        connection: custom!.connection,
        contractAddress: providerAddress,
      };
      break
    default:
      // NB: this shouldn't happen
      throw new Error("Network does not exist")
  }
  return connectionDetails;
}