import { ClientConfig, coreInterfaceUris } from "@polywrap/client-js";
import { ensResolverPlugin } from "@polywrap/ens-resolver-plugin-js";
import { ethereumPlugin } from "@polywrap/ethereum-plugin-js";
import { ipfsPlugin } from "@polywrap/ipfs-plugin-js";
import { ensAddresses, providers } from "@polywrap/test-env-js";

import { concurrentPromisePlugin } from "../";

export interface TestEnvironment {
  ipfs: string;
  ethereum: string;
  ensAddress: string;
}

export const testEnv: TestEnvironment = {
  ipfs: providers.ipfs,
  ethereum: providers.ethereum,
  ensAddress: ensAddresses.ensAddress,
};

export function getPlugins(): Partial<ClientConfig> {
  return {
    redirects: [],
    plugins: [
      {
        uri: "wrap://ens/ipfs.web3api.eth",
        plugin: ipfsPlugin({ provider: testEnv.ipfs }),
      },
      {
        uri: "wrap://ens/ens.web3api.eth",
        plugin: ensResolverPlugin({ addresses: { testnet: testEnv.ensAddress } }),
      },
      {
        uri: "wrap://ens/ethereum.web3api.eth",
        plugin: ethereumPlugin({
          networks: {
            testnet: {
              provider: testEnv.ethereum,
            },
            MAINNET: {
              provider: "http://localhost:8546",
            },
          },
          defaultNetwork: "testnet",
        }),
      },
      {
        uri: "wrap://ens/interface.concurrent.polywrap.eth",
        plugin: concurrentPromisePlugin({
          query: {},
          mutation: {},
        }),
      },
    ],
    interfaces: [
      {
        interface: coreInterfaceUris.uriResolver.uri,
        implementations: [
          "wrap://ens/ipfs.web3api.eth",
          "wrap://ens/ens.web3api.eth",
        ],
      },
      {
        interface: coreInterfaceUris.logger.uri,
        implementations: ["wrap://ens/js-logger.web3api.eth"],
      },
    ],
  };
}
