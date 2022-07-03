import {
  Input_addDelta,
  Input_encodeSqrtRatioX96,
  Input_getAmount0Delta,
  Input_getAmount1Delta,
  Input_getNextSqrtPriceFromInput,
  Input_getNextSqrtPriceFromOutput,
  Input_mostSignificantBit,
  Input_mulDivRoundingUp,
} from "./w3";
import { MAX_UINT_160, MAX_UINT_256, Q96 } from "../utils/constants";

import { BigInt } from "@web3api/wasm-as";

/**
 * Returns the most significant bit of a positive integer, starting with first bit = 0
 */
export function mostSignificantBit(input: Input_mostSignificantBit): u32 {
  const x: BigInt = input.x;
  if (x.isNegative || x.isZero()) {
    throw new Error("ZERO: input is less than or equal to zero");
  }
  return <u32>x.countBits() - 1;
}

/**
 * Returns the sqrt ratio as a Q64.96 corresponding to a given ratio of amount1 and amount0
 * @param input.amount1 The numerator amount i.e., the amount of token1
 * @param input.amount0 The denominator amount i.e., the amount of token0
 */
export function encodeSqrtRatioX96(input: Input_encodeSqrtRatioX96): BigInt {
  const numerator: BigInt = input.amount1.leftShift(192);
  const denominator: BigInt = input.amount0;
  const ratioX192: BigInt = BigInt.div(numerator, denominator);
  return ratioX192.sqrt();
}

/**
 * fullMath
 */
export function mulDivRoundingUp(input: Input_mulDivRoundingUp): BigInt {
  const a: BigInt = input.a;
  const b: BigInt = input.b;
  const denominator: BigInt = input.denominator;

  const product = BigInt.mul(a, b);
  let result = BigInt.div(product, denominator);
  if (product.mod(denominator) != BigInt.ZERO) {
    result = result.add(BigInt.ONE);
  }
  return result;
}

/**
 * liquidityMath
 */
export function addDelta(input: Input_addDelta): BigInt {
  const x: BigInt = input.x;
  const y: BigInt = input.y;
  // this if branch seems pointless since it's mathematically the same thing. Why does Uniswap SDK do this?
  //  positive y: x + y
  //  negative y: x - (-1 * -y) = x - y = x + -y;
  // if (y.isNegative) {
  //   return x.sub(y.opposite());
  // }
  return x.add(y);
}

/**
 * sqrtPriceMath
 */
export function getAmount0Delta(input: Input_getAmount0Delta): BigInt {
  const liquidity: BigInt = input.liquidity;
  const roundUp: boolean = input.roundUp;

  let sqrtRatioAX96: BigInt;
  let sqrtRatioBX96: BigInt;
  if (input.sqrtRatioAX96 <= input.sqrtRatioBX96) {
    sqrtRatioAX96 = input.sqrtRatioAX96;
    sqrtRatioBX96 = input.sqrtRatioBX96;
  } else {
    sqrtRatioAX96 = input.sqrtRatioBX96;
    sqrtRatioBX96 = input.sqrtRatioAX96;
  }

  const numerator1: BigInt = liquidity.leftShift(96);
  const numerator2: BigInt = sqrtRatioBX96.sub(sqrtRatioAX96);

  if (roundUp) {
    const a: BigInt = mulDivRoundingUp({
      a: numerator1,
      b: numerator2,
      denominator: sqrtRatioBX96,
    });
    return mulDivRoundingUp({
      a: a,
      b: BigInt.ONE,
      denominator: sqrtRatioAX96,
    });
  }
  return numerator1.mul(numerator2).div(sqrtRatioBX96).div(sqrtRatioAX96);
}

/**
 * sqrtPriceMath
 */
export function getAmount1Delta(input: Input_getAmount1Delta): BigInt {
  const liquidity: BigInt = input.liquidity;
  const roundUp: boolean = input.roundUp;

  let sqrtRatioAX96: BigInt;
  let sqrtRatioBX96: BigInt;
  if (input.sqrtRatioAX96 <= input.sqrtRatioBX96) {
    sqrtRatioAX96 = input.sqrtRatioAX96;
    sqrtRatioBX96 = input.sqrtRatioBX96;
  } else {
    sqrtRatioAX96 = input.sqrtRatioBX96;
    sqrtRatioBX96 = input.sqrtRatioAX96;
  }

  return roundUp
    ? mulDivRoundingUp({
        a: liquidity,
        b: sqrtRatioBX96.sub(sqrtRatioAX96),
        denominator: Q96,
      })
    : sqrtRatioBX96.sub(sqrtRatioAX96).mul(liquidity).div(Q96);
}

