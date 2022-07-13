import * as QuerySchema from "./w3";
import { sha512 } from "sha.js"
import { Tzip16Module } from "@taquito/tzip16"
import { char2Bytes as taquitoChar2Bytes } from "@taquito/utils"
import { TezosToolkit  } from "@taquito/taquito"
import { TaquitoTezosDomainsClient } from "@tezos-domains/taquito-client"
import { TezosClient, TezosDomainConfig } from "../common/types";

export interface QueryConfig extends TezosDomainConfig, Record<string, unknown> { }

export class Query extends QuerySchema.Module<QueryConfig> {
  private static defaultNetwork: QuerySchema.NetworkString = "mainnet";
  private _connections: Record<QuerySchema.NetworkString, string> = {
    mainnet: 'https://rpc.tzstats.com',
    ghostnet: 'https://rpc.ghost.tzstats.com',
  }

  constructor(config: QueryConfig) {
    super(config);
    Query.defaultNetwork = config.defaultNetwork;
  }
  
  public async getAcquisitionInfo(
    input: QuerySchema.Input_getAcquisitionInfo
  ): Promise<QuerySchema.AcquisitionInfo> {
    let duration = 365;
    const domainsClient = await this.getTezosDomainsClient(input.network)
    const info = await domainsClient.manager.getAcquisitionInfo(input.domain)
    const acquisitionInfo = <QuerySchema.AcquisitionInfo>{
      state: info.acquisitionState
    }
    if (input.duration) {
      duration = input.duration
    }
    if (info.acquisitionState === 'CanBeBought') {
      acquisitionInfo.cost = info.calculatePrice(duration)
      acquisitionInfo.duration = duration
    }
    return acquisitionInfo
  }

  public bytesToHex(
    input: QuerySchema.Input_bytesToHex
  ): string {
    return new sha512().update(this.textToArray(input.bytes)).digest('hex');
  }

  public char2Bytes(
    input: QuerySchema.Input_char2Bytes
  ): string {
    return taquitoChar2Bytes(input.text);
  }

  // Utils
  private async getTezosDomainsClient(network: QuerySchema.Network | undefined | null): Promise<TaquitoTezosDomainsClient> {
    let tezosNetworkClient = Query.defaultNetwork;
    if (network) {
      tezosNetworkClient = <QuerySchema.NetworkString>network;
    }
    const { tezos, network: selectedNetwork} = await this.getTezosClient(tezosNetworkClient)
    tezos.addExtension(new Tzip16Module())
    return new TaquitoTezosDomainsClient({ tezos, network: selectedNetwork })
  }

  private async getTezosClient(network: QuerySchema.NetworkString): Promise<TezosClient> { 
    return {
      tezos: new TezosToolkit(this._connections[network]),
      network: network,
    }
  }

  private textToArray(text: string): Uint8Array {
    return new Uint8Array(text.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || [])
  }
}
