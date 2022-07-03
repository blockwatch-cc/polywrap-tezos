import { buildAndDeployApi, initTestEnvironment, stopTestEnvironment } from "@web3api/test-env-js";
import { ClientConfig, Web3ApiClient } from "@web3api/client-js";
import { Pool, TokenAmount, PoolChangeResult } from "../types";
import path from "path";
import { getPlugins, getPoolFromAddress, getPools } from "../testUtils";
import * as uni from "@uniswap/v3-sdk";
import * as uniCore from "@uniswap/sdk-core";
import * as ethers from "ethers";
import poolList from "../testData/poolList.json";
import { getUniswapPool } from "../uniswapCreatePool";

jest.setTimeout(240000);

describe("Pool (mainnet fork)", () => {

  let client: Web3ApiClient;
  let ensUri: string;
  const addresses: string[] = poolList;
  let pools: Pool[];
  let pool0: Pool;
  let uniPool0: uni.Pool;
  let ethersProvider: ethers.providers.BaseProvider;

  beforeAll(async () => {
    const { ipfs, ethereum, ensAddress, registrarAddress, resolverAddress } = await initTestEnvironment();
    // get client
    const config: ClientConfig = getPlugins(ethereum, ipfs, ensAddress);
    client = new Web3ApiClient(config);
    // deploy api
    const apiPath: string = path.resolve(__dirname + "/../../../../");
    const api = await buildAndDeployApi({
      apiAbsPath: apiPath,
      ipfsProvider: ipfs,
      ensRegistryAddress: ensAddress,
      ethereumProvider: ethereum,
      ensRegistrarAddress: registrarAddress,
      ensResolverAddress: resolverAddress,
    });
    ensUri = `ens/testnet/${api.ensDomain}`;
    // set up ethers provider
    ethersProvider = ethers.providers.getDefaultProvider("http://localhost:8546");
    // set up test case data
    pools = await getPools(client, ensUri);
    pool0 = await getPoolFromAddress(client, ensUri, addresses[0], true);
    uniPool0 = await getUniswapPool(ethersProvider, addresses[0], true);
  });

  afterAll(async () => {
    await stopTestEnvironment();
  });

  it("Gets pool address", async () => {
    for (let i = 0; i < pools.length; i++) {
      const query = await client.query<{
        getPoolAddress: string;
      }>({
        uri: ensUri,
        query: `
          query {
            getPoolAddress(
              tokenA: $tokenA
              tokenB: $tokenB
              fee: $fee
            )
          }
        `,
        variables: {
          tokenA: pools[i].token0,
          tokenB: pools[i].token1,
          fee: pools[i].fee,
        },
      });
      expect(query.errors).toBeFalsy();
      expect(query.data).toBeTruthy();
      expect(query.data?.getPoolAddress.toLowerCase()).toEqual(addresses[i].toLowerCase());
    }
  });

  it("getPoolOutputAmount", async () => {
    // const pool0 = (await getPools(client, ensUri, true, 0, 1))[0];
    // const uniPool0 = (await getUniPools(ethersProvider, true, 0, 1))[0];
    const inputAmount: TokenAmount = {
      token: pool0.token0,
      amount: "1000000000000000000",
    }
    const query = await client.query<{
      getPoolOutputAmount: PoolChangeResult;
    }>({
      uri: ensUri,
      query: `
        query {
          getPoolOutputAmount(
            pool: $pool
            inputAmount: $inputAmount
            sqrtPriceLimitX96: $sqrtPriceLimitX96
          )
        }
      `,
      variables: {
        pool: pool0,
        inputAmount: inputAmount,
        sqrtPriceLimitX96: null,
      },
    });
    expect(query.errors).toBeFalsy();
    expect(query.data).toBeTruthy();

    const { amount, nextPool }: PoolChangeResult = query.data!.getPoolOutputAmount;
    const uniInputAmount = uniCore.CurrencyAmount.fromRawAmount<uniCore.Token>(uniPool0.token0, inputAmount.amount);
    const [uniCurrencyAmount, uniPool] = await uniPool0.getOutputAmount(uniInputAmount);

    // output amount
    expect(amount.token.address).toEqual(uniCurrencyAmount.currency.address);
    expect(amount.amount).toEqual(uniCurrencyAmount.numerator.toString());
    // pool state
    expect(nextPool.sqrtRatioX96).toEqual(uniPool.sqrtRatioX96.toString());
    expect(nextPool.liquidity).toEqual(uniPool.liquidity.toString());
    expect(nextPool.tickCurrent).toEqual(uniPool.tickCurrent);
  });

  it("getPoolInputAmount", async () => {
    // const pool0 = (await getPools(client, ensUri, true, 0, 1))[0];
    // const uniPool0 = (await getUniPools(ethersProvider, true, 0, 1))[0];
    const outputAmount: TokenAmount = {
      token: pool0.token0,
      amount: "1000000000000000000",
    }
    const query = await client.query<{
      getPoolInputAmount: PoolChangeResult;
    }>({
      uri: ensUri,
      query: `
        query {
          getPoolInputAmount(
            pool: $pool
            outputAmount: $outputAmount
            sqrtPriceLimitX96: $sqrtPriceLimitX96
          )
        }
      `,
      variables: {
        pool: pool0,
        outputAmount: outputAmount,
        sqrtPriceLimitX96: null,
      },
    });
    expect(query.errors).toBeFalsy();
    expect(query.data).toBeTruthy();

    const { amount, nextPool }: PoolChangeResult = query.data!.getPoolInputAmount;
    const unitOutputAmount = uniCore.CurrencyAmount.fromRawAmount<uniCore.Token>(uniPool0.token0, outputAmount.amount);
    const [uniCurrencyAmount, uniPool] = await uniPool0.getInputAmount(unitOutputAmount);

    // input amount
    expect(amount.token.address).toEqual(uniCurrencyAmount.currency.address);
    expect(amount.amount).toEqual(uniCurrencyAmount.numerator.toString());
    // pool state
    expect(nextPool.sqrtRatioX96).toEqual(uniPool.sqrtRatioX96.toString());
    expect(nextPool.liquidity).toEqual(uniPool.liquidity.toString());
    expect(nextPool.tickCurrent).toEqual(uniPool.tickCurrent);
  });
});
