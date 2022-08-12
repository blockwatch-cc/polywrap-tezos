import { MIN_TICK, MAX_TICK, MIN_SQRT_RATIO, MAX_SQRT_RATIO } from "../../../utils/constants";
import * as TickUtils from "../../../query/tickUtils";
import { BigInt } from "@web3api/wasm-as";

describe('TickMath', () => {
  
  describe('MIN_TICK', () => {
    it('equals correct value', () => {
      expect(MIN_TICK).toStrictEqual(-887272);
    });
  });

  describe('MAX_TICK', () => {
    it('equals correct value', () => {
      expect(MAX_TICK).toStrictEqual(887272)
    })
  })

  describe('getSqrtRatioAtTick', () => {

    it('throws for tick too small', () => {
      expect(() => TickUtils.getSqrtRatioAtTick({ tick: MIN_TICK - 1 })).toThrow(`TICK_BOUND: tick index is out of range ${MIN_TICK} to ${MAX_TICK}`);
    });

    it('throws for tick too large', () => {
      expect(() => TickUtils.getSqrtRatioAtTick({ tick: MAX_TICK + 1 })).toThrow(`TICK_BOUND: tick index is out of range ${MIN_TICK} to ${MAX_TICK}`);
    });

    it('returns the correct value for min tick', () => {
      expect(TickUtils.getSqrtRatioAtTick({ tick: MIN_TICK}).toString()).toStrictEqual(MIN_SQRT_RATIO.toString());
    });

    it('returns the correct value for tick 0', () => {
      expect(TickUtils.getSqrtRatioAtTick({ tick: 0 }).toString()).toStrictEqual(BigInt.ONE.leftShift(96).toString());
    });

    it('returns the correct value for max tick', () => {
      expect(TickUtils.getSqrtRatioAtTick({ tick: MAX_TICK }).toString()).toStrictEqual(MAX_SQRT_RATIO.toString());
    });
  });

  describe('getTickAtSqrtRatio', () => {

    it('returns the correct value for sqrt ratio at min tick', () => {
      expect(TickUtils.getTickAtSqrtRatio({sqrtRatioX96: MIN_SQRT_RATIO })).toStrictEqual(MIN_TICK);
    });

    it('returns the correct value for sqrt ratio at max tick', () => {
      expect(TickUtils.getTickAtSqrtRatio({sqrtRatioX96: MAX_SQRT_RATIO.subInt(1)})).toStrictEqual(MAX_TICK - 1);
    });
  });
})