import {
  BestTradeOptions,
  Args_bestTradeExactIn,
  Args_bestTradeExactOut,
  Args_createTradeExactIn,
  Args_createTradeExactOut,
  Args_createTradeFromRoute,
  Args_createTradeFromRoutes,
  Args_createUncheckedTrade,
  Args_createUncheckedTradeWithMultipleRoutes,
  Args_tradeExecutionPrice,
  Args_tradeInputAmount,
  Args_tradeMaximumAmountIn,
  Args_tradeMinimumAmountOut,
  Args_tradeOutputAmount,
  Args_tradePriceImpact,
  Args_tradeWorstExecutionPrice,
  Pool,
  PoolChangeResult,
  Price as PriceType,
  Fraction as FractionType,
  Route,
  Token,
  TokenAmount,
  Trade,
  TradeRoute,
  TradeSwap,
  TradeType,
} from "../wrap";
import {
  tokenAmountEquals,
  tokenEquals,
  copyTokenAmount,
  _wrapAmount,
  _wrapToken,
} from "../token";
import {
  getPoolInputAmount,
  getPoolOutputAmount,
  poolInvolvesToken,
} from "../pool";
import { Price, Fraction, PriorityQueue } from "../utils";
import { createRoute } from "../route";

import { BigInt, Option } from "@polywrap/wasm-as";

/**
 * private constructor; constructs and validates trade
 * @param swaps the routes to swap through, the amount being passed in, and the amount returned when the trade is executed
 * @param tradeType the type of the trade, either exact in or exact out
 */
function createTrade(swaps: TradeSwap[], tradeType: TradeType): Trade {
  // All routes should have the same starting token.
  const tokenIn: Token = _wrapToken(swaps[0].inputAmount.token);
  for (let i = 0; i < swaps.length; i++) {
    const tokenA: Token = _wrapToken(swaps[i].route.input);
    if (!tokenEquals({ tokenA, tokenB: tokenIn })) {
      throw new Error(
        "INPUT_CURRENCY_MATCH: the input token of the trade and all its routes must match"
      );
    }
  }
  // All routes should have the same ending token.
  const tokenOut: Token = _wrapToken(swaps[0].outputAmount.token);
  for (let i = 0; i < swaps.length; i++) {
    const tokenA: Token = _wrapToken(swaps[i].route.output);
    if (!tokenEquals({ tokenA, tokenB: tokenOut })) {
      throw new Error(
        "OUTPUT_CURRENCY_MATCH: the output token of the trade and all its routes must match"
      );
    }
  }

  const numPools: i32 = swaps
    .map<i32>((route: TradeSwap) => route.route.pools.length)
    .reduce((total, cur) => total + cur, 0);
  const poolAddressSet = new Set<string>();
  for (let i = 0; i < swaps.length; i++) {
    const route: Route = swaps[i].route;
    for (let j = 0; j < route.pools.length; j++) {
      const pool: Pool = route.pools[j];
      // TODO: can't run unit tests with getPoolAddress because it relies on sha3 plugin; is this really necessary?
      // const address: string = getPoolAddress({
      //   tokenA: pool.token0,
      //   tokenB: pool.token1,
      //   fee: pool.fee,
      //   initCodeHashManualOverride: null,
      // });
      const address: string =
        pool.token0.address + pool.token1.address + pool.fee.toString();
      poolAddressSet.add(address);
    }
  }
  if (numPools != poolAddressSet.size) {
    throw new Error(
      "POOLS_DUPLICATED: pools must be unique within and across routes"
    );
  }

  const inputAmount: TokenAmount = tradeInputAmount({ swaps: swaps });
  const outputAmount: TokenAmount = tradeOutputAmount({ swaps: swaps });
  const executionPrice: PriceType = tradeExecutionPrice({
    inputAmount,
    outputAmount,
  });
  const priceImpact: FractionType = tradePriceImpact({ swaps, outputAmount });

  return {
    swaps,
    tradeType,
    inputAmount,
    outputAmount,
    executionPrice,
    priceImpact,
  };
}

/**
 * private helper function used to create a TradeSwap
 * @param route the route to swap through
 * @param amount the amount being passed in or out, depending on the trade type
 * @param tradeType the type of the trade, either exact in or exact out
 * @returns TradeSwap the route to swap through, the amount being passed in, and the amount returned when the trade is executed
 */
