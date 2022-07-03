import { BigInt } from "@web3api/wasm-as";
import { addDelta } from "../../../query";

const x: BigInt = BigInt.fromUInt16(10);
const y: BigInt = BigInt.fromUInt16(5);

describe('Liquidity Math', () => {
  describe('addDelta', () => {
    it('adds positive integers', () => {
      const result: BigInt = addDelta({ x, y });
      expect(result.toString()).toStrictEqual("15");
    });

    it('adds negative integers', () => {
      const result: BigInt = addDelta({ x: x.opposite(), y: y.opposite() });
      expect(result.toString()).toStrictEqual("-15");
    });

    it('adds positive and negative integers together', () => {
      const result: BigInt = addDelta({ x, y: y.opposite() });
      expect(result.toString()).toStrictEqual("5");
    });
  });
});