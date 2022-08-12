import { nearestUsableTick } from "../../..";
import { _MAX_TICK, _MIN_TICK } from "../../../utils";

describe('nearestUsableTick', () => {

  it('throws if tickSpacing is 0', () => {
    const throwsSpacing = (): void => {
      nearestUsableTick({ tick: 1, tickSpacing: 0 });
    };
    expect(throwsSpacing).toThrow('TICK_SPACING: tick spacing must be greater than 0');
  });

  it('throws if tickSpacing is negative', () => {
    const throwsSpacing = (): void => {
      nearestUsableTick({ tick: 1, tickSpacing: -5 });
    };
    expect(throwsSpacing).toThrow('TICK_SPACING: tick spacing must be greater than 0');
  });

  it('throws if tick > MAX_TICK or  tick < MIN_TICK', () => {
    const throwsTickMax = (): void => {
      nearestUsableTick({ tick: _MAX_TICK + 1, tickSpacing: 1 });
    };
    const throwsTickMin = (): void => {
      nearestUsableTick({ tick: _MIN_TICK - 1, tickSpacing: 1 });
    };
    expect(throwsTickMax).toThrow(`TICK_BOUND: tick index is out of range ${_MIN_TICK} to ${_MAX_TICK}`);
    expect(throwsTickMin).toThrow(`TICK_BOUND: tick index is out of range ${_MIN_TICK} to ${_MAX_TICK}`);
  });

  it('rounds at positive half', () => {
    expect(nearestUsableTick({ tick: 5, tickSpacing: 10 })).toStrictEqual(10);
  });

  it('rounds down below positive half', () => {
    expect(nearestUsableTick({ tick: 4, tickSpacing: 10 })).toStrictEqual(0);
  });

  it('rounds up for negative half', () => {
    expect(nearestUsableTick({ tick: -5, tickSpacing: 10 })).toStrictEqual(0);
  });

  it('rounds up for negative half', () => {
    expect(nearestUsableTick({ tick: -6, tickSpacing: 10 })).toStrictEqual(-10);
  });

  it('cannot round past MIN_TICK', () => {
    const spacing: i32 = _MAX_TICK / 2 + 100;
    expect(nearestUsableTick({ tick: _MIN_TICK, tickSpacing: spacing })).toStrictEqual(-spacing);
  });

  it('cannot round past MAX_TICK', () => {
    const spacing: i32 = _MAX_TICK / 2 + 100;
    expect(nearestUsableTick({ tick: _MAX_TICK, tickSpacing: spacing })).toStrictEqual(spacing);
  });
});