import path from "path"
import { Web3ApiClient } from "@web3api/client-js"
import { buildAndDeployApi, initTestEnvironment, stopTestEnvironment } from "@web3api/test-env-js"
import { tezosPlugin } from "@blockwatch-cc/tezos-plugin-js"

import * as QuerySchema from "../../query/w3"
import { getPlugins } from "../testUtils"

jest.setTimeout(150000)

describe("Query", () => {
  let client: Web3ApiClient;
  let ensUri: string;

  beforeAll(async () => {
    const testEnv = await initTestEnvironment();
    const apiPath = path.join(__dirname, "/../../../");
    const api = await buildAndDeployApi({
      apiAbsPath: apiPath,
      ipfsProvider: testEnv.ipfs,
      ensRegistryAddress: testEnv.ensAddress,
      ensRegistrarAddress: testEnv.registrarAddress,
      ensResolverAddress: testEnv.resolverAddress,
      ethereumProvider: testEnv.ethereum,
    });
    ensUri = `ens/testnet/${api.ensDomain}`;
    client = new Web3ApiClient({
        plugins: [
          {
            uri: "w3://ens/tezos.web3api.eth",
            plugin: tezosPlugin({
                networks: {
                    mainnet: {
                        provider: "https://rpc.tzstats.com"
                    },  
                    ithacanet: {
                        provider: "https://rpc.ithaca.tzstats.com",
                    }
                },
                defaultNetwork: "ithacanet"
              })
          },
          ...getPlugins(testEnv.ipfs, testEnv.ensAddress, testEnv.ethereum),
        ],
    })
  })

  afterAll(async () => {
    await stopTestEnvironment()
  })

  describe("resolveDomain", () => {
    it("should resolve a valid domain name", async () => {
      const response =  await client.query<{ resolveDomain: QuerySchema.DomainInfo | null }>({
        uri: ensUri,
        query: `
          query {
            resolveDomain(
              network: mainnet,
              domain: $domain
            )
          }
        `,
        variables: {
          domain: "alice.tez"
        }
      })
  
      expect(response.errors).toBeUndefined()
      expect(response.data).toBeDefined()
      expect(response.data?.resolveDomain).toBeDefined()
      expect(response.data?.resolveDomain?.Name).toBeDefined()
      expect(response.data?.resolveDomain?.Address).toBeDefined()
      expect(response.data?.resolveDomain?.Data).toBeDefined()
      expect(response.data?.resolveDomain?.Expiry).toBeDefined()
    })
  
    it("should return null for an invalid domain name", async () => {
      const response =  await client.query<{ resolveDomain: QuerySchema.DomainInfo | null }>({
        uri: ensUri,
        query: `
          query {
            resolveDomain(
              network: mainnet,
              domain: $domain
            )
          }
        `,
        variables: {
          domain: `chalak-${Math.random() * 1000}.tez`
        }
      })
  
      expect(response.errors).toBeUndefined()
      expect(response.data).toBeDefined()
      expect(response.data?.resolveDomain).toBeNull()
    })
  })

  describe("resolveAddress", () => {
    it("should resolve address to domain record", async () => {
      const response =  await client.query<{ resolveAddress: QuerySchema.DomainInfo | null }>({
        uri: ensUri,
        query: `
          query {
            resolveAddress(
              network: mainnet,
              address: $address
            )
          }
        `,
        variables: {
          address: 'tz1PnpYYdcgoVq1RYgj6qSdbzwSJRXXcfU3F'
        }
      })

      expect(response.errors).toBeUndefined()
      expect(response.data).toBeDefined()
      expect(response.data?.resolveAddress).toBeDefined()
      expect(response.data?.resolveAddress?.Name).toBeDefined()
      expect(response.data?.resolveAddress?.Address).toBeDefined()
      expect(response.data?.resolveAddress?.Data).toBeDefined()
      expect(response.data?.resolveAddress?.Expiry).toBeDefined()
    })
  })
})