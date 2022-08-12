import { getTick, validateTickList } from "../../../query";
import { BigInt } from "@web3api/wasm-as";
import { Tick } from "../../../query/w3";

describe('TickListDataProvider', () => {

  describe('TickListDataProvider constructor', () => {

    it('can take an empty list of ticks', () => {
      const noError = (): void => {
        validateTickList({ ticks: [], tickSpacing: 1 });
      };
      expect(noError).not.toThrow();
    });

    it('throws for 0 tick spacing', () => {
      const error = (): void => {
        validateTickList({ ticks: [], tickSpacing: 0 });
      };
      expect(error).toThrow("TICK_SPACING_NONZERO: Tick spacing must be greater than zero");
    });

    it('throws for uneven tick list', () => {
      const error = (): void => {
        validateTickList({ ticks: [
          { index: -1, liquidityNet: BigInt.fromString("-1"), liquidityGross: BigInt.ONE },
            { index: 1, liquidityNet: BigInt.fromUInt16(2), liquidityGross: BigInt.ONE }
          ], tickSpacing: 0 });
      };
      expect(error).toThrow("ZERO_NET: tick net liquidity values must sum to 0");
    });
  });

  describe('getTick', () => {
    
    it('throws if tick not in list', () => {
      const error = (): void => {
        const ticks: Tick[] = [
          { index: -1, liquidityNet: BigInt.fromString("-1"), liquidityGross: BigInt.ONE },
          { index: 1, liquidityNet: BigInt.ONE, liquidityGross: BigInt.ONE }
        ];
        validateTickList({ ticks, tickSpacing: 1 });
        getTick({ tickIndex: 0, tickDataProvider: ticks });
      };
      expect(error).toThrow("NOT_CONTAINED: requested tick not found in tick list");
    });
    
    it('gets the smallest tick from the list', () => {
      const ticks: Tick[] = [
        { index: -1, liquidityNet: BigInt.fromString("-1"), liquidityGross: BigInt.ONE },
        { index: 1, liquidityNet: BigInt.ONE, liquidityGross: BigInt.ONE }
      ];
      validateTickList({ ticks, tickSpacing: 1 });
      const tick: Tick = getTick({ tickIndex: -1, tickDataProvider: ticks });
      expect(tick.liquidityNet).toStrictEqual(BigInt.fromString("-1"));
      expect(tick.liquidityGross).toStrictEqual(BigInt.ONE);
    });

    it('gets the largest tick from the list', () => {
      const ticks: Tick[] = [
        { index: -1, liquidityNet: BigInt.fromString("-1"), liquidityGross: BigInt.ONE },
        { index: 1, liquidityNet: BigInt.ONE, liquidityGross: BigInt.ONE }
      ];
      validateTickList({ ticks, tickSpacing: 1 });
      const tick: Tick = getTick({ tickIndex: 1, tickDataProvider: ticks });
      expect(tick.liquidityNet).toStrictEqual(BigInt.ONE)
      expect(tick.liquidityGross).toStrictEqual(BigInt.ONE)
    })
  })
})