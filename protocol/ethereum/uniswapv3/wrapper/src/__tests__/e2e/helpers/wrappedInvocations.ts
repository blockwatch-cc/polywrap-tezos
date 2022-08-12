 import { PolywrapClient } from "@polywrap/client-js";
import {
  AddLiquidityOptions, BestTradeOptions,
  BigInt, ChainId, ChainIdEnum, ClaimOptions, CollectOptions,
  FeeAmount,
  FeeAmountEnum,
  FeeOptions, FullWithdrawOptions, IncentiveKey,
  Int32, MethodParameters,
  Pool, Position, QuoteOptions, RemoveLiquidityOptions,
  Route, SafeTransferOptions, SwapOptions,
  Tick,
  Token, TokenAmount, Trade,
  TradeRoute,
  TradeType, TradeTypeEnum
} from "./types";

type BigIntish = BigInt | number;

export async function constant<T>(client: PolywrapClient, uri: string, method: string): Promise<T> {
  const invocation = await client.invoke<T>({
    uri: uri,
    method: method,
  });
  if (invocation.error) {
    throw invocation.error;
  }
  return invocation.data!;
}

export async function createPool(client: PolywrapClient, uri: string, tokenA: Token, tokenB: Token, fee: FeeAmount, sqrtRatioX96: BigIntish, liquidity: BigIntish, tickCurrent: Int32, ticks: Tick[]): Promise<Pool> {
  const invocation = await client.invoke<Pool>({
    uri: uri,
    method: "createPool",
    args: {
      tokenA,
      tokenB,
      fee: typeof fee === "string" ? fee : FeeAmountEnum[fee],
      sqrtRatioX96: sqrtRatioX96.toString(),
      liquidity: liquidity.toString(),
      tickCurrent,
      ticks,
    },
  });
  if (invocation.error) {
    throw invocation.error;
  }
  return invocation.data!;
}

export async function encodeSqrtRatioX96(client: PolywrapClient, uri: string, amount1: BigIntish, amount0: BigIntish): Promise<BigInt> {
  const invocation = await client.invoke<BigInt>({
    uri: uri,
    method: "encodeSqrtRatioX96",
    args: {
      amount1: amount1.toString(),
      amount0: amount0.toString(),
    },
  });
  if (invocation.error) {
    throw invocation.error;
  }
  return invocation.data!;
}

export async function createRoute(client: PolywrapClient, uri: string, pools: Pool[], inToken: Token, outToken: Token): Promise<Route> {
  const invocation = await client.invoke<Route>({
    uri: uri,
    method: "createRoute",
    args: {
      pools,
      inToken,
      outToken,
    },
  });
  if (invocation.error) {
    throw invocation.error;
  }
  return invocation.data!;
}

export async function encodeRouteToPath(client: PolywrapClient, uri: string, route: Route, exactOutput: boolean): Promise<string> {
  const invocation = await client.invoke<string>({
    uri: uri,
    method: "encodeRouteToPath",
    args: {
      route,
      exactOutput,
    },
  });
  if (invocation.error) {
    throw invocation.error;
  }
  return invocation.data!;
}

export async function encodeUnwrapWETH9(client: PolywrapClient, uri: string, amountMinimum: BigIntish, recipient: string, feeOptions?: FeeOptions): Promise<string> {
  const invocation = await client.invoke<string>({
    uri: uri,
    method: "encodeUnwrapWETH9",
    args: {
      amountMinimum: amountMinimum.toString(),
      recipient,
      feeOptions: feeOptions ?? null,
    },
  });
  if (invocation.error) {
    throw invocation.error;
  }
  return invocation.data!;
}

export async function encodeSweepToken(client: PolywrapClient, uri: string, token: Token, amountMinimum: BigIntish, recipient: string, feeOptions?: FeeOptions): Promise<string> {
  const invocation = await client.invoke<string>({
    uri: uri,
    method: "encodeSweepToken",
    args: {
      token,
      amountMinimum: amountMinimum.toString(),
      recipient,
      feeOptions: feeOptions ?? null,
    },
  });
  if (invocation.error) {
    throw invocation.error;
  }
  return invocation.data!;
}

export async function encodeRefundETH(client: PolywrapClient, uri: string): Promise<string> {
  const invocation = await client.invoke<string>({
    uri: uri,
    method: "encodeRefundETH",
  });
  if (invocation.error) {
    throw invocation.error;
  }
  return invocation.data!;
}

