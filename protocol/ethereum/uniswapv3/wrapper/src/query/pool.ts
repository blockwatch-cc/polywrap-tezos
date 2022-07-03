/* eslint-disable @typescript-eslint/no-non-null-assertion */

import {
  ChainId,
  FeeAmount,
  Input_createPool,
  Input_getPoolAddress,
  Input_getPoolInputAmount,
  Input_getPoolOutputAmount,
  Input_getPoolTickSpacing,
  Input_poolChainId,
  Input_poolInvolvesToken,
  Input_poolPriceOf,
  Input_poolToken0Price,
  Input_poolToken1Price,
  Pool,
  PoolChangeResult,
  Price as PriceType,
  Tick,
  Token,
  TokenAmount,
} from "./w3";
import {
  computePoolAddress,
  SimulatedSwapResult,
  simulateSwap,
} from "./poolUtils";
import { FACTORY_ADDRESS, Q192 } from "../utils/constants";
import * as TickUtils from "./tickUtils";
import { tokenEquals, tokenSortsBefore } from "./token";
import Price from "../utils/Price";
import { _feeAmountToTickSpacing } from "../utils/enumUtils";

import { BigInt } from "@web3api/wasm-as";

/**
 * constructs and validates a Pool
 */
export function createPool(input: Input_createPool): Pool {
  const tokenA: Token = input.tokenA;
  const tokenB: Token = input.tokenB;
  const fee: FeeAmount = input.fee;
  const sqrtRatioX96: BigInt = input.sqrtRatioX96;
  const liquidity: BigInt = input.liquidity;
  const tickCurrent: i32 = input.tickCurrent;
  const ticks: Tick[] | null = input.ticks;

  if (tokenA.chainId != tokenB.chainId) {
    throw new Error("CHAIN_IDS: tokens in a pool must have the same chain id");
  }
  if (tokenEquals({ tokenA, tokenB })) {
    throw new Error("ADDRESSES: tokens in a pool cannot have the same address");
  }

  const tickCurrentSqrtRatioX96: BigInt = TickUtils.getSqrtRatioAtTick({
    tick: tickCurrent,
  });
  const nextTickSqrtRatioX96: BigInt = TickUtils.getSqrtRatioAtTick({
    tick: tickCurrent + 1,
  });
  if (
    sqrtRatioX96 < tickCurrentSqrtRatioX96 ||
    sqrtRatioX96 > nextTickSqrtRatioX96
  ) {
    throw new Error("PRICE_BOUNDS: sqrtRatioX96 is invalid for current tick");
  }

  const tokens: Token[] = tokenSortsBefore({ tokenA: tokenA, tokenB: tokenB })
    ? [tokenA, tokenB]
    : [tokenB, tokenA];

  return {
    token0: tokens[0],
    token1: tokens[1],
    fee: fee,
    sqrtRatioX96: sqrtRatioX96,
    liquidity: liquidity,
    tickCurrent: tickCurrent,
    tickDataProvider: ticks === null ? [] : ticks,
    token0Price: poolToken0Price({
      token0: tokens[0],
      token1: tokens[1],
      sqrtRatioX96,
    }),
    token1Price: poolToken1Price({
      token0: tokens[0],
      token1: tokens[1],
      sqrtRatioX96,
    }),
  };
}

/**
 * Returns the Ethereum address of the Pool contract
 */
export function getPoolAddress(input: Input_getPoolAddress): string {
  return computePoolAddress({
    factoryAddress: FACTORY_ADDRESS,
    fee: input.fee,
    tokenA: input.tokenA,
    tokenB: input.tokenB,
    initCodeHashManualOverride: input.initCodeHashManualOverride,
  });
}

/**
 * Returns true if the token is either token0 or token1
 */
export function poolInvolvesToken(input: Input_poolInvolvesToken): boolean {
  const token: Token = input.token;
  const pool: Pool = input.pool;
  return (
    tokenEquals({ tokenA: token, tokenB: pool.token0 }) ||
    tokenEquals({ tokenA: token, tokenB: pool.token1 })
  );
}

/**
 * Returns the current mid price of the pool in terms of token0, i.e. the ratio of token1 over token0
 */
export function poolToken0Price(input: Input_poolToken0Price): PriceType {
  const token0: Token = input.token0;
  const token1: Token = input.token1;
  const sqrtRatioX96: BigInt = input.sqrtRatioX96;
  return new Price(
    token0,
    token1,
    Q192,
    BigInt.mul(sqrtRatioX96, sqrtRatioX96)
  ).toPriceType();
}

/**
 * Returns the current mid price of the pool in terms of token1, i.e. the ratio of token0 over token1
 */
export function poolToken1Price(input: Input_poolToken1Price): PriceType {
  const token0: Token = input.token0;
  const token1: Token = input.token1;
  const sqrtRatioX96: BigInt = input.sqrtRatioX96;
  return new Price(
    token1,
    token0,
    BigInt.mul(sqrtRatioX96, sqrtRatioX96),
    Q192
  ).toPriceType();
}

/**
 * Returns the price of the given token in terms of the other token in the pool
 * @param input.token The token to return price of
 */
