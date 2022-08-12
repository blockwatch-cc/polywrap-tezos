 import { Web3ApiClient } from "@web3api/client-js";
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

export async function constant<T>(client: Web3ApiClient, ensUri: string, method: string): Promise<T> {
  const query = await client.invoke<T>({
    uri: ensUri,
    module: "query",
    method: method,
    input: {},
  });
  if (query.error) {
    throw query.error;
  }
  return query.data!;
}

export async function createPool(client: Web3ApiClient, ensUri: string, tokenA: Token, tokenB: Token, fee: FeeAmount, sqrtRatioX96: BigIntish, liquidity: BigIntish, tickCurrent: Int32, ticks: Tick[]): Promise<Pool> {
  const query = await client.invoke<Pool>({
    uri: ensUri,
    module: "query",
    method: "createPool",
    input: {
      tokenA,
      tokenB,
      fee: typeof fee === "string" ? fee : FeeAmountEnum[fee],
      sqrtRatioX96: sqrtRatioX96.toString(),
      liquidity: liquidity.toString(),
      tickCurrent,
      ticks,
    },
  });
  if (query.error) {
    throw query.error;
  }
  return query.data!;
}

export async function encodeSqrtRatioX96(client: Web3ApiClient, ensUri: string, amount1: BigIntish, amount0: BigIntish): Promise<BigInt> {
  const query = await client.invoke<BigInt>({
    uri: ensUri,
    module: "query",
    method: "encodeSqrtRatioX96",
    input: {
      amount1: amount1.toString(),
      amount0: amount0.toString(),
    },
  });
  if (query.error) {
    throw query.error;
  }
  return query.data!;
}

export async function createRoute(client: Web3ApiClient, ensUri: string, pools: Pool[], inToken: Token, outToken: Token): Promise<Route> {
  const query = await client.invoke<Route>({
    uri: ensUri,
    module: "query",
    method: "createRoute",
    input: {
      pools,
      inToken,
      outToken,
    },
  });
  if (query.error) {
    throw query.error;
  }
  return query.data!;
}

export async function encodeRouteToPath(client: Web3ApiClient, ensUri: string, route: Route, exactOutput: boolean): Promise<string> {
  const query = await client.invoke<string>({
    uri: ensUri,
    module: "query",
    method: "encodeRouteToPath",
    input: {
      route,
      exactOutput,
    },
  });
  if (query.error) {
    throw query.error;
  }
  return query.data!;
}

export async function encodeUnwrapWETH9(client: Web3ApiClient, ensUri: string, amountMinimum: BigIntish, recipient: string, feeOptions?: FeeOptions): Promise<string> {
  const query = await client.invoke<string>({
    uri: ensUri,
    module: "query",
    method: "encodeUnwrapWETH9",
    input: {
      amountMinimum: amountMinimum.toString(),
      recipient,
      feeOptions: feeOptions ?? null,
    },
  });
  if (query.error) {
    throw query.error;
  }
  return query.data!;
}

export async function encodeSweepToken(client: Web3ApiClient, ensUri: string, token: Token, amountMinimum: BigIntish, recipient: string, feeOptions?: FeeOptions): Promise<string> {
  const query = await client.invoke<string>({
    uri: ensUri,
    module: "query",
    method: "encodeSweepToken",
    input: {
      token,
      amountMinimum: amountMinimum.toString(),
      recipient,
      feeOptions: feeOptions ?? null,
    },
  });
  if (query.error) {
    throw query.error;
  }
  return query.data!;
}

export async function encodeRefundETH(client: Web3ApiClient, ensUri: string): Promise<string> {
  const query = await client.invoke<string>({
    uri: ensUri,
    module: "query",
    method: "encodeRefundETH",
    input: {},
  });
  if (query.error) {
    throw query.error;
  }
  return query.data!;
}

export async function encodeMulticall(client: Web3ApiClient, ensUri: string, calldatas: string[]): Promise<string> {
  const query = await client.invoke<string>({
    uri: ensUri,
    module: "query",
    method: "encodeMulticall",
    input: {
      calldatas,
    },
  });
  if (query.error) {
    throw query.error;
  }
  return query.data!;
}

export async function getTickAtSqrtRatio(client: Web3ApiClient, ensUri: string, sqrtRatioX96: BigIntish): Promise<number> {
  const query = await client.invoke<number>({
    uri: ensUri,
    module: "query",
    method: "getTickAtSqrtRatio",
    input: {
      sqrtRatioX96: sqrtRatioX96.toString(),
    },
  });
  if (query.error) {
    throw query.error;
  }
  return query.data!;
}

