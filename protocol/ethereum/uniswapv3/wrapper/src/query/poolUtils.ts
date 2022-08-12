/* eslint-disable @typescript-eslint/no-non-null-assertion */

import {
  Ethereum_Query,
  FeeAmount,
  Input_computePoolAddress,
  NextTickResult,
  Pool,
  SHA3_Query,
  Token,
} from "./w3";
import { tokenSortsBefore } from "./token";
import { concat, getChecksumAddress } from "../utils/addressUtils";
import {
  MAX_FEE,
  MAX_SQRT_RATIO,
  MAX_TICK,
  MIN_SQRT_RATIO,
  MIN_TICK,
  POOL_INIT_CODE_HASH,
} from "../utils/constants";
import { _getFeeAmount } from "../utils/enumUtils";
import * as MathUtils from "./mathUtils";
import { getTick, nextInitializedTickWithinOneWord } from "./tickList";
import * as TickUtils from "./tickUtils";
import { getPoolTickSpacing } from "./pool";

import { BigInt } from "@web3api/wasm-as";

// Pool state after swap execution; Return value of simulateSwap(...)
export class SimulatedSwapResult {
  amountCalculated: BigInt;
  sqrtRatioX96: BigInt;
  liquidity: BigInt;
  tickCurrent: i32;
}

class SimulatedSwapState {
  amountSpecifiedRemaining: BigInt;
  amountCalculated: BigInt;
  sqrtPriceX96: BigInt;
  tick: i32;
  liquidity: BigInt;
}

class StepComputations {
  sqrtPriceStartX96: BigInt;
  tickNext: i32;
  initialized: boolean;
  sqrtPriceNextX96: BigInt;
  amountIn: BigInt;
  amountOut: BigInt;
  feeAmount: BigInt;
}

class SwapStepResult {
  sqrtRatioNextX96: BigInt;
  amountIn: BigInt;
  amountOut: BigInt;
  feeAmount: BigInt;
}

/**
 * Computes a pool address
 * @param input.factoryAddress The Uniswap V3 factory address
 * @param input.tokenA The first token of the pool, irrespective of sort order
 * @param input.tokenB The second token of the pool, irrespective of sort order
 * @param input.fee The fee tier of the pool
 * @param input.initCodeHashManualOverride Override the init code hash used to compute the pool address if necessary
 * @returns The pool address
 */
export function computePoolAddress(input: Input_computePoolAddress): string {
  const factoryAddress: string = input.factoryAddress;
  const tokens: Token[] = tokenSortsBefore({
    tokenA: input.tokenA,
    tokenB: input.tokenB,
  })
    ? [input.tokenA, input.tokenB]
    : [input.tokenB, input.tokenA];
  const fee: u32 = _getFeeAmount(input.fee);
  const initCodeHash: string =
    input.initCodeHashManualOverride == null
      ? POOL_INIT_CODE_HASH
      : input.initCodeHashManualOverride!;

  const salt: string = SHA3_Query.hex_keccak_256({
    message: Ethereum_Query.encodeParams({
      types: ["address", "address", "uint24"],
      values: [tokens[0].address, tokens[1].address, fee.toString()],
    }).unwrap(),
  }).unwrap();
  const concatenatedItems: Uint8Array = concat([
    "0xff",
    getChecksumAddress(factoryAddress),
    salt,
    initCodeHash,
  ]);
  const concatenationHash: string = SHA3_Query.buffer_keccak_256({
    message: concatenatedItems.buffer,
  }).unwrap();
  return getChecksumAddress(concatenationHash.substring(24));
}

/**
 * Simulations execution of a swap and returns next pool state
 * @param pool The pool on which to execute the swap
 * @param zeroForOne Whether the amount in is token0 or token1
 * @param amountSpecified The amount of the swap, which implicitly configures the swap as exact input (positive), or exact output (negative)
 * @param sqrtPriceLimitX96 The Q64.96 sqrt price limit. If zero for one, the price cannot be less than this value after the swap. If one for zero, the price cannot be greater than this value after the swap.
 */
