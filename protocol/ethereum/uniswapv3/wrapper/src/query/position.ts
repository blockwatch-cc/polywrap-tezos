import {
  Input_burnAmountsWithSlippage,
  Input_createPosition,
  Input_createPositionFromAmount0,
  Input_createPositionFromAmount1,
  Input_createPositionFromAmounts,
  Input_mintAmounts,
  Input_mintAmountsWithSlippage,
  Input_positionAmount0,
  Input_positionAmount1,
  Input_positionToken0PriceLower,
  Input_positionToken0PriceUpper,
  MintAmounts,
  Pool,
  Position,
  Price as PriceType,
  TokenAmount,
} from "./w3";
import {
  MAX_SQRT_RATIO,
  MAX_TICK,
  MAX_UINT_256,
  MIN_SQRT_RATIO,
  MIN_TICK,
} from "../utils/constants";
import { createPool, getPoolTickSpacing } from "./pool";
import {
  getSqrtRatioAtTick,
  getTickAtSqrtRatio,
  tickToPrice,
} from "./tickUtils";
import {
  encodeSqrtRatioX96,
  getAmount0Delta,
  getAmount1Delta,
} from "./mathUtils";
import Fraction from "../utils/Fraction";
import Price from "../utils/Price";
import { maxLiquidityForAmounts } from "./positionUtils";

import { BigInt } from "@web3api/wasm-as";

/**
 * Constructs and validates a Position for a given Pool with the given liquidity
 * @param input.pool For which pool the liquidity is assigned
 * @param input.tickLower The lower tick of the position
 * @param input.tickUpper The upper tick of the position
 * @param input.liquidity The amount of liquidity that is in the position
 */
export function createPosition(input: Input_createPosition): Position {
  const pool: Pool = input.pool;
  const tickLower: i32 = input.tickLower;
  const tickUpper: i32 = input.tickUpper;
  const liquidity: BigInt = input.liquidity;

  if (tickLower >= tickUpper) {
    throw new Error(
      "TICK_ORDER: upper tick index must be greater than lower tick index"
    );
  }
  if (tickLower < MIN_TICK || tickLower % getPoolTickSpacing({ pool }) != 0) {
    throw new Error(
      "TICK_LOWER: lower tick index is less than minimum or not aligned with tick spacing"
    );
  }
  if (tickUpper > MAX_TICK || tickUpper % getPoolTickSpacing({ pool }) != 0) {
    throw new Error(
      "TICK_UPPER: upper tick index is greater than maximum or not aligned with tick spacing"
    );
  }

  return {
    pool,
    tickLower,
    tickUpper,
    liquidity,
    token0Amount: positionAmount0({
      pool: input.pool,
      tickLower: input.tickLower,
      tickUpper: input.tickUpper,
      liquidity: input.liquidity,
    }),
    token1Amount: positionAmount1({
      pool: input.pool,
      tickLower: input.tickLower,
      tickUpper: input.tickUpper,
      liquidity: input.liquidity,
    }),
    mintAmounts: mintAmounts({
      pool: input.pool,
      tickLower: input.tickLower,
      tickUpper: input.tickUpper,
      liquidity: input.liquidity,
    }),
    token0PriceLower: positionToken0PriceLower({ pool, tickLower }),
    token0PriceUpper: positionToken0PriceUpper({ pool, tickUpper }),
  };
}

/**
 * Computes the maximum amount of liquidity received for a given amount of token0, token1, and the prices at the tick boundaries
 * @param input.pool The pool for which the position should be created
 * @param input.tickLower The lower tick of the position
 * @param input.tickUpper The upper tick of the position
 * @param input.amount0 token0 amount
 * @param input.amount1 token1 amount
 * @param input.useFullPrecision If false, liquidity will be maximized according to what the router can calculate, not what core can theoretically support
 */
export function createPositionFromAmounts(
  input: Input_createPositionFromAmounts
): Position {
  const pool: Pool = input.pool;
  const tickLower: i32 = input.tickLower;
  const tickUpper: i32 = input.tickUpper;
  const amount0: BigInt = input.amount0;
  const amount1: BigInt = input.amount1;
  const useFullPrecision: boolean = input.useFullPrecision;

  const sqrtRatioAX96: BigInt = getSqrtRatioAtTick({ tick: tickLower });
  const sqrtRatioBX96: BigInt = getSqrtRatioAtTick({ tick: tickUpper });
  return createPosition({
    pool,
    tickLower,
    tickUpper,
    liquidity: maxLiquidityForAmounts({
      sqrtRatioCurrentX96: pool.sqrtRatioX96,
      sqrtRatioAX96,
      sqrtRatioBX96,
      amount0,
      amount1,
      useFullPrecision,
    }),
  });
}

