import { TezosToolkit } from "@taquito/taquito";
import { SupportedNetworkType } from "@tezos-domains/core";

import * as QuerySchema from '../query/w3'

export type TezosDomainConfig = {
  defaultNetwork: QuerySchema.NetworkString
}

export interface TezosClient {
    tezos: TezosToolkit;
    network: SupportedNetworkType;
}