export async function encodeMulticall(client: PolywrapClient, uri: string, calldatas: string[]): Promise<string> {
  const invocation = await client.invoke<string>({
    uri: uri,
    method: "encodeMulticall",
    args: {
      calldatas,
    },
  });
  if (invocation.error) {
    throw invocation.error;
  }
  return invocation.data!;
}

export async function getTickAtSqrtRatio(client: PolywrapClient, uri: string, sqrtRatioX96: BigIntish): Promise<number> {
  const invocation = await client.invoke<number>({
    uri: uri,
    method: "getTickAtSqrtRatio",
    args: {
      sqrtRatioX96: sqrtRatioX96.toString(),
    },
  });
  if (invocation.error) {
    throw invocation.error;
  }
  return invocation.data!;
}

export async function nearestUsableTick(client: PolywrapClient, uri: string, tick: number, tickSpacing: number): Promise<number> {
  const invocation = await client.invoke<number>({
    uri: uri,
    method: "nearestUsableTick",
    args: {
      tick,
      tickSpacing,
    },
  });
  if (invocation.error) {
    throw invocation.error;
  }
  return invocation.data!;
}

export async function getSqrtRatioAtTick(client: PolywrapClient, uri: string, tick: number): Promise<string> {
 const invocation = await client.invoke<string>({
   uri: uri,
   method: "getSqrtRatioAtTick",
   args: {
     tick,
   },
 });
 if (invocation.error) {
   throw invocation.error;
 }
 return invocation.data!;
}

export async function feeAmountToTickSpacing(client: PolywrapClient, uri: string, feeAmount: FeeAmount): Promise<number> {
  const invocation = await client.invoke<number>({
    uri: uri,
    method: "feeAmountToTickSpacing",
    args: {
      feeAmount: typeof feeAmount === "string" ? feeAmount : FeeAmountEnum[feeAmount],
    },
  });
  if (invocation.error) {
    throw invocation.error;
  }
  return invocation.data!;
}

export async function createTradeFromRoute(client: PolywrapClient, uri: string, tradeRoute: TradeRoute, tradeType: TradeType): Promise<Trade> {
  const invocation = await client.invoke<Trade>({
    uri: uri,
    method: "createTradeFromRoute",
    args: {
      tradeRoute,
      tradeType,
    },
  });
  if (invocation.error) {
    throw invocation.error;
  }
  return invocation.data!;
}

export async function createTradeFromRoutes(client: PolywrapClient, uri: string, tradeRoutes: TradeRoute[], tradeType: TradeType): Promise<Trade> {
  const invocation = await client.invoke<Trade>({
    uri: uri,
    method: "createTradeFromRoutes",
    args: {
      tradeRoutes,
      tradeType,
    },
  });
  if (invocation.error) {
    throw invocation.error;
  }
  return invocation.data!;
}

export async function swapCallParameters(client: PolywrapClient, uri: string, trades: Trade[], options: SwapOptions): Promise<MethodParameters> {
  const invocation = await client.invoke<MethodParameters>({
    uri: uri,
    method: "swapCallParameters",
    args: {
      trades,
      options,
    },
  });
  if (invocation.error) {
    throw invocation.error;
  }
  return invocation.data!;
}

export async function quoteCallParameters(client: PolywrapClient, uri: string, route: Route, amount: TokenAmount, tradeType: TradeType, options?: QuoteOptions): Promise<MethodParameters> {
  const invocation = await client.invoke<MethodParameters>({
    uri: uri,
    method: "quoteCallParameters",
    args: {
      route,
      amount,
      tradeType: typeof tradeType === "string" ? tradeType : TradeTypeEnum[tradeType],
      options: options ?? null,
    },
  });
  if (invocation.error) {
    throw invocation.error;
  }
  return invocation.data!;
}

export async function collectRewards(client: PolywrapClient, uri: string, incentiveKeys: IncentiveKey[], options: ClaimOptions): Promise<MethodParameters> {
  const invocation = await client.invoke<MethodParameters>({
    uri: uri,
    method: "collectRewards",
    args: {
      incentiveKeys,
      options,
    },
  });
  if (invocation.error) {
    throw invocation.error;
  }
  return invocation.data!;
}

export async function withdrawToken(client: PolywrapClient, uri: string, incentiveKeys: IncentiveKey[], options: FullWithdrawOptions): Promise<MethodParameters> {
  const invocation = await client.invoke<MethodParameters>({
    uri: uri,
    method: "withdrawToken",
    args: {
      incentiveKeys,
      options,
    },
  });
  if (invocation.error) {
    throw invocation.error;
  }
  return invocation.data!;
}

