import { mostSignificantBit} from "../../../query";
import { BigInt } from "@web3api/wasm-as";
import { MAX_UINT_256 } from "../../../utils/constants";

describe('mostSignificantBit', () => {

  it('throws for zero', () => {
    const throwsZero = (): void => {
      const x: BigInt = BigInt.ZERO;
      const _error: u32 = mostSignificantBit({ x });
    };
    expect(throwsZero).toThrow('ZERO');
  });

  it('correct value for every power of 2', () => {
    for (let i = 1; i < 256; i++) {
      const x: BigInt = BigInt.ONE.leftShift(i);
      expect(mostSignificantBit({ x })).toStrictEqual(i);
    }
  });

  it('correct value for every power of 2 - 1', () => {
    for (let i = 2; i < 256; i++) {
      const x: BigInt = BigInt.ONE.leftShift(i).subInt(1);
      expect(mostSignificantBit({ x })).toStrictEqual(i - 1);
    }
  });

  it('succeeds for MaxUint256', () => {
    expect(mostSignificantBit({ x: MAX_UINT_256 })).toStrictEqual(255);
  });
})