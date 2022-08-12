/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  Ethereum_Module,
  Args_swapCallParameters,
  MethodParameters,
  Route,
  SwapOptions,
  Token,
  TokenAmount,
  Trade,
  TradeType,
} from "../wrap";
import { _isNative, _wrapToken, tokenEquals } from "../token";
import { tradeMaximumAmountIn, tradeMinimumAmountOut } from "../trade";
import {
  _getFeeAmount,
  getChecksumAddress,
  ADDRESS_ZERO,
  ZERO_HEX,
} from "../utils";
import {
  encodePermit,
  encodeRouteToPath,
  encodeMulticall,
  encodeRefundETH,
  encodeSweepToken,
  encodeUnwrapWETH9,
  toHex,
} from "./utils";

import { BigInt } from "@polywrap/wasm-as";

export * from "./utils";

class ExactInputSingleParams {
  tokenIn: string;
  tokenOut: string;
  fee: u32;
  recipient: string;
  deadline: string;
  amountIn: string;
  amountOutMinimum: string;
  sqrtPriceLimitX96: string;
}

class ExactOutputSingleParams {
  tokenIn: string;
  tokenOut: string;
  fee: u32;
  recipient: string;
  deadline: string;
  amountOut: string;
  amountInMaximum: string;
  sqrtPriceLimitX96: string;
}

class ExactInputParams {
  path: string;
  recipient: string;
  deadline: string;
  amountIn: string;
  amountOutMinimum: string;
}

class ExactOutputParams {
  path: string;
  recipient: string;
  deadline: string;
  amountOut: string;
  amountInMaximum: string;
}

/**
 * Produces the on-chain method name to call and the hex encoded parameters to pass as arguments for a given trade
 * @param args.trades trades to produce call parameters for
 * @param args.options options for the call parameters
 */