function createTradeSwap(
  route: Route,
  amount: TokenAmount,
  tradeType: TradeType
): TradeSwap {
  const amounts: TokenAmount[] = new Array<TokenAmount>(route.path.length);
  let inputAmount: TokenAmount;
  let outputAmount: TokenAmount;

  if (tradeType === TradeType.EXACT_INPUT) {
    if (!tokenEquals({ tokenA: amount.token, tokenB: route.input })) {
      throw new Error(
        "INPUT: the input amount token does not match the route input token"
      );
    }
    amounts[0] = _wrapAmount(amount);
    for (let i = 0; i < route.path.length - 1; i++) {
      amounts[i + 1] = getPoolOutputAmount({
        pool: route.pools[i],
        inputAmount: amounts[i],
        sqrtPriceLimitX96: null,
      }).amount;
    }
    inputAmount = {
      token: route.input,
      amount: amount.amount,
    };
    outputAmount = {
      token: route.output,
      amount: amounts[amounts.length - 1].amount,
    };
  } else {
    if (!tokenEquals({ tokenA: amount.token, tokenB: route.output })) {
      throw new Error(
        "OUTPUT: the output amount token does not match the route output token"
      );
    }
    amounts[amounts.length - 1] = _wrapAmount(amount);
    for (let i = route.path.length - 1; i > 0; i--) {
      amounts[i - 1] = getPoolInputAmount({
        pool: route.pools[i - 1],
        outputAmount: amounts[i],
        sqrtPriceLimitX96: null,
      }).amount;
    }
    inputAmount = {
      token: route.input,
      amount: amounts[0].amount,
    };
    outputAmount = {
      token: route.output,
      amount: amount.amount,
    };
  }
  return { route, inputAmount, outputAmount };
}

/**
 * Constructs an exact in trade with the given amount in and route
 * @param args.route the route of the exact in trade and the amount being passed in
 */
export function createTradeExactIn(args: Args_createTradeExactIn): Trade {
  const tradeRoute: TradeRoute = args.tradeRoute;
  return createTradeFromRoute({
    tradeRoute: tradeRoute,
    tradeType: TradeType.EXACT_INPUT,
  });
}

/**
 * Constructs an exact out trade with the given amount out and route
 * @param args.route the route of the exact out trade and the amount returned
 */
export function createTradeExactOut(args: Args_createTradeExactOut): Trade {
  const tradeRoute: TradeRoute = args.tradeRoute;
  return createTradeFromRoute({
    tradeRoute: tradeRoute,
    tradeType: TradeType.EXACT_OUTPUT,
  });
}

/**
 * Constructs a trade by simulating swaps through the given route
 * @param args.route the route to swap through and the amount specified, either input or output, depending on the trade type
 * @param args.tradeType whether the trade is an exact input or exact output swap
 */
export function createTradeFromRoute(args: Args_createTradeFromRoute): Trade {
  const route: Route = args.tradeRoute.route;
  const amount: TokenAmount = args.tradeRoute.amount;
  const tradeType: TradeType = args.tradeType;
  return createTrade([createTradeSwap(route, amount, tradeType)], tradeType);
}

/**
 * Constructs a trade by simulating swaps through the given routes
 * @param args.routes the routes to swap through and how much of the amount should be routed through each
 * @param args.tradeType whether the trade is an exact input or exact output swap
 */
export function createTradeFromRoutes(args: Args_createTradeFromRoutes): Trade {
  const tradeRoutes: TradeRoute[] = args.tradeRoutes;
  const tradeType: TradeType = args.tradeType;

  const populatedRoutes: TradeSwap[] = [];
  for (let i = 0; i < tradeRoutes.length; i++) {
    const route: Route = tradeRoutes[i].route;
    const amount: TokenAmount = tradeRoutes[i].amount;
    populatedRoutes.push(createTradeSwap(route, amount, tradeType));
  }

  return createTrade(populatedRoutes, tradeType);
}

/**
 * Creates a trade without computing the result of swapping through the route. Useful when you have simulated the trade elsewhere and do not have any tick data
 * @param args.swap the route to swap through, the amount being passed in, and the amount returned when the trade is executed
 * @param args.tradeType the type of the trade, either exact in or exact out
 */
