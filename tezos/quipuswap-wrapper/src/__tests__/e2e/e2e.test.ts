import path from "path"
import { Web3ApiClient } from "@web3api/client-js"
import { buildAndDeployApi, initTestEnvironment, stopTestEnvironment } from "@web3api/test-env-js"
import { InMemorySigner } from "@blockwatch-cc/tezos-plugin-js"
import add from "date-fns/add"

import { Config } from "../config"
import { getPlugins } from "../testUtils"
import * as QuerySchema from "../../query/w3"

jest.setTimeout(300000)

describe("e2e", () => {
  let client: Web3ApiClient;
  let ensUri: string;

  beforeAll(async () => {
    const { ensAddress, ethereum, ipfs } = await initTestEnvironment();
    const apiPath = path.join(__dirname, "/../../..");
    const api = await buildAndDeployApi(apiPath, ipfs, ensAddress);
    ensUri = `ens/testnet/${api.ensDomain}`;
    const tezosConnection = {
      network: "ithacanet",
      provider: "https://rpc.ithaca.tzstats.com",
      signer: await InMemorySigner.fromSecretKey(Config.TZ_SECRET)
    }
    client = new Web3ApiClient({
        plugins: getPlugins(ipfs, ensAddress, ethereum, tezosConnection),
    })
  })

  afterAll(async () => {
    await stopTestEnvironment()
  })

  describe("Query", () => {
    describe("getTokenPair", () => {
      it("should get a token pair", async () => {
        const response =  await client.query<{ getTokenPair: object }>({
          uri: ensUri,
          query: `
            query {
              getTokenPair(
                network: hangzhounet,
                pairId: "4"
              )
            }
          `,
        });

        expect(response.errors).toBeUndefined()
        expect(response.data).toBeDefined()
        expect(response.data?.getTokenPair).toBeDefined()
      })

      it("throws an error when paidId is invalid", async () => {
        const response =  await client.query<{ getTokenPair: object }>({
          uri: ensUri,
          query: `
            query {
              getTokenPair(
                network: hangzhounet,
                pairId: "1000"
              )
            }
          `,
        });

        expect(response.data?.getTokenPair).toBeUndefined()
        expect(response.errors).toBeDefined()
        expect(response.errors?.[0].message).toMatch(/invalid pair id/)   
      })
    })

    describe("listTokenPairs", () => {
      it("should get a list of token pairs from storage", async () => {
        const response =  await client.query<{ listTokenPairs: object }>({
          uri: ensUri,
          query: `
            query {
              listTokenPairs(
                network: mainnet
              )
            }
          `,
        });

        expect(response.errors).toBeUndefined()
        expect(response.data).toBeDefined()
        expect(response.data?.listTokenPairs).toBeDefined()
      })
    })
      
    describe("getTokenSupply", () => {
      it("should get a list of assets from a provider", async () => {
        const response =  await client.query<{ getTokenSupply: QuerySchema.GetTokenSupplyResponse}>({
          uri: ensUri,
            query: `
              query {
                getTokenSupply(
                  pairId: $pairId,
                  network: mainnet
                )
              }`,
          variables: {
            pairId: "0"
          }
        })
    
        expect(response.errors).toBeUndefined()
        expect(response.data).toBeDefined()
        expect(response.data?.getTokenSupply).toBeDefined()
        expect(response.data?.getTokenSupply.token_a_pool).toBeDefined()
        expect(response.data?.getTokenSupply.token_b_pool).toBeDefined()
        expect(response.data?.getTokenSupply.total_supply).toBeDefined()
      })
    })

    describe("getLPTokenBalance", () => {
      it("should get candle data from a provider", async () => {
        const response = await client.query<{ getLPTokenBalance: string }>({
          uri: ensUri,
          query: `
            query {
              getLPTokenBalance(
                network: mainnet
                owner: $owner 
                pairId: $pairId
              )
          }`,
          variables: {
            owner: "tz1LSMu9PugfVyfX2ynNU9y4eVvSACJKP7sg",
            pairId: "0"
          }
        })
      
        expect(response.errors).toBeUndefined()
        expect(response.data).toBeDefined()
        expect(response.data?.getLPTokenBalance).toBeDefined()
      })
    })
  })

  describe("Mutation", () => {
    describe("addOperator", () => {
      it("should add operator", async () => {
        const response = await client.query<{ addOperator: QuerySchema.Tezos_TransferParams }>({
          uri: ensUri,
          query: `
            mutation {
              addOperator(
                network: hangzhounet,
                contractAddress: $contractAddress
                params: $params
              )
            }
          `,
          variables: {
            contractAddress: "KT1Ni6JpXqGyZKXhJCPQJZ9x5x5bd7tXPNPC",
            params: {
              tokenId: 0,
              operator: "KT1Ni6JpXqGyZKXhJCPQJZ9x5x5bd7tXPNPC"
            }
          }
        })

        expect(response.errors).toBeUndefined()
        expect(response.data?.addOperator).toBeDefined()
        expect(response.data?.addOperator.to).toBeDefined()
        expect(response.data?.addOperator.amount).toBeDefined()
      });
    })
    
    describe("removeOperator", () => {
      it("should remove operator", async () => {
        const response = await client.query<{ removeOperator: QuerySchema.Tezos_TransferParams }>({
          uri: ensUri,
          query: `
            mutation {
              removeOperator(
                network: hangzhounet,
                contractAddress: $contractAddress
                params: $params
              )
            }
          `,
          variables: {
            contractAddress: "KT1Ni6JpXqGyZKXhJCPQJZ9x5x5bd7tXPNPC",
            params: {
              tokenId: 0,
              operator: "KT1Ni6JpXqGyZKXhJCPQJZ9x5x5bd7tXPNPC"
            }
          }
        })

        expect(response.errors).toBeUndefined()
        expect(response.data?.removeOperator).toBeDefined()
        expect(response.data?.removeOperator.to).toBeDefined()
        expect(response.data?.removeOperator.amount).toBeDefined()
      });
    })

    describe("swapMultiHop", () => {
      it.todo("should swap multiple tokens");
    })

    describe("swapDirect", () => {
      it("should be to swap token directly on ithacanet", async () => {
        const swapResponse = await client.query<{ swapDirect: QuerySchema.Tezos_TransferParams[] }>({
          uri: ensUri,
          query: `
            mutation {
              swapDirect(
                network: ithacanet,
                params: $params,
                sendParams: $sendParams
              )
            }
          `,
          variables: {
            params: {
              pairId: 3,
              direction: `b_to_a`,
              swapParams: {
                amountIn: "1",
                minAmountOut: "3",
                deadline: add(new Date(), { minutes: 10 }).toISOString(),
                receiver:  "tz1PVZMqeRN4x2EAtHfn5qVcq6M9PB45kVMd"
              }
            },
            sendParams: {
              to: "",
              amount: 0,
              mutez: true
            }
          }
        })
        expect(swapResponse.errors).toBeUndefined()
        expect(swapResponse.data?.swapDirect).toBeDefined()
        expect(swapResponse.data?.swapDirect).toHaveLength(3)
      });

      it("should swap tokens directly", async() => {
        const swapResponse = await client.query<{ swapDirect: QuerySchema.Tezos_TransferParams[] }>({
          uri: ensUri,
          query: `
            mutation {
              swapDirect(
                network: hangzhounet,
                params: $params,
                sendParams: $sendParams
              )
            }
          `,
          variables: {
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
        expect(swapResponse.errors).toBeUndefined()
        expect(swapResponse.data?.swapDirect).toBeDefined()
        expect(swapResponse.data?.swapDirect).toHaveLength(3)
        
        const batchContractCallResponse = await client.query<{ batchContractCalls: string }>({
          uri: "w3://ens/tezos.web3api.eth",
          query: `
            mutation {
              batchContractCalls(
                params: $params
              )
            }
          `,
          variables: {
            params: swapResponse.data?.swapDirect
          }
        })

        expect(batchContractCallResponse.errors).toBeUndefined()
        expect(batchContractCallResponse.data?.batchContractCalls).toBeDefined()
      });
    })

    describe("transfer", () => {
      it.skip("should transfer token from caller/sender", async () => {
         // transfer
         const transferResponse = await client.query<{ transfer: QuerySchema.Tezos_TransferParams }>({
          uri: ensUri,
          query: `
            mutation {
              transfer(
                network: hangzhounet,
                params: $params,
                sendParams: $sendParams
              )
            }
          `,
          variables: {
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
        expect(transferResponse.errors).toBeUndefined()
        expect(transferResponse.data?.transfer).toBeDefined()
        expect(transferResponse.data?.transfer.mutez).toBe(true)
        expect(transferResponse.data?.transfer.parameter).toBeDefined()
        // batch contract calls
        const batchContractCallResponse = await client.query<{ batchContractCalls: string }>({
          uri: "w3://ens/tezos.web3api.eth",
          query: `
            mutation {
              batchContractCalls(
                params: $params
              )
            }
          `,
          variables: {
            params: [transferResponse.data?.transfer]
          }
        })
        expect(batchContractCallResponse.errors).toBeUndefined()
        expect(batchContractCallResponse.data?.batchContractCalls).toBeDefined()
      });
    })

    describe("transferFrom", () => {
      it.skip("should transfer token from address provided", async () => {
        // transferFrom
         const transferFromResponse = await client.query<{ transferFrom: QuerySchema.Tezos_TransferParams }>({
          uri: ensUri,
          query: `
            mutation {
              transferFrom(
                network: hangzhounet,
                from: $from,
                params: $params,
                sendParams: $sendParams
              )
            }
          `,
          variables: {
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
        expect(transferFromResponse.errors).toBeUndefined()
        expect(transferFromResponse.data?.transferFrom).toBeDefined()
        expect(transferFromResponse.data?.transferFrom.mutez).toBe(true)
        expect(transferFromResponse.data?.transferFrom.parameter).toBeDefined()
      });
    })

    describe("invest", () => {
      it("should invest into a token pair", async () => {
        // invest
        const investResponse = await client.query<{ invest: QuerySchema.Tezos_TransferParams[] }>({
          uri: ensUri,
          query: `
            mutation {
              invest(
                network: hangzhounet,
                params: $params,
                sendParams: $sendParams
              )
            }
          `,
          variables: {
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
        expect(investResponse.errors).toBeUndefined()
        expect(investResponse.data?.invest).toBeDefined()
        expect(investResponse.data?.invest).toHaveLength(5)
        // batch contract calls
        const batchContractCallResponse = await client.query<{ batchContractCalls: string }>({
          uri: "w3://ens/tezos.web3api.eth",
          query: `
            mutation {
              batchContractCalls(
                params: $params
              )
            }
          `,
          variables: {
            params: investResponse.data?.invest
          }
        })
        expect(batchContractCallResponse.errors).toBeUndefined()
        expect(batchContractCallResponse.data?.batchContractCalls).toBeDefined()
      });
    })

    describe("divest", () => {
      it("should divest into a token pair", async () => {
        // divest
        const divestResponse = await client.query<{ divest: QuerySchema.Tezos_TransferParams }>({
          uri: ensUri,
          query: `
            mutation {
              divest(
                network: hangzhounet,
                params: $params,
                sendParams: $sendParams
              )
            }
          `,
          variables: {
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
          }
        });
        expect(divestResponse.errors).toBeUndefined()
        expect(divestResponse.data?.divest).toBeDefined()
        expect(divestResponse.data?.divest.mutez).toBe(true)
        expect(divestResponse.data?.divest.parameter).toBeDefined()
        // batch contract calls
        const batchContractCallResponse = await client.query<{ batchContractCalls: string }>({
          uri: "w3://ens/tezos.web3api.eth",
          query: `
            mutation {
              batchContractCalls(
                params: $params
              )
            }
          `,
          variables: {
            params: [divestResponse.data?.divest]
          }
        })
        expect(batchContractCallResponse.errors).toBeUndefined()
        expect(batchContractCallResponse.data?.batchContractCalls).toBeDefined()
      });
    })
  })
})