export function simulateSwap(
  pool: Pool,
  zeroForOne: boolean,
  amountSpecified: BigInt,
  sqrtPriceLimitX96: BigInt | null
): SimulatedSwapResult {
  let _sqrtPriceLimitX96: BigInt;
  if (sqrtPriceLimitX96 !== null) {
    _sqrtPriceLimitX96 = sqrtPriceLimitX96;
  } else {
    _sqrtPriceLimitX96 = zeroForOne
      ? BigInt.add(MIN_SQRT_RATIO, BigInt.ONE)
      : BigInt.sub(MAX_SQRT_RATIO, BigInt.ONE);
  }

  if (zeroForOne) {
    if (_sqrtPriceLimitX96 <= MIN_SQRT_RATIO) {
      throw new Error(
        `RATIO_MIN: input sqrtPriceLimitX96 ${_sqrtPriceLimitX96.toString()} is less than or equal to the minimum sqrt ratio ${MIN_SQRT_RATIO.toString()}`
      );
    }
    if (_sqrtPriceLimitX96 >= pool.sqrtRatioX96) {
      throw new Error(
        `RATIO_CURRENT: input sqrtPriceLimitX96 ${_sqrtPriceLimitX96.toString()} is greater than or equal to the pool's current sqrt ratio ${pool.sqrtRatioX96.toString()}`
      );
    }
  } else {
    if (_sqrtPriceLimitX96 >= MAX_SQRT_RATIO) {
      throw new Error(
        `RATIO_MAX: input sqrtPriceLimitX96 ${_sqrtPriceLimitX96.toString()} is greater than or equal to the maximum sqrt ratio ${MAX_SQRT_RATIO.toString()}`
      );
    }
    if (_sqrtPriceLimitX96 <= pool.sqrtRatioX96) {
      throw new Error(
        `RATIO_CURRENT: input sqrtPriceLimitX96 ${_sqrtPriceLimitX96.toString()} is less than or equal to the pool's current sqrt ratio ${pool.sqrtRatioX96.toString()}`
      );
    }
  }

  const ZERO: BigInt = BigInt.ZERO;
  const exactInput: boolean = amountSpecified >= ZERO;

  // keep track of swap state
  const state: SimulatedSwapState = {
    amountSpecifiedRemaining: amountSpecified,
    amountCalculated: ZERO,
    sqrtPriceX96: pool.sqrtRatioX96,
    tick: pool.tickCurrent,
    liquidity: pool.liquidity,
  };

  // start swap while loop
  while (
    state.amountSpecifiedRemaining != ZERO &&
    state.sqrtPriceX96 != _sqrtPriceLimitX96
  ) {
    const step: StepComputations = {
      sqrtPriceStartX96: BigInt.ZERO,
      tickNext: 0,
      initialized: false,
      sqrtPriceNextX96: BigInt.ZERO,
      amountIn: BigInt.ZERO,
      amountOut: BigInt.ZERO,
      feeAmount: BigInt.ZERO,
    };
    step.sqrtPriceStartX96 = state.sqrtPriceX96;

    // because each iteration of the while loop rounds, we can't optimize this code (relative to the smart contract)
    // by simply traversing to the next available tick, we instead need to exactly replicate
    // tickBitmap.nextInitializedTickWithinOneWord
    const nextTickResult: NextTickResult = nextInitializedTickWithinOneWord({
      tick: state.tick,
      lte: zeroForOne,
      tickSpacing: getPoolTickSpacing({ pool: pool }),
      tickDataProvider: pool.tickDataProvider,
    });
    step.tickNext = nextTickResult.index;
    step.initialized = nextTickResult.found;

    if (step.tickNext < MIN_TICK) {
      step.tickNext = MIN_TICK;
    } else if (step.tickNext > MAX_TICK) {
      step.tickNext = MAX_TICK;
    }

    step.sqrtPriceNextX96 = TickUtils.getSqrtRatioAtTick({
      tick: step.tickNext,
    });

    const sqrtRatioTargetX96: BigInt = (
      zeroForOne
        ? step.sqrtPriceNextX96 < _sqrtPriceLimitX96
        : step.sqrtPriceNextX96 > _sqrtPriceLimitX96
    )
      ? _sqrtPriceLimitX96
      : step.sqrtPriceNextX96;
    const swapStepResult: SwapStepResult = computeSwapStep(
      state.sqrtPriceX96,
      sqrtRatioTargetX96,
      state.liquidity,
      state.amountSpecifiedRemaining,
      pool.fee
    );
    state.sqrtPriceX96 = swapStepResult.sqrtRatioNextX96;
    step.amountIn = swapStepResult.amountIn;
    step.amountOut = swapStepResult.amountOut;
    step.feeAmount = swapStepResult.feeAmount;

    if (exactInput) {
      state.amountSpecifiedRemaining = state.amountSpecifiedRemaining
        .sub(step.amountIn)
        .sub(step.feeAmount);
      state.amountCalculated = state.amountCalculated.sub(step.amountOut);
    } else {
      state.amountSpecifiedRemaining = BigInt.add(
        state.amountSpecifiedRemaining,
        step.amountOut
      );
      state.amountCalculated = state.amountCalculated
        .add(step.amountIn)
        .add(step.feeAmount);
    }

    if (state.sqrtPriceX96 == step.sqrtPriceNextX96) {
      // if the tick is initialized, run the tick transition
      if (step.initialized) {
        let liquidityNet: BigInt = getTick({
          tickIndex: step.tickNext,
          tickDataProvider: pool.tickDataProvider,
        }).liquidityNet;
        // if we're moving leftward, we interpret liquidityNet as the opposite sign
        // safe because liquidityNet cannot be type(int128).min
        if (zeroForOne) {
          liquidityNet = liquidityNet.opposite();
        }
        // state.liquidity = MathUtils.addDelta({x: state.liquidity, y: liquidityNet });
        state.liquidity = state.liquidity.add(liquidityNet);
      }
      state.tick = zeroForOne ? step.tickNext - 1 : step.tickNext;
    } else if (state.sqrtPriceX96 != step.sqrtPriceStartX96) {
      // recompute unless we're on a lower tick boundary (i.e. already transitioned ticks), and haven't moved
      state.tick = TickUtils.getTickAtSqrtRatio({
        sqrtRatioX96: state.sqrtPriceX96,
      });
    }
  }

  return {
    amountCalculated: state.amountCalculated,
    sqrtRatioX96: state.sqrtPriceX96,
    liquidity: state.liquidity,
    tickCurrent: state.tick,
  };
}

