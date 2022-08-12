import { tickListIsSorted } from "../../../query";
import { Tick } from "../../../query/w3";
import { BigInt } from "@web3api/wasm-as";

const tick1: Tick = {
    index: 1,
    liquidityGross: BigInt.ZERO,
    liquidityNet: BigInt.ZERO,
  };
const tick2: Tick = {
    index: 2,
    liquidityGross: BigInt.ZERO,
    liquidityNet: BigInt.ZERO,
  };
const tick3: Tick = {
    index: 3,
    liquidityGross: BigInt.ZERO,
    liquidityNet: BigInt.ZERO,
  };
const tick4: Tick = {
    index: 4,
    liquidityGross: BigInt.ZERO,
    liquidityNet: BigInt.ZERO,
  };
const tick5: Tick = {
    index: 5,
    liquidityGross: BigInt.ZERO,
    liquidityNet: BigInt.ZERO,
  };
const tick6: Tick = {
  index: 6,
  liquidityGross: BigInt.ZERO,
  liquidityNet: BigInt.ZERO,
};
const tick7: Tick = {
  index: 7,
  liquidityGross: BigInt.ZERO,
  liquidityNet: BigInt.ZERO,
};

const tick2Copy: Tick = {
  index: 2,
  liquidityGross: BigInt.ZERO,
  liquidityNet: BigInt.ZERO,
};

describe('tickListIsSorted', () => {

  it('list with one element', () => {
    expect(tickListIsSorted({ticks: [tick1]})).toStrictEqual(true);
  });

  it('list with two sorted elements', () => {
    expect(tickListIsSorted({ticks: [tick1, tick2]})).toStrictEqual(true);
  });

  it('list with two equal elements', () => {
    expect(tickListIsSorted({ticks: [tick2, tick2Copy]})).toStrictEqual(true);
  });

  it('list with two unsorted elements', () => {
    expect(tickListIsSorted({ticks: [tick2, tick1]})).toStrictEqual(false);
  });

  it('list with many elements with one unsorted pair', () => {
    expect(tickListIsSorted({ticks: [tick1, tick2, tick3, tick4, tick6, tick5, tick7]})).toStrictEqual(false);
  });

  it('list with many elements with one unsorted pair at the end', () => {
    expect(tickListIsSorted({ticks: [tick1, tick2, tick3, tick4, tick5, tick7, tick6]})).toStrictEqual(false);
  });

  it('list with many elements with one unsorted pair at the beginning', () => {
    expect(tickListIsSorted({ticks: [tick2, tick1, tick3, tick4, tick5, tick6, tick7]})).toStrictEqual(false);
  });

  it('list with many elements with duplicates', () => {
    expect(tickListIsSorted({ticks: [tick1, tick2, tick2Copy, tick3, tick4, tick5, tick6, tick7]})).toStrictEqual(true);
  });
})