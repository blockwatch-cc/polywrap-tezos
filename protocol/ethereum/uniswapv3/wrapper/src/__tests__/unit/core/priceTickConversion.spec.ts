import { ChainId, Args_priceToClosestTick, Args_tickToPrice, Token, Price as PriceType } from "../../../wrap";
import { priceToClosestTick, tickToPrice } from "../../..";
import {Price} from "../../../utils";
import { BigInt, BigNumber } from "@polywrap/wasm-as";

/**
 * Creates an example token with a specific sort order
 */
function token(sortOrder: i32, decimals: u8 = 18, chainId: ChainId = ChainId.MAINNET): Token {
  if (sortOrder > 9 || sortOrder % 1 !== 0) throw new Error('invalid sort order');
  return {
    chainId: chainId,
    address: `0x${new Array<string>(40).fill(`${sortOrder}`).join('')}`,
    currency: {
      decimals: decimals,
      symbol: `T${sortOrder}`,
      name: `token${sortOrder}`,
    },
  };
}

function reciprocal(baseToken: Token, quoteToken: Token, tick: i32): i32 {
  const tickToPriceInput: Args_tickToPrice = {
    baseToken: baseToken,
    quoteToken: quoteToken,
    tick: tick,
  };

  const priceToTickInput: Args_priceToClosestTick = {
    price: tickToPrice(tickToPriceInput),
  };
  return priceToClosestTick(priceToTickInput);
}

const token0: Token = token(0);
const token1: Token = token(1);
const token2_6decimals: Token = token(2, 6);

describe('priceTickConversions', () => {

  describe('tickToPrice', () => {

    it('1800 t0/1 t1', () => {
      const price: string = tickToPrice({ baseToken: token1, quoteToken: token0, tick: -74959 }).price;
      const result: string = BigNumber.fromString(price).toSignificant(5);
      expect(result).toStrictEqual('1800');
    });

    it('1 t1/1800 t0', () => {
      const price: string = tickToPrice({ baseToken: token0, quoteToken: token1, tick: -74959 }).price;
      const result: string = BigNumber.fromString(price).toSignificant(5);
      expect(result).toStrictEqual('0.00055556');
    });

    it('1800 t1/1 t0', () => {
      const price: string = tickToPrice({ baseToken: token0, quoteToken: token1, tick: 74959 }).price;
      const result: string = BigNumber.fromString(price).toSignificant(5);
      expect(result).toStrictEqual('1800');
    });

    it('1 t0/1800 t1', () => {
      const price: string = tickToPrice({ baseToken: token1, quoteToken: token0, tick: 74959 }).price;
      const result: string = BigNumber.fromString(price).toSignificant(5);
      expect(result).toStrictEqual('0.00055556');
    });

    describe('12 decimal difference', () => {

      it('1.01 t2/1 t0', () => {
        const price: string = tickToPrice({ baseToken: token0, quoteToken: token2_6decimals, tick: -276225 }).price;
        const result: string = BigNumber.fromString(price).toSignificant(3);
        expect(result).toStrictEqual('1.01');
      });

      it('1 t0/1.01 t2', () => {
        const price: string = tickToPrice({ baseToken: token2_6decimals, quoteToken: token0, tick: -276225 }).price;
        const result: string = BigNumber.fromString(price).toSignificant(5);
        expect(result).toStrictEqual('0.99015');
      });

      it('1 t2/1.01 t0', () => {
        const price: string = tickToPrice({ baseToken: token0, quoteToken: token2_6decimals, tick: -276423 }).price;
        const result: string = BigNumber.fromString(price).toSignificant(5);
        expect(result).toStrictEqual('0.99015');
      });

      it('1.01 t0/1 t2', () => {
        const price: string = tickToPrice({ baseToken: token2_6decimals, quoteToken: token0, tick: -276423 }).price;
        const result: string = BigNumber.fromString(price).toSignificant(5);
        expect(result).toStrictEqual('1.0099');
      });

      it('1.01 t2/1 t0', () => {
        const price: string = tickToPrice({ baseToken: token0, quoteToken: token2_6decimals, tick: -276225 }).price;
        const result: string = BigNumber.fromString(price).toSignificant(3);
        expect(result).toStrictEqual('1.01');
      });
    });
  });

  describe('priceToClosestTick', () => {

    it('1800 t0/1 t1', () => {
      const price: PriceType = new Price(token1, token0, BigInt.ONE, BigInt.fromString("1800")).toPriceType();
      const args: Args_priceToClosestTick = { price };
      expect(priceToClosestTick(args)).toStrictEqual(-74960);
    });

    it('1 t1/1800 t0', () => {
      const price: PriceType = new Price(token0, token1, BigInt.fromString("1800"), BigInt.ONE).toPriceType();
      const args: Args_priceToClosestTick = { price };
      expect(priceToClosestTick(args)).toStrictEqual(-74960);
    });

    it('1.01 t2/1 t0', () => {
      const price: PriceType = new Price(token0, token2_6decimals, BigInt.fromString("100000000000000000000"), BigInt.fromString("101000000")).toPriceType();
      const args: Args_priceToClosestTick = { price };
      expect(priceToClosestTick(args)).toStrictEqual(-276225);
    });

    it('1 t0/1.01 t2', () => {
      const price: PriceType = new Price(token2_6decimals, token0, BigInt.fromString("101000000"), BigInt.fromString("100000000000000000000")).toPriceType();
      const args: Args_priceToClosestTick = { price };
      expect(priceToClosestTick(args)).toStrictEqual(-276225);
    });

    describe('reciprocal with tickToPrice', () => {

      it('1800 t0/1 t1', () => {
        const baseToken: Token = token1;
        const quoteToken: Token = token0;
        const tick: i32 = -74960;
        expect(reciprocal(baseToken, quoteToken, tick)).toStrictEqual(tick);
      });

      it('1 t0/1800 t1', () => {
        const baseToken: Token = token1;
        const quoteToken: Token = token0;
        const tick: i32 = 74960;
        expect(reciprocal(baseToken, quoteToken, tick)).toStrictEqual(tick);
      })

      it('1 t1/1800 t0', () => {
        const baseToken: Token = token0;
        const quoteToken: Token = token1;
        const tick: i32 = -74960;
        expect(reciprocal(baseToken, quoteToken, tick)).toStrictEqual(tick);
      })

      it('1800 t1/1 t0', () => {
        const baseToken: Token = token0;
        const quoteToken: Token = token1;
        const tick: i32 = 74960;
        expect(reciprocal(baseToken, quoteToken, tick)).toStrictEqual(tick);
      })

      it('1.01 t2/1 t0', () => {
        const baseToken: Token = token0;
        const quoteToken: Token = token2_6decimals;
        const tick: i32 = -276225;
        expect(reciprocal(baseToken, quoteToken, tick)).toStrictEqual(tick);
      })

      it('1 t0/1.01 t2', () => {
        const baseToken: Token = token2_6decimals;
        const quoteToken: Token = token0;
        const tick: i32 = -276225;
        expect(reciprocal(baseToken, quoteToken, tick)).toStrictEqual(tick);
      })
    })
  })
})