/**
 * sqrtPriceMath
 */
export function getNextSqrtPriceFromInput(
  input: Input_getNextSqrtPriceFromInput
): BigInt {
  const sqrtPX96: BigInt = input.sqrtPX96;
  const liquidity: BigInt = input.liquidity;
  const amountIn: BigInt = input.amountIn;
  const zeroForOne: boolean = input.zeroForOne;

  if (sqrtPX96 <= BigInt.ZERO) {
    throw new Error("sqrtPX96 <= 0");
  }
  if (liquidity <= BigInt.ZERO) {
    throw new Error("liquidity <= 0");
  }

  return zeroForOne
    ? getNextSqrtPriceFromAmount0RoundingUp(sqrtPX96, liquidity, amountIn, true)
    : getNextSqrtPriceFromAmount1RoundingDown(
        sqrtPX96,
        liquidity,
        amountIn,
        true
      );
}

/**
 * sqrtPriceMath
 */
export function getNextSqrtPriceFromOutput(
  input: Input_getNextSqrtPriceFromOutput
): BigInt {
  const sqrtPX96: BigInt = input.sqrtPX96;
  const liquidity: BigInt = input.liquidity;
  const amountOut: BigInt = input.amountOut;
  const zeroForOne: boolean = input.zeroForOne;

  if (sqrtPX96 <= BigInt.ZERO) {
    throw new Error("sqrtPX96 <= 0");
  }
  if (liquidity <= BigInt.ZERO) {
    throw new Error("liquidity <= 0");
  }

  return zeroForOne
    ? getNextSqrtPriceFromAmount1RoundingDown(
        sqrtPX96,
        liquidity,
        amountOut,
        false
      )
    : getNextSqrtPriceFromAmount0RoundingUp(
        sqrtPX96,
        liquidity,
        amountOut,
        false
      );
}

/**
 * sqrtPriceMath
 */
function multiplyIn256(x: BigInt, y: BigInt): BigInt {
  const product: BigInt = x.mul(y);
  return BigInt.bitwiseAnd(product, MAX_UINT_256);
}

/**
 * sqrtPriceMath
 */
function addIn256(x: BigInt, y: BigInt): BigInt {
  const sum: BigInt = x.add(y);
  return BigInt.bitwiseAnd(sum, MAX_UINT_256);
}

/**
 * sqrtPriceMath
 */
function getNextSqrtPriceFromAmount0RoundingUp(
  sqrtPX96: BigInt,
  liquidity: BigInt,
  amount: BigInt,
  add: boolean
): BigInt {
  if (amount == BigInt.ZERO) {
    return sqrtPX96;
  }
  const numerator1: BigInt = liquidity.leftShift(96);
  const product: BigInt = multiplyIn256(amount, sqrtPX96);

  if (add) {
    if (product.div(amount) == sqrtPX96) {
      const denominator: BigInt = addIn256(numerator1, product);
      if (denominator >= numerator1) {
        return mulDivRoundingUp({
          a: numerator1,
          b: sqrtPX96,
          denominator: denominator,
        });
      }
    }
    const denominator: BigInt = numerator1.div(sqrtPX96).add(amount);
    return mulDivRoundingUp({
      a: numerator1,
      b: BigInt.ONE,
      denominator: denominator,
    });
  } else {
    if (product.div(amount) != sqrtPX96) {
      throw new Error("SQRT_PRICE_MATH: invariant failed");
    }
    if (numerator1 <= product) {
      throw new Error("SQRT_PRICE_MATH: invariant failed");
    }
    const denominator = numerator1.sub(product);
    return mulDivRoundingUp({
      a: numerator1,
      b: sqrtPX96,
      denominator: denominator,
    });
  }
}

/**
 * sqrtPriceMath
 */
function getNextSqrtPriceFromAmount1RoundingDown(
  sqrtPX96: BigInt,
  liquidity: BigInt,
  amount: BigInt,
  add: boolean
): BigInt {
  if (add) {
    const quotient: BigInt =
      amount <= MAX_UINT_160
        ? amount.leftShift(96).div(liquidity)
        : amount.mul(Q96).div(liquidity);

    return sqrtPX96.add(quotient);
  } else {
    const quotient: BigInt = mulDivRoundingUp({
      a: amount,
      b: Q96,
      denominator: liquidity,
    });
    if (sqrtPX96 <= quotient) {
      throw new Error("SQRT_PRICE_MATH: invariant failed");
    }
    return sqrtPX96.sub(quotient);
  }
}
