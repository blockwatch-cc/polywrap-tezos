import { ChainId, FeeAmount, Pool, Token } from "../../../wrap";
import { createPool, encodeSqrtRatioX96, nearestUsableTick, simulateSwap } from "../../..";
import { BigInt } from "@polywrap/wasm-as";
import { _MAX_SQRT_RATIO, _MAX_TICK, _MIN_SQRT_RATIO, _MIN_TICK, _feeAmountToTickSpacing } from "../../../utils";

const USDC: Token = {
  chainId: ChainId.MAINNET,
  address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  currency: {
    decimals: 6,
    symbol: "USDC",
    name: "USD Coin",
  },
};
const DAI: Token = {
  chainId: ChainId.MAINNET,
  address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  currency: {
    decimals: 18,
    symbol: "DAI",
    name: "DAI Stablecoin",
  },
};
const ONE_ETHER: BigInt = BigInt.pow(BigInt.fromUInt16(10), 18);

const pool: Pool = createPool({
  tokenA: USDC,
  tokenB: DAI,
  fee: FeeAmount.LOW,
  sqrtRatioX96: encodeSqrtRatioX96({ amount1: BigInt.ONE, amount0: BigInt.ONE }),
  liquidity: ONE_ETHER,
  tickCurrent: 0,
  ticks: [
    {
      index: nearestUsableTick({ tick: _MIN_TICK, tickSpacing: _feeAmountToTickSpacing(FeeAmount.LOW) }),
      liquidityNet: ONE_ETHER,
      liquidityGross: ONE_ETHER
    },
    {
      index: nearestUsableTick({ tick: _MAX_TICK, tickSpacing: _feeAmountToTickSpacing(FeeAmount.LOW) }),
      liquidityNet: ONE_ETHER.opposite(),
      liquidityGross: ONE_ETHER
    }],
});

describe('Pool Utils', () => {
  describe('simulateSwap', () => {
    it('throws if sqrtRatio <= MIN and zeroForOne = true', () => {
      const error = (): void => {
        simulateSwap(pool, false, BigInt.fromUInt16(100), _MIN_SQRT_RATIO)
      };
      expect(error).toThrow(`RATIO_MIN: input sqrtPriceLimitX96 ${_MIN_SQRT_RATIO.toString()} is less than or equal to the minimum sqrt ratio ${_MIN_SQRT_RATIO.toString()}`);
    });

    it('throws if sqrtRatio >= pool.sqrtRatioX96 and zeroForOne = true', () => {
      const error = (): void => {
        simulateSwap(pool, false, BigInt.fromUInt16(100), pool.sqrtRatioX96)
      };
      expect(error).toThrow(`RATIO_CURRENT: input sqrtPriceLimitX96 ${pool.sqrtRatioX96.toString()} is greater than or equal to the pool's current sqrt ratio ${pool.sqrtRatioX96.toString()}`);
    });

    it('throws if sqrtRatio >= MAX and zeroForOne = false', () => {
      const error = (): void => {
        simulateSwap(pool, false, BigInt.fromUInt16(100), _MAX_SQRT_RATIO)
      };
      expect(error).toThrow(`RATIO_MAX: input sqrtPriceLimitX96 ${_MAX_SQRT_RATIO.toString()} is greater than or equal to the maximum sqrt ratio ${_MAX_SQRT_RATIO.toString()}`);
    });

    it('throws if sqrtRatio <= pool.sqrtRatioX96 and zeroForOne = false', () => {
      const error = (): void => {
        simulateSwap(pool, false, BigInt.fromUInt16(100), pool.sqrtRatioX96)
      };
      expect(error).toThrow(`RATIO_CURRENT: input sqrtPriceLimitX96 ${pool.sqrtRatioX96.toString()} is less than or equal to the pool's current sqrt ratio ${pool.sqrtRatioX96.toString()}`);
    });
  });
});