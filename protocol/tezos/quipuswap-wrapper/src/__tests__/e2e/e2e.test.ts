import add from "date-fns/add"
import path from "path"
import { PolywrapClient } from "@polywrap/client-js"
import { buildWrapper } from "@polywrap/test-env-js"

import { GetTokenSupplyResponse, Tezos_TransferParams } from "./types/wrap"

const { tezosPlugin } = require("../../../../plugin-js")

jest.setTimeout(460000)

describe("e2e", () => {
  let client: PolywrapClient;
  let apiUri: string;

  beforeAll(async () => {
    const apiPath = path.join(__dirname, "/../../..");
    apiUri = `fs/${apiPath}/build`;
    
    await buildWrapper(apiPath);
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
                        signer
                    }
                },
                defaultNetwork: "ghostnet"
              })
          }
      ],
    })
  })

  describe("getTokenPair", () => {
    it("should get a token pair", async () => {
      const response =  await client.invoke<{ getTokenPair: object }>({
        uri: apiUri,
        method: "getTokenPair",
        args: {
          network: "ghostnet",
          pairId: "4"
        }
      });

      expect(response.error).toBeUndefined()
      expect(response.data).toBeDefined()
      expect(response.data?.getTokenPair).toBeDefined()
    })

    it("throws an error when paidId is invalid", async () => {
      const response =  await client.invoke<{ getTokenPair: object }>({
        uri: apiUri,
        method: "getTokenPair",
        args: {
          network: "ghostnet",
          pairId: "1000"
        }
      });

      expect(response.data?.getTokenPair).toBeUndefined()
      expect(response.error).toBeDefined()
      expect(response.error?.message).toMatch(/invalid pair id/)   
    })
  })

  describe("listTokenPairs", () => {
    it("should get a list of token pairs from storage", async () => {
      const response =  await client.invoke<{ listTokenPairs: object }>({
        uri: apiUri,
        method: "listTokenPairs",
        args: {
          network: "mainnet"
        }
      });

      expect(response.error).toBeUndefined()
      expect(response.data).toBeDefined()
      expect(response.data?.listTokenPairs).toBeDefined()
    })
  })
    
  describe("getTokenSupply", () => {
    it("should get a list of assets from a provider", async () => {
      const response =  await client.invoke<{ getTokenSupply: GetTokenSupplyResponse}>({
        uri: apiUri,
        method: "getTokenSupply",
        args: {
          pairId: "0",
          network: "mainnet"
        }
      })
  
      expect(response.error).toBeUndefined()
      expect(response.data).toBeDefined()
      expect(response.data?.getTokenSupply).toBeDefined()
      expect(response.data?.getTokenSupply.token_a_pool).toBeDefined()
      expect(response.data?.getTokenSupply.token_b_pool).toBeDefined()
      expect(response.data?.getTokenSupply.total_supply).toBeDefined()
    })
  })

  describe("getLPTokenBalance", () => {
    it("should get candle data from a provider", async () => {
      const response = await client.invoke<{ getLPTokenBalance: string }>({
        uri: apiUri,
        method: "getLPTokenBalance",
        args: {
          network: "mainnet",
          owner: "tz1LSMu9PugfVyfX2ynNU9y4eVvSACJKP7sg",
          pairId: "0"
        }
      })
    
      expect(response.error).toBeUndefined()
      expect(response.data).toBeDefined()
      expect(response.data?.getLPTokenBalance).toBeDefined()
    })
  })

  describe("addOperator", () => {
    it("should add operator", async () => {
      const contractAddress = "KT1PnmpVWmA5CBUsA5ZAx1HoDW67mPYurAL5";
      const response = await client.invoke<{ addOperator: Tezos_TransferParams }>({
        uri: apiUri,
        method: "addOperator",
        args: {
          network: "ghostnet",
          contractAddress,
          params: {
            tokenId: 0,
            operator: contractAddress
          }
        }
      })

      expect(response.error).toBeUndefined()
      expect(response.data?.addOperator).toBeDefined()
      expect(response.data?.addOperator.to).toBeDefined()
      expect(response.data?.addOperator.amount).toBeDefined()
    });
  })
  
  describe("removeOperator", () => {
    it("should remove operator", async () => {
      const contractAddress = "KT1PnmpVWmA5CBUsA5ZAx1HoDW67mPYurAL5";
      const response = await client.invoke<{ removeOperator: Tezos_TransferParams }>({
        uri: apiUri,
        method: "removeOperator",
        args: {
          network: "ghostnet",
          contractAddress,
          params: {
            tokenId: 0,
            operator: contractAddress
          }
        }
      })

      expect(response.error).toBeUndefined()
      expect(response.data?.removeOperator).toBeDefined()
      expect(response.data?.removeOperator.to).toBeDefined()
      expect(response.data?.removeOperator.amount).toBeDefined()
    });
  })

  describe("swapMultiHop", () => {
    it.todo("should swap multiple tokens");
  })

  describe("swapDirect", () => {
    it("should be to swap token directly on ghostnet", async () => {
      const swapResponse = await client.invoke<{ swapDirect: Tezos_TransferParams[] }>({
        uri: apiUri,
        method: "swapDirect",
        args: {
          network: "ghostnet",
          params: {
            pairId: 3,
            direction: `b_to_a`,
            swapParams: {
              amountIn: "1",
              minAmountOut: "1",
              deadline: add(new Date(), { minutes: 10 }).toISOString(),
              receiver:  "tz1ZuBvvtrS9JroGs5e4B3qg2PLntxhj1h8Z"
            }
          },
          sendParams: {
            to: "",
            amount: 0,
            mutez: true
          }
        }
      })
      expect(swapResponse.error).toBeUndefined()
      expect(swapResponse.data?.swapDirect).toBeDefined()
      expect(swapResponse.data?.swapDirect).toHaveLength(3)
    });

    it("should swap tokens directly", async() => {
      const swapResponse = await client.invoke<{ swapDirect: Tezos_TransferParams[] }>({
        uri: apiUri,
        method: "swapDirect",
        args: {
          network: "ghostnet",
          params: {
            pairId: 14,
            direction: `b_to_a`,
            swapParams: {
              amountIn: "1",
              minAmountOut: "26288",
              deadline: add(new Date(), { minutes: 10 }).toISOString(),
              receiver:  "tz1ZuBvvtrS9JroGs5e4B3qg2PLntxhj1h8Z"
            }
          },
          sendParams: {
            to: "",
            amount: 0,
            mutez: true
          }
        }
      })
      expect(swapResponse.error).toBeUndefined()
      expect(swapResponse.data?.swapDirect).toBeDefined()
      expect(swapResponse.data?.swapDirect).toHaveLength(3)
      
      const batchContractCallResponse = await client.invoke<{ batchContractCalls: string }>({
        uri: "wrap://ens/tezos.polywrap.eth",
        method: "batchContractCalls",
        args: {
          params: swapResponse.data?.swapDirect
        }
      })

      expect(batchContractCallResponse.error).toBeUndefined()
      expect(batchContractCallResponse.data?.batchContractCalls).toBeDefined()
    });
  })

  describe("transfer", () => {
    it.skip("should transfer token from caller/sender", async () => {
        // transfer
        const transferResponse = await client.invoke<{ transfer: Tezos_TransferParams }>({
        uri: apiUri,
        method: "transfer",
        args: {
          network: "ghostnet",
          params: {
            to: "tz1ZuBvvtrS9JroGs5e4B3qg2PLntxhj1h8Z",
            tokenId: 0,
            amount: "1",
          },
          sendParams: {
            to: "",
            amount: 0,
            mutez: true
          }
        }
      })
      expect(transferResponse.error).toBeUndefined()
      expect(transferResponse.data?.transfer).toBeDefined()
      expect(transferResponse.data?.transfer.mutez).toBe(true)
      expect(transferResponse.data?.transfer.parameter).toBeDefined()
      // batch contract calls
      const batchContractCallResponse = await client.invoke<{ batchContractCalls: string }>({
        uri: "wrap://ens/tezos.polywrap.eth",
        method: "batchContractCalls",
        args: {
          params: [transferResponse.data?.transfer]
        }
      })
      expect(batchContractCallResponse.error).toBeUndefined()
      expect(batchContractCallResponse.data?.batchContractCalls).toBeDefined()
    });
  })

  describe("transferFrom", () => {
    it.skip("should transfer token from address provided", async () => {
      // transferFrom
        const transferFromResponse = await client.invoke<{ transferFrom: Tezos_TransferParams }>({
        uri: apiUri,
        method: "transferFrom",
        args: {
          network: "ghostnet",
          from: "tz1ZuBvvtrS9JroGs5e4B3qg2PLntxhj1h8Z",
          params: {
            to: "tz1dUru8MXTpHoXLmcHQrs2iPWmDP1Y9rDEY",
            tokenId: 0,
            amount: "0",
          },
          sendParams: {
            to: "",
            amount: 0,
            mutez: true
          }
        }
      })
      expect(transferFromResponse.error).toBeUndefined()
      expect(transferFromResponse.data?.transferFrom).toBeDefined()
      expect(transferFromResponse.data?.transferFrom.mutez).toBe(true)
      expect(transferFromResponse.data?.transferFrom.parameter).toBeDefined()
    });
  })

  describe("invest", () => {
    it("should invest into a token pair", async () => {
      // invest
      const investResponse = await client.invoke<{ invest: Tezos_TransferParams[] }>({
        uri: apiUri,
        method: "invest",
        args: {
          network: "ghostnet",
          params: {
            pairId: 14,
            shares: "1",
            tokenAIn: "26543",
            tokenBIn: "1",
            deadline: add(new Date(), { minutes: 10 }).toISOString(),
          },
          sendParams: {
            to: "",
            amount: 0,
            mutez: true
          }
        }
      })
      expect(investResponse.error).toBeUndefined()
      expect(investResponse.data?.invest).toBeDefined()
      expect(investResponse.data?.invest).toHaveLength(5)
      // batch contract calls
      const batchContractCallResponse = await client.invoke<{ batchContractCalls: string }>({
        uri: "wrap://ens/tezos.polywrap.eth",
        method: "batchContractCalls",
        args: {
          params: investResponse.data?.invest
        }
      })
      expect(batchContractCallResponse.error).toBeUndefined()
      expect(batchContractCallResponse.data?.batchContractCalls).toBeDefined()
    });
  })

  describe("divest", () => {
    it("should divest into a token pair", async () => {
      // divest
      const divestResponse = await client.invoke<{ divest: Tezos_TransferParams }>({
        uri: apiUri,
        method: "divest",
        args: {
          network: "ghostnet",
          params: {
            pairId: 14,
            shares: "10",
            minTokenAOut: "144587",
            minTokenBOut: "4",
            deadline: add(new Date(), { minutes: 10 }).toISOString(),
          },
          sendParams: {
            to: "",
            amount: 0,
            mutez: true
          }
        },
      });
      expect(divestResponse.error).toBeUndefined()
      expect(divestResponse.data?.divest).toBeDefined()
      expect(divestResponse.data?.divest.mutez).toBe(true)
      expect(divestResponse.data?.divest.parameter).toBeDefined()
      // batch contract calls
      const batchContractCallResponse = await client.invoke<{ batchContractCalls: string }>({
        uri: "wrap://ens/tezos.polywrap.eth",
        method: "batchContractCalls",
        args: {
          params: [divestResponse.data?.divest]
        }
      })
      expect(batchContractCallResponse.error).toBeUndefined()
      expect(batchContractCallResponse.data?.batchContractCalls).toBeDefined()
    });
  })
})