/**
 * Computes a position with the maximum amount of liquidity received for a given amount of token0, assuming an unlimited amount of token1
 * @param input.pool The pool for which the position should be created
 * @param input.tickLower The lower tick of the position
 * @param input.tickUpper The upper tick of the position
 * @param input.amount0 token0 The desired amount of token0
 * @param input.useFullPrecision If false, liquidity will be maximized according to what the router can calculate, not what core can theoretically support
 */
export function createPositionFromAmount0(
  input: Input_createPositionFromAmount0
): Position {
  const pool: Pool = input.pool;
  const tickLower: i32 = input.tickLower;
  const tickUpper: i32 = input.tickUpper;
  const amount0: BigInt = input.amount0;
  const useFullPrecision: boolean = input.useFullPrecision;
  return createPositionFromAmounts({
    pool,
    tickLower,
    tickUpper,
    amount0,
    amount1: MAX_UINT_256,
    useFullPrecision,
  });
}

/**
 * Computes a position with the maximum amount of liquidity received for a given amount of token1, assuming an unlimited amount of token0
 * @param input.pool The pool for which the position should be created
 * @param input.tickLower The lower tick of the position
 * @param input.tickUpper The upper tick of the position
 * @param input.amount1 token0 The desired amount of token1
 * @param input.useFullPrecision If false, liquidity will be maximized according to what the router can calculate, not what core can theoretically support
 */
export function createPositionFromAmount1(
  input: Input_createPositionFromAmount1
): Position {
  const pool: Pool = input.pool;
  const tickLower: i32 = input.tickLower;
  const tickUpper: i32 = input.tickUpper;
  const amount1: BigInt = input.amount1;
  return createPositionFromAmounts({
    pool,
    tickLower,
    tickUpper,
    amount0: MAX_UINT_256,
    amount1,
    useFullPrecision: true,
  });
}

/**
 * Returns the price of token0 at the lower tick
 * @param input.position
 */
export function positionToken0PriceLower(
  input: Input_positionToken0PriceLower
): PriceType {
  const pool: Pool = input.pool;
  const tickLower: i32 = input.tickLower;
  return tickToPrice({
    baseToken: pool.token0,
    quoteToken: pool.token1,
    tick: tickLower,
  });
}

/**
 * Returns the price of token0 at the upper tick
 * @param input.position
 */
export function positionToken0PriceUpper(
  input: Input_positionToken0PriceUpper
): PriceType {
  const pool: Pool = input.pool;
  const tickUpper: i32 = input.tickUpper;
  return tickToPrice({
    baseToken: pool.token0,
    quoteToken: pool.token1,
    tick: tickUpper,
  });
}

/**
 * Returns the amount of token0 that this position's liquidity could be burned for at the current pool price
 * @param input.position
 */
export function positionAmount0(input: Input_positionAmount0): TokenAmount {
  const pool: Pool = input.pool;
  const tickLower: i32 = input.tickLower;
  const tickUpper: i32 = input.tickUpper;
  const liquidity: BigInt = input.liquidity;
  if (pool.tickCurrent < tickLower) {
    return {
      token: pool.token0,
      amount: getAmount0Delta({
        sqrtRatioAX96: getSqrtRatioAtTick({ tick: tickLower }),
        sqrtRatioBX96: getSqrtRatioAtTick({ tick: tickUpper }),
        liquidity: liquidity,
        roundUp: false,
      }),
    };
  } else if (pool.tickCurrent < tickUpper) {
    return {
      token: pool.token0,
      amount: getAmount0Delta({
        sqrtRatioAX96: pool.sqrtRatioX96,
        sqrtRatioBX96: getSqrtRatioAtTick({ tick: tickUpper }),
        liquidity: liquidity,
        roundUp: false,
      }),
    };
  } else {
    return {
      token: pool.token0,
      amount: BigInt.ZERO,
    };
  }
}

/**
 * Returns the amount of token1 that this position's liquidity could be burned for at the current pool price
 * @param input.position
 */
