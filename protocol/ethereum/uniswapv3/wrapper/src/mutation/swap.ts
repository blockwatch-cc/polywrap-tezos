import {
  Ethereum_TxResponse,
  FeeAmount,
  GasOptions,
  Input_execSwap,
  Input_swap,
  Input_swapWithPool,
  MethodParameters,
  Pool,
  Route,
  SwapOptions,
  Token,
  TokenAmount,
  Trade,
  TradeType,
} from "./w3";
import {
  swapCallParameters,
  createTradeExactIn,
  createRoute,
  createTradeExactOut,
  fetchPoolFromAddress,
  tokenEquals,
  getPoolAddress,
} from "../query";
import { ROUTER_ADDRESS } from "../utils/constants";
import { execCall } from "./call";
import { _wrapToken } from "../utils/tokenUtils";

import { BigInt } from "@web3api/wasm-as";

export function execSwap(input: Input_execSwap): Ethereum_TxResponse {
  const trades: Trade[] = input.trades;
  const swapOptions: SwapOptions = input.swapOptions;
  const gasOptions: GasOptions | null = input.gasOptions;

  const parameters: MethodParameters = swapCallParameters({
    trades,
    options: swapOptions,
  });
  return execCall({
    parameters,
    address: ROUTER_ADDRESS,
    chainId: input.trades[0].inputAmount.token.chainId,
    gasOptions,
  });
}

export function swap(input: Input_swap): Ethereum_TxResponse {
  const inToken: Token = input.inToken;
  const outToken: Token = input.outToken;
  const fee: FeeAmount = input.fee;
  const amountNum: BigInt = input.amount;
  const tradeType: TradeType = input.tradeType;
  const swapOptions: SwapOptions = input.swapOptions;
  const gasOptions: GasOptions | null = input.gasOptions;

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

export function swapWithPool(input: Input_swapWithPool): Ethereum_TxResponse {
  const address: string = input.address;
  const amount: TokenAmount = input.amount;
  const tradeType: TradeType = input.tradeType;
  const swapOptions: SwapOptions = input.swapOptions;
  const gasOptions: GasOptions | null = input.gasOptions;

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