export function poolPriceOf(input: Input_poolPriceOf): PriceType {
  const token: Token = input.token;
  const pool: Pool = input.pool;
  if (!poolInvolvesToken({ token: token, pool: pool })) {
    throw new Error(
      "TOKEN: Cannot return the price of a token that is not in the pool"
    );
  }
  return tokenEquals({ tokenA: token, tokenB: pool.token0 })
    ? pool.token0Price
    : pool.token1Price;
}

/**
 * Returns the chain ID of the tokens in the pool
 */
export function poolChainId(input: Input_poolChainId): ChainId {
  return input.pool.token0.chainId;
}

/**
 * Given an input amount of a token, return the computed output amount, and a pool with state updated after the trade
 * @param input.inputAmount The input amount for which to quote the output amount
 * @param input.sqrtPriceLimitX96 The Q64.96 sqrt price limit
 */
export function getPoolOutputAmount(
  input: Input_getPoolOutputAmount
): PoolChangeResult {
  const inputAmount: TokenAmount = input.inputAmount;
  const sqrtPriceLimitX96: BigInt | null = input.sqrtPriceLimitX96;
  const pool: Pool = input.pool;
  if (!poolInvolvesToken({ token: inputAmount.token, pool: pool })) {
    throw new Error(
      "TOKEN: Cannot return the output amount for an input token that is not in the pool"
    );
  }

  const zeroForOne: boolean = tokenEquals({
    tokenA: inputAmount.token,
    tokenB: pool.token0,
  });

  const simulatedSwapResult: SimulatedSwapResult = simulateSwap(
    pool,
    zeroForOne,
    inputAmount.amount,
    sqrtPriceLimitX96
  );
  const outputAmount: BigInt = simulatedSwapResult.amountCalculated;
  const sqrtRatioX96: BigInt = simulatedSwapResult.sqrtRatioX96;
  const liquidity: BigInt = simulatedSwapResult.liquidity;
  const tickCurrent: i32 = simulatedSwapResult.tickCurrent;

  const outputToken: Token = zeroForOne ? pool.token1 : pool.token0;
  return {
    amount: {
      token: outputToken,
      amount: outputAmount.opposite(),
    },
    nextPool: {
      token0: pool.token0,
      token1: pool.token1,
      fee: pool.fee,
      sqrtRatioX96: sqrtRatioX96,
      liquidity: liquidity,
      tickCurrent: tickCurrent,
      tickDataProvider: pool.tickDataProvider,
      token0Price: poolToken0Price({
        token0: pool.token0,
        token1: pool.token1,
        sqrtRatioX96,
      }),
      token1Price: poolToken1Price({
        token0: pool.token0,
        token1: pool.token1,
        sqrtRatioX96,
      }),
    },
  };
}

/**
 * Given a desired output amount of a token, return the computed input amount and a pool with state updated after the trade
 * @param input.outputAmount The output amount for which to quote the input amount
 * @param input.sqrtPriceLimitX96 The Q64.96 sqrt price limit. If zero for one, the price cannot be less than this value after the swap. If one for zero, the price cannot be greater than this value after the swap.
 */
export function getPoolInputAmount(
  input: Input_getPoolInputAmount
): PoolChangeResult {
  const outputAmount: TokenAmount = input.outputAmount;
  const sqrtPriceLimitX96: BigInt | null = input.sqrtPriceLimitX96;
  const pool: Pool = input.pool;
  if (!poolInvolvesToken({ token: outputAmount.token, pool: pool })) {
    throw new Error(
      "TOKEN: Cannot return the output amount for an input token that is not in the pool"
    );
  }

  const zeroForOne: boolean = tokenEquals({
    tokenA: outputAmount.token,
    tokenB: pool.token1,
  });

  const simulatedSwapResult: SimulatedSwapResult = simulateSwap(
    pool,
    zeroForOne,
    outputAmount.amount.opposite(),
    sqrtPriceLimitX96
  );
  const inputAmount: BigInt = simulatedSwapResult.amountCalculated;
  const sqrtRatioX96: BigInt = simulatedSwapResult.sqrtRatioX96;
  const liquidity: BigInt = simulatedSwapResult.liquidity;
  const tickCurrent: i32 = simulatedSwapResult.tickCurrent;

  const inputToken = zeroForOne ? pool.token0 : pool.token1;
  return {
    amount: {
      token: inputToken,
      amount: inputAmount,
    },
    nextPool: {
      token0: pool.token0,
      token1: pool.token1,
      fee: pool.fee,
      sqrtRatioX96: sqrtRatioX96,
      liquidity: liquidity,
      tickCurrent: tickCurrent,
      tickDataProvider: pool.tickDataProvider,
      token0Price: poolToken0Price({
        token0: pool.token0,
        token1: pool.token1,
        sqrtRatioX96,
      }),
      token1Price: poolToken1Price({
        token0: pool.token0,
        token1: pool.token1,
        sqrtRatioX96,
      }),
    },
  };
}

/**
 * Returns the tick spacing of ticks in the pool
 */
export function getPoolTickSpacing(input: Input_getPoolTickSpacing): i32 {
  return _feeAmountToTickSpacing(input.pool.fee);
}
