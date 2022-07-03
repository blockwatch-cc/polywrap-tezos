import {
  Input_getSqrtRatioAtTick,
  Input_getTickAtSqrtRatio,
  Input_nearestUsableTick,
  Input_priceToClosestTick,
  Input_tickToPrice,
  Price as PriceType,
  Token,
} from "./w3";
import {
  MAX_SQRT_RATIO,
  MAX_TICK,
  MAX_UINT_256,
  MIN_SQRT_RATIO,
  MIN_TICK,
  Q192,
  Q32,
} from "../utils/constants";
import { tokenSortsBefore } from "./token";
import Price from "../utils/Price";
import { mostSignificantBit, encodeSqrtRatioX96 } from "./mathUtils";

import { BigInt } from "@web3api/wasm-as";

/**
 * Returns the closest tick that is nearest a given tick and usable for the given tick spacing
 * @param input.tick the target tick
 * @param input.tickSpacing the spacing of the pool
 */
export function nearestUsableTick(input: Input_nearestUsableTick): i32 {
  const tick: i32 = input.tick;
  const tickSpacing: i32 = input.tickSpacing;
  if (tickSpacing <= 0) {
    throw new Error("TICK_SPACING: tick spacing must be greater than 0");
  }
  if (tick < MIN_TICK || tick > MAX_TICK) {
    throw new Error(
      `TICK_BOUND: tick index is out of range ${MIN_TICK} to ${MAX_TICK}`
    );
  }

  const rounded: i32 = <i32>Math.round(<f64>tick / tickSpacing) * tickSpacing;

  if (rounded < MIN_TICK) return rounded + tickSpacing;
  else if (rounded > MAX_TICK) return rounded - tickSpacing;
  else return rounded;
}

/**
 * Returns a price object corresponding to the input tick and the base/quote token. Inputs must be tokens because the address order is used to interpret the price represented by the tick.
 * @param input.baseToken the base token of the price
 * @param input.quoteToken the quote token of the price
 * @param input.tick the tick for which to return the price
 */
export function tickToPrice(input: Input_tickToPrice): PriceType {
  return _tickToPrice(input).toPriceType();
}

function _tickToPrice(input: Input_tickToPrice): Price {
  const baseToken: Token = input.baseToken;
  const quoteToken: Token = input.quoteToken;
  const tick: i32 = input.tick;

  const sqrtRatioX96: BigInt = getSqrtRatioAtTick({ tick: tick });
  const ratioX192: BigInt = BigInt.mul(sqrtRatioX96, sqrtRatioX96);

  return tokenSortsBefore({ tokenA: baseToken, tokenB: quoteToken })
    ? new Price(baseToken, quoteToken, Q192, ratioX192)
    : new Price(baseToken, quoteToken, ratioX192, Q192);
}

/**
 * Returns the first tick for which the given price is greater than or equal to the tick price
 * @param input.price price for which to return the closest tick that represents a price less than or equal to the input price, i.e. the price of the returned tick is less than or equal to the input price
 */
export function priceToClosestTick(input: Input_priceToClosestTick): i32 {
  const price: Price = new Price(
    input.price.baseToken,
    input.price.quoteToken,
    input.price.denominator,
    input.price.numerator
  );

  const sorted: boolean = tokenSortsBefore({
    tokenA: price.baseToken,
    tokenB: price.quoteToken,
  });

  const sqrtRatioX96: BigInt = sorted
    ? encodeSqrtRatioX96({
        amount1: price.numerator,
        amount0: price.denominator,
      })
    : encodeSqrtRatioX96({
        amount1: price.denominator,
        amount0: price.numerator,
      });

  let tick: i32 = getTickAtSqrtRatio({ sqrtRatioX96: sqrtRatioX96 });
  const nextTickPrice: Price = _tickToPrice({
    baseToken: price.baseToken,
    quoteToken: price.quoteToken,
    tick: tick + 1,
  });
  if (sorted) {
    if (!price.lt(nextTickPrice)) {
      tick++;
    }
  } else {
    if (!price.gt(nextTickPrice)) {
      tick++;
    }
  }
  return tick;
}

/**
 * Returns the sqrt ratio as a Q64.96 for the given tick. The sqrt ratio is computed as sqrt(1.0001)^tick
 * @param input.tick the tick for which to compute the sqrt ratio
 */