export function createUncheckedTrade(args: Args_createUncheckedTrade): Trade {
  return createTrade([args.swap], args.tradeType);
}

/**
 * Creates a trade without computing the result of swapping through the routes. Useful when you have simulated the trade elsewhere and do not have any tick data
 * @param args.routes the routes to swap through, the amounts being passed in, and the amounts returned when the trade is executed
 * @param args.tradeType the type of the trade, either exact in or exact out
 */
export function createUncheckedTradeWithMultipleRoutes(
  args: Args_createUncheckedTradeWithMultipleRoutes
): Trade {
  return createTrade(args.swaps, args.tradeType);
}

/**
 * The input amount for the trade assuming no slippage.
 * @param args.swaps the routes to swap through, the amounts being passed in, and the amounts returned when the trade is executed
 */
export function tradeInputAmount(args: Args_tradeInputAmount): TokenAmount {
  const swaps: TradeSwap[] = args.swaps;
  const inputCurrency: Token = swaps[0].inputAmount.token;
  const totalInputFromRoutes: BigInt = swaps
    .map<BigInt>((swap: TradeSwap) => swap.inputAmount.amount)
    .reduce((total, cur) => total.add(cur), BigInt.ZERO);
  return {
    token: inputCurrency,
    amount: totalInputFromRoutes,
  };
}

/**
 * The output amount for the trade assuming no slippage
 * @param args.swaps the routes to swap through, the amounts being passed in, and the amounts returned when the trade is executed
 */
export function tradeOutputAmount(args: Args_tradeOutputAmount): TokenAmount {
  const swaps: TradeSwap[] = args.swaps;
  const outputCurrency: Token = swaps[0].outputAmount.token;
  const totalOutputFromRoutes: BigInt = swaps
    .map<BigInt>((swap: TradeSwap) => swap.outputAmount.amount)
    .reduce((total, cur) => total.add(cur), BigInt.ZERO);
  return {
    token: outputCurrency,
    amount: totalOutputFromRoutes,
  };
}

/**
 * The price expressed in terms of output amount/input amount.
 * @param args.inputAmount the trade input amount, e.g. from Trade object or tradeInputAmount(...)
 * @param args.outputAmount the trade output amount, e.g. from Trade object or tradeOutputAmount(...)
 */
export function tradeExecutionPrice(args: Args_tradeExecutionPrice): PriceType {
  const inputAmount: TokenAmount = args.inputAmount;
  const outputAmount: TokenAmount = args.outputAmount;
  return new Price(
    inputAmount.token,
    outputAmount.token,
    inputAmount.amount,
    outputAmount.amount
  ).toPriceType();
}

/**
 * Returns the percent difference between the route's mid price and the price impact
 * @param args.swaps the routes to swap through, the amounts being passed in, and the amounts returned when the trade is executed
 * @param args.outputAmount the trade output amount, e.g. from Trade object or tradeOutputAmount(...)
 */
export function tradePriceImpact(args: Args_tradePriceImpact): FractionType {
  const swaps: TradeSwap[] = args.swaps;
  const outputAmount: TokenAmount = args.outputAmount;

  let spotOutputAmount: Fraction = new Fraction(BigInt.ZERO);

  for (let i = 0; i < swaps.length; i++) {
    const route: Route = swaps[i].route;
    const inputAmount: TokenAmount = swaps[i].inputAmount;
    const midPrice: Price = Price.from(route.midPrice);
    const quote: Fraction = midPrice.quote(inputAmount);
    spotOutputAmount = spotOutputAmount.add(quote);
  }

  const tradeOutputFraction: Fraction = new Fraction(outputAmount.amount);
  const priceImpact: Fraction = spotOutputAmount
    .sub(tradeOutputFraction)
    .div(spotOutputAmount);

  return {
    numerator: priceImpact.numerator,
    denominator: priceImpact.denominator,
    quotient: priceImpact.toFixed(18),
  };
}

/**
 * Get the minimum amount that must be received from this trade for the given slippage tolerance
 * @param args.slippageTolerance The tolerance of unfavorable slippage from the execution price of this trade; a decimal number between 0 and 1 (e.g. "0.03") that represents a percentage
 * @param args.amountOut The output amount of the trade, before slippage, e.g. from Trade object or tradeOutputAmount(...)
 * @param args.tradeType The type of the trade, either exact in or exact out
 */