export function positionAmount1(input: Input_positionAmount1): TokenAmount {
  const pool: Pool = input.pool;
  const tickLower: i32 = input.tickLower;
  const tickUpper: i32 = input.tickUpper;
  const liquidity: BigInt = input.liquidity;
  if (pool.tickCurrent < tickLower) {
    return {
      token: pool.token1,
      amount: BigInt.ZERO,
    };
  } else if (pool.tickCurrent < tickUpper) {
    return {
      token: pool.token1,
      amount: getAmount1Delta({
        sqrtRatioAX96: getSqrtRatioAtTick({ tick: tickLower }),
        sqrtRatioBX96: pool.sqrtRatioX96,
        liquidity: liquidity,
        roundUp: false,
      }),
    };
  } else {
    return {
      token: pool.token1,
      amount: getAmount1Delta({
        sqrtRatioAX96: getSqrtRatioAtTick({ tick: tickLower }),
        sqrtRatioBX96: getSqrtRatioAtTick({ tick: tickUpper }),
        liquidity: liquidity,
        roundUp: false,
      }),
    };
  }
}

/**
 * Returns the minimum amounts that must be sent in order to mint the amount of liquidity held by the position at the current price for the pool
 * @param input.position
 */
export function mintAmounts(input: Input_mintAmounts): MintAmounts {
  const pool: Pool = input.pool;
  const tickLower: i32 = input.tickLower;
  const tickUpper: i32 = input.tickUpper;
  const liquidity: BigInt = input.liquidity;
  if (pool.tickCurrent < tickLower) {
    return {
      amount0: getAmount0Delta({
        sqrtRatioAX96: getSqrtRatioAtTick({ tick: tickLower }),
        sqrtRatioBX96: getSqrtRatioAtTick({ tick: tickUpper }),
        liquidity: liquidity,
        roundUp: true,
      }),
      amount1: BigInt.ZERO,
    };
  } else if (pool.tickCurrent < tickUpper) {
    return {
      amount0: getAmount0Delta({
        sqrtRatioAX96: pool.sqrtRatioX96,
        sqrtRatioBX96: getSqrtRatioAtTick({ tick: tickUpper }),
        liquidity: liquidity,
        roundUp: true,
      }),
      amount1: getAmount1Delta({
        sqrtRatioAX96: getSqrtRatioAtTick({ tick: tickLower }),
        sqrtRatioBX96: pool.sqrtRatioX96,
        liquidity: liquidity,
        roundUp: true,
      }),
    };
  } else {
    return {
      amount0: BigInt.ZERO,
      amount1: getAmount1Delta({
        sqrtRatioAX96: getSqrtRatioAtTick({ tick: tickLower }),
        sqrtRatioBX96: getSqrtRatioAtTick({ tick: tickUpper }),
        liquidity: liquidity,
        roundUp: true,
      }),
    };
  }
}

/**
 * Returns the minimum amounts that must be sent in order to safely mint the amount of liquidity held by the position with the given slippage tolerance
 * @param input.position
 * @param input.slippageTolerance Tolerance of unfavorable slippage from the current price
 */
export function mintAmountsWithSlippage(
  input: Input_mintAmountsWithSlippage
): MintAmounts {
  const position: Position = input.position;
  const slippageTolerance: string = input.slippageTolerance;

  // get lower/upper prices
  const bounds: BigInt[] = ratiosAfterSlippage(
    position.pool,
    Fraction.fromString(slippageTolerance)
  );
  const sqrtRatioX96Lower: BigInt = bounds[0];
  const sqrtRatioX96Upper: BigInt = bounds[1];

  // construct counterfactual pools
  const poolLower = createPool({
    tokenA: position.pool.token0,
    tokenB: position.pool.token1,
    fee: position.pool.fee,
    sqrtRatioX96: sqrtRatioX96Lower,
    liquidity: BigInt.ZERO /* liquidity doesn't matter */,
    tickCurrent: getTickAtSqrtRatio({ sqrtRatioX96: sqrtRatioX96Lower }),
    ticks: null,
  });
  const poolUpper = createPool({
    tokenA: position.pool.token0,
    tokenB: position.pool.token1,
    fee: position.pool.fee,
    sqrtRatioX96: sqrtRatioX96Upper,
    liquidity: BigInt.ZERO /* liquidity doesn't matter */,
    tickCurrent: getTickAtSqrtRatio({ sqrtRatioX96: sqrtRatioX96Upper }),
    ticks: null,
  });

  // because the router is imprecise, we need to calculate the position that will be created (assuming no slippage)
  // the mint amounts are what will be passed as calldata
  const positionThatWillBeCreated = createPositionFromAmounts({
    pool: position.pool,
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
    amount0: position.mintAmounts.amount0,
    amount1: position.mintAmounts.amount1,
    useFullPrecision: false,
  });

  // we want the smaller amounts...
  // ...which occurs at the upper price for amount0...
  const amount0: BigInt = mintAmounts({
    pool: poolUpper,
    liquidity: positionThatWillBeCreated.liquidity,
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
  }).amount0;
  // ...and the lower for amount1
  const amount1: BigInt = mintAmounts({
    pool: poolLower,
    liquidity: positionThatWillBeCreated.liquidity,
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
  }).amount1;

  return { amount0, amount1 };
}

