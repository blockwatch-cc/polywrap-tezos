import { BigInt } from "@polywrap/wasm-as";
import { encodeSqrtRatioX96, maxLiquidityForAmounts } from "../../..";
import { MAX_UINT_256 } from "../../../utils";

describe('maxLiquidityForAmounts', () => {
  describe('imprecise', () => {
    describe('price inside', () => {
      it('100 token0, 200 token1', () => {
        const result: BigInt = maxLiquidityForAmounts({
          sqrtRatioCurrentX96: encodeSqrtRatioX96({ amount1: BigInt.ONE, amount0: BigInt.ONE}),
          sqrtRatioAX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(100), amount0: BigInt.fromUInt16(110)}),
          sqrtRatioBX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(110), amount0: BigInt.fromUInt16(100)}),
          amount0: BigInt.fromString("100"),
          amount1: BigInt.fromString("200"),
          useFullPrecision: false,
        });
        expect(result.toString()).toStrictEqual("2148");
      });

      it('100 token0, max token1', () => {
        const result: BigInt = maxLiquidityForAmounts({
          sqrtRatioCurrentX96: encodeSqrtRatioX96({ amount1: BigInt.ONE, amount0: BigInt.ONE}),
          sqrtRatioAX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(100), amount0: BigInt.fromUInt16(110)}),
          sqrtRatioBX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(110), amount0: BigInt.fromUInt16(100)}),
          amount0: BigInt.fromString("100"),
          amount1: MAX_UINT_256,
          useFullPrecision: false,
        });
        expect(result.toString()).toStrictEqual("2148");
      });

      it('max token0, 200 token1', () => {
        const result: BigInt = maxLiquidityForAmounts({
          sqrtRatioCurrentX96: encodeSqrtRatioX96({ amount1: BigInt.ONE, amount0: BigInt.ONE}),
          sqrtRatioAX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(100), amount0: BigInt.fromUInt16(110)}),
          sqrtRatioBX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(110), amount0: BigInt.fromUInt16(100)}),
          amount0: MAX_UINT_256,
          amount1: BigInt.fromString("200"),
          useFullPrecision: false,
        });
        expect(result.toString()).toStrictEqual("4297");
      });
    });

    describe('price below', () => {
      it('100 token0, 200 token1', () => {
        const result: BigInt = maxLiquidityForAmounts({
          sqrtRatioCurrentX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(99), amount0: BigInt.fromUInt16(110)}),
          sqrtRatioAX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(100), amount0: BigInt.fromUInt16(110)}),
          sqrtRatioBX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(110), amount0: BigInt.fromUInt16(100)}),
          amount0: BigInt.fromString("100"),
          amount1: BigInt.fromString("200"),
          useFullPrecision: false,
        });
        expect(result.toString()).toStrictEqual("1048");
      });

      it('100 token0, max token1', () => {
        const result: BigInt = maxLiquidityForAmounts({
          sqrtRatioCurrentX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(99), amount0: BigInt.fromUInt16(110)}),
          sqrtRatioAX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(100), amount0: BigInt.fromUInt16(110)}),
          sqrtRatioBX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(110), amount0: BigInt.fromUInt16(100)}),
          amount0: BigInt.fromString("100"),
          amount1: MAX_UINT_256,
          useFullPrecision: false,
        });
        expect(result.toString()).toStrictEqual("1048");
      });

      it('max token0, 200 token1', () => {
        const result: BigInt = maxLiquidityForAmounts({
          sqrtRatioCurrentX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(99), amount0: BigInt.fromUInt16(110)}),
          sqrtRatioAX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(100), amount0: BigInt.fromUInt16(110)}),
          sqrtRatioBX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(110), amount0: BigInt.fromUInt16(100)}),
          amount0: MAX_UINT_256,
          amount1: BigInt.fromString("200"),
          useFullPrecision: false,
        });
        expect(result.toString()).toStrictEqual('1214437677402050006470401421068302637228917309992228326090730924516431320489727');
      });
    });

    describe('price above', () => {
      it('100 token0, 200 token1', () => {
        const result: BigInt = maxLiquidityForAmounts({
            sqrtRatioCurrentX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(111), amount0: BigInt.fromUInt16(100)}),
            sqrtRatioAX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(100), amount0: BigInt.fromUInt16(110)}),
            sqrtRatioBX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(110), amount0: BigInt.fromUInt16(100)}),
            amount0: BigInt.fromString("100"),
            amount1: BigInt.fromString("200"),
            useFullPrecision: false,
          });
        expect(result.toString()).toStrictEqual("2097");
      });

      it('100 token0, max token1', () => {
        const result: BigInt = maxLiquidityForAmounts({
          sqrtRatioCurrentX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(111), amount0: BigInt.fromUInt16(100)}),
          sqrtRatioAX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(100), amount0: BigInt.fromUInt16(110)}),
          sqrtRatioBX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(110), amount0: BigInt.fromUInt16(100)}),
          amount0: BigInt.fromString("100"),
          amount1: MAX_UINT_256,
          useFullPrecision: false,
        });
        expect(result.toString()).toStrictEqual('1214437677402050006470401421098959354205873606971497132040612572422243086574654');
      });

      it('max token0, 200 token1', () => {
        const result: BigInt = maxLiquidityForAmounts({
          sqrtRatioCurrentX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(111), amount0: BigInt.fromUInt16(100)}),
          sqrtRatioAX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(100), amount0: BigInt.fromUInt16(110)}),
          sqrtRatioBX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(110), amount0: BigInt.fromUInt16(100)}),
          amount0: MAX_UINT_256,
          amount1: BigInt.fromString("200"),
          useFullPrecision: false,
        });
        expect(result.toString()).toStrictEqual("2097");
      });
    });
  });

  describe('precise', () => {
    describe('price inside', () => {
      it('100 token0, 200 token1', () => {
        const result: BigInt = maxLiquidityForAmounts({
          sqrtRatioCurrentX96: encodeSqrtRatioX96({ amount1: BigInt.ONE, amount0: BigInt.ONE}),
          sqrtRatioAX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(100), amount0: BigInt.fromUInt16(110)}),
          sqrtRatioBX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(110), amount0: BigInt.fromUInt16(100)}),
          amount0: BigInt.fromString("100"),
          amount1: BigInt.fromString("200"),
          useFullPrecision: true,
        });
        expect(result.toString()).toStrictEqual("2148");
      });

      it('100 token0, max token1', () => {
        const result: BigInt = maxLiquidityForAmounts({
          sqrtRatioCurrentX96: encodeSqrtRatioX96({ amount1: BigInt.ONE, amount0: BigInt.ONE}),
          sqrtRatioAX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(100), amount0: BigInt.fromUInt16(110)}),
          sqrtRatioBX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(110), amount0: BigInt.fromUInt16(100)}),
          amount0: BigInt.fromString("100"),
          amount1: MAX_UINT_256,
          useFullPrecision: true,
        });
        expect(result.toString()).toStrictEqual("2148");
      });

      it('max token0, 200 token1', () => {
        const result: BigInt = maxLiquidityForAmounts({
          sqrtRatioCurrentX96: encodeSqrtRatioX96({ amount1: BigInt.ONE, amount0: BigInt.ONE}),
          sqrtRatioAX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(100), amount0: BigInt.fromUInt16(110)}),
          sqrtRatioBX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(110), amount0: BigInt.fromUInt16(100)}),
          amount0: MAX_UINT_256,
          amount1: BigInt.fromString("200"),
          useFullPrecision: true,
        });
        expect(result.toString()).toStrictEqual("4297");
      });
    });

    describe('price below', () => {
      it('100 token0, 200 token1', () => {
        const result: BigInt = maxLiquidityForAmounts({
          sqrtRatioCurrentX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(99), amount0: BigInt.fromUInt16(110)}),
          sqrtRatioAX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(100), amount0: BigInt.fromUInt16(110)}),
          sqrtRatioBX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(110), amount0: BigInt.fromUInt16(100)}),
          amount0: BigInt.fromString("100"),
          amount1: BigInt.fromString("200"),
          useFullPrecision: true,
        });
        expect(result.toString()).toStrictEqual("1048");
      });

      it('100 token0, max token1', () => {
        const result: BigInt = maxLiquidityForAmounts({
          sqrtRatioCurrentX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(99), amount0: BigInt.fromUInt16(110)}),
          sqrtRatioAX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(100), amount0: BigInt.fromUInt16(110)}),
          sqrtRatioBX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(110), amount0: BigInt.fromUInt16(100)}),
          amount0: BigInt.fromString("100"),
          amount1: MAX_UINT_256,
          useFullPrecision: true,
        });
        expect(result.toString()).toStrictEqual("1048");
      });

      it('max token0, 200 token1', () => {
        const result: BigInt = maxLiquidityForAmounts({
          sqrtRatioCurrentX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(99), amount0: BigInt.fromUInt16(110)}),
          sqrtRatioAX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(100), amount0: BigInt.fromUInt16(110)}),
          sqrtRatioBX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(110), amount0: BigInt.fromUInt16(100)}),
          amount0: MAX_UINT_256,
          amount1: BigInt.fromString("200"),
          useFullPrecision: true,
        });
        expect(result.toString()).toStrictEqual('1214437677402050006470401421082903520362793114274352355276488318240158678126184');
      });
    });

    describe('price above', () => {
      it('100 token0, 200 token1', () => {
        const result: BigInt = maxLiquidityForAmounts({
          sqrtRatioCurrentX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(111), amount0: BigInt.fromUInt16(100)}),
          sqrtRatioAX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(100), amount0: BigInt.fromUInt16(110)}),
          sqrtRatioBX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(110), amount0: BigInt.fromUInt16(100)}),
          amount0: BigInt.fromString("100"),
          amount1: BigInt.fromString("200"),
          useFullPrecision: true,
        });
        expect(result.toString()).toStrictEqual("2097");
      });

      it('100 token0, max token1', () => {
        const result: BigInt = maxLiquidityForAmounts({
          sqrtRatioCurrentX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(111), amount0: BigInt.fromUInt16(100)}),
          sqrtRatioAX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(100), amount0: BigInt.fromUInt16(110)}),
          sqrtRatioBX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(110), amount0: BigInt.fromUInt16(100)}),
          amount0: BigInt.fromString("100"),
          amount1: MAX_UINT_256,
          useFullPrecision: true,
        });
        expect(result.toString()).toStrictEqual('1214437677402050006470401421098959354205873606971497132040612572422243086574654');
      });

      it('max token0, 200 token1', () => {
        const result: BigInt = maxLiquidityForAmounts({
          sqrtRatioCurrentX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(111), amount0: BigInt.fromUInt16(100)}),
          sqrtRatioAX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(100), amount0: BigInt.fromUInt16(110)}),
          sqrtRatioBX96: encodeSqrtRatioX96({ amount1: BigInt.fromUInt16(110), amount0: BigInt.fromUInt16(100)}),
          amount0: MAX_UINT_256,
          amount1: BigInt.fromString("200"),
          useFullPrecision: true,
        });
        expect(result.toString()).toStrictEqual("2097");
      });
    });
  });
});