import path from 'path'
import { randomInt} from 'crypto'
import { PolywrapClient } from "@polywrap/client-js"
import { InMemorySigner } from "@taquito/signer"
import { buildWrapper } from "@polywrap/test-env-js"

import { Config } from "./config"
import { tezosDomainsPlugin } from "../../../tezos-domains-plugin-js"
import { getRandomString, waitForConfirmation } from "./testUtils"
import { DomainInfo, Tezos_TxOperation } from "./types/wrap";
const { tezosPlugin } = require("../../../tezos-domains-plugin-js")

jest.setTimeout(600000)

describe("Tezos Domains Wrapper", () => {
  const { TZ_PKH: PKH, TZ_SECRET_KEY } = Config;
  let client: PolywrapClient;
  let apiUri: string;

  beforeAll(async () => {
    const apiPath = path.join(__dirname, "/../..");
    apiUri = `fs/${apiPath}/build`;

    await buildWrapper(apiPath);

    const signer = await InMemorySigner.fromSecretKey(TZ_SECRET_KEY);
    client = new PolywrapClient({
      plugins: [
        {
          uri: "wrap://ens/tezosDomainsPlugin.polywrap.eth",
          plugin: tezosDomainsPlugin({ defaultNetwork: "ghostnet" })
        },
        {
          uri: "wrap://ens/tezos.polywrap.eth",
          plugin: tezosPlugin({
              networks: {
                mainnet: {
                  provider: "https://rpc.tzstats.com"
                },
                ghostnet: {
                  provider: "https://rpc.ghost.tzstats.com",
                  signer
                }
            },
            defaultNetwork: "ghostnet"
          })
        }
      ]
    })
  })

  describe("Commit", () => {
    it("should be to make a commitment to a domain", async () => {
      const response =  await client.invoke<{ commit: string }>({
        uri: apiUri,
        method: "commit",
        args: {
          network: "ghostnet",
          params: {
            label: `commit-${getRandomString()}`,
            owner: PKH,
            nonce: 491919002
          }
        }
      });
      expect(response.error).toBeUndefined()
      expect(response.data?.commit).toBeDefined()
      expect(typeof response.data?.commit).toBe('string')

      await waitForConfirmation(client, response.data?.commit!)
    })
  })
  
  describe("Buy", () => {
    it("should be to purchase a domain", async () => {
      // @dev 
      // To be able to purchase a domain you need to make a commitment first
      const MAX_32_BIT_INTEGER = 2147483648;
      const buyParams = {
        label: `zakager-${getRandomString()}`,
        nonce: randomInt(MAX_32_BIT_INTEGER),
        owner: 'tz1ZuBvvtrS9JroGs5e4B3qg2PLntxhj1h8Z',
        duration: 365,
        metadata: {
          isMichelsonMap: true,
          values: []
        }
      }

      const commitResponse =  await client.invoke<{ commit: string }>({
        uri: apiUri,
        method: "commit",
        args: {
          network: "ghostnet",
          params: {
            label: buyParams.label,
            owner: buyParams.owner,
            nonce: buyParams.nonce
          }
        }
      });
      expect(commitResponse.error).toBeUndefined()
      expect(commitResponse.data?.commit).toBeDefined()
      expect(typeof commitResponse.data?.commit).toBe('string')

      // Wait till the commitment operation has more  confirmations
      await waitForConfirmation(client, commitResponse.data?.commit!)
      
      const buyResponse = await client.invoke<{ buy: Tezos_TxOperation }>({
        uri: apiUri,
        method: "buy",
        args: {
          network: "ghostnet",
          params: {
            label: buyParams.label,
            owner: buyParams.owner,
            address: buyParams.owner,
            nonce: buyParams.nonce,
            duration: buyParams.duration,
            data: JSON.stringify(buyParams.metadata)
          },
          sendParams: {
            amount: 1
          }
        }
      });
      expect(buyResponse.error).toBeUndefined()
      expect(buyResponse.data).toBeDefined()
      expect(buyResponse.data?.buy).toBeDefined()
      expect(typeof buyResponse.data?.buy).toBe('string')
    })
  })

  describe("resolveDomain", () => {
    it("should resolve a valid domain name", async () => {
      const response =  await client.invoke<{ resolveDomain: DomainInfo | null }>({
        uri: apiUri,
        method: "resolveDomain",
        args: {
          network: "mainnet",
          domain: "alice.tez"
        }
      })
  
      expect(response.error).toBeUndefined()
      expect(response.data).toBeDefined()
      expect(response.data?.resolveDomain).toBeDefined()
      expect(response.data?.resolveDomain?.Name).toBeDefined()
      expect(response.data?.resolveDomain?.Address).toBeDefined()
      expect(response.data?.resolveDomain?.Data).toBeDefined()
      expect(response.data?.resolveDomain?.Expiry).toBeDefined()
    })
  
    it("should return null for an invalid domain name", async () => {
      const response =  await client.invoke<{ resolveDomain: DomainInfo | null }>({
        uri: apiUri,
        method: "resolveDomain",
        args: {
          network: "mainnet",
          domain: `chalak-${Math.random() * 1000}.tez`
        }
      })
  
      expect(response.error).toBeUndefined()
      expect(response.data).toBeDefined()
      expect(response.data?.resolveDomain).toBeNull()
    })
  })

  describe("resolveAddress", () => {
    it("should resolve address to domain record", async () => {
      const response =  await client.invoke<{ resolveAddress: DomainInfo | null }>({
        uri: apiUri,
        method: "resolveAddress",
        args: {
          network: "mainnet",
          address: 'tz1PnpYYdcgoVq1RYgj6qSdbzwSJRXXcfU3F'
        }
      })

      expect(response.error).toBeUndefined()
      expect(response.data).toBeDefined()
      expect(response.data?.resolveAddress).toBeDefined()
      expect(response.data?.resolveAddress?.Name).toBeDefined()
      expect(response.data?.resolveAddress?.Address).toBeDefined()
      expect(response.data?.resolveAddress?.Data).toBeDefined()
      expect(response.data?.resolveAddress?.Expiry).toBeDefined()
    })
  })
})