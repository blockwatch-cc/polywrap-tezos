import { FeeAmount, Args_nextInitializedTick, Args_validateTickList, Tick } from "../../../wrap";
import { BigInt } from "@polywrap/wasm-as";
import { _MAX_TICK, _MIN_TICK, _feeAmountToTickSpacing } from "../../../utils";
import * as TickList from "../../../tickList/index";
import * as TickListUtils from "../../../tickList/utils";
import { nearestUsableTick } from "../../..";

let highTick: Tick;
let lowTick: Tick;
let midTick: Tick;
let ticks: Tick[];

describe('TickList', () => {

  beforeEach(() => {
    lowTick = {
      index: _MIN_TICK + 1,
      liquidityNet: BigInt.fromUInt16(10),
      liquidityGross: BigInt.fromUInt16(10),
    };
    midTick = {
      index: 0,
      liquidityNet: BigInt.fromString("-5"),
      liquidityGross: BigInt.fromUInt16(5),
    };
    highTick = {
      index: _MAX_TICK - 1,
      liquidityNet: BigInt.fromString("-5"),
      liquidityGross: BigInt.fromUInt16(5),
    };
  });

  describe('validate', () => {

    it('errors for incomplete lists', () => {
      const _error = (): void => {
        const args: Args_validateTickList = {ticks: [lowTick], tickSpacing: 1 };
        TickListUtils.validateTickList(args)
      };
      expect(_error).toThrow("ZERO_NET: tick net liquidity values must sum to 0");
    });

    it('errors for unsorted lists', () => {
      const _error = (): void => {
        const args: Args_validateTickList = { ticks: [highTick, lowTick, midTick], tickSpacing: 1 };
        TickListUtils.validateTickList(args)
      };
      expect(_error).toThrow("SORTED: tick list must be sorted by index");
    });

    it('errors if ticks are not on multiples of tick spacing', () => {
      const _error = (): void => {
        const args: Args_validateTickList = { ticks: [highTick, lowTick, midTick], tickSpacing: 1337 };
        TickListUtils.validateTickList(args)
      };
      expect(_error).toThrow("TICK_SPACING: Tick indices must be multiples of tickSpacing");
    });
  });

  it('isBelowSmallest', () => {
    const ticks: Tick[] = [lowTick, midTick, highTick];
    expect(TickListUtils.tickIsBelowSmallest({ ticks: ticks, tick: _MIN_TICK })).toStrictEqual(true);
    expect(TickListUtils.tickIsBelowSmallest({ticks: ticks, tick: _MIN_TICK + 1 })).toStrictEqual(false);
  });

  it('isAtOrAboveLargest', () => {
    const ticks: Tick[] = [lowTick, midTick, highTick];
    expect(TickListUtils.tickIsAtOrAboveLargest({ ticks: ticks, tick: _MAX_TICK - 2 })).toStrictEqual(false);
    expect(TickListUtils.tickIsAtOrAboveLargest({ ticks: ticks, tick: _MAX_TICK - 1 })).toStrictEqual(true);
  });

  describe('nextInitializedTick', () => {

    beforeEach(() => {
      ticks = [lowTick, midTick, highTick];
    });

    it('low - lte = true', () => {
      const _error = (): void => {
        const args: Args_nextInitializedTick = { ticks: ticks, tick: _MIN_TICK, lte: true };
        TickListUtils.nextInitializedTick(args);
      };
      expect(_error).toThrow("BELOW_SMALLEST: tick is below smallest tick index in the list");

      expect(TickListUtils.nextInitializedTick({ ticks: ticks, tick: _MIN_TICK + 1, lte: true })).toStrictEqual(lowTick);
      expect(TickListUtils.nextInitializedTick({ ticks: ticks, tick: _MIN_TICK + 2, lte: true })).toStrictEqual(lowTick);
    });

    it('low - lte = false', () => {
      expect(TickListUtils.nextInitializedTick({ ticks: ticks, tick: _MIN_TICK, lte: false })).toStrictEqual(lowTick);
      expect(TickListUtils.nextInitializedTick({ ticks: ticks, tick: _MIN_TICK + 1, lte: false })).toStrictEqual(midTick);
    });

    it('mid - lte = true', () => {
      expect(TickListUtils.nextInitializedTick({ ticks: ticks, tick: 0, lte: true })).toStrictEqual(midTick);
      expect(TickListUtils.nextInitializedTick({ ticks: ticks, tick: 1, lte: true })).toStrictEqual(midTick);
    });

    it('mid - lte = false', () => {
      expect(TickListUtils.nextInitializedTick({ ticks: ticks, tick: -1, lte: false })).toStrictEqual(midTick);
      expect(TickListUtils.nextInitializedTick({ ticks: ticks, tick: 1, lte: false })).toStrictEqual(highTick);
    });

    it('high - lte = true', () => {
      expect(TickListUtils.nextInitializedTick({ ticks: ticks, tick: _MAX_TICK - 1, lte: true })).toStrictEqual(highTick);
      expect(TickListUtils.nextInitializedTick({ ticks: ticks, tick: _MAX_TICK, lte: true })).toStrictEqual(highTick);
    });

    it('high - lte = false', () => {
      const _error = (): void => {
        const args: Args_nextInitializedTick = { ticks: ticks, tick: _MAX_TICK - 1, lte: false };
        TickListUtils.nextInitializedTick(args);
      };
      expect(_error).toThrow("AT_OR_ABOVE_LARGEST: tick is at or above largest tick index in the list");

      expect(TickListUtils.nextInitializedTick({ ticks: ticks, tick: _MAX_TICK - 2, lte: false })).toStrictEqual(highTick)
      expect(TickListUtils.nextInitializedTick({ ticks: ticks, tick: _MAX_TICK - 3, lte: false })).toStrictEqual(highTick)
    });
  });

  describe('nextInitializedTickWithinOneWord', () => {

    beforeEach(() => {
      ticks = [lowTick, midTick, highTick];
    });

    it('words around 0, lte = true', () => {
      expect(TickList.nextInitializedTickWithinOneWord({
        tick: -257,
        lte: true,
        tickSpacing: 1,
        tickDataProvider: ticks,
      })).toStrictEqual({
        index: -512,
        found: false,
      });

      expect(TickList.nextInitializedTickWithinOneWord({
        tick: -256,
        lte: true,
        tickSpacing: 1,
        tickDataProvider: ticks,
      })).toStrictEqual({
        index: -256,
        found: false,
      });

      expect(TickList.nextInitializedTickWithinOneWord({
        tick: -1,
        lte: true,
        tickSpacing: 1,
        tickDataProvider: ticks,
      })).toStrictEqual({
        index: -256,
        found: false,
      });

      expect(TickList.nextInitializedTickWithinOneWord({
        tick: 0,
        lte: true,
        tickSpacing: 1,
        tickDataProvider: ticks,
      })).toStrictEqual({
        index: 0,
        found: true,
      });

      expect(TickList.nextInitializedTickWithinOneWord({
        tick: 1,
        lte: true,
        tickSpacing: 1,
        tickDataProvider: ticks,
      })).toStrictEqual({
        index: 0,
        found: true,
      });

      expect(TickList.nextInitializedTickWithinOneWord({
        tick: 255,
        lte: true,
        tickSpacing: 1,
        tickDataProvider: ticks,
      })).toStrictEqual({
        index: 0,
        found: true,
      });

      expect(TickList.nextInitializedTickWithinOneWord({
        tick: 256,
        lte: true,
        tickSpacing: 1,
        tickDataProvider: ticks,
      })).toStrictEqual({
        index: 256,
        found: false,
      });

      expect(TickList.nextInitializedTickWithinOneWord({
        tick: 257,
        lte: true,
        tickSpacing: 1,
        tickDataProvider: ticks,
      })).toStrictEqual({
        index: 256,
        found: false,
      });
    })

    it('words around 0, lte = false', () => {
      expect(TickList.nextInitializedTickWithinOneWord({
        tick: -258,
        lte: false,
        tickSpacing: 1,
        tickDataProvider: ticks,
      })).toStrictEqual({
        index: -257,
        found: false,
      });

      expect(TickList.nextInitializedTickWithinOneWord({
        tick: -257,
        lte: false,
        tickSpacing: 1,
        tickDataProvider: ticks,
      })).toStrictEqual({
        index: -1,
        found: false,
      });

      expect(TickList.nextInitializedTickWithinOneWord({
        tick: -256,
        lte: false,
        tickSpacing: 1,
        tickDataProvider: ticks,
      })).toStrictEqual({
        index: -1,
        found: false,
      });

      expect(TickList.nextInitializedTickWithinOneWord({
        tick: -2,
        lte: false,
        tickSpacing: 1,
        tickDataProvider: ticks,
      })).toStrictEqual({
        index: -1,
        found: false,
      });

      expect(TickList.nextInitializedTickWithinOneWord({
        tick: -1,
        lte: false,
        tickSpacing: 1,
        tickDataProvider: ticks,
      })).toStrictEqual({
        index: 0,
        found: true,
      });

      expect(TickList.nextInitializedTickWithinOneWord({
        tick: 0,
        lte: false,
        tickSpacing: 1,
        tickDataProvider: ticks,
      })).toStrictEqual({
        index: 255,
        found: false,
      });

      expect(TickList.nextInitializedTickWithinOneWord({
        tick: 1,
        lte: false,
        tickSpacing: 1,
        tickDataProvider: ticks,
      })).toStrictEqual({
        index: 255,
        found: false,
      });

      expect(TickList.nextInitializedTickWithinOneWord({
        tick: 254,
        lte: false,
        tickSpacing: 1,
        tickDataProvider: ticks,
      })).toStrictEqual({
        index: 255,
        found: false,
      });

      expect(TickList.nextInitializedTickWithinOneWord({
        tick: 255,
        lte: false,
        tickSpacing: 1,
        tickDataProvider: ticks,
      })).toStrictEqual({
        index: 511,
        found: false,
      });

      expect(TickList.nextInitializedTickWithinOneWord({
        tick: 256,
        lte: false,
        tickSpacing: 1,
        tickDataProvider: ticks,
      })).toStrictEqual({
        index: 511,
        found: false,
      });
    });

    it('pool getInputAmount and getOutputAmount failed test params', () => {
      const ONE_ETHER: BigInt = BigInt.pow(BigInt.fromUInt16(10), 18);
      ticks = [
        {
          index: nearestUsableTick({ tick: _MIN_TICK, tickSpacing: _feeAmountToTickSpacing(FeeAmount.LOW) }),
          liquidityNet: ONE_ETHER,
          liquidityGross: ONE_ETHER
        },
        {
          index: nearestUsableTick({ tick: _MAX_TICK, tickSpacing: _feeAmountToTickSpacing(FeeAmount.LOW) }),
          liquidityNet: ONE_ETHER.opposite(),
          liquidityGross: ONE_ETHER
        }];
      expect(TickList.nextInitializedTickWithinOneWord({
        tick: -1,
        lte: true,
        tickSpacing: 10,
        tickDataProvider: ticks,
      })).toStrictEqual({
        index: -2560,
        found: false,
      });
    });
  });
});