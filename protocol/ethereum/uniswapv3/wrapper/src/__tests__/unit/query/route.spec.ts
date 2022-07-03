import { ETHER, _getWETH } from "../../../utils/tokenUtils";
import { ChainId, FeeAmount, Pool, Price, Route, Token } from "../../../query/w3";
import { createPool, encodeSqrtRatioX96, getTickAtSqrtRatio } from "../../../query";
import { BigInt } from "@web3api/wasm-as";
import { createRoute, routeChainId, routeMidPrice } from "../../../query";
import { BigFloat } from "as-bigfloat";

const getTestToken = (i: i32): Token => {
  return {
    chainId: ChainId.MAINNET,
    address: "0x000000000000000000000000000000000000000" + i.toString(),
    currency: {
      decimals: 18,
      symbol: "t" + i.toString(),
      name: null,
    }
  }
}

const getTestPool = (tokenA: Token, tokenB: Token, amount1: BigInt, amount0: BigInt): Pool => {
  const sqrtRatioX96: BigInt = encodeSqrtRatioX96({ amount1, amount0 });
  return createPool({
    tokenA: tokenA,
    tokenB: tokenB,
    fee: FeeAmount.MEDIUM,
    sqrtRatioX96: sqrtRatioX96,
    liquidity: BigInt.ZERO,
    tickCurrent: getTickAtSqrtRatio({ sqrtRatioX96 }),
    ticks: [],
  });
}

const eth: Token = {
  chainId: ChainId.MAINNET,
  address: "",
  currency: ETHER,
};
const weth: Token = _getWETH(ChainId.MAINNET);
const token0: Token = getTestToken(0);
const token1: Token = getTestToken(1);
const token2: Token = getTestToken(2);
let pool_0_1: Pool;
let pool_0_weth: Pool;
let pool_1_weth: Pool;
let pool_1_2: Pool;

