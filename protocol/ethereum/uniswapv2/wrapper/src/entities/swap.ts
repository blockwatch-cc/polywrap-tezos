import {
  Args_approve,
  Args_exec,
  Args_execCall,
  Args_swap,
  ChainId,
  Ethereum_Module,
  Ethereum_TxResponse,
  getChainIdKey,
  Pair,
  SwapParameters,
  Trade,
  TradeType,
  TxOverrides,
} from "../wrap";
import { getSwapMethodAbi, UNISWAP_ROUTER_CONTRACT } from "../utils";
import { swapCallParameters, toHex } from "./router";
import { fetchPairData } from "./fetch";
import { bestTradeExactIn, bestTradeExactOut } from "./trade";

import { BigInt } from "@polywrap/wasm-as";

const MAX_UINT_256 =
  "115792089237316195423570985008687907853269984665640564039457584007913129639935";

export function exec(args: Args_exec): Ethereum_TxResponse {
  const swapParameters: SwapParameters = swapCallParameters({
    trade: args.trade,
    tradeOptions: args.tradeOptions,
  });
  return execCall({
    parameters: swapParameters,
    chainId: args.trade.inputAmount.token.chainId,
    txOverrides: args.txOverrides,
  });
}

export function execCall(args: Args_execCall): Ethereum_TxResponse {
  const swapParameters: SwapParameters = args.parameters;
  const chainId: ChainId = args.chainId;
  const txOverrides: TxOverrides =
    args.txOverrides === null
      ? { gasLimit: null, gasPrice: null }
      : args.txOverrides!;

  return Ethereum_Module.callContractMethod({
    address: UNISWAP_ROUTER_CONTRACT,
    method: getSwapMethodAbi(swapParameters.methodName),
    args: swapParameters.args,
    connection: {
      node: null,
      networkNameOrChainId: getChainIdKey(chainId),
    },
    txOverrides: {
      value: BigInt.fromString(swapParameters.value.substring(2), 16),
      gasPrice: txOverrides.gasPrice,
      gasLimit: txOverrides.gasLimit,
    },
  }).unwrap();
}

export function swap(args: Args_swap): Ethereum_TxResponse {
  let trade: Trade;
  const pair: Pair = fetchPairData({
    token0: args.tokenIn,
    token1: args.tokenOut,
  });

  if (args.tradeType == TradeType.EXACT_INPUT) {
    trade = bestTradeExactIn({
      pairs: [pair],
      amountIn: {
        token: args.tokenIn,
        amount: args.amount,
      },
      tokenOut: args.tokenOut,
      options: null,
    })[0];
  } else {
    trade = bestTradeExactOut({
      pairs: [pair],
      amountOut: {
        token: args.tokenOut,
        amount: args.amount,
      },
      tokenIn: args.tokenIn,
      options: null,
    })[0];
  }

  return exec({
    trade: trade,
    tradeOptions: args.tradeOptions,
    txOverrides: args.txOverrides,
  });
}

export function approve(args: Args_approve): Ethereum_TxResponse {
  const amount: BigInt =
    args.amount === null ? BigInt.fromString(MAX_UINT_256) : args.amount!;
  const txOverrides: TxOverrides =
    args.txOverrides === null
      ? { gasLimit: null, gasPrice: null }
      : args.txOverrides!;

  return Ethereum_Module.callContractMethod({
    address: args.token.address,
    method:
      "function approve(address spender, uint value) external returns (bool)",
    args: [UNISWAP_ROUTER_CONTRACT, toHex(amount)],
    connection: {
      node: null,
      networkNameOrChainId: getChainIdKey(args.token.chainId),
    },
    txOverrides: {
      value: null,
      gasPrice: txOverrides.gasPrice,
      gasLimit: txOverrides.gasLimit,
    },
  }).unwrap();
}
