import path from 'path'
import { randomInt} from 'crypto'
import { tezosPlugin } from "@blockwatch-cc/tezos-plugin-js"
import { Web3ApiClient } from "@web3api/client-js"
import { InMemorySigner } from "@taquito/signer"
import { initTestEnvironment, stopTestEnvironment, buildAndDeployApi } from "@web3api/test-env-js"

import { Config } from "../config"
import * as MutationSchema from "../../mutation/w3"
import { getPlugins, getRandomString, waitForConfirmation } from "../testUtils"

jest.setTimeout(600000)

describe("Mutation", () => {
  const PKH = Config.TZ_PKH;
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
    const signer = await InMemorySigner.fromSecretKey(Config.TZ_SECRET_KEY);
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
                      signer,
                  }
              },
              defaultNetwork: "ithacanet"
            })
        },
        ...getPlugins(testEnv.ipfs, testEnv.ensAddress, testEnv.ethereum),
      ]
    })
  })

  afterAll(async () => {
    await stopTestEnvironment()
  })

  describe("Mutation", () => {
    describe("Commit", () => {
      it("should be to make a commitment to a domain", async () => {
        const response =  await client.query<{ commit: string }>({
          uri: ensUri,
          query: `
            mutation {
              commit(
                network: ithacanet,
                params: $params
              )
            }
          `,
          variables: {
            params: {
              label: `commit-${getRandomString()}`,
              owner: PKH,
              nonce: 491919002
            },
          }
        });
        expect(response.errors).toBeUndefined()
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
  
        const commitResponse =  await client.query<{ commit: string }>({
          uri: ensUri,
          query: `
            mutation {
              commit(
                network: ithacanet,
                params: $params
              )
            }
          `,
          variables: {
            params: {
              label: buyParams.label,
              owner: buyParams.owner,
              nonce: buyParams.nonce
            },
          }
        });
        expect(commitResponse.errors).toBeUndefined()
        expect(commitResponse.data?.commit).toBeDefined()
        expect(typeof commitResponse.data?.commit).toBe('string')
  
        // Wait till the commitment operation has more  confirmations
        await waitForConfirmation(client, commitResponse.data?.commit!)
        
        const buyResponse = await client.query<{ buy: MutationSchema.Tezos_TxOperation }>({
          uri: ensUri,
          query: `
            mutation {
              buy(
                network: ithacanet,
                params: $params,
                sendParams: $sendParams
              )
            }
          `,
          variables: {
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
        expect(buyResponse.errors).toBeUndefined()
        expect(buyResponse.data).toBeDefined()
        expect(buyResponse.data?.buy).toBeDefined()
        expect(typeof buyResponse.data?.buy).toBe('string')
      })
    })
  })
})