export async function nearestUsableTick(client: Web3ApiClient, ensUri: string, tick: number, tickSpacing: number): Promise<number> {
  const query = await client.invoke<number>({
    uri: ensUri,
    module: "query",
    method: "nearestUsableTick",
    input: {
      tick,
      tickSpacing,
    },
  });
  if (query.error) {
    throw query.error;
  }
  return query.data!;
}

export async function getSqrtRatioAtTick(client: Web3ApiClient, ensUri: string, tick: number): Promise<string> {
 const query = await client.invoke<string>({
   uri: ensUri,
   module: "query",
   method: "getSqrtRatioAtTick",
   input: {
     tick,
   },
 });
 if (query.error) {
   throw query.error;
 }
 return query.data!;
}

export async function feeAmountToTickSpacing(client: Web3ApiClient, ensUri: string, feeAmount: FeeAmount): Promise<number> {
  const query = await client.invoke<number>({
    uri: ensUri,
    module: "query",
    method: "feeAmountToTickSpacing",
    input: {
      feeAmount: typeof feeAmount === "string" ? feeAmount : FeeAmountEnum[feeAmount],
    },
  });
  if (query.error) {
    throw query.error;
  }
  return query.data!;
}

export async function createTradeFromRoute(client: Web3ApiClient, ensUri: string, tradeRoute: TradeRoute, tradeType: TradeType): Promise<Trade> {
  const query = await client.invoke<Trade>({
    uri: ensUri,
    module: "query",
    method: "createTradeFromRoute",
    input: {
      tradeRoute,
      tradeType,
    },
  });
  if (query.error) {
    throw query.error;
  }
  return query.data!;
}

export async function createTradeFromRoutes(client: Web3ApiClient, ensUri: string, tradeRoutes: TradeRoute[], tradeType: TradeType): Promise<Trade> {
  const query = await client.invoke<Trade>({
    uri: ensUri,
    module: "query",
    method: "createTradeFromRoutes",
    input: {
      tradeRoutes,
      tradeType,
    },
  });
  if (query.error) {
    throw query.error;
  }
  return query.data!;
}

export async function swapCallParameters(client: Web3ApiClient, ensUri: string, trades: Trade[], options: SwapOptions): Promise<MethodParameters> {
  const query = await client.invoke<MethodParameters>({
    uri: ensUri,
    module: "query",
    method: "swapCallParameters",
    input: {
      trades,
      options,
    },
  });
  if (query.error) {
    throw query.error;
  }
  return query.data!;
}

export async function quoteCallParameters(client: Web3ApiClient, ensUri: string, route: Route, amount: TokenAmount, tradeType: TradeType, options?: QuoteOptions): Promise<MethodParameters> {
  const query = await client.invoke<MethodParameters>({
    uri: ensUri,
    module: "query",
    method: "quoteCallParameters",
    input: {
      route,
      amount,
      tradeType: typeof tradeType === "string" ? tradeType : TradeTypeEnum[tradeType],
      options: options ?? null,
    },
  });
  if (query.error) {
    throw query.error;
  }
  return query.data!;
}

export async function collectRewards(client: Web3ApiClient, ensUri: string, incentiveKeys: IncentiveKey[], options: ClaimOptions): Promise<MethodParameters> {
  const query = await client.invoke<MethodParameters>({
    uri: ensUri,
    module: "query",
    method: "collectRewards",
    input: {
      incentiveKeys,
      options,
    },
  });
  if (query.error) {
    throw query.error;
  }
  return query.data!;
}

export async function withdrawToken(client: Web3ApiClient, ensUri: string, incentiveKeys: IncentiveKey[], options: FullWithdrawOptions): Promise<MethodParameters> {
  const query = await client.invoke<MethodParameters>({
    uri: ensUri,
    module: "query",
    method: "withdrawToken",
    input: {
      incentiveKeys,
      options,
    },
  });
  if (query.error) {
    throw query.error;
  }
  return query.data!;
}

export async function encodeDeposit(client: Web3ApiClient, ensUri: string, incentiveKeys: IncentiveKey[]): Promise<string> {
  const query = await client.invoke<string>({
    uri: ensUri,
    module: "query",
    method: "encodeDeposit",
    input: {
      incentiveKeys,
    },
  });
  if (query.error) {
    throw query.error;
  }
  return query.data!;
}

