import { Network, Tezos_Connection } from "./wrap";
import { SupportedActions, DefaultAddresses } from "./default-address"

export class Address {
  connection: Tezos_Connection;
  contractAddress: string;

  constructor(conn: Tezos_Connection, contractAddress: string) {
    this.connection = conn;
    this.contractAddress = contractAddress;
  }

  static getAddress(network: Network, action: string): Address {
    let contractAddress: string;
    let connection: Tezos_Connection;
    if (!SupportedActions.includes(action)) {
      throw new Error(`action '${action}' is not supported`);
    }
    switch (network) {
      case Network.ghostnet:
        contractAddress = DefaultAddresses.get(`Ghostnet.${action}`)!;
        connection = <Tezos_Connection> {
          provider: "https://rpc.ghost.tzstats.com",
          networkNameOrChainId: "ghostnet"
        };
        break;
      case Network.mainnet: 
        contractAddress = DefaultAddresses.get(`Mainnet.${action}`)!;
        connection = <Tezos_Connection> {
          provider: "https://rpc.tzstats.com",
          networkNameOrChainId: "mainnet"
        };
        break;
      default:
        throw new Error(`Network '${network.toString()}' is not supported.`);
    }
    return new Address(connection, contractAddress);
  }
}