export function getSqrtRatioAtTick(input: Input_getSqrtRatioAtTick): BigInt {
  const tick: i32 = input.tick;
  if (tick < MIN_TICK || tick > MAX_TICK) {
    throw new Error(
      `TICK_BOUND: tick index is out of range ${MIN_TICK} to ${MAX_TICK}`
    );
  }
  const absTick: i32 = tick < 0 ? tick * -1 : tick;

  let ratio: BigInt =
    (absTick & 0x1) != 0
      ? BigInt.fromString("fffcb933bd6fad37aa2d162d1a594001", 16)
      : BigInt.fromString("100000000000000000000000000000000", 16);
  if ((absTick & 0x2) != 0)
    ratio = mulShift(ratio, "fff97272373d413259a46990580e213a");
  if ((absTick & 0x4) != 0)
    ratio = mulShift(ratio, "fff2e50f5f656932ef12357cf3c7fdcc");
  if ((absTick & 0x8) != 0)
    ratio = mulShift(ratio, "ffe5caca7e10e4e61c3624eaa0941cd0");
  if ((absTick & 0x10) != 0)
    ratio = mulShift(ratio, "ffcb9843d60f6159c9db58835c926644");
  if ((absTick & 0x20) != 0)
    ratio = mulShift(ratio, "ff973b41fa98c081472e6896dfb254c0");
  if ((absTick & 0x40) != 0)
    ratio = mulShift(ratio, "ff2ea16466c96a3843ec78b326b52861");
  if ((absTick & 0x80) != 0)
    ratio = mulShift(ratio, "fe5dee046a99a2a811c461f1969c3053");
  if ((absTick & 0x100) != 0)
    ratio = mulShift(ratio, "fcbe86c7900a88aedcffc83b479aa3a4");
  if ((absTick & 0x200) != 0)
    ratio = mulShift(ratio, "f987a7253ac413176f2b074cf7815e54");
  if ((absTick & 0x400) != 0)
    ratio = mulShift(ratio, "f3392b0822b70005940c7a398e4b70f3");
  if ((absTick & 0x800) != 0)
    ratio = mulShift(ratio, "e7159475a2c29b7443b29c7fa6e889d9");
  if ((absTick & 0x1000) != 0)
    ratio = mulShift(ratio, "d097f3bdfd2022b8845ad8f792aa5825");
  if ((absTick & 0x2000) != 0)
    ratio = mulShift(ratio, "a9f746462d870fdf8a65dc1f90e061e5");
  if ((absTick & 0x4000) != 0)
    ratio = mulShift(ratio, "70d869a156d2a1b890bb3df62baf32f7");
  if ((absTick & 0x8000) != 0)
    ratio = mulShift(ratio, "31be135f97d08fd981231505542fcfa6");
  if ((absTick & 0x10000) != 0)
    ratio = mulShift(ratio, "9aa508b5b7a84e1c677de54f3e99bc9");
  if ((absTick & 0x20000) != 0)
    ratio = mulShift(ratio, "5d6af8dedb81196699c329225ee604");
  if ((absTick & 0x40000) != 0)
    ratio = mulShift(ratio, "2216e584f5fa1ea926041bedfe98");
  if ((absTick & 0x80000) != 0)
    ratio = mulShift(ratio, "48a170391f7dc42444e8fa2");

  if (tick > 0) {
    ratio = BigInt.div(MAX_UINT_256, ratio);
  }

  // back to Q96
  return BigInt.mod(ratio, Q32) > BigInt.ZERO
    ? BigInt.add(BigInt.div(ratio, Q32), BigInt.ONE)
    : BigInt.div(ratio, Q32);
}

/**
 * Returns the tick corresponding to a given sqrt ratio, s.t. #getSqrtRatioAtTick(tick) <= sqrtRatioX96 and #getSqrtRatioAtTick(tick + 1) > sqrtRatioX96
 * @param input.sqrtRatioX96 the sqrt ratio as a Q64.96 for which to compute the tick
 */
export function getTickAtSqrtRatio(input: Input_getTickAtSqrtRatio): i32 {
  const sqrtRatioX96: BigInt = input.sqrtRatioX96;
  if (sqrtRatioX96 < MIN_SQRT_RATIO || sqrtRatioX96 > MAX_SQRT_RATIO) {
    throw new Error(
      `SQRT_RATIO_BOUND: sqrt ratio is out of range ${MIN_SQRT_RATIO} to ${MAX_SQRT_RATIO}`
    );
  }

  const sqrtRatioX128: BigInt = sqrtRatioX96.leftShift(32);

  const msb: u32 = mostSignificantBit({ x: sqrtRatioX128 });
  const biMsb: BigInt = BigInt.fromUInt32(msb);
  const bi128: BigInt = BigInt.fromUInt16(128);

  let r: BigInt;
  if (biMsb >= bi128) {
    r = sqrtRatioX128.rightShift(msb - 127);
  } else {
    r = sqrtRatioX128.leftShift(127 - msb);
  }

  let log2: BigInt = biMsb.sub(bi128).leftShift(64);

  for (let i = 0; i < 14; i++) {
    r = r.mul(r).rightShift(127);
    const f: BigInt = r.rightShift(128);
    log2 = BigInt.bitwiseOr(log2, f.leftShift(63 - i));
    r = r.rightShift(f.toInt32());
  }

  const logSqrt10001 = BigInt.mul(
    log2,
    BigInt.fromString("255738958999603826347141")
  );

  const tickLow: i32 = logSqrt10001
    .sub(BigInt.fromString("3402992956809132418596140100660247210"))
    .rightShift(128)
    .toInt32();
  const tickHigh: i32 = logSqrt10001
    .add(BigInt.fromString("291339464771989622907027621153398088495"))
    .rightShift(128)
    .toInt32();

  return tickLow == tickHigh
    ? tickLow
    : getSqrtRatioAtTick({ tick: tickHigh }) <= sqrtRatioX96
    ? tickHigh
    : tickLow;
}

/**
 * Multiplies a value by a hex string and shifts right by 128 bits
 * @param val the base value
 * @param mulBy a hex (i.e. base 16) string representing the amount that val is multiplied by
 */
function mulShift(val: BigInt, mulBy: string): BigInt {
  const biMulBy: BigInt = BigInt.fromString(mulBy, 16);
  return val.mul(biMulBy).rightShift(128);
}
