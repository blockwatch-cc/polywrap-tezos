import {  PolywrapClient } from "@polywrap/client-js";
import {
  ChainIdEnum, Pool, Token,
  getPlugins, initInfra, stopInfra,
  getFeeAmount, getPools, getTokens, getUniPools,
  getUniswapPool
} from "./helpers";
import path from "path";
import * as uni from "@uniswap/v3-sdk";
import poolList from "./testData/poolList.json";
import * as ethers from "ethers";
import { Tick } from "../../wrap";

jest.setTimeout(180000);

describe("Fetch (mainnet fork)", () => {

  let client: PolywrapClient;
  let fsUri: string;
  let poolAddresses: string[] = poolList;
  let uniPools: uni.Pool[];
  let ethersProvider: ethers.providers.BaseProvider;

  beforeAll(async () => {
    await initInfra();
    // get client
    const config = getPlugins();
    client = new PolywrapClient(config);
    // get uri
    const wrapperAbsPath: string = path.resolve(__dirname + "/../../../");
    fsUri = "fs/" + wrapperAbsPath + '/build';
    // set up ethers provider
    ethersProvider = ethers.providers.getDefaultProvider("http://localhost:8546");
    // get uni pools
    uniPools = await getUniPools(ethersProvider);
  });

  afterAll(async () => {
    await stopInfra();
  });

  it("fetchTickList", async () => {
    const uniPool: uni.Pool = await getUniswapPool(ethersProvider, poolAddresses[0], true);
    const tickListQuery = await client.invoke<Tick[]>({
      uri: fsUri,
      method: "fetchTickList",
      args: {
        chainId: ChainIdEnum[ChainIdEnum.MAINNET],
        address: poolAddresses[0],
      },
    });
    expect(tickListQuery.error).toBeFalsy();
    expect(tickListQuery.data).toBeTruthy();

    const tickList = tickListQuery.data!;
    for (let i = 0; i < tickList.length; i++) {
      const tick = tickList[i];
      // @ts-ignore
      const uniTick: uni.Tick = await uniPool.tickDataProvider.getTick(tick.index);
      expect(tick.index).toEqual(uniTick.index);
      expect(tick.liquidityNet.toString()).toEqual(uniTick.liquidityNet.toString());
      expect(tick.liquidityGross.toString()).toEqual(uniTick.liquidityGross.toString());
    }
  });

  it("fetchPoolFromAddress", async () => {
    for (let i = 0; i < 3; i++) {
      // fetch pool
      const poolData = await client.invoke<Pool>({
        uri: fsUri,
        method: "fetchPoolFromAddress",
        args: {
          chainId: ChainIdEnum[ChainIdEnum.MAINNET],
          address: poolAddresses[i],
          fetchTicks: false,
        },
      });
      expect(poolData.error).toBeFalsy();
      expect(poolData.data).toBeTruthy();

      const pool = poolData.data!;
      const uniPool: uni.Pool = uniPools[i];

      expect(pool.token0.address).toEqual(uniPool.token0.address);
      expect(pool.token1.address).toEqual(uniPool.token1.address);
      expect(getFeeAmount(pool.fee)).toEqual(uniPool.fee.valueOf());
      expect(pool.sqrtRatioX96).toEqual(uniPool.sqrtRatioX96.toString());
      expect(pool.liquidity).toEqual(uniPool.liquidity.toString());
      expect(pool.tickCurrent).toEqual(uniPool.tickCurrent);
    }
  });

  it("fetchToken", async () => {
    const pools: Pool[] = await getPools(client, fsUri, false, 3, 6);
    const tokens: Token[] = getTokens(pools);
    for (let i = 0; i < tokens.length; i++) {
      // fetch token
      const tokenData = await client.invoke<Token>({
        uri: fsUri,
        method: "fetchToken",
        args: {
          chainId: ChainIdEnum[tokens[i].chainId],
          address: tokens[i].address,
        },
      });
      // compare results
      expect(tokenData.error).toBeFalsy();
      expect(tokenData.data).toBeTruthy();
      expect(tokenData.data?.currency.decimals).toEqual(tokens[i].currency.decimals);
      expect(tokenData.data?.currency.symbol).toEqual(tokens[i].currency.symbol);
      expect(tokenData.data?.currency.name).toEqual(tokens[i].currency.name);
    }
  });
  
  it("fetchPoolFromTokens", async () => {
    const pools: Pool[] = await getPools(client, fsUri, false, 6, 9);
    for (let i = 0; i < pools.length; i++) {
      // fetch pool
      const poolData = await client.invoke<Pool>({
        uri: fsUri,
        method: "fetchPoolFromTokens",
        args: {
          tokenA: pools[i].token0,
          tokenB: pools[i].token1,
          fee: pools[i].fee,
          fetchTicks: false,
        },
      });
      expect(poolData.error).toBeFalsy();
      expect(poolData.data).toBeTruthy();

      const pool = poolData.data;
      const expectedPool: Pool = pools[i];
      expect(pool).toStrictEqual(expectedPool);
    }
  });
});
