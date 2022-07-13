import { PolywrapClientConfig, Workflow, PolywrapClient } from "@polywrap/client-js";
import { ClientConfig, coreInterfaceUris } from "@polywrap/client-js";
import { ensResolverPlugin } from "@polywrap/ens-resolver-plugin-js";
import { ethereumPlugin } from "@polywrap/ethereum-plugin-js";
import { ipfsPlugin } from "@polywrap/ipfs-plugin-js";

interface TestEnvironment {
  ipfs: string;
  ethereum: string;
  ensAddress: string;
  registrarAddress?: string;
  reverseAddress?: string;
  resolverAddress?: string;
}

async function getProviders(): Promise<TestEnvironment> {
  const ipfs = "http://localhost:5001";
  const ethereum = "http://localhost:8545";
  const ensAddress = "0xe78A0F7E598Cc8b0Bb87894B0F60dD2a88d6a8Ab";

  return { ipfs, ethereum, ensAddress };
}

function getPlugins(
  ethereum: string,
  ipfs: string,
  ensAddress: string
): Partial<ClientConfig> {
  return {
    redirects: [],
    plugins: [
      {
        uri: "wrap://ens/ipfs.polywrap.eth",
        plugin: ipfsPlugin({ provider: ipfs }),
      },
      {
        uri: "wrap://ens/ens.polywrap.eth",
        plugin: ensResolverPlugin({ addresses: { testnet: ensAddress } }),
      },
      {
        uri: "wrap://ens/ethereum.polywrap.eth",
        plugin: ethereumPlugin({
          networks: {
            testnet: {
              provider: ethereum,
            },
            MAINNET: {
              provider: "http://localhost:8546",
            },
          },
          defaultNetwork: "testnet",
        }),
      },
    ],
    interfaces: [
      {
        interface: "ens/logger.core.polywrap.eth",
        implementations: ["ens/js-logger.polywrap.eth"],
      },
    ],
  };
}

export async function getClientConfig(
  _: Partial<PolywrapClientConfig>
): Promise<Partial<PolywrapClientConfig>> {
  const { ipfs, ethereum, ensAddress } = await getProviders();
  const workflow: Workflow = {
    name: "hello-world",
    jobs: {
      cases: {
        steps: [
          {
            uri: "fs/./build",
            method: "debug",
            args: {
              message: "DEBUG",
            },
          },
          {
            uri: "fs/./build",
            method: "info",
            args: {
              message: "INFO",
            },
          },
          {
            uri: "fs/./build",
            method: "warn",
            args: {
              message: "WARN",
            },
          },
          {
            uri: "fs/./build",
            method: "error",
            args: {
              message: "ERROR",
            },
          },
        ],
      },
    },
  };
  // const client = new PolywrapClient(getPlugins(ethereum, ipfs, ensAddress));
  return getPlugins(ethereum, ipfs, ensAddress);
}
