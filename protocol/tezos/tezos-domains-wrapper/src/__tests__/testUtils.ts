import { ensPlugin } from "@web3api/ens-plugin-js"
import { ipfsPlugin } from "@web3api/ipfs-plugin-js"
import { ethereumPlugin  } from "@web3api/ethereum-plugin-js"
import { PluginRegistration, Subscription, Web3ApiClient } from "@web3api/client-js"
import { tezosDomainsPlugin } from "@blockwatch-cc/tezos-domains-plugin-js"

import * as QuerySchema from "../query/w3"

export const getPlugins = (ipfs: string, ensAddress: string, ethereum: string): PluginRegistration<string>[] => {
    return [
        {
            uri: "w3://ens/tezosDomainsPlugin.web3api.eth",
            plugin: tezosDomainsPlugin({
                defaultNetwork: "ithacanet"
            })
        },
        {
            uri: "w3://ens/ipfs.web3api.eth",
            plugin: ipfsPlugin({ provider: ipfs }),
        },
        {
            uri: "w3://ens/ens.web3api.eth",
            plugin: ensPlugin({ query: { addresses: { testnet: ensAddress } } }),
        },
        {
            uri: "w3://ens/ethereum.web3api.eth",
            plugin: ethereumPlugin({
                networks: {
                    testnet: {
                        provider: ethereum
                    },
                },
                defaultNetwork: "testnet"
            }),
        },
    ]
}

export const getRandomString = () => {
    return (Math.floor(Math.random() * 1000000)).toString()
}

export const waitForConfirmation = async (client: Web3ApiClient, hash: string, confirmations: number = 3) => {
    const getSubscription: Subscription<{
        getOperationStatus: QuerySchema.Tezos_OperationStatus;
      }> = client.subscribe<{
        getOperationStatus: QuerySchema.Tezos_OperationStatus;
      }>({
        uri: "w3://ens/tezos.web3api.eth",
        query: `
          query {
            getOperationStatus(
              hash: $hash
              network: ithacanet
            )
          }
        `,
        variables: {
          hash,
        },
        frequency: { ms: 4500 },
      });

      for await (let query of getSubscription) {
        if (query.errors) {
          continue
        }
        expect(query.errors).toBeUndefined();
        const operationStatus = query.data?.getOperationStatus;
        if (operationStatus !== undefined) {
          if (operationStatus.confirmations > confirmations) {
            break
          }
        }
      }   
}