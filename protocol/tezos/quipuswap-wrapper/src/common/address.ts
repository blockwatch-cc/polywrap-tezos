import { Network, Tezos_Connection } from "../query/w3";
export class Address {
  connection: Tezos_Connection;
  contractAddress: string;

  constructor(conn: Tezos_Connection, contractAddress: string) {
    this.connection = conn;
    this.contractAddress = contractAddress;
  }

  static getAddress(network: Network): Address {
    let contractAddress: string;
    let connection: Tezos_Connection;

    switch (network) {
      case Network.ghostnet: 
        contractAddress = "KT1PnmpVWmA5CBUsA5ZAx1HoDW67mPYurAL5";
        connection = <Tezos_Connection> {
          provider: "https://rpc.ghost.tzstats.com",
          networkNameOrChainId: "ghostnet"  
        }
        break;
      case Network.mainnet: 
        contractAddress = "KT1VNEzpf631BLsdPJjt2ZhgUitR392x6cSi";
        connection = <Tezos_Connection> {
          provider: "https://rpc.tzstats.com",
          networkNameOrChainId: "mainnet"
        };
        break;
      default:
        throw new Error(`network ${network.toString()} is not supported`);
    }
    return new Address(connection, contractAddress);
  }
}