import { _MIN_TICK, _MAX_TICK, _MIN_SQRT_RATIO, _MAX_SQRT_RATIO } from "../../../utils";
import * as TickUtils from "../../..";
import { BigInt } from "@polywrap/wasm-as";

describe('TickMath', () => {
  
  describe('MIN_TICK', () => {
    it('equals correct value', () => {
      expect(_MIN_TICK).toStrictEqual(-887272);
    });
  });

  describe('MAX_TICK', () => {
    it('equals correct value', () => {
      expect(_MAX_TICK).toStrictEqual(887272)
    })
  })

  describe('getSqrtRatioAtTick', () => {

    it('throws for tick too small', () => {
      expect(() => TickUtils.getSqrtRatioAtTick({ tick: _MIN_TICK - 1 })).toThrow(`TICK_BOUND: tick index is out of range ${_MIN_TICK} to ${_MAX_TICK}`);
    });

    it('throws for tick too large', () => {
      expect(() => TickUtils.getSqrtRatioAtTick({ tick: _MAX_TICK + 1 })).toThrow(`TICK_BOUND: tick index is out of range ${_MIN_TICK} to ${_MAX_TICK}`);
    });

    it('returns the correct value for min tick', () => {
      expect(TickUtils.getSqrtRatioAtTick({ tick: _MIN_TICK}).toString()).toStrictEqual(_MIN_SQRT_RATIO.toString());
    });

    it('returns the correct value for tick 0', () => {
      expect(TickUtils.getSqrtRatioAtTick({ tick: 0 }).toString()).toStrictEqual(BigInt.ONE.leftShift(96).toString());
    });

    it('returns the correct value for max tick', () => {
      expect(TickUtils.getSqrtRatioAtTick({ tick: _MAX_TICK }).toString()).toStrictEqual(_MAX_SQRT_RATIO.toString());
    });
  });

  describe('getTickAtSqrtRatio', () => {

    it('returns the correct value for sqrt ratio at min tick', () => {
      expect(TickUtils.getTickAtSqrtRatio({sqrtRatioX96: _MIN_SQRT_RATIO })).toStrictEqual(_MIN_TICK);
    });

    it('returns the correct value for sqrt ratio at max tick', () => {
      expect(TickUtils.getTickAtSqrtRatio({sqrtRatioX96: _MAX_SQRT_RATIO.subInt(1)})).toStrictEqual(_MAX_TICK - 1);
    });
  });
})