export function swapCallParameters(
  args: Args_swapCallParameters
): MethodParameters {
  const trades: Trade[] = args.trades;
  const options: SwapOptions = args.options;

  const sampleTrade: Trade = trades[0];

  // All trades should have the same starting token.
  const tokenIn: Token = _wrapToken(sampleTrade.inputAmount.token);
  for (let i = 1; i < trades.length; i++) {
    const tokenA: Token = _wrapToken(trades[i].inputAmount.token);
    if (!tokenEquals({ tokenA, tokenB: tokenIn })) {
      throw new Error(
        "TOKEN_IN_DIFF: the input token of the trades must match"
      );
    }
  }
  // All trades should have the same ending token.
  const tokenOut: Token = _wrapToken(sampleTrade.outputAmount.token);
  for (let i = 1; i < trades.length; i++) {
    const tokenA: Token = _wrapToken(trades[i].outputAmount.token);
    if (!tokenEquals({ tokenA, tokenB: tokenOut })) {
      throw new Error(
        "TOKEN_OUT_DIFF: the output token of the trades must match"
      );
    }
  }

  const calldatas: string[] = [];

  let sumAmountOut: BigInt = BigInt.ZERO;
  for (let i = 0; i < trades.length; i++) {
    const minOut: BigInt = tradeMinimumAmountOut({
      slippageTolerance: options.slippageTolerance,
      amountOut: trades[i].outputAmount,
      tradeType: trades[i].tradeType,
    }).amount;
    sumAmountOut = sumAmountOut.add(minOut);
  }
  const totalAmountOut: TokenAmount = {
    token: trades[0].outputAmount.token,
    amount: sumAmountOut,
  };

  // flag for whether a refund needs to happen
  const mustRefund: boolean =
    _isNative(sampleTrade.inputAmount.token) &&
    sampleTrade.tradeType == TradeType.EXACT_OUTPUT;
  const inputIsNative: boolean = _isNative(sampleTrade.inputAmount.token);
  // flags for whether funds should be sent first to the router
  const outputIsNative: boolean = _isNative(sampleTrade.outputAmount.token);
  const routerMustCustody: boolean = outputIsNative || options.fee !== null;

  let sumValue: BigInt = BigInt.ZERO;
  if (inputIsNative) {
    for (let i = 0; i < trades.length; i++) {
      const maxIn: BigInt = tradeMaximumAmountIn({
        slippageTolerance: options.slippageTolerance,
        amountIn: trades[i].inputAmount,
        tradeType: trades[i].tradeType,
      }).amount;
      sumValue = sumValue.add(maxIn);
    }
  }
  const totalValue: TokenAmount = {
    token: trades[0].inputAmount.token,
    amount: sumValue,
  };

  // encode permit if necessary
  if (options.inputTokenPermit !== null) {
    if (_isNative(sampleTrade.inputAmount.token)) {
      throw new Error(
        "NON_TOKEN_PERMIT: cannot encode permit of native currency (e.g. Ether)"
      );
    }
    calldatas.push(
      encodePermit({
        token: sampleTrade.inputAmount.token,
        options: options.inputTokenPermit!,
      })
    );
  }

  const recipient: string = getChecksumAddress(options.recipient);
  const deadline: string = toHex({ value: options.deadline });

  for (let i = 0; i < trades.length; i++) {
    const trade: Trade = trades[i];
    for (let j = 0; j < trade.swaps.length; j++) {
      const route: Route = trade.swaps[j].route;
      const inputAmount: TokenAmount = trade.swaps[j].inputAmount;
      const outputAmount: TokenAmount = trade.swaps[j].outputAmount;

      const amountIn: string = toHex({
        value: tradeMaximumAmountIn({
          slippageTolerance: options.slippageTolerance,
          amountIn: inputAmount,
          tradeType: trade.tradeType,
        }).amount,
      });
      const amountOut: string = toHex({
        value: tradeMinimumAmountOut({
          slippageTolerance: options.slippageTolerance,
          amountOut: outputAmount,
          tradeType: trade.tradeType,
        }).amount,
      });

      // flag for whether the trade is single hop or not
      const singleHop = route.pools.length == 1;

      if (singleHop) {
        if (trade.tradeType == TradeType.EXACT_INPUT) {
          const exactInputSingleParams: ExactInputSingleParams = {
            tokenIn: route.path[0].address,
            tokenOut: route.path[1].address,
            fee: _getFeeAmount(route.pools[0].fee),
            recipient: routerMustCustody ? ADDRESS_ZERO : recipient,
            deadline,
            amountIn,
            amountOutMinimum: amountOut,
            sqrtPriceLimitX96:
              options.sqrtPriceLimitX96 === null
                ? ZERO_HEX
                : toHex({ value: options.sqrtPriceLimitX96! }),
          };

          calldatas.push(
            Ethereum_Module.encodeFunction({
              method: routerAbi("exactInputSingle"),
              args: [paramsToJsonString(exactInputSingleParams)],
            }).unwrap()
          );
        } else {
          const exactOutputSingleParams: ExactOutputSingleParams = {
            tokenIn: route.path[0].address,
            tokenOut: route.path[1].address,
            fee: _getFeeAmount(route.pools[0].fee),
            recipient: routerMustCustody ? ADDRESS_ZERO : recipient,
            deadline,
            amountOut,
            amountInMaximum: amountIn,
            sqrtPriceLimitX96:
              options.sqrtPriceLimitX96 === null
                ? ZERO_HEX
                : toHex({ value: options.sqrtPriceLimitX96! }),
          };

          calldatas.push(
            Ethereum_Module.encodeFunction({
              method: routerAbi("exactOutputSingle"),
              args: [paramsToJsonString(exactOutputSingleParams)],
            }).unwrap()
          );
        }
      } else {
        if (options.sqrtPriceLimitX96 !== null) {
          throw new Error(
            "MULTIHOP_PRICE_LIMIT: sqrtPriceLimitX96 option must be null for multi-hop trades"
          );
        }

        const path: string = encodeRouteToPath({
          route: route,
          exactOutput: trade.tradeType == TradeType.EXACT_OUTPUT,
        });

        if (trade.tradeType == TradeType.EXACT_INPUT) {
          const exactInputParams: ExactInputParams = {
            path,
            recipient: routerMustCustody ? ADDRESS_ZERO : recipient,
            deadline,
            amountIn,
            amountOutMinimum: amountOut,
          };

          calldatas.push(
            Ethereum_Module.encodeFunction({
              method: routerAbi("exactInput"),
              args: [paramsToJsonString(exactInputParams)],
            }).unwrap()
          );
        } else {
          const exactOutputParams: ExactOutputParams = {
            path,
            recipient: routerMustCustody ? ADDRESS_ZERO : recipient,
            deadline,
            amountOut,
            amountInMaximum: amountIn,
          };

          calldatas.push(
            Ethereum_Module.encodeFunction({
              method: routerAbi("exactOutput"),
              args: [paramsToJsonString(exactOutputParams)],
            }).unwrap()
          );
        }
      }
    }
  }

  // unwrap
  if (routerMustCustody) {
    if (options.fee !== null) {
      if (outputIsNative) {
        calldatas.push(
          encodeUnwrapWETH9({
            amountMinimum: totalAmountOut.amount,
            recipient: recipient,
            feeOptions: options.fee,
          })
        );
      } else {
        calldatas.push(
          encodeSweepToken({
            token: _wrapToken(sampleTrade.outputAmount.token),
            amountMinimum: totalAmountOut.amount,
            recipient: recipient,
            feeOptions: options.fee,
          })
        );
      }
    } else {
      calldatas.push(
        encodeUnwrapWETH9({
          amountMinimum: totalAmountOut.amount,
          recipient: recipient,
          feeOptions: null,
        })
      );
    }
  }

  // refund
  if (mustRefund) {
    calldatas.push(encodeRefundETH({}));
  }

  return {
    calldata: encodeMulticall({ calldatas }),
    value: toHex({ value: totalValue.amount }),
  };
}

