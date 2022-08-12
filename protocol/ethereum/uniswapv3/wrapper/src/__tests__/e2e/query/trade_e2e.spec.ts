import { buildAndDeployApi, initTestEnvironment, stopTestEnvironment } from "@web3api/test-env-js";
import { ClientConfig, Web3ApiClient } from "@web3api/client-js";
import { ChainIdEnum, Pool, Tick, Token, TokenAmount, Trade } from "../types";
import path from "path";
import { getPlugins, getPools, getTokens, getUniPools } from "../testUtils";
import * as uni from "@uniswap/v3-sdk";
import * as uniCore from "@uniswap/sdk-core";
import * as ethers from "ethers";

jest.setTimeout(180000);

describe("Trade (mainnet fork)", () => {

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
    const sliceStart = 0;
    const sliceEnd = 3;
    pools = await getPools(client, ensUri, true, sliceStart, sliceEnd);
    tokens = getTokens(pools);
    tokens.push({
      chainId: ChainIdEnum.MAINNET,
      address: "",
      currency: {
        decimals: 18,
        name: "Ether",
        symbol: "ETH",
      },
    });
    // set up ethers provider
    ethersProvider = ethers.providers.getDefaultProvider("http://localhost:8546");
    // get uni pools
    const ticks: Tick[][] = pools.map((pool: Pool): Tick[] => pool.tickDataProvider);
    const uniTicks: uni.Tick[][] = ticks.map(tickArr => tickArr.map(tick => new uni.Tick({ ...tick })));
    uniPools = await getUniPools(ethersProvider, true, sliceStart, sliceEnd, uniTicks);
  });

  afterAll(async () => {
    await stopTestEnvironment();
  });

  it('finds the best trade for exact input (default options)', async () => {
    for (let i = 0; i < tokens.length; i++) {
      for (let j = 0; j < tokens.length; j++) {
        if (tokens[i] === tokens[j]) {
          continue;
        }
        // get best trades
        const amountIn: TokenAmount = {
          token: tokens[i],
          amount: "10000000000"
        }
        const tokenOut = tokens[j];
        const query = await client.invoke<Trade[]>({
          uri: ensUri,
          module: "query",
          method: "bestTradeExactIn",
          input: {
            pools: pools,
            amountIn: amountIn,
            tokenOut: tokenOut,
            options: null,
          },
        });
        expect(query.error).toBeUndefined();
        expect(query.data).toBeDefined();
        const actualTrades: Trade[] = query.data!;

        // get expected best trades
        const uniTokenIn: uniCore.Token = amountIn.token.address === ""
          ? uniCore.WETH9[1]
          : new uniCore.Token(
          1,
          amountIn.token.address,
          amountIn.token.currency.decimals,
          amountIn.token.currency.symbol || "",
          amountIn.token.currency.name || ""
        );
        const uniAmountIn: uniCore.CurrencyAmount<uniCore.Token> = uniCore.CurrencyAmount.fromRawAmount(uniTokenIn, amountIn.amount);
        const uniTokenOut: uniCore.Token = tokenOut.address === ""
          ? uniCore.WETH9[1]
          : new uniCore.Token(
          1,
          tokenOut.address,
          tokenOut.currency.decimals,
          tokenOut.currency.symbol || "",
          tokenOut.currency.name || ""
        );
        const expectedTrades: uni.Trade<uniCore.Token, uniCore.Token, uniCore.TradeType.EXACT_INPUT>[] = await uni.Trade.bestTradeExactIn(uniPools, uniAmountIn, uniTokenOut);

        // compare trade route paths
        expect(actualTrades.length).toStrictEqual(expectedTrades.length);
        for (let k = 0; k < actualTrades.length; k++) {
          const actualTrade = actualTrades[k];
          const expectedTrade = expectedTrades[k];
          expect(actualTrade.swaps.length).toStrictEqual(expectedTrade.swaps.length);
          for (let m = 0; m < actualTrade.swaps.length; m++) {
            const actualRoutePath: string[] = actualTrade.swaps[m].route.path.map(token => token.address) ?? [];
            const expectedRoutePath: string[] = expectedTrade.swaps[m].route.tokenPath.map(token => token.address);
            expect(actualRoutePath).toStrictEqual(expectedRoutePath);
          }
        }
        // compare result amounts
        for (let k = 0; k < actualTrades.length; k++) {
          expect(actualTrades[k].outputAmount.amount).toStrictEqual(expectedTrades[k].outputAmount.numerator.toString());
        }
      }
    }
  });

  it('finds the best trade for exact output (default options)', async () => {
    for (let i = 0; i < tokens.length; i++) {
      for (let j = 0; j < tokens.length; j++) {
        if (tokens[i] === tokens[j]) {
          continue;
        }
        // get best trades
        const tokenIn = tokens[i];
        const amountOut: TokenAmount = {
          token: tokens[j],
          amount: "10000000000"
        }
        const query = await client.invoke<Trade[]>({
          uri: ensUri,
          module: "query",
          method: "bestTradeExactOut",
          input: {
            pools: pools,
            tokenIn: tokenIn,
            amountOut: amountOut,
            options: null,
          },
        });
        expect(query.error).toBeUndefined();
        expect(query.data).toBeDefined();
        const actualTrades: Trade[] = query.data!;

        // get expected best trades
        const uniTokenIn: uniCore.Token = tokenIn.address === ""
          ? uniCore.WETH9[1]
          : new uniCore.Token(
          1,
          tokenIn.address,
          tokenIn.currency.decimals,
          tokenIn.currency.symbol || "",
          tokenIn.currency.name || ""
        );
        const uniTokenOut: uniCore.Token = amountOut.token.address === ""
        ? uniCore.WETH9[1]
        : new uniCore.Token(
          1,
          amountOut.token.address,
          amountOut.token.currency.decimals,
          amountOut.token.currency.symbol || "",
          amountOut.token.currency.name || ""
        );
        const uniAmountOut: uniCore.CurrencyAmount<uniCore.Token> = uniCore.CurrencyAmount.fromRawAmount(
          uniTokenOut, amountOut.amount);
        const expectedTrades: uni.Trade<uniCore.Token, uniCore.Token, uniCore.TradeType.EXACT_OUTPUT>[] = await uni.Trade.bestTradeExactOut(uniPools, uniTokenIn, uniAmountOut);

        // compare trade route paths
        // if (actualTrades.length !== expectedTrades.length) {
        //   const acutalPaths = actualTrades.map(trade => trade.swaps.map(swap => swap.route.path.map(token => token.currency.symbol)));
        //   console.log("received: " + JSON.stringify(acutalPaths, null, 2));
        //   const expectedPaths = expectedTrades.map(trade => trade.swaps.map(swap => swap.route.tokenPath.map(token => token.symbol)));
        //   console.log("expected: " + JSON.stringify(expectedPaths, null, 2));
        // }
        expect(actualTrades.length).toStrictEqual(expectedTrades.length);
        for (let k = 0; k < actualTrades.length; k++) {
          const actualTrade = actualTrades[k];
          const expectedTrade = expectedTrades[k];
          expect(actualTrade.swaps.length).toStrictEqual(expectedTrade.swaps.length);
          for (let m = 0; m < actualTrade.swaps.length; m++) {
            const actualRoutePath: string[] = actualTrade.swaps[m].route.path.map(token => token.address) ?? [];
            const expectedRoutePath: string[] = expectedTrade.swaps[m].route.tokenPath.map(token => token.address);
            expect(actualRoutePath).toStrictEqual(expectedRoutePath);
          }
        }
        // compare result amounts
        for (let k = 0; k < actualTrades.length; k++) {
          expect(actualTrades[k].inputAmount.amount).toStrictEqual(expectedTrades[k].inputAmount.numerator.toString());
        }
      }
    }
  });

});
