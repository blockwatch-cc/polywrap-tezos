import {
  Args_nextInitializedTick,
  Args_tickIsAtOrAboveLargest,
  Args_tickIsBelowSmallest,
  Args_tickListIsSorted,
  Args_validateTickList,
  Tick,
} from "../wrap";

import { BigInt } from "@polywrap/wasm-as";

export function validateTickList(args: Args_validateTickList): boolean {
  const ticks: Tick[] = args.ticks;
  const tickSpacing: i32 = args.tickSpacing;
  if (tickSpacing <= 0) {
    throw new Error(
      "TICK_SPACING_NONZERO: Tick spacing must be greater than zero"
    );
  }
  // ensure ticks are spaced appropriately
  for (let i = 0; i < ticks.length; i++) {
    if (ticks[i].index % tickSpacing != 0) {
      throw new Error(
        "TICK_SPACING: Tick indices must be multiples of tickSpacing"
      );
    }
  }
  // ensure tick liquidity deltas sum to 0
  if (
    BigInt.ne(
      ticks.reduce<BigInt>(
        (accumulator: BigInt, tick: Tick) =>
          BigInt.add(accumulator, tick.liquidityNet),
        BigInt.ZERO
      ),
      BigInt.ZERO
    )
  ) {
    throw new Error("ZERO_NET: tick net liquidity values must sum to 0");
  }
  if (!isSorted(ticks, tickComparator)) {
    throw new Error("SORTED: tick list must be sorted by index");
  }
  return true;
}

export function tickIsBelowSmallest(args: Args_tickIsBelowSmallest): boolean {
  const ticks: Tick[] = args.ticks;
  const tick: i32 = args.tick;
  if (ticks.length == 0) {
    throw new Error("LENGTH: Tick list is empty");
  }
  return tick < ticks[0].index;
}

export function tickIsAtOrAboveLargest(
  args: Args_tickIsAtOrAboveLargest
): boolean {
  const ticks: Tick[] = args.ticks;
  const tick: i32 = args.tick;
  if (ticks.length == 0) {
    throw new Error("LENGTH: Tick list is empty");
  }
  return tick >= ticks[ticks.length - 1].index;
}

/**
 * Finds the largest tick in the list of ticks that is less than or equal to tick
 * @param ticks list of ticks
 * @param tick tick to find the largest tick that is less than or equal to tick
 * @private
 */
function binarySearch(ticks: Tick[], tick: i32): i32 {
  if (tickIsBelowSmallest({ ticks: ticks, tick: tick })) {
    throw new Error(
      "BELOW_SMALLEST: target tick index is below smallest tick index in list"
    );
  }
  let l: i32 = 0;
  let r: i32 = ticks.length - 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const i: i32 = <i32>Math.floor((<f64>l + r) / 2);

    if (
      ticks[i].index <= tick &&
      (i === ticks.length - 1 || ticks[i + 1].index > tick)
    ) {
      return i;
    }

    if (ticks[i].index < tick) {
      l = i + 1;
    } else {
      r = i - 1;
    }
  }
}

export function findTick(ticks: Tick[], index: u32): Tick {
  const tick: Tick = ticks[binarySearch(ticks, index)];
  if (tick.index != index) {
    throw new Error("NOT_CONTAINED: requested tick not found in tick list");
  }
  return tick;
}

export function nextInitializedTick(args: Args_nextInitializedTick): Tick {
  const ticks: Tick[] = args.ticks;
  const tick: i32 = args.tick;
  const lte: boolean = args.lte;

  if (lte) {
    if (tickIsBelowSmallest({ ticks: ticks, tick: tick })) {
      throw new Error(
        "BELOW_SMALLEST: tick is below smallest tick index in the list"
      );
    }
    if (tickIsAtOrAboveLargest({ ticks: ticks, tick: tick })) {
      return ticks[ticks.length - 1];
    }
    const index: i32 = binarySearch(ticks, tick);
    return ticks[index];
  } else {
    if (tickIsAtOrAboveLargest({ ticks: ticks, tick: tick })) {
      throw new Error(
        "AT_OR_ABOVE_LARGEST: tick is at or above largest tick index in the list"
      );
    }
    if (tickIsBelowSmallest({ ticks: ticks, tick: tick })) {
      return ticks[0];
    }
    const index: i32 = binarySearch(ticks, tick);
    return ticks[index + 1];
  }
}

/**
 * Returns true if a tick list is sorted by tick index
 * @param args.ticks the tick list
 * @returns true if sorted
 */
export function tickListIsSorted(args: Args_tickListIsSorted): boolean {
  return isSorted(args.ticks, tickComparator);
}

function tickComparator(a: Tick, b: Tick): i32 {
  return a.index - b.index;
}

function isSorted<T>(list: Array<T>, comparator: (a: T, b: T) => i32): boolean {
  for (let i = 0; i < list.length - 1; i++) {
    if (comparator(list[i], list[i + 1]) > 0) {
      return false;
    }
  }
  return true;
}