export function tradeMinimumAmountOut(
  args: Args_tradeMinimumAmountOut
): TokenAmount {
  const tolerance: Fraction = Fraction.fromString(args.slippageTolerance);
  const amountOut: TokenAmount = args.amountOut;
  const tradeType: TradeType = args.tradeType;

  if (tolerance.lt(new Fraction(BigInt.ZERO))) {
    throw new RangeError(
      "SLIPPAGE_TOLERANCE: slippage tolerance cannot be less than zero"
    );
  }

  if (tradeType == TradeType.EXACT_OUTPUT) {
    return amountOut;
  } else {
    const amountOutFraction: Fraction = new Fraction(amountOut.amount);
    const slippageAdjustedAmountOut: BigInt = new Fraction(BigInt.ONE)
      .add(tolerance)
      .invert()
      .mul(amountOutFraction)
      .quotient();
    return {
      token: amountOut.token,
      amount: slippageAdjustedAmountOut,
    };
  }
}

/**
 * Get the maximum amount in that can be spent via this trade for the given slippage tolerance
 * @param args.slippageTolerance The tolerance of unfavorable slippage from the execution price of this trade; a decimal number between 0 and 1 (e.g. "0.03") that represents a percentage
 * @param args.amountIn The input amount of the trade, before slippage, e.g. from Trade object or tradeInputAmount(...)
 * @param args.tradeType The type of the trade, either exact in or exact out
 */
export function tradeMaximumAmountIn(
  args: Args_tradeMaximumAmountIn
): TokenAmount {
  const tolerance: Fraction = Fraction.fromString(args.slippageTolerance);
  const amountIn: TokenAmount = args.amountIn;
  const tradeType: TradeType = args.tradeType;

  if (tolerance.lt(new Fraction(BigInt.ZERO))) {
    throw new RangeError(
      "SLIPPAGE_TOLERANCE: slippage tolerance cannot be less than zero"
    );
  }

  if (tradeType === TradeType.EXACT_INPUT) {
    return amountIn;
  } else {
    const amountInFraction: Fraction = new Fraction(amountIn.amount);
    const slippageAdjustedAmountIn: BigInt = new Fraction(BigInt.ONE)
      .add(tolerance)
      .mul(amountInFraction)
      .quotient();
    return {
      token: amountIn.token,
      amount: slippageAdjustedAmountIn,
    };
  }
}

/**
 * Return the execution price after accounting for slippage tolerance
 * @param args.swaps the routes to swap through, the amounts being passed in, and the amounts returned when the trade is executed
 * @param args.tradeType the type of the trade, either exact in or exact out
 * @param args.amountIn the trade input amount, e.g. from Trade object or tradeInputAmount(...)
 * @param args.amountOut the trade output amount, e.g. from Trade object or tradeOutputAmount(...)
 * @param args.slippageTolerance the allowed tolerated slippage
 */
export function tradeWorstExecutionPrice(
  args: Args_tradeWorstExecutionPrice
): PriceType {
  const swaps: TradeSwap[] = args.trade.swaps;
  const tradeType: TradeType = args.trade.tradeType;
  const amountIn: TokenAmount = args.trade.inputAmount;
  const amountOut: TokenAmount = args.trade.outputAmount;
  const slippageTolerance: string = args.slippageTolerance;

  return new Price(
    swaps[0].inputAmount.token,
    swaps[0].outputAmount.token,
    tradeMaximumAmountIn({ slippageTolerance, amountIn, tradeType }).amount,
    tradeMinimumAmountOut({ slippageTolerance, amountOut, tradeType }).amount
  ).toPriceType();
}

/**
 * Given a list of pools, and a fixed amount in, returns the top `maxNumResults` trades that go from an input token
 amount to an output token, making at most `maxHops` hops.
 Note this does not consider aggregation, as routes are linear. It's possible a better route exists by splitting
 the amount in among multiple routes.
 * @param args.pools the pools to consider in finding the best trade
 * @param args.amountIn exact amount of input currency to spend
 * @param args.tokenOut the desired currency out
 * @param args.options options used when determining the best trade
 */