function computeSwapStep(
  sqrtRatioCurrentX96: BigInt,
  sqrtRatioTargetX96: BigInt,
  liquidity: BigInt,
  amountRemaining: BigInt,
  feePips: FeeAmount
): SwapStepResult {
  const _feePips: u32 = _getFeeAmount(feePips);

  const returnValues: SwapStepResult = {
    sqrtRatioNextX96: BigInt.ZERO,
    amountIn: BigInt.ZERO,
    amountOut: BigInt.ZERO,
    feeAmount: BigInt.ZERO,
  };

  const zeroForOne: boolean = sqrtRatioCurrentX96 >= sqrtRatioTargetX96;
  const exactIn: boolean = amountRemaining >= BigInt.ZERO;

  if (exactIn) {
    const amountRemainingLessFee: BigInt = BigInt.div(
      BigInt.mul(
        amountRemaining,
        BigInt.sub(MAX_FEE, BigInt.fromUInt32(_feePips))
      ),
      MAX_FEE
    );

    returnValues.amountIn = zeroForOne
      ? MathUtils.getAmount0Delta({
          sqrtRatioAX96: sqrtRatioTargetX96,
          sqrtRatioBX96: sqrtRatioCurrentX96,
          liquidity: liquidity,
          roundUp: true,
        })
      : MathUtils.getAmount1Delta({
          sqrtRatioAX96: sqrtRatioCurrentX96,
          sqrtRatioBX96: sqrtRatioTargetX96,
          liquidity: liquidity,
          roundUp: true,
        });
    if (amountRemainingLessFee >= returnValues.amountIn) {
      returnValues.sqrtRatioNextX96 = sqrtRatioTargetX96;
    } else {
      returnValues.sqrtRatioNextX96 = MathUtils.getNextSqrtPriceFromInput({
        sqrtPX96: sqrtRatioCurrentX96,
        liquidity: liquidity,
        amountIn: amountRemainingLessFee,
        zeroForOne: zeroForOne,
      });
    }
  } else {
    returnValues.amountOut = zeroForOne
      ? MathUtils.getAmount1Delta({
          sqrtRatioAX96: sqrtRatioTargetX96,
          sqrtRatioBX96: sqrtRatioCurrentX96,
          liquidity: liquidity,
          roundUp: false,
        })
      : MathUtils.getAmount0Delta({
          sqrtRatioAX96: sqrtRatioCurrentX96,
          sqrtRatioBX96: sqrtRatioTargetX96,
          liquidity: liquidity,
          roundUp: false,
        });
    if (amountRemaining.opposite() >= returnValues.amountOut) {
      returnValues.sqrtRatioNextX96 = sqrtRatioTargetX96;
    } else {
      returnValues.sqrtRatioNextX96 = MathUtils.getNextSqrtPriceFromOutput({
        sqrtPX96: sqrtRatioCurrentX96,
        liquidity: liquidity,
        amountOut: amountRemaining.opposite(),
        zeroForOne: zeroForOne,
      });
    }
  }

  const max: boolean = sqrtRatioTargetX96 == returnValues.sqrtRatioNextX96;

  if (zeroForOne) {
    returnValues.amountIn =
      max && exactIn
        ? returnValues.amountIn
        : MathUtils.getAmount0Delta({
            sqrtRatioAX96: returnValues.sqrtRatioNextX96,
            sqrtRatioBX96: sqrtRatioCurrentX96,
            liquidity: liquidity,
            roundUp: true,
          });
    returnValues.amountOut =
      max && !exactIn
        ? returnValues.amountOut
        : MathUtils.getAmount1Delta({
            sqrtRatioAX96: returnValues.sqrtRatioNextX96,
            sqrtRatioBX96: sqrtRatioCurrentX96,
            liquidity: liquidity,
            roundUp: false,
          });
  } else {
    returnValues.amountIn =
      max && exactIn
        ? returnValues.amountIn
        : MathUtils.getAmount1Delta({
            sqrtRatioAX96: sqrtRatioCurrentX96,
            sqrtRatioBX96: returnValues.sqrtRatioNextX96,
            liquidity: liquidity,
            roundUp: true,
          });
    returnValues.amountOut =
      max && !exactIn
        ? returnValues.amountOut
        : MathUtils.getAmount0Delta({
            sqrtRatioAX96: sqrtRatioCurrentX96,
            sqrtRatioBX96: returnValues.sqrtRatioNextX96,
            liquidity: liquidity,
            roundUp: false,
          });
  }

  const negAmountRemaining: BigInt = amountRemaining.opposite();
  if (!exactIn && returnValues.amountOut > negAmountRemaining) {
    returnValues.amountOut = negAmountRemaining;
  }

  if (exactIn && returnValues.sqrtRatioNextX96 != sqrtRatioTargetX96) {
    // we didn't reach the target, so take the remainder of the maximum input as fee
    returnValues.feeAmount = amountRemaining.sub(returnValues.amountIn);
  } else {
    returnValues.feeAmount = MathUtils.mulDivRoundingUp({
      a: returnValues.amountIn,
      b: BigInt.fromUInt32(_feePips),
      denominator: MAX_FEE.subInt(_feePips),
    });
  }

  return {
    sqrtRatioNextX96: returnValues.sqrtRatioNextX96,
    amountIn: returnValues.amountIn,
    amountOut: returnValues.amountOut,
    feeAmount: returnValues.feeAmount,
  };
}
