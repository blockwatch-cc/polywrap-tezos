import {
  Args_getTick,
  Args_nextInitializedTickWithinOneWord,
  NextTickResult,
  Tick,
} from "../wrap";
import * as TickListUtils from "./utils";

export * from "./utils";
export * from "./tickUtils";

/**
 * returns tick at requested index
 */
export function getTick(args: Args_getTick): Tick {
  const tickIndex: i32 = args.tickIndex;
  const ticks: Tick[] = args.tickDataProvider;
  return TickListUtils.findTick(ticks, tickIndex);
}

/**
 * returns next initialized tick, or max or min tick. Returns true if a tick is found at index
 */
export function nextInitializedTickWithinOneWord(
  args: Args_nextInitializedTickWithinOneWord
): NextTickResult {
  const tick: i32 = args.tick;
  const lte = args.lte;
  const tickSpacing: i32 = args.tickSpacing;
  const ticks: Tick[] = args.tickDataProvider;

  const compressed: i32 = <i32>Math.floor(<f64>tick / tickSpacing);

  if (lte) {
    const wordPos: i32 = compressed >> 8;
    const minimum: i32 = (wordPos << 8) * tickSpacing;

    if (TickListUtils.tickIsBelowSmallest({ ticks: ticks, tick: tick })) {
      return {
        index: minimum,
        found: false,
      };
    }

    const index: i32 = TickListUtils.nextInitializedTick({
      ticks: ticks,
      tick: tick,
      lte: lte,
    }).index;
    const nextInitializedTick: i32 = index > minimum ? index : minimum;
    return {
      index: nextInitializedTick,
      found: nextInitializedTick == index,
    };
  } else {
    const wordPos = (compressed + 1) >> 8;
    const maximum = ((wordPos + 1) << 8) * tickSpacing - 1;

    if (TickListUtils.tickIsAtOrAboveLargest({ ticks: ticks, tick: tick })) {
      return {
        index: maximum,
        found: false,
      };
    }

    const index: i32 = TickListUtils.nextInitializedTick({
      ticks: ticks,
      tick: tick,
      lte: lte,
    }).index;
    const nextInitializedTick = maximum < index ? maximum : index;
    return {
      index: nextInitializedTick,
      found: nextInitializedTick == index,
    };
  }
}