export async function encodeDeposit(client: PolywrapClient, uri: string, incentiveKeys: IncentiveKey[]): Promise<string> {
  const invocation = await client.invoke<string>({
    uri: uri,
    method: "encodeDeposit",
    args: {
      incentiveKeys,
    },
  });
  if (invocation.error) {
    throw invocation.error;
  }
  return invocation.data!;
}

export async function safeTransferFromParameters(client: PolywrapClient, uri: string, options: SafeTransferOptions): Promise<MethodParameters> {
  const invocation = await client.invoke<MethodParameters>({
    uri: uri,
    method: "safeTransferFromParameters",
    args: {
      options,
    },
  });
  if (invocation.error) {
    throw invocation.error;
  }
  return invocation.data!;
}

export async function createCallParameters(client: PolywrapClient, uri: string, pool: Pool): Promise<MethodParameters> {
  const invocation = await client.invoke<MethodParameters>({
    uri: uri,
    method: "createCallParameters",
    args: {
      pool
    },
  });
  if (invocation.error) {
    throw invocation.error;
  }
  return invocation.data!;
}

export async function addCallParameters(client: PolywrapClient, uri: string, position: Position, options: AddLiquidityOptions): Promise<MethodParameters> {
  const invocation = await client.invoke<MethodParameters>({
    uri: uri,
    method: "addCallParameters",
    args: {
      position,
      options,
    },
  });
  if (invocation.error) {
    throw invocation.error;
  }
  return invocation.data!;
}

export async function collectCallParameters(client: PolywrapClient, uri: string, options: CollectOptions): Promise<MethodParameters> {
  const invocation = await client.invoke<MethodParameters>({
    uri: uri,
    method: "collectCallParameters",
    args: {
      options
    },
  });
  if (invocation.error) {
    throw invocation.error;
  }
  return invocation.data!;
}

export async function removeCallParameters(client: PolywrapClient, uri: string, position: Position, options: RemoveLiquidityOptions): Promise<MethodParameters> {
  const invocation = await client.invoke<MethodParameters>({
    uri: uri,
    method: "removeCallParameters",
    args: {
      position,
      options,
    },
  });
  if (invocation.error) {
    throw invocation.error;
  }
  return invocation.data!;
}

export async function createPosition(client: PolywrapClient, uri: string, pool: Pool, tickLower: number, tickUpper: number, liquidity: BigIntish): Promise<Position> {
  const invocation = await client.invoke<Position>({
    uri: uri,
    method: "createPosition",
    args: {
      pool,
      tickLower,
      tickUpper,
      liquidity: liquidity.toString(),
    },
  });
  if (invocation.error) {
    throw invocation.error;
  }
  return invocation.data!;
}

export async function bestTradeExactIn(client: PolywrapClient, uri: string, pools: Pool[], amountIn: TokenAmount, tokenOut: Token, options?: BestTradeOptions): Promise<Trade[]> {
  const invocation = await client.invoke<Trade[]>({
    uri: uri,
    method: "bestTradeExactIn",
    args: {
      pools,
      amountIn,
      tokenOut,
      options,
    },
  });
  if (invocation.error) {
    throw invocation.error;
  }
  return invocation.data!;
}

export async function bestTradeExactOut(client: PolywrapClient, uri: string, pools: Pool[], tokenIn: Token, amountOut: TokenAmount, options?: BestTradeOptions): Promise<Trade[]> {
 const invocation = await client.invoke<Trade[]>({
   uri: uri,
   method: "bestTradeExactOut",
   args: {
     pools,
     tokenIn,
     amountOut,
     options,
   },
 });
 if (invocation.error) {
   throw invocation.error;
 }
 return invocation.data!;
}

export async function getNative(client: PolywrapClient, uri: string, chainId: ChainId): Promise<Token> {
 const invocation = await client.invoke<Token>({
   uri: uri,
   method: "getNative",
   args: {
     chainId: typeof chainId === "string" ? chainId : ChainIdEnum[chainId],
   },
 });
 if (invocation.error) {
   throw invocation.error;
 }
 return invocation.data!;
}

export async function getWETH(client: PolywrapClient, uri: string, chainId: ChainId): Promise<Token> {
 const invocation = await client.invoke<Token>({
   uri: uri,
   method: "getWETH",
   args: {
     chainId: typeof chainId === "string" ? chainId : ChainIdEnum[chainId],
   },
 });
 if (invocation.error) {
   throw invocation.error;
 }
 return invocation.data!;
}
