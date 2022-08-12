import { ChainId, FeeAmount, MintAmounts, Pool, Position, Token } from "../../../query/w3";
import { createPool, encodeSqrtRatioX96, getTickAtSqrtRatio, nearestUsableTick, burnAmountsWithSlippage,
  createPosition, mintAmounts,
  mintAmountsWithSlippage,
  positionAmount0,
  positionAmount1 } from "../../../query";
import { BigInt } from "@web3api/wasm-as";
import { _feeAmountToTickSpacing } from "../../../utils/enumUtils";
import { MAX_SQRT_RATIO, MAX_TICK, MIN_SQRT_RATIO, MIN_TICK } from "../../../utils/constants";

const USDC: Token = {
  chainId: ChainId.MAINNET,
  address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  currency: {
    decimals: 6,
    symbol: "USDC",
    name: "USD Coin",
  },
};
const DAI: Token = {
  chainId: ChainId.MAINNET,
  address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  currency: {
    decimals: 18,
    symbol: "DAI",
    name: "DAI Stablecoin",
  },
};

const bi100e6: BigInt = BigInt.fromString("100000000");
const bi100e12: BigInt = BigInt.fromString("100000000000000");
const bi100e18: BigInt = BigInt.fromString("100000000000000000000");

const POOL_SQRT_RATIO_START: BigInt = encodeSqrtRatioX96({
  amount1: bi100e6,
  amount0: bi100e18
});
const POOL_TICK_CURRENT: i32 = getTickAtSqrtRatio({ sqrtRatioX96: POOL_SQRT_RATIO_START });
const TICK_SPACING: i32 = _feeAmountToTickSpacing(FeeAmount.LOW);
const DAI_USDC_POOL: Pool = createPool({
  tokenA: DAI,
  tokenB: USDC,
  fee: FeeAmount.LOW,
  sqrtRatioX96: POOL_SQRT_RATIO_START,
  liquidity: BigInt.ZERO,
  tickCurrent: POOL_TICK_CURRENT,
  ticks: null,
});

