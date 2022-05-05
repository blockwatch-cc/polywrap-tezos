/* eslint-disable import/no-extraneous-dependencies */
import { query } from "./resolvers";
import { manifest, Query } from "./w3";
import * as Types from "./w3"
import { TezosClient } from "./types";

import {
  Client,
  Plugin,
  PluginPackageManifest,
  PluginFactory,
} from "@web3api/core-js";
import { sha512 } from "sha.js"
import { Tzip16Module } from "@taquito/tzip16"
import { char2Bytes } from "@taquito/utils"
import { TezosToolkit  } from "@taquito/taquito"
import { TaquitoTezosDomainsClient } from "@tezos-domains/taquito-client"

export type TezosDomainPluginConfig = {
  defaultNetwork: Types.NetworkString
}

export class TezosDomainPlugin extends Plugin {
  public static defaultNetwork: Types.NetworkString = "mainnet"; 
  private connections: Record<Types.NetworkString, string> = {
    mainnet: 'https://rpc.tzstats.com',
    hangzhounet: 'https://rpc.hangzhou.tzstats.com',
    ithacanet: 'https://rpc.ithaca.tzstats.com',
  }
  
  constructor(cfg: TezosDomainPluginConfig) {
    super();
    TezosDomainPlugin.defaultNetwork = cfg.defaultNetwork;
  }

  public static manifest(): PluginPackageManifest {
    return manifest;
  }

  public getModules(
    client: Client
  ): {
    query: Query.Module;
  } {
    return {
      query: query(this, client),
    };
  }

  // Query
  public async getAcquisitionInfo(
    input: Types.Query.Input_getAcquisitionInfo
  ): Promise<Types.AcquisitionInfo> {
    let duration = 365;
    const domainsClient = await this.getTezosDomainsClient(input.network)
    const info = await domainsClient.manager.getAcquisitionInfo(input.domain)
    const acquisitionInfo = <Types.AcquisitionInfo>{
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
    input: Types.Query.Input_bytesToHex
  ): string {
    return new sha512().update(this.textToArray(input.bytes)).digest('hex');
  }

  public encodeCharactersToBytes(
    input: Types.Query.Input_char2Bytes
  ): string {
    return char2Bytes(input.text);
  }

  // Utils
  private async getTezosDomainsClient(network: Types.Network | undefined | null): Promise<TaquitoTezosDomainsClient> {
    let tezosNetworkClient = TezosDomainPlugin.defaultNetwork;
    if (network) {
      tezosNetworkClient = <Types.NetworkString>network;
    }
    const { tezos, network: selectedNetwork} = await this.getTezosClient(tezosNetworkClient)
    tezos.addExtension(new Tzip16Module())
    return new TaquitoTezosDomainsClient({ tezos, network: selectedNetwork })
  }

  private async getTezosClient(network: Types.NetworkString): Promise<TezosClient> { 
    return {
      tezos: new TezosToolkit(this.connections[network]),
      network: network,
    }
  }

  private textToArray(text: string): Uint8Array {
    return new Uint8Array(text.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || [])
  }
}

export const tezosDomainsPlugin: PluginFactory<TezosDomainPluginConfig> = (opts: TezosDomainPluginConfig) => {
  return {
    factory: () => new TezosDomainPlugin(opts),
    manifest: manifest,
  };
};
export const plugin = tezosDomainsPlugin;
