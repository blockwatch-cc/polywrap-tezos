import { getProvider } from "./Networks";

import {
  ContractAbstraction,
  ContractProvider,
  TezosToolkit,
} from "@taquito/taquito";
import { InMemorySigner } from "@taquito/signer";
import { Tzip16Module } from "@taquito/tzip16"

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
  confirmationPollingTimeoutSecond: number | undefined
  defaultConfirmationCount: number | undefined
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
    if (confirmationConfig) {
      this._client.setProvider({
        config: confirmationConfig
      })
    }
    if (signer) {
      this.setSigner(signer);
    }
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
}
