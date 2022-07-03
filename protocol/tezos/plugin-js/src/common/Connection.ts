import { getProvider } from "./Networks";
import { Connection as SchemaConnection } from "../query/w3";

import {
  ContractAbstraction,
  ContractProvider,
  PollingSubscribeProvider,
  TezosToolkit,
} from "@taquito/taquito";
import { InMemorySigner } from "@taquito/signer";
import { Tzip16Module } from "@taquito/tzip16"
import { TezosPluginConfigs } from "..";

export type Address = string;
export type AccountIndex = number;
export type TezosProvider = string;
export type TezosClient = TezosToolkit;

export {
  InMemorySigner
}

export interface ConnectionConfig {
  provider: TezosProvider;
  signer?: InMemorySigner;
  confirmationConfig?: ConfirmationConfig;
}

export interface ConnectionConfigs {
  [network: string]: ConnectionConfig;
}

export interface Connections {
  [network: string]: Connection;
}

export interface ConfirmationConfig {
  confirmationPollingTimeoutSecond?: number;
  defaultConfirmationCount?: number;
  pollingIntervalMilliseconds?: number;
}

export class Connection {
  private _client: TezosClient;

  constructor(private _config: ConnectionConfig) {
    const { provider, signer, confirmationConfig } = _config;
    this.setProvider(provider, signer, confirmationConfig);
  }

  static fromConfigs(configs: ConnectionConfigs): Connections {
    const connections: Connections = {};
    for (const network of Object.keys(configs)) {
      // Create the connection
      const connection = new Connection(configs[network]);
      const networkStr = network.toLowerCase();
      connections[networkStr] = connection;
    }
    return connections;
  }

  static fromNetwork(network: string): Connection {
    network = network.toLowerCase();
    const provider = getProvider(network);
    if (!provider) {
      throw Error("Provider not available");
    }
    return new Connection({
      provider,
    });
  }

  static fromNode(node: string): Connection {
    return new Connection({
      provider: node,
    });
  }

  public setProvider(provider: TezosProvider, signer?: InMemorySigner, confirmationConfig?: ConfirmationConfig): void {
    this._client = new TezosToolkit(provider);
    this._client.addExtension(new Tzip16Module());
    this._client.setProvider({
      signer,
      config: {
        defaultConfirmationCount: confirmationConfig?.defaultConfirmationCount,
        confirmationPollingTimeoutSecond: confirmationConfig?.confirmationPollingTimeoutSecond
      },
    });
    this._client.setStreamProvider(this._client.getFactory(PollingSubscribeProvider)({
      pollingIntervalMilliseconds: confirmationConfig?.confirmationPollingTimeoutSecond
    }));
  }

  public getProvider(): TezosClient {
    return this._client;
  }

  public setSigner(signer: InMemorySigner): void {
    if (!this._client) {
      throw Error(`Please call "setProvider(...)" before calling setSigner`);
    }
    this._config.signer = signer;
    this._client.setProvider({
      signer,
    });
  }

  public getSigner(): InMemorySigner {
    const { signer } = this._config;
    if (!signer) {
      throw Error("Provider does not have a signer");
    }
    return signer;
  }

  public async getContract(
    address: Address
  ): Promise<ContractAbstraction<ContractProvider>> {
    return this._client.contract.at(address);
  }

  toJSON() {
    return `class Connection {}`;
  }
}

export async function getConnection(
  connections: Connections,
  defaultNetwork: string,
  connection?: SchemaConnection | null
): Promise<Connection> {
  if (!connection) {
    return connections[defaultNetwork];
  }
  const { networkNameOrChainId, provider } = connection;
  let result: Connection= connections[defaultNetwork];
  // If a custom network is provided, either get an already
  // established connection, or a create a new one
  if (networkNameOrChainId) {
    const networkStr = networkNameOrChainId.toLowerCase();
    if (connections[networkStr]) {
      result = connections[networkStr];
    } else {
      try {
        result = Connection.fromNetwork(networkStr);
      } catch (error) {
        // ignore if network is not supported by core
      }
    }
  } 
  // If a custom node endpoint is provided, create a combined
  // connection with the node's endpoint and a connection's signer
  // (if one exists for the network)
  else if (provider) {
    const nodeConnection = Connection.fromNode(provider);
    result = nodeConnection;
  }
  return result;
}

export const getConnections = (config: TezosPluginConfigs) => {
  let defaultNetwork;
  const connections = Connection.fromConfigs(config.networks);
  // Assign the default network (mainnet if not provided)
  if (config.defaultNetwork) {
    defaultNetwork = config.defaultNetwork;
  } else {
    defaultNetwork = "mainnet";
  }
  // Create a connection for the default network if none exists
  if (!connections[defaultNetwork]) {
    connections[defaultNetwork] = Connection.fromNetwork(
      defaultNetwork
    );
  }
  return {
    connections,
    defaultNetwork
  }
}

