/* eslint-disable @typescript-eslint/no-non-null-assertion */

import {
  Ethereum_Module,
  Args_quoteCallParameters,
  MethodParameters,
  QuoteOptions,
  Route,
  TokenAmount,
  TradeType,
} from "../wrap";
import { encodeRouteToPath, toHex } from "../router";
import { _getFeeAmount, ZERO_HEX } from "../utils";

/**
 * Produces the on-chain method name of the appropriate function within QuoterV2, and the relevant hex encoded parameters.
 * @param args.route The swap route, a list of pools through which a swap can occur
 * @param args.amount The amount of the quote, either an amount in, or an amount out
 * @param args.tradeType The trade type, either exact input or exact output
 */
export function quoteCallParameters(
  args: Args_quoteCallParameters
): MethodParameters {
  const route: Route = args.route;
  const tokenAmount: TokenAmount = args.amount;
  const tradeType: TradeType = args.tradeType;
  const options: QuoteOptions | null = args.options;

  const singleHop: boolean = route.pools.length == 1;
  const quoteAmount: string = toHex({ value: tokenAmount.amount });
  let calldata: string;

  if (singleHop) {
    if (tradeType == TradeType.EXACT_INPUT) {
      calldata = Ethereum_Module.encodeFunction({
        method: quoterAbi("quoteExactInputSingle"),
        args: [
          route.path[0].address,
          route.path[1].address,
          _getFeeAmount(route.pools[0].fee).toString(),
          quoteAmount,
          options !== null && options.sqrtPriceLimitX96 !== null
            ? toHex({ value: options.sqrtPriceLimitX96! })
            : ZERO_HEX,
        ],
      }).unwrap();
    } else {
      calldata = Ethereum_Module.encodeFunction({
        method: quoterAbi("quoteExactOutputSingle"),
        args: [
          route.path[0].address,
          route.path[1].address,
          _getFeeAmount(route.pools[0].fee).toString(),
          quoteAmount,
          options !== null && options.sqrtPriceLimitX96 !== null
            ? toHex({ value: options.sqrtPriceLimitX96! })
            : ZERO_HEX,
        ],
      }).unwrap();
    }
  } else {
    if (options !== null && options.sqrtPriceLimitX96 !== null) {
      throw new Error(
        "MULTIHOP_PRICE_LIMIT: cannot use price limit options with multi-hop quote"
      );
    }

    const path: string = encodeRouteToPath({
      route,
      exactOutput: tradeType == TradeType.EXACT_OUTPUT,
    });

    if (tradeType == TradeType.EXACT_INPUT) {
      calldata = calldata = Ethereum_Module.encodeFunction({
        method: quoterAbi("quoteExactInput"),
        args: [path, quoteAmount],
      }).unwrap();
    } else {
      calldata = calldata = Ethereum_Module.encodeFunction({
        method: quoterAbi("quoteExactOutput"),
        args: [path, quoteAmount],
      }).unwrap();
    }
  }
  return {
    calldata,
    value: ZERO_HEX,
  };
}

function quoterAbi(methodName: string): string {
  if (methodName == "quoteExactInputSingle") {
    return "function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)";
  } else if (methodName == "quoteExactOutputSingle") {
    return "function quoteExactOutputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountOut, uint160 sqrtPriceLimitX96) external returns (uint256 amountIn)";
  } else if (methodName == "quoteExactInput") {
    return "function quoteExactInput(bytes memory path, uint256 amountIn) external returns (uint256 amountOut)";
  } else if (methodName == "quoteExactOutput") {
    return "function quoteExactOutput(bytes memory path, uint256 amountOut) external returns (uint256 amountIn)";
  } else {
    throw new Error("Invalid method name: " + methodName);
  }
}