describe('Route', () => {

  describe('createRoute', () => {

    beforeAll(() => {
      pool_0_1 = getTestPool(token0, token1, BigInt.ONE, BigInt.ONE);
      pool_0_weth = getTestPool(token0, weth, BigInt.ONE, BigInt.ONE);
      pool_1_weth = getTestPool(token1, weth, BigInt.ONE, BigInt.ONE);
    });

    it('constructs a path from the tokens', () => {
      const route: Route = createRoute({
        pools: [pool_0_1],
        inToken: token0,
        outToken: token1,
      });
      expect(route.pools).toStrictEqual([pool_0_1]);
      expect(route.path).toStrictEqual([token0, token1]);
      expect(route.input).toStrictEqual(token0);
      expect(route.output).toStrictEqual(token1);
      expect(routeChainId({ route })).toStrictEqual(ChainId.MAINNET);
    });

    it('should fail if the input is not in the first pool', () => {
      const error = (): void => {
        createRoute({ pools: [pool_0_1], inToken: weth, outToken: token1 });
      };
      expect(error).toThrow();
    });

    it('should fail if output is not in the last pool', () => {
      const error = (): void => {
        createRoute({ pools: [pool_0_1], inToken: token0, outToken: weth });
      };
      expect(error).toThrow();
    });

    it('can have a token as both input and output', () => {
      const route: Route = createRoute({
        pools: [pool_0_weth, pool_0_1, pool_1_weth],
        inToken: weth,
        outToken: weth,
      });
      expect(route.pools).toStrictEqual([pool_0_weth, pool_0_1, pool_1_weth]);
      expect(route.input).toStrictEqual(weth);
      expect(route.output).toStrictEqual(weth);
    });

    it('supports ether input', () => {
      const route: Route = createRoute({
        pools: [pool_0_weth],
        inToken: eth,
        outToken: token0,
      });
      expect(route.pools).toStrictEqual([pool_0_weth]);
      expect(route.input).toStrictEqual(eth);
      expect(route.output).toStrictEqual(token0);
    });

    it('supports ether output', () => {
      const route: Route = createRoute({
        pools: [pool_0_weth],
        inToken: token0,
        outToken: eth,
      });
      expect(route.pools).toStrictEqual([pool_0_weth]);
      expect(route.input).toStrictEqual(token0);
      expect(route.output).toStrictEqual(eth);
    });
  });

  describe('routeMidPrice', () => {

    beforeAll(() => {
      pool_0_1 = getTestPool(token0, token1, BigInt.fromUInt16(1), BigInt.fromUInt16(5));
      pool_1_2 = getTestPool(token1, token2, BigInt.fromUInt16(15), BigInt.fromUInt16(30));
      pool_0_weth = getTestPool(token0, weth, BigInt.fromUInt16(3), BigInt.fromUInt16(1));
      pool_1_weth = getTestPool(token1, weth, BigInt.fromUInt16(1), BigInt.fromUInt16(7));
    });

    it('correct for 0 -> 1', () => {
      const route: Route = createRoute({
        pools: [pool_0_1],
        inToken: token0,
        outToken: token1,
      });
      const price: Price = routeMidPrice({
        pools: [pool_0_1],
        inToken: token0,
        outToken: token1,
      });
      expect(price).toStrictEqual(route.midPrice);
      expect(price.price.substring(0, 6)).toStrictEqual('0.2000');
      expect(price.baseToken).toStrictEqual(token0);
      expect(price.quoteToken).toStrictEqual(token1);
    });

    it('correct for 1 -> 0', () => {
      const route: Route = createRoute({
        pools: [pool_0_1],
        inToken: token1,
        outToken: token0,
      });
      const price: Price = routeMidPrice({
        pools: [pool_0_1],
        inToken: token1,
        outToken: token0,
      });
      expect(price).toStrictEqual(route.midPrice);
      expect(price.price.substring(0, 6)).toStrictEqual('5.0000');
      expect(price.baseToken).toStrictEqual(token1);
      expect(price.quoteToken).toStrictEqual(token0);
    });

    it('correct for 0 -> 1 -> 2', () => {
      const route: Route = createRoute({
        pools: [pool_0_1, pool_1_2],
        inToken: token0,
        outToken: token2,
      });
      const price: Price = routeMidPrice({
        pools: [pool_0_1, pool_1_2],
        inToken: token0,
        outToken: token2,
      });
      expect(price).toStrictEqual(route.midPrice);
      expect(price.price.substring(0, 6)).toStrictEqual('0.1000');
      expect(price.baseToken).toStrictEqual(token0);
      expect(price.quoteToken).toStrictEqual(token2);
    });

    it('correct for 2 -> 1 -> 0', () => {
      const route: Route = createRoute({
        pools: [pool_1_2, pool_0_1],
        inToken: token2,
        outToken: token0,
      });
      const price: Price = routeMidPrice({
        pools: [pool_1_2, pool_0_1],
        inToken: token2,
        outToken: token0,
      });
      expect(price).toStrictEqual(route.midPrice);
      expect(price.price.substring(0, 7)).toStrictEqual('10.0000');
      expect(price.baseToken).toStrictEqual(token2);
      expect(price.quoteToken).toStrictEqual(token0);
    });

    it('correct for ether -> 0', () => {
      const route: Route = createRoute({
        pools: [pool_0_weth],
        inToken: eth,
        outToken: token0,
      });
      const price: Price = routeMidPrice({
        pools: [pool_0_weth],
        inToken: eth,
        outToken: token0,
      });
      expect(price).toStrictEqual(route.midPrice);
      expect(price.price.substring(0, 6)).toStrictEqual('0.3333');
      expect(price.baseToken).toStrictEqual(eth);
      expect(price.quoteToken).toStrictEqual(token0);
    });

    it('correct for 1 -> weth', () => {
      const route: Route = createRoute({
        pools: [pool_1_weth],
        inToken: token1,
        outToken: weth,
      });
      const price: Price = routeMidPrice({
        pools: [pool_1_weth],
        inToken: token1,
        outToken: weth,
      });
      expect(price).toStrictEqual(route.midPrice);
      const priceStr: string = BigFloat.fromString(price.price).toFixed(4);
      expect(priceStr).toStrictEqual('0.1429');
      expect(price.baseToken).toStrictEqual(token1);
      expect(price.quoteToken).toStrictEqual(weth);
    });

    it('correct for ether -> 0 -> 1 -> weth', () => {
      const route: Route = createRoute({
        pools: [pool_0_weth, pool_0_1, pool_1_weth],
        inToken: eth,
        outToken: weth,
      });
      const price: Price = routeMidPrice({
        pools: [pool_0_weth, pool_0_1, pool_1_weth],
        inToken: eth,
        outToken: weth,
      });
      expect(price).toStrictEqual(route.midPrice);
      const priceStr: string = BigFloat.fromString(price.price).toFixed(6);
      expect(priceStr).toStrictEqual('0.009524');
      expect(price.baseToken).toStrictEqual(eth);
      expect(price.quoteToken).toStrictEqual(weth);
    });

    it('correct for weth -> 0 -> 1 -> ether', () => {
      const route: Route = createRoute({
        pools: [pool_0_weth, pool_0_1, pool_1_weth],
        inToken: weth,
        outToken: eth,
      });
      const price: Price = routeMidPrice({
        pools: [pool_0_weth, pool_0_1, pool_1_weth],
        inToken: weth,
        outToken: eth,
      });
      expect(price).toStrictEqual(route.midPrice);
      const priceStr: string = BigFloat.fromString(price.price).toFixed(6);
      expect(priceStr).toStrictEqual('0.009524');
      expect(price.baseToken).toStrictEqual(weth);
      expect(price.quoteToken).toStrictEqual(eth);
    });
  });
});