export function bestTradeExactIn(args: Args_bestTradeExactIn): Trade[] {
  const pools: Pool[] = args.pools;
  const amountIn: TokenAmount = args.amountIn;
  const tokenOut: Token = args.tokenOut;
  const options: BestTradeOptions = fillBestTradeOptions(args.options);

  if (pools.length == 0) {
    throw new Error("POOLS: pools array is empty");
  }
  if (options.maxHops.unwrap() == 0) {
    throw new Error("MAX_HOPS: maxHops must be greater than zero");
  }

  return _bestTradeExactIn(pools, amountIn, tokenOut, options)
    .toArray()
    .slice(0, options.maxNumResults.unwrap());
}

function _bestTradeExactIn(
  pools: Pool[],
  currencyAmountIn: TokenAmount,
  currencyOut: Token,
  options: BestTradeOptions,
  // used in recursion
  currentPools: Pool[] = [],
  nextAmountIn: TokenAmount = copyTokenAmount(currencyAmountIn),
  bestTrades: PriorityQueue<Trade> = new PriorityQueue<Trade>(tradeComparator)
): PriorityQueue<Trade> {
  if (
    !(
      tokenAmountEquals({
        tokenAmountA: currencyAmountIn,
        tokenAmountB: nextAmountIn,
      }) || currentPools.length > 0
    )
  ) {
    throw new Error("INVALID_RECURSION");
  }

  const amountIn = _wrapAmount(nextAmountIn);
  const tokenOut = _wrapToken(currencyOut);
  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i];
    // pool irrelevant
    if (!poolInvolvesToken({ pool, token: amountIn.token })) continue;

    const amountOut: TokenAmount = getPoolOutputAmount({
      pool,
      inputAmount: amountIn,
      sqrtPriceLimitX96: null,
    }).amount;

    // we have arrived at the output token, so this is the final trade of one of the paths
    if (tokenEquals({ tokenA: amountOut.token, tokenB: tokenOut })) {
      const newTrade = createTradeFromRoute({
        tradeRoute: {
          route: createRoute({
            pools: currentPools.concat([pool]),
            inToken: currencyAmountIn.token,
            outToken: currencyOut,
          }),
          amount: currencyAmountIn,
        },
        tradeType: TradeType.EXACT_INPUT,
      });
      bestTrades.insert(newTrade);
    } else if (options.maxHops.unwrap() > 1 && pools.length > 1) {
      const poolsExcludingThisPool: Pool[] = pools
        .slice(0, i)
        .concat(pools.slice(i + 1));

      // otherwise, consider all the other paths that lead from this token as long as we have not exceeded maxHops
      _bestTradeExactIn(
        poolsExcludingThisPool,
        currencyAmountIn,
        currencyOut,
        {
          maxNumResults: options.maxNumResults,
          maxHops: new Option(options.maxHops.unwrap() - 1, false),
        },
        currentPools.concat([pool]),
        amountOut,
        bestTrades
      );
    }
  }

  return bestTrades;
}

/**
 * Similar to bestTradeExactIn(...) but instead targets a fixed output amount
 given a list of pools, and a fixed amount out, returns the top `maxNumResults` trades that go from an input token
 to an output token amount, making at most `maxHops` hops.
 Note this does not consider aggregation, as routes are linear. It's possible a better route exists by splitting
 the amount in among multiple routes.
 * @param args.pools the pools to consider in finding the best trade
 * @param args.tokenIn the currency to spend
 * @param args.amountOut the desired currency amount out
 * @param args.options options used when determining the best trade
 */
export function bestTradeExactOut(args: Args_bestTradeExactOut): Trade[] {
  const pools: Pool[] = args.pools;
  const tokenIn: Token = args.tokenIn;
  const amountOut: TokenAmount = args.amountOut;
  const options: BestTradeOptions = fillBestTradeOptions(args.options);

  if (pools.length == 0) {
    throw new Error("POOLS: pools array is empty");
  }
  if (options.maxHops.unwrap() == 0) {
    throw new Error("MAX_HOPS: maxHops must be greater than zero");
  }

  return _bestTradeExactOut(pools, tokenIn, amountOut, options)
    .toArray()
    .slice(0, options.maxNumResults.unwrap());
}