describe('Position', () => {

  it('can be constructed around 0 tick', () => {
    const position: Position = createPosition({
      pool: DAI_USDC_POOL,
      liquidity: BigInt.ONE,
      tickLower: -10,
      tickUpper: 10
    });
    expect(position.liquidity).toStrictEqual(BigInt.ONE);
  });

  it('can use min and max ticks', () => {
    const position: Position = createPosition({
      pool: DAI_USDC_POOL,
      liquidity: BigInt.ONE,
      tickLower: nearestUsableTick({ tick: MIN_TICK, tickSpacing: TICK_SPACING}),
      tickUpper: nearestUsableTick({ tick: MAX_TICK, tickSpacing: TICK_SPACING}),
    });
    expect(position.liquidity).toStrictEqual(BigInt.ONE);
  });

  it('tick lower must be less than tick upper', () => {
    const error = (): void => {
      createPosition({
        pool: DAI_USDC_POOL,
        liquidity: BigInt.ONE,
        tickLower: 10,
        tickUpper: -10,
      });
    };
    expect(error).toThrow("TICK_ORDER: upper tick index must be greater than lower tick index");
  });

  it('tick lower cannot equal tick upper', () => {
    const error = (): void => {
      createPosition({
        pool: DAI_USDC_POOL,
        liquidity: BigInt.ONE,
        tickLower: -10,
        tickUpper: -10,
      });
    };
    expect(error).toThrow("TICK_ORDER: upper tick index must be greater than lower tick index");
  });

  it('tick lower must be multiple of tick spacing', () => {
    const error = (): void => {
      createPosition({
        pool: DAI_USDC_POOL,
        liquidity: BigInt.ONE,
        tickLower: -5,
        tickUpper: 10,
      });
    };
    expect(error).toThrow("TICK_LOWER: lower tick index is less than minimum or not aligned with tick spacing");
  });

  it('tick lower must be greater than MIN_TICK', () => {
    const error = (): void => {
      createPosition({
        pool: DAI_USDC_POOL,
        liquidity: BigInt.ONE,
        tickLower: nearestUsableTick({ tick: MIN_TICK, tickSpacing: TICK_SPACING}) - TICK_SPACING,
        tickUpper: 10,
      });
    };
    expect(error).toThrow("TICK_LOWER: lower tick index is less than minimum or not aligned with tick spacing");
  });

  it('tick upper must be multiple of tick spacing', () => {
    const error = (): void => {
      createPosition({
        pool: DAI_USDC_POOL,
        liquidity: BigInt.ONE,
        tickLower: -10,
        tickUpper: 15,
      });
    };
    expect(error).toThrow("TICK_UPPER: upper tick index is greater than maximum or not aligned with tick spacing");
  });

  it('tick upper must be less than MAX_TICK', () => {
    const error = (): void => {
      createPosition({
        pool: DAI_USDC_POOL,
        liquidity: BigInt.ONE,
        tickLower: -10,
        tickUpper: nearestUsableTick({ tick: MAX_TICK, tickSpacing: TICK_SPACING}) + TICK_SPACING,
      });
    };
    expect(error).toThrow("TICK_UPPER: upper tick index is greater than maximum or not aligned with tick spacing");
  });

  describe('amount0', () => {
    it('is correct for price above', () => {
      const position: Position = createPosition({
        pool: DAI_USDC_POOL,
        liquidity: bi100e12,
        tickLower: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING,
        tickUpper: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING * 2,
      });
      const amount: string = positionAmount0({
        pool: position.pool,
        liquidity: position.liquidity,
        tickLower: position.tickLower,
        tickUpper: position.tickUpper,
      }).amount.toString();
      expect(amount).toStrictEqual('49949961958869841');
      expect(amount).toStrictEqual(position.token0Amount.amount.toString());
    });

    it('is correct for price below', () => {
      const position: Position = createPosition({
        pool: DAI_USDC_POOL,
        liquidity: bi100e18,
        tickLower: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) - TICK_SPACING * 2,
        tickUpper: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) - TICK_SPACING,
      });
      const amount: string = positionAmount0({
        pool: position.pool,
        liquidity: position.liquidity,
        tickLower: position.tickLower,
        tickUpper: position.tickUpper,
      }).amount.toString();
      expect(amount).toStrictEqual('0');
      expect(amount).toStrictEqual(position.token0Amount.amount.toString());
    });

    it('is correct for in-range position', () => {
      const position: Position = createPosition({
        pool: DAI_USDC_POOL,
        liquidity: bi100e18,
        tickLower: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) - TICK_SPACING * 2,
        tickUpper: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING * 2,
      });
      const amount: string = positionAmount0({
        pool: position.pool,
        liquidity: position.liquidity,
        tickLower: position.tickLower,
        tickUpper: position.tickUpper,
      }).amount.toString();
      expect(amount).toStrictEqual('120054069145287995769396');
      expect(amount).toStrictEqual(position.token0Amount.amount.toString());
    });
  });

  describe('amount1', () => {
    it('is correct for price above', () => {
      const position: Position = createPosition({
        pool: DAI_USDC_POOL,
        liquidity: bi100e18,
        tickLower: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING,
        tickUpper: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING * 2,
      });
      const amount: string = positionAmount1({
        pool: position.pool,
        liquidity: position.liquidity,
        tickLower: position.tickLower,
        tickUpper: position.tickUpper,
      }).amount.toString();
      expect(amount).toStrictEqual('0');
      expect(amount).toStrictEqual(position.token1Amount.amount.toString());
    });

    it('is correct for price below', () => {
      const position: Position = createPosition({
        pool: DAI_USDC_POOL,
        liquidity: bi100e18,
        tickLower: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) - TICK_SPACING * 2,
        tickUpper: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) - TICK_SPACING,
      });
      const amount: string = positionAmount1({
        pool: position.pool,
        liquidity: position.liquidity,
        tickLower: position.tickLower,
        tickUpper: position.tickUpper,
      }).amount.toString();
      expect(amount).toStrictEqual('49970077052');
      expect(amount).toStrictEqual(position.token1Amount.amount.toString());
    });

    it('is correct for in-range position', () => {
      const position: Position = createPosition({
        pool: DAI_USDC_POOL,
        liquidity: bi100e18,
        tickLower: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) - TICK_SPACING * 2,
        tickUpper: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING * 2,
      });
      const amount: string = positionAmount1({
        pool: position.pool,
        liquidity: position.liquidity,
        tickLower: position.tickLower,
        tickUpper: position.tickUpper,
      }).amount.toString();
      expect(amount).toStrictEqual('79831926242');
      expect(amount).toStrictEqual(position.token1Amount.amount.toString());
    });
  });

  describe('mintAmountsWithSlippage', () => {
    describe('0 slippage', () => {
      it('is correct for positions below', () => {
        const position: Position = createPosition({
          pool: DAI_USDC_POOL,
          liquidity: bi100e18,
          tickLower: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING,
          tickUpper: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING * 2,
        });
        const mintAmounts: MintAmounts = mintAmountsWithSlippage({ position, slippageTolerance: "0" });
        expect(mintAmounts.amount0.toString()).toStrictEqual('49949961958869841738198');
        expect(mintAmounts.amount1.toString()).toStrictEqual('0');
      });

      it('is correct for positions above', () => {
        const position: Position = createPosition({
          pool: DAI_USDC_POOL,
          liquidity: bi100e18,
          tickLower: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) - TICK_SPACING * 2,
          tickUpper: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) - TICK_SPACING,
        });
        const mintAmounts: MintAmounts = mintAmountsWithSlippage({ position, slippageTolerance: "0" });
        expect(mintAmounts.amount0.toString()).toStrictEqual('0');
        expect(mintAmounts.amount1.toString()).toStrictEqual('49970077053');
      });

      it('is correct for positions within', () => {
        const position: Position = createPosition({
          pool: DAI_USDC_POOL,
          liquidity: bi100e18,
          tickLower: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) - TICK_SPACING * 2,
          tickUpper: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING * 2,
        });
        const mintAmounts: MintAmounts = mintAmountsWithSlippage({ position, slippageTolerance: "0" });
        expect(mintAmounts.amount0.toString()).toStrictEqual('120054069145287995740584');
        expect(mintAmounts.amount1.toString()).toStrictEqual('79831926243');
      });
    });

    describe('.05% slippage', () => {
      it('is correct for positions below', () => {
        const position: Position = createPosition({
          pool: DAI_USDC_POOL,
          liquidity: bi100e18,
          tickLower: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING,
          tickUpper: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING * 2,
        });
        const mintAmounts: MintAmounts = mintAmountsWithSlippage({ position, slippageTolerance: "0.0005" });
        expect(mintAmounts.amount0.toString()).toStrictEqual('49949961958869841738198');
        expect(mintAmounts.amount1.toString()).toStrictEqual('0');
      });

      it('is correct for positions above', () => {
        const position: Position = createPosition({
          pool: DAI_USDC_POOL,
          liquidity: bi100e18,
          tickLower: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) - TICK_SPACING * 2,
          tickUpper: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) - TICK_SPACING,
        });
        const mintAmounts: MintAmounts = mintAmountsWithSlippage({ position, slippageTolerance: "0.0005" });
        expect(mintAmounts.amount0.toString()).toStrictEqual('0');
        expect(mintAmounts.amount1.toString()).toStrictEqual('49970077053');
      });

      it('is correct for positions within', () => {
        const position: Position = createPosition({
          pool: DAI_USDC_POOL,
          liquidity: bi100e18,
          tickLower: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) - TICK_SPACING * 2,
          tickUpper: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING * 2,
        });
        const mintAmounts: MintAmounts = mintAmountsWithSlippage({ position, slippageTolerance: "0.0005" });
        expect(mintAmounts.amount0.toString()).toStrictEqual('95063440240746211432007');
        expect(mintAmounts.amount1.toString()).toStrictEqual('54828800461');
      });
    });

    describe('5% slippage tolerance', () => {
      it('is correct for pool at min price', () => {
        const position: Position = createPosition({
          pool: createPool({ tokenA: DAI, tokenB: USDC, fee: FeeAmount.LOW, sqrtRatioX96: MIN_SQRT_RATIO, liquidity: BigInt.ZERO, tickCurrent: MIN_TICK, ticks: null }),
          liquidity: bi100e18,
          tickLower: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING,
          tickUpper: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING * 2,
        });
        const mintAmounts: MintAmounts = mintAmountsWithSlippage({ position, slippageTolerance: "0.05" });
        expect(mintAmounts.amount0.toString()).toStrictEqual('49949961958869841738198');
        expect(mintAmounts.amount1.toString()).toStrictEqual('0');
      });

      it('is correct for pool at max price', () => {
        const position: Position = createPosition({
          pool: createPool({ tokenA: DAI, tokenB: USDC, fee: FeeAmount.LOW, sqrtRatioX96: MAX_SQRT_RATIO.subInt(1), liquidity: BigInt.ZERO, tickCurrent: MAX_TICK - 1, ticks: null }),
          liquidity: bi100e18,
          tickLower: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING,
          tickUpper: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING * 2,
        });
        const burnAmounts: MintAmounts = mintAmountsWithSlippage({ position, slippageTolerance: "0.05" });
        expect(burnAmounts.amount0.toString()).toStrictEqual("0");
        expect(burnAmounts.amount1.toString()).toStrictEqual('50045084660');
      });
    });
  });

  describe('burnAmountsWithSlippage', () => {
    describe('0 slippage', () => {

      it('is correct for positions below', () => {
        const position: Position = createPosition({
          pool: DAI_USDC_POOL,
          liquidity: bi100e18,
          tickLower: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING,
          tickUpper: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING * 2,
        });
        const burnAmounts: MintAmounts = burnAmountsWithSlippage({ position, slippageTolerance: "0" });
        expect(burnAmounts.amount0.toString()).toStrictEqual('49949961958869841754181');
        expect(burnAmounts.amount1.toString()).toStrictEqual('0');
      });

      it('is correct for positions above', () => {
        const position: Position = createPosition({
          pool: DAI_USDC_POOL,
          liquidity: bi100e18,
          tickLower: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) - TICK_SPACING * 2,
          tickUpper: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) - TICK_SPACING,
        });
        const burnAmounts: MintAmounts = burnAmountsWithSlippage({ position, slippageTolerance: "0" });
        expect(burnAmounts.amount0.toString()).toStrictEqual('0');
        expect(burnAmounts.amount1.toString()).toStrictEqual('49970077052');
      });

      it('is correct for positions within', () => {
        const position: Position = createPosition({
          pool: DAI_USDC_POOL,
          liquidity: bi100e18,
          tickLower: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) - TICK_SPACING * 2,
          tickUpper: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING * 2,
        });
        const burnAmounts: MintAmounts = burnAmountsWithSlippage({ position, slippageTolerance: "0" });
        expect(burnAmounts.amount0.toString()).toStrictEqual('120054069145287995769396');
        expect(burnAmounts.amount1.toString()).toStrictEqual('79831926242');
      });
    });

    describe('.05% slippage', () => {
      it('is correct for positions below', () => {
        const position: Position = createPosition({
          pool: DAI_USDC_POOL,
          liquidity: bi100e18,
          tickLower: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING,
          tickUpper: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING * 2,
        });
        const burnAmounts: MintAmounts = burnAmountsWithSlippage({ position, slippageTolerance: "0.0005" });
        expect(burnAmounts.amount0.toString()).toStrictEqual('49949961958869841754181');
        expect(burnAmounts.amount1.toString()).toStrictEqual('0');
      });

      it('is correct for positions above', () => {
        const position: Position = createPosition({
          pool: DAI_USDC_POOL,
          liquidity: bi100e18,
          tickLower: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) - TICK_SPACING * 2,
          tickUpper: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) - TICK_SPACING,
        });
        const burnAmounts: MintAmounts = burnAmountsWithSlippage({ position, slippageTolerance: "0.0005" });
        expect(burnAmounts.amount0.toString()).toStrictEqual('0');
        expect(burnAmounts.amount1.toString()).toStrictEqual('49970077052');
      });

      it('is correct for positions within', () => {
        const position: Position = createPosition({
          pool: DAI_USDC_POOL,
          liquidity: bi100e18,
          tickLower: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) - TICK_SPACING * 2,
          tickUpper: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING * 2,
        });
        const burnAmounts: MintAmounts = burnAmountsWithSlippage({ position, slippageTolerance: "0.0005" });
        expect(burnAmounts.amount0.toString()).toStrictEqual('95063440240746211454822');
        expect(burnAmounts.amount1.toString()).toStrictEqual('54828800460');
      });
    });

    describe('5% slippage tolerance', () => {
      it('is correct for pool at min price', () => {
        const position: Position = createPosition({
          pool: createPool({ tokenA: DAI, tokenB: USDC, fee: FeeAmount.LOW, sqrtRatioX96: MIN_SQRT_RATIO, liquidity: BigInt.ZERO, tickCurrent: MIN_TICK, ticks: null }),
          liquidity: bi100e18,
          tickLower: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING,
          tickUpper: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING * 2,
        });
        const burnAmounts: MintAmounts = burnAmountsWithSlippage({ position, slippageTolerance: "0.05" });
        expect(burnAmounts.amount0.toString()).toStrictEqual('49949961958869841754181');
        expect(burnAmounts.amount1.toString()).toStrictEqual('0');
      });

      it('is correct for pool at max price', () => {
        const position: Position = createPosition({
          pool: createPool({ tokenA: DAI, tokenB: USDC, fee: FeeAmount.LOW, sqrtRatioX96: MAX_SQRT_RATIO.subInt(1), liquidity: BigInt.ZERO, tickCurrent: MAX_TICK - 1, ticks: null }),
          liquidity: bi100e18,
          tickLower: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING,
          tickUpper: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING * 2,
        });
        const burnAmounts: MintAmounts = burnAmountsWithSlippage({ position, slippageTolerance: "0.05" });
        expect(burnAmounts.amount0.toString()).toStrictEqual("0");
        expect(burnAmounts.amount1.toString()).toStrictEqual('50045084659');
      });
    });
  });

  describe('mintAmounts', () => {
    it('is correct for price above', () => {
      const position: Position = createPosition({
        pool: DAI_USDC_POOL,
        liquidity: bi100e18,
        tickLower: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING,
        tickUpper: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING * 2,
      });
      const amounts: MintAmounts = mintAmounts({
        pool: position.pool,
        liquidity: position.liquidity,
        tickLower: position.tickLower,
        tickUpper: position.tickUpper,
      });
      expect(amounts.amount0.toString()).toStrictEqual('49949961958869841754182');
      expect(amounts.amount1.toString()).toStrictEqual('0');
      expect(amounts.amount0.toString()).toStrictEqual(position.mintAmounts.amount0.toString());
      expect(amounts.amount1.toString()).toStrictEqual(position.mintAmounts.amount1.toString());
    });

    it('is correct for price below', () => {
      const position: Position = createPosition({
        pool: DAI_USDC_POOL,
        liquidity: bi100e18,
        tickLower: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) - TICK_SPACING * 2,
        tickUpper: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) - TICK_SPACING,
      });
      const amounts: MintAmounts = mintAmounts({
        pool: position.pool,
        liquidity: position.liquidity,
        tickLower: position.tickLower,
        tickUpper: position.tickUpper,
      });
      expect(amounts.amount0.toString()).toStrictEqual('0');
      expect(amounts.amount1.toString()).toStrictEqual('49970077053');
      expect(amounts.amount0.toString()).toStrictEqual(position.mintAmounts.amount0.toString());
      expect(amounts.amount1.toString()).toStrictEqual(position.mintAmounts.amount1.toString());
    });

    it('is correct for in-range position', () => {
      const position: Position = createPosition({
        pool: DAI_USDC_POOL,
        liquidity: bi100e18,
        tickLower: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) - TICK_SPACING * 2,
        tickUpper: nearestUsableTick({ tick: POOL_TICK_CURRENT, tickSpacing: TICK_SPACING}) + TICK_SPACING * 2,
      });
      const amounts: MintAmounts = mintAmounts({
        pool: position.pool,
        liquidity: position.liquidity,
        tickLower: position.tickLower,
        tickUpper: position.tickUpper,
      });
      expect(amounts.amount0.toString()).toStrictEqual('120054069145287995769397');
      expect(amounts.amount1.toString()).toStrictEqual('79831926243');
      expect(amounts.amount0.toString()).toStrictEqual(position.mintAmounts.amount0.toString());
      expect(amounts.amount1.toString()).toStrictEqual(position.mintAmounts.amount1.toString());
    });
  });
});
