import { buildAndDeployApi, initTestEnvironment, stopTestEnvironment } from "@web3api/test-env-js";
import { ClientConfig, Web3ApiClient } from "@web3api/client-js";
import { Pool, Route, Token, Price } from "../types";
import path from "path";
import { getPlugins, getPoolFromAddress, getTokens, isDefined, toUniToken } from "../testUtils";
import * as uni from "@uniswap/v3-sdk";
import * as uniCore from "@uniswap/sdk-core";
import * as ethers from "ethers";
import { getUniswapPool } from "../uniswapCreatePool";

jest.setTimeout(120000);

describe("Route (mainnet fork)", () => {

  const DAI_WETH_address = "0xc2e9f25be6257c210d7adf0d4cd6e3e881ba25f8";
  //const DAI_WETH_address = "0x60594a405d53811d3bc4766596efd80fd545a270";
  const DAI_USDC_address = "0x6c6bc977e13df9b0de53b251522280bb72383700";
  const USDC_USDT_address = "0x3416cf6c708da44db2624d63ea0aaef7113527c6";

  let client: Web3ApiClient;
  let ensUri: string;
  let tokens: Token[];
  let pools: Pool[];
  let uniPools: uni.Pool[];
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
    // set up test case data
    pools = [
      await getPoolFromAddress(client, ensUri, DAI_WETH_address, false),
      await getPoolFromAddress(client, ensUri, DAI_USDC_address, false),
      await getPoolFromAddress(client, ensUri, USDC_USDT_address, false),
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
    await stopTestEnvironment();
  });

  it("Route mid price", async () => {
    const [inToken, outToken]: Token[] = [
      tokens.find((token: Token) => token.currency.symbol === "WETH"),
      tokens.find((token: Token) => token.currency.symbol === "USDT"),
    ].filter(isDefined);

    const routeQuery = await client.query<{
      createRoute: Route;
    }>({
      uri: ensUri,
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

    const midPriceQuery = await client.query<{
      routeMidPrice: Price;
    }>({
      uri: ensUri,
      query: `
        query {
          routeMidPrice(
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
    expect(midPriceQuery.errors).toBeFalsy();
    expect(midPriceQuery.data).toBeTruthy();

    const price: Price = midPriceQuery.data!.routeMidPrice;
    const uniPrice: uniCore.Price<uniCore.Token, uniCore.Token> = uniRoute.midPrice;
    expect(price.price).toEqual(uniPrice.toFixed(18));
    expect(price).toStrictEqual(route.midPrice);
  });
});
