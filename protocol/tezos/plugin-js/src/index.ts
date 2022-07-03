// TIP: All user-defined code lives in the module folders (./query, ./mutation)

import { PluginFactory, PluginPackage } from "@web3api/core-js";

import * as Internal from "./w3";
import { TezosConfig } from "./common/TezosConfig";
import { getConnections } from "./common/Connection";

export { manifest, schema } from "./w3";

export interface TezosPluginConfigs
  extends TezosConfig,
    Record<string, unknown> {}

export class TezosPlugin extends Internal.TezosPlugin {
  constructor(pluginConfig: TezosPluginConfigs) {
    const connectionsCfg = getConnections(pluginConfig)
    super({
      query: connectionsCfg,
      mutation: connectionsCfg,
    });
  }
}


export const tezosPlugin: PluginFactory<TezosPluginConfigs> = (
  pluginConfig: TezosPluginConfigs
): PluginPackage => {
  const connectionsCfg = getConnections(pluginConfig)
  return Internal.tezosPlugin({
    query: connectionsCfg,
    mutation: connectionsCfg,
  });
} 

export const plugin = tezosPlugin;