/**
 * Returns the minimum amounts that should be requested in order to safely burn the amount of liquidity held by the position with the given slippage tolerance
 * @param input.position
 * @param input.slippageTolerance Tolerance of unfavorable slippage from the current price
 */
export function burnAmountsWithSlippage(
  input: Input_burnAmountsWithSlippage
): MintAmounts {
  const position: Position = input.position;
  const slippageTolerance: string = input.slippageTolerance;

  // get lower/upper prices
  const bounds: BigInt[] = ratiosAfterSlippage(
    position.pool,
    Fraction.fromString(slippageTolerance)
  );
  const sqrtRatioX96Lower: BigInt = bounds[0];
  const sqrtRatioX96Upper: BigInt = bounds[1];

  // construct counterfactual pools
  const poolLower = createPool({
    tokenA: position.pool.token0,
    tokenB: position.pool.token1,
    fee: position.pool.fee,
    sqrtRatioX96: sqrtRatioX96Lower,
    liquidity: BigInt.ZERO /* liquidity doesn't matter */,
    tickCurrent: getTickAtSqrtRatio({ sqrtRatioX96: sqrtRatioX96Lower }),
    ticks: null,
  });
  const poolUpper = createPool({
    tokenA: position.pool.token0,
    tokenB: position.pool.token1,
    fee: position.pool.fee,
    sqrtRatioX96: sqrtRatioX96Upper,
    liquidity: BigInt.ZERO /* liquidity doesn't matter */,
    tickCurrent: getTickAtSqrtRatio({ sqrtRatioX96: sqrtRatioX96Upper }),
    ticks: null,
  });

  // we want the smaller amounts...
  // ...which occurs at the upper price for amount0...
  const amount0: BigInt = positionAmount0({
    pool: poolUpper,
    liquidity: position.liquidity,
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
  }).amount;
  // ...and the lower for amount1
  const amount1: BigInt = positionAmount1({
    pool: poolLower,
    liquidity: position.liquidity,
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
  }).amount;

  return { amount0, amount1 };
}

/**
 * Returns the lower and upper sqrt ratios if the price 'slips' up to slippage tolerance percentage
 * @param pool The pool for which the position exists
 * @param slippageTolerance The amount by which the price can 'slip' before the transaction will revert
 * @returns The sqrt ratios after slippage
 */
function ratiosAfterSlippage(
  pool: Pool,
  slippageTolerance: Fraction
): BigInt[] {
  const one: Fraction = new Fraction(BigInt.ONE);
  const priceLower: Fraction = Price.fromPriceType(pool.token0Price)
    .raw()
    .mul(one.sub(slippageTolerance));
  const priceUpper: Fraction = Price.fromPriceType(pool.token0Price)
    .raw()
    .mul(slippageTolerance.add(one));

  let sqrtRatioX96Lower: BigInt = encodeSqrtRatioX96({
    amount1: priceLower.numerator,
    amount0: priceLower.denominator,
  });
  if (sqrtRatioX96Lower <= MIN_SQRT_RATIO) {
    sqrtRatioX96Lower = MIN_SQRT_RATIO.addInt(1);
  }
  let sqrtRatioX96Upper = encodeSqrtRatioX96({
    amount1: priceUpper.numerator,
    amount0: priceUpper.denominator,
  });
  if (sqrtRatioX96Upper >= MAX_SQRT_RATIO) {
    sqrtRatioX96Upper = MAX_SQRT_RATIO.subInt(1);
  }
  return [sqrtRatioX96Lower, sqrtRatioX96Upper];
}
