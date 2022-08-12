import path from "path"
import { tezosPlugin } from "@blockwatch-cc/tezos-plugin-js"
import { PolywrapClient } from "@polywrap/client-js"
import { buildWrapper } from "@polywrap/test-env-js"

import { SwapData, TokenBalance, TokenMetadata } from "./types/wrap"

jest.setTimeout(150000)

describe("Query", () => {
  let client: PolywrapClient;
  let wrapperUri: string;

  beforeAll(async () => {
    const wrapperPath = path.join(__dirname, "/../../../");
    wrapperUri = `fs/${wrapperPath}/build`;

    await buildWrapper(wrapperPath);

    client = new PolywrapClient({
        plugins: [
          {
            uri: "wrap://ens/tezos.polywrap.eth",
            plugin: tezosPlugin({
                networks: {
                    mainnet: {
                        provider: "https://rpc.tzstats.com"
                    },  
                    ghostnet: {
                        provider: "https://rpc.ghost.tzstats.com",
                    }
                },
                defaultNetwork: "ghostnet"
              })
          }
        ]
    })
  })

  describe("getBalanceOfData", () => {
    it("should return balance", async () => {
      const response =  await client.invoke<{ getBalanceOf: TokenBalance }>({
        uri: wrapperUri,
        method: "getBalanceOf",
        args: {
          owner: "tz1UBZUkXpKGhYsP5KtzDNqLLchwF4uHrGjw",
          network: "mainnet",
          tokenId: "152",
        }
      })
  
      expect(response.error).toBeUndefined()
      expect(response.data).toBeDefined()
      expect(response.data?.getBalanceOf).toBeDefined()
      expect(response.data?.getBalanceOf.owner).toBeDefined()
      expect(response.data?.getBalanceOf.tokenId).toBeDefined()
      expect(response.data?.getBalanceOf.balance).toBeDefined()
    })
  })

  describe("getTokenMetadata", () => {
    it("should get token metadata on mainnet", async () => {
      const response =  await client.invoke<{ getTokenMetadata: TokenMetadata }>({
        uri: wrapperUri,
        method: "getTokenMetadata",
        args: {
          network: "mainnet",
          tokenId: "703989"
        }
      })
  
      expect(response.error).toBeUndefined()
      expect(response.data).toBeDefined()
      expect(response.data?.getTokenMetadata.tokenId).toBeDefined()
      expect(response.data?.getTokenMetadata.ipfsHash).toBeDefined()
    })
  })

  describe("getTokenCountData", () => {
    it("should count token on mainnet", async () => {
      const response = await client.invoke<{ getTokenCountData: string }>({
        uri: wrapperUri,
        method: "getTokenCountData",
        args: {
          network: "mainnet",
        }
      })
  
      expect(response.error).toBeUndefined()
      expect(response.data?.getTokenCountData).toBeDefined()
    })
  })

  describe("getSwapData", () => {
    it("should swap data", async () => {
      const response =  await client.invoke<{ getSwapData: SwapData }>({
        uri: wrapperUri,
        method: "getSwapData",
        args: {
          network: "mainnet",
          swapId: "500004"
        }
      });
  
      expect(response.error).toBeUndefined()
      expect(response.data).toBeDefined()
      expect(response.data?.getSwapData).toBeDefined()
      expect(response.data?.getSwapData.creator).toBeDefined()
      expect(response.data?.getSwapData.issuer).toBeDefined()
      expect(response.data?.getSwapData.objktAmount).toBeDefined()
      expect(response.data?.getSwapData.objktId).toBeDefined()
      expect(response.data?.getSwapData.royalties).toBeDefined()
    })
  })
})