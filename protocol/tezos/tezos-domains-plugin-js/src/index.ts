// TIP: All user-defined code lives in the module folders (./query, ./mutation)

import * as Internal from "./w3";
import { PluginFactory } from "@web3api/core-js";
import { TezosDomainConfig } from "./common/types";

export interface TezosDomainPluginConfig extends TezosDomainConfig, Record<string, unknown> { }

export class TezosDomainPlugin extends Internal.TezosDomainPlugin {
  constructor(config: TezosDomainPluginConfig) {
    super({
      query: config,
    });
  }
}

export const tezosDomainsPlugin: PluginFactory<TezosDomainPluginConfig> = (opts: TezosDomainPluginConfig) => {
  return Internal.tezosDomainPlugin({
    query: opts
  })
};
export const plugin = tezosDomainsPlugin;