function _bestTradeExactOut(
  pools: Pool[],
  currencyIn: Token,
  currencyAmountOut: TokenAmount,
  options: BestTradeOptions,
  // used in recursion
  currentPools: Pool[] = [],
  nextAmountOut: TokenAmount = copyTokenAmount(currencyAmountOut),
  bestTrades: PriorityQueue<Trade> = new PriorityQueue<Trade>(tradeComparator)
): PriorityQueue<Trade> {
  if (
    !(
      tokenAmountEquals({
        tokenAmountA: currencyAmountOut,
        tokenAmountB: nextAmountOut,
      }) || currentPools.length > 0
    )
  ) {
    throw new Error("INVALID_RECURSION");
  }

  const amountOut: TokenAmount = _wrapAmount(nextAmountOut);
  const tokenIn: Token = _wrapToken(currencyIn);
  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i];
    // pool irrelevant
    if (!poolInvolvesToken({ pool, token: amountOut.token })) continue;

    const poolChangeResult: PoolChangeResult = getPoolInputAmount({
      pool,
      outputAmount: amountOut,
      sqrtPriceLimitX96: null,
    });
    const amountIn: TokenAmount = poolChangeResult.amount;
    const nextPoolState: Pool = poolChangeResult.nextPool;
    // TODO: is this a valid test for insufficient liquidity?
    // insufficient liquidity
    if (nextPoolState.liquidity.isZero()) {
      continue;
    }

    // we have arrived at the input token, so this is the first trade of one of the paths
    if (tokenEquals({ tokenA: amountIn.token, tokenB: tokenIn })) {
      const newTrade = createTradeFromRoute({
        tradeRoute: {
          route: createRoute({
            pools: [pool].concat(currentPools),
            inToken: currencyIn,
            outToken: currencyAmountOut.token,
          }),
          amount: currencyAmountOut,
        },
        tradeType: TradeType.EXACT_OUTPUT,
      });
      bestTrades.insert(newTrade);
    } else if (options.maxHops.unwrap() > 1 && pools.length > 1) {
      const poolsExcludingThisPool: Pool[] = pools
        .slice(0, i)
        .concat(pools.slice(i + 1));

      // otherwise, consider all the other paths that arrive at this token as long as we have not exceeded maxHops
      _bestTradeExactOut(
        poolsExcludingThisPool,
        currencyIn,
        currencyAmountOut,
        {
          maxNumResults: options.maxNumResults,
          maxHops: new Option(options.maxHops.unwrap() - 1, false),
        },
        [pool].concat(currentPools),
        amountIn,
        bestTrades
      );
    }
  }

  return bestTrades;
}

function tradeComparator(a: Trade, b: Trade): i32 {
  const aInput = a.inputAmount;
  const bInput = b.inputAmount;
  if (!tokenEquals({ tokenA: aInput.token, tokenB: bInput.token })) {
    throw new Error(
      "INPUT_CURRENCY: To be compared, trades must the same input token"
    );
  }

  const aOutput = a.outputAmount;
  const bOutput = b.outputAmount;
  if (!tokenEquals({ tokenA: aOutput.token, tokenB: bOutput.token })) {
    throw new Error(
      "OUTPUT_CURRENCY: To be compared, trades must the same output token"
    );
  }

  const aOutputBI = aOutput.amount;
  const bOutputBI = bOutput.amount;
  const aInputBI = aInput.amount;
  const bInputBI = bInput.amount;

  if (aOutputBI.eq(bOutputBI)) {
    if (aInputBI.eq(bInputBI)) {
      // consider the number of hops since each hop costs gas
      const aHops = a.swaps.reduce((x, cur) => x + cur.route.path.length, 0);
      const bHops = b.swaps.reduce((x, cur) => x + cur.route.path.length, 0);
      return bHops - aHops;
    }
    // trade A requires less input than trade B, so A should come first
    if (aInputBI.lt(bInputBI)) {
      return 1;
    } else {
      return -1;
    }
  } else {
    // tradeA has less output than trade B, so should come second
    if (aOutputBI.lt(bOutputBI)) {
      return -1;
    } else {
      return 1;
    }
  }
}

function fillBestTradeOptions(
  options: BestTradeOptions | null
): BestTradeOptions {
  return options === null
    ? {
        maxNumResults: new Option(3, false),
        maxHops: new Option(3, false),
      }
    : {
        maxNumResults: options.maxNumResults.isNone
          ? new Option(3, false)
          : options.maxNumResults,
        maxHops: options.maxHops.isNone
          ? new Option(3, false)
          : options.maxHops,
      };
}
