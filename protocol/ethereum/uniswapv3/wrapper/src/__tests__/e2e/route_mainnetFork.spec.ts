import { PolywrapClient } from "@polywrap/client-js";
import path from "path";
import * as uni from "@uniswap/v3-sdk";
import * as uniCore from "@uniswap/sdk-core";
import * as ethers from "ethers";
import {
  initInfra, stopInfra, getPlugins,
  getUniswapPool, getPoolFromAddress, getTokens, isDefined, toUniToken,
  Pool, Route, Token, Price
} from "./helpers";

jest.setTimeout(120000);

describe("Route (mainnet fork)", () => {

  const DAI_WETH_address = "0xc2e9f25be6257c210d7adf0d4cd6e3e881ba25f8";
  const DAI_USDC_address = "0x6c6bc977e13df9b0de53b251522280bb72383700";
  const USDC_USDT_address = "0x3416cf6c708da44db2624d63ea0aaef7113527c6";

  let client: PolywrapClient;
  let fsUri: string;
  let tokens: Token[];
  let pools: Pool[];
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
    // set up test case data
    pools = [
      await getPoolFromAddress(client, fsUri, DAI_WETH_address, false),
      await getPoolFromAddress(client, fsUri, DAI_USDC_address, false),
      await getPoolFromAddress(client, fsUri, USDC_USDT_address, false),
    ].filter(isDefined);
    tokens = getTokens(pools);
    // set up ethers provider
    ethersProvider = ethers.providers.getDefaultProvider("http://localhost:8546");
    // get uni pools
    uniPools = [
      await getUniswapPool(ethersProvider, DAI_WETH_address, false),
      await getUniswapPool(ethersProvider, DAI_USDC_address, false),
      await getUniswapPool(ethersProvider, USDC_USDT_address, false),
    ].filter(isDefined);
  });

  afterAll(async () => {
    await stopInfra();
  });

  it("Route mid price", async () => {
    const [inToken, outToken]: Token[] = [
      tokens.find((token: Token) => token.currency.symbol === "WETH"),
      tokens.find((token: Token) => token.currency.symbol === "USDT"),
    ].filter(isDefined);

    const routeQuery = await client.query<{
      createRoute: Route;
    }>({
      uri: fsUri,
      query: `
        query {
          createRoute(
            pools: $pools
            inToken: $inToken
            outToken: $outToken
          )
        }
      `,
      variables: {
        pools: pools,
        inToken: inToken,
        outToken: outToken,
      },
    });
    expect(routeQuery.errors).toBeFalsy();
    expect(routeQuery.data?.createRoute).toBeTruthy();

    const route: Route = routeQuery.data!.createRoute;
    const uniRoute: uni.Route<uniCore.Token, uniCore.Token> = new uni.Route(uniPools, toUniToken(inToken), toUniToken(outToken));

    const midPriceInvocation = await client.invoke<Price>({
      uri: fsUri,
      method: "routeMidPrice",
      args: {
        pools: pools,
        inToken: inToken,
        outToken: outToken,
      },
    });
    expect(midPriceInvocation.error).toBeFalsy();
    expect(midPriceInvocation.data).toBeTruthy();

    const price = midPriceInvocation.data;
    const uniPrice: uniCore.Price<uniCore.Token, uniCore.Token> = uniRoute.midPrice;
    expect(price?.price).toEqual(uniPrice.toFixed(18));
    expect(price).toStrictEqual(route.midPrice);
  });
});
