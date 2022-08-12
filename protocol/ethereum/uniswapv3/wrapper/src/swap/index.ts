import {
  Ethereum_TxResponse,
  FeeAmount,
  GasOptions,
  Args_execSwap,
  Args_swap,
  Args_swapWithPool,
  MethodParameters,
  Pool,
  Route,
  SwapOptions,
  Token,
  TokenAmount,
  Trade,
  TradeType,
} from "../wrap";
import { ROUTER_ADDRESS, execCall, fetchPoolFromAddress } from "../utils";
import { _wrapToken, tokenEquals } from "../token";
import { swapCallParameters } from "../router";
import { createRoute } from "../route";
import { getPoolAddress } from "../pool";
import { createTradeExactIn, createTradeExactOut } from "../trade";

import { BigInt } from "@polywrap/wasm-as";

export function execSwap(args: Args_execSwap): Ethereum_TxResponse {
  const trades: Trade[] = args.trades;
  const swapOptions: SwapOptions = args.swapOptions;
  const gasOptions: GasOptions | null = args.gasOptions;

  const parameters: MethodParameters = swapCallParameters({
    trades,
    options: swapOptions,
  });
  return execCall({
    parameters,
    address: ROUTER_ADDRESS,
    chainId: args.trades[0].inputAmount.token.chainId,
    gasOptions,
  });
}

export function swap(args: Args_swap): Ethereum_TxResponse {
  const inToken: Token = args.inToken;
  const outToken: Token = args.outToken;
  const fee: FeeAmount = args.fee;
  const amountNum: BigInt = args.amount;
  const tradeType: TradeType = args.tradeType;
  const swapOptions: SwapOptions = args.swapOptions;
  const gasOptions: GasOptions | null = args.gasOptions;

  const address: string = getPoolAddress({
    tokenA: _wrapToken(inToken),
    tokenB: _wrapToken(outToken),
    fee: fee,
    initCodeHashManualOverride: null,
  });
  const pool: Pool = fetchPoolFromAddress({
    chainId: inToken.chainId,
    address: address,
    fetchTicks: true,
  });
  const route: Route = createRoute({
    pools: [pool],
    inToken,
    outToken,
  });

  let trade: Trade;
  if (tradeType == TradeType.EXACT_INPUT) {
    trade = createTradeExactIn({
      tradeRoute: {
        route,
        amount: {
          token: inToken,
          amount: amountNum,
        },
      },
    });
  } else {
    trade = createTradeExactOut({
      tradeRoute: {
        route,
        amount: {
          token: outToken,
          amount: amountNum,
        },
      },
    });
  }
  return execSwap({
    trades: [trade],
    swapOptions: swapOptions,
    gasOptions: gasOptions,
  });
}

export function swapWithPool(args: Args_swapWithPool): Ethereum_TxResponse {
  const address: string = args.address;
  const amount: TokenAmount = args.amount;
  const tradeType: TradeType = args.tradeType;
  const swapOptions: SwapOptions = args.swapOptions;
  const gasOptions: GasOptions | null = args.gasOptions;

  const pool: Pool = fetchPoolFromAddress({
    chainId: amount.token.chainId,
    address: address,
    fetchTicks: true,
  });
  const dependentToken = tokenEquals({
    tokenA: amount.token,
    tokenB: pool.token0,
  })
    ? pool.token1
    : pool.token0;

  let trade: Trade;
  if (tradeType == TradeType.EXACT_INPUT) {
    trade = createTradeExactIn({
      tradeRoute: {
        route: createRoute({
          pools: [pool],
          inToken: amount.token,
          outToken: dependentToken,
        }),
        amount,
      },
    });
  } else {
    trade = createTradeExactOut({
      tradeRoute: {
        route: createRoute({
          pools: [pool],
          inToken: dependentToken,
          outToken: amount.token,
        }),
        amount,
      },
    });
  }

  return execSwap({
    trades: [trade],
    swapOptions: swapOptions,
    gasOptions: gasOptions,
  });
}