export async function safeTransferFromParameters(client: Web3ApiClient, ensUri: string, options: SafeTransferOptions): Promise<MethodParameters> {
  const query = await client.invoke<MethodParameters>({
    uri: ensUri,
    module: "query",
    method: "safeTransferFromParameters",
    input: {
      options,
    },
  });
  if (query.error) {
    throw query.error;
  }
  return query.data!;
}

export async function createCallParameters(client: Web3ApiClient, ensUri: string, pool: Pool): Promise<MethodParameters> {
  const query = await client.invoke<MethodParameters>({
    uri: ensUri,
    module: "query",
    method: "createCallParameters",
    input: {
      pool
    },
  });
  if (query.error) {
    throw query.error;
  }
  return query.data!;
}

export async function addCallParameters(client: Web3ApiClient, ensUri: string, position: Position, options: AddLiquidityOptions): Promise<MethodParameters> {
  const query = await client.invoke<MethodParameters>({
    uri: ensUri,
    module: "query",
    method: "addCallParameters",
    input: {
      position,
      options,
    },
  });
  if (query.error) {
    throw query.error;
  }
  return query.data!;
}

export async function collectCallParameters(client: Web3ApiClient, ensUri: string, options: CollectOptions): Promise<MethodParameters> {
  const query = await client.invoke<MethodParameters>({
    uri: ensUri,
    module: "query",
    method: "collectCallParameters",
    input: {
      options
    },
  });
  if (query.error) {
    throw query.error;
  }
  return query.data!;
}

export async function removeCallParameters(client: Web3ApiClient, ensUri: string, position: Position, options: RemoveLiquidityOptions): Promise<MethodParameters> {
  const query = await client.invoke<MethodParameters>({
    uri: ensUri,
    module: "query",
    method: "removeCallParameters",
    input: {
      position,
      options,
    },
  });
  if (query.error) {
    throw query.error;
  }
  return query.data!;
}

export async function createPosition(client: Web3ApiClient, ensUri: string, pool: Pool, tickLower: number, tickUpper: number, liquidity: BigIntish): Promise<Position> {
  const query = await client.invoke<Position>({
    uri: ensUri,
    module: "query",
    method: "createPosition",
    input: {
      pool,
      tickLower,
      tickUpper,
      liquidity: liquidity.toString(),
    },
  });
  if (query.error) {
    throw query.error;
  }
  return query.data!;
}

export async function bestTradeExactIn(client: Web3ApiClient, ensUri: string, pools: Pool[], amountIn: TokenAmount, tokenOut: Token, options?: BestTradeOptions): Promise<Trade[]> {
  const query = await client.invoke<Trade[]>({
    uri: ensUri,
    module: "query",
    method: "bestTradeExactIn",
    input: {
      pools,
      amountIn,
      tokenOut,
      options,
    },
  });
  if (query.error) {
    throw query.error;
  }
  return query.data!;
}

export async function bestTradeExactOut(client: Web3ApiClient, ensUri: string, pools: Pool[], tokenIn: Token, amountOut: TokenAmount, options?: BestTradeOptions): Promise<Trade[]> {
 const query = await client.invoke<Trade[]>({
   uri: ensUri,
   module: "query",
   method: "bestTradeExactOut",
   input: {
     pools,
     tokenIn,
     amountOut,
     options,
   },
 });
 if (query.error) {
   throw query.error;
 }
 return query.data!;
}

export async function getNative(client: Web3ApiClient, ensUri: string, chainId: ChainId): Promise<Token> {
 const query = await client.invoke<Token>({
   uri: ensUri,
   module: "query",
   method: "getNative",
   input: {
     chainId: typeof chainId === "string" ? chainId : ChainIdEnum[chainId],
   },
 });
 if (query.error) {
   throw query.error;
 }
 return query.data!;
}

export async function getWETH(client: Web3ApiClient, ensUri: string, chainId: ChainId): Promise<Token> {
 const query = await client.invoke<Token>({
   uri: ensUri,
   module: "query",
   method: "getWETH",
   input: {
     chainId: typeof chainId === "string" ? chainId : ChainIdEnum[chainId],
   },
 });
 if (query.error) {
   throw query.error;
 }
 return query.data!;
}