function routerAbi(methodName: string): string {
  if (methodName == "exactInputSingle") {
    return "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) calldata params) external payable returns (uint256 amountOut)";
  } else if (methodName == "exactOutputSingle") {
    return "function exactOutputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96) calldata params) external payable returns (uint256 amountIn)";
  } else if (methodName == "exactInput") {
    return "function exactInput(tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) calldata params) external payable returns (uint256 amountOut)";
  } else if (methodName == "exactOutput") {
    return "function exactOutput(tuple(bytes path, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum) calldata params) external payable returns (uint256 amountIn)";
  } else {
    throw new Error("Invalid method name: " + methodName);
  }
}

function paramsToJsonString<T>(params: T): string {
  if (params instanceof ExactInputSingleParams) {
    return `{
      "tokenIn": "${params.tokenIn}",
      "tokenOut": "${params.tokenOut}",
      "fee": ${params.fee},
      "recipient": "${params.recipient}",
      "deadline": "${params.deadline}",
      "amountIn": "${params.amountIn}",
      "amountOutMinimum": "${params.amountOutMinimum}",
      "sqrtPriceLimitX96": "${params.sqrtPriceLimitX96}"
    }`;
  } else if (params instanceof ExactOutputSingleParams) {
    return `{
      "tokenIn": "${params.tokenIn}",
      "tokenOut": "${params.tokenOut}",
      "fee": ${params.fee},
      "recipient": "${params.recipient}",
      "deadline": "${params.deadline}",
      "amountOut": "${params.amountOut}",
      "amountInMaximum": "${params.amountInMaximum}",
      "sqrtPriceLimitX96": "${params.sqrtPriceLimitX96}"
    }`;
  } else if (params instanceof ExactInputParams) {
    return `{
      "path": "${params.path}",
      "recipient": "${params.recipient}",
      "deadline": "${params.deadline}",
      "amountIn": "${params.amountIn}",
      "amountOutMinimum": "${params.amountOutMinimum}"
    }`;
  } else if (params instanceof ExactOutputParams) {
    return `{
      "path": "${params.path}",
      "recipient": "${params.recipient}",
      "deadline": "${params.deadline}",
      "amountOut": "${params.amountOut}",
      "amountInMaximum": "${params.amountInMaximum}"
    }`;
  } else {
    throw new Error("unknown router parameters type");
  }
}
