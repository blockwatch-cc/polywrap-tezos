/* eslint-disable @typescript-eslint/no-non-null-assertion */

import {
  AddLiquidityOptions,
  CollectOptions,
  Ethereum_Module,
  Args_addCallParameters,
  Args_collectCallParameters,
  Args_createCallParameters,
  Args_removeCallParameters,
  Args_safeTransferFromParameters,
  MethodParameters,
  MintAmounts,
  Pool,
  Position,
  RemoveLiquidityOptions,
  SafeTransferOptions,
  Token,
  TokenAmount,
} from "../wrap";
import {
  encodeMulticall,
  encodePermit,
  encodeRefundETH,
  encodeSweepToken,
  encodeUnwrapWETH9,
  toHex,
} from "../router";
import {
  ADDRESS_ZERO,
  ZERO_HEX,
  _getFeeAmount,
  _getPermitV,
  getChecksumAddress,
  Fraction,
} from "../utils";
import {
  burnAmountsWithSlippage,
  createPosition,
  mintAmountsWithSlippage,
} from "./index";
import { tokenEquals, _isNative, _wrapToken } from "../token";

import { BigInt } from "@polywrap/wasm-as";

const MAX_UINT_128_HEX = toHex({ value: BigInt.ONE.leftShift(128).subInt(1) });

class MintArgs {
  token0: string;
  token1: string;
  fee: u32;
  tickLower: i32;
  tickUpper: i32;
  amount0Desired: string;
  amount1Desired: string;
  amount0Min: string;
  amount1Min: string;
  recipient: string;
  deadline: string;
}

class IncreaseLiquidityArgs {
  tokenId: string;
  amount0Desired: string;
  amount1Desired: string;
  amount0Min: string;
  amount1Min: string;
  deadline: string;
}

class CollectArgs {
  tokenId: string;
  recipient: string;
  amount0Max: string;
  amount1Max: string;
}

class DecreaseLiquidityArgs {
  tokenId: string;
  liquidity: string;
  amount0Min: string;
  amount1Min: string;
  deadline: string;
}

export function createCallParameters(
  args: Args_createCallParameters
): MethodParameters {
  return {
    calldata: encodeCreate(args.pool),
    value: ZERO_HEX,
  };
}

export function addCallParameters(
  args: Args_addCallParameters
): MethodParameters {
  const position: Position = args.position;
  const options: AddLiquidityOptions = args.options;

  if (position.liquidity <= BigInt.ZERO) {
    throw new Error("ZERO_LIQUIDITY: position liquidity must exceed zero");
  }

  const calldatas: string[] = [];

  // get amounts
  const amount0Desired: BigInt = position.mintAmounts.amount0;
  const amount1Desired: BigInt = position.mintAmounts.amount1;

  // adjust for slippage
  const minimumAmounts: MintAmounts = mintAmountsWithSlippage({
    position,
    slippageTolerance: options.slippageTolerance,
  });
  const amount0Min: string = toHex({ value: minimumAmounts.amount0 });
  const amount1Min: string = toHex({ value: minimumAmounts.amount1 });

  const deadline: string = toHex({ value: options.deadline });

  // create pool if needed
  if (isMint(options) && !options.createPool.isNone) {
    calldatas.push(encodeCreate(position.pool));
  }

  // permits if necessary
  if (options.token0Permit !== null) {
    calldatas.push(
      encodePermit({
        token: position.pool.token0,
        options: options.token0Permit!,
      })
    );
  }
  if (options.token1Permit !== null) {
    calldatas.push(
      encodePermit({
        token: position.pool.token1,
        options: options.token1Permit!,
      })
    );
  }

  // mint
  if (isMint(options)) {
    const args: MintArgs = {
      token0: position.pool.token0.address,
      token1: position.pool.token1.address,
      fee: _getFeeAmount(position.pool.fee),
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
      amount0Desired: toHex({ value: amount0Desired }),
      amount1Desired: toHex({ value: amount1Desired }),
      amount0Min,
      amount1Min,
      recipient: getChecksumAddress(options.recipient!),
      deadline,
    };
    calldatas.push(
      Ethereum_Module.encodeFunction({
        method: nfpmAbi("mint"),
        args: [paramsToJsonString(args)],
      }).unwrap()
    );
  } else {
    // increase
    const args: IncreaseLiquidityArgs = {
      tokenId: toHex({ value: options.tokenId! }),
      amount0Desired: toHex({ value: amount0Desired }),
      amount1Desired: toHex({ value: amount1Desired }),
      amount0Min,
      amount1Min,
      deadline,
    };
    calldatas.push(
      Ethereum_Module.encodeFunction({
        method: nfpmAbi("increaseLiquidity"),
        args: [paramsToJsonString(args)],
      }).unwrap()
    );
  }

  let value: string = ZERO_HEX;
  if (options.useNative !== null) {
    const wrapped: Token = _wrapToken(options.useNative!);
    const isToken0: boolean = tokenEquals({
      tokenA: position.pool.token0,
      tokenB: wrapped,
    });
    const isToken1: boolean = tokenEquals({
      tokenA: position.pool.token1,
      tokenB: wrapped,
    });
    if (!isToken0 && !isToken1) {
      throw new Error(
        "NO_WETH: the native token provided with the useNative option must be involved in the position pool"
      );
    }

    const wrappedValue: BigInt = isToken0 ? amount0Desired : amount1Desired;

    // we only need to refund if we're actually sending ETH
    if (wrappedValue > BigInt.ZERO) {
      calldatas.push(encodeRefundETH({}));
    }

    value = toHex({ value: wrappedValue });
  }

  return {
    calldata: encodeMulticall({ calldatas }),
    value,
  };
}

export function collectCallParameters(
  args: Args_collectCallParameters
): MethodParameters {
  const calldatas: string[] = encodeCollect(args.options);
  return {
    calldata: encodeMulticall({ calldatas }),
    value: ZERO_HEX,
  };
}

/**
 * Produces the calldata for completely or partially exiting a position
 * @param args.position The position to exit
 * @param args.options Additional information necessary for generating the calldata
 */
export function removeCallParameters(
  args: Args_removeCallParameters
): MethodParameters {
  const position: Position = args.position;
  const options: RemoveLiquidityOptions = args.options;

  const calldatas: string[] = [];

  const deadline: string = toHex({ value: options.deadline });
  const tokenId: string = toHex({ value: options.tokenId });
  const liqPercent: Fraction = Fraction.fromString(options.liquidityPercentage);

  // construct a partial position with a percentage of liquidity
  const partialPosition = createPosition({
    pool: position.pool,
    liquidity: liqPercent.mul(new Fraction(position.liquidity)).quotient(),
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
  });
  if (partialPosition.liquidity <= BigInt.ZERO) {
    throw new Error("ZERO_LIQUIDITY");
  }

  // slippage-adjusted underlying amounts
  const burnAmounts: MintAmounts = burnAmountsWithSlippage({
    position: partialPosition,
    slippageTolerance: options.slippageTolerance,
  });
  const amount0Min: BigInt = burnAmounts.amount0;
  const amount1Min: BigInt = burnAmounts.amount1;

  if (options.permit !== null) {
    calldatas.push(
      Ethereum_Module.encodeFunction({
        method: nfpmAbi("permit"),
        args: [
          getChecksumAddress(options.permit!.spender),
          tokenId,
          toHex({ value: options.permit!.deadline }),
          _getPermitV(options.permit!.v).toString(),
          options.permit!.r,
          options.permit!.s,
        ],
      }).unwrap()
    );
  }

  // remove liquidity
  const decreaseLiqArgs: DecreaseLiquidityArgs = {
    tokenId,
    liquidity: toHex({ value: partialPosition.liquidity }),
    amount0Min: toHex({ value: amount0Min }),
    amount1Min: toHex({ value: amount1Min }),
    deadline,
  };
  calldatas.push(
    Ethereum_Module.encodeFunction({
      method: nfpmAbi("decreaseLiquidity"),
      args: [paramsToJsonString(decreaseLiqArgs)],
    }).unwrap()
  );

  const expectedCurrencyOwed0: TokenAmount =
    options.collectOptions.expectedCurrencyOwed0;
  const expectedCurrencyOwed1: TokenAmount =
    options.collectOptions.expectedCurrencyOwed1;
  const collectCalldatas: string[] = encodeCollect({
    tokenId: options.tokenId,
    // add the underlying value to the expected currency already owed
    expectedCurrencyOwed0: {
      token: expectedCurrencyOwed0.token,
      amount: expectedCurrencyOwed0.amount.add(amount0Min),
    },
    expectedCurrencyOwed1: {
      token: expectedCurrencyOwed1.token,
      amount: expectedCurrencyOwed1.amount.add(amount1Min),
    },
    recipient: options.collectOptions.recipient,
  });
  for (let i = 0; i < collectCalldatas.length; i++) {
    calldatas.push(collectCalldatas[i]);
  }

  if (liqPercent.eq(new Fraction(BigInt.ONE))) {
    if (
      options.burnToken.isNone == false &&
      options.burnToken.unwrap() == true
    ) {
      calldatas.push(
        Ethereum_Module.encodeFunction({
          method: nfpmAbi("burn"),
          args: [tokenId],
        }).unwrap()
      );
    }
  } else {
    if (
      options.burnToken.isNone == false &&
      options.burnToken.unwrap() == true
    ) {
      throw new Error("CANNOT_BURN");
    }
  }

  return {
    calldata: encodeMulticall({ calldatas }),
    value: ZERO_HEX,
  };
}

export function safeTransferFromParameters(
  args: Args_safeTransferFromParameters
): MethodParameters {
  const options: SafeTransferOptions = args.options;

  const recipient: string = getChecksumAddress(options.recipient);
  const sender: string = getChecksumAddress(options.sender);

  let calldata: string;
  if (options.data !== null) {
    calldata = Ethereum_Module.encodeFunction({
      method: nfpmAbi("safeTransferFrom"),
      args: [
        sender,
        recipient,
        toHex({ value: options.tokenId }),
        options.data!,
      ],
    }).unwrap();
  } else {
    calldata = Ethereum_Module.encodeFunction({
      method: nfpmAbi("_safeTransferFrom"),
      args: [sender, recipient, toHex({ value: options.tokenId })],
    }).unwrap();
  }

  return {
    calldata: calldata,
    value: ZERO_HEX,
  };
}

function isMint(options: AddLiquidityOptions): boolean {
  return options.recipient !== null;
}

function encodeCreate(pool: Pool): string {
  return Ethereum_Module.encodeFunction({
    method: nfpmAbi("createAndInitializePoolIfNecessary"),
    args: [
      pool.token0.address,
      pool.token1.address,
      _getFeeAmount(pool.fee).toString(),
      toHex({ value: pool.sqrtRatioX96 }),
    ],
  }).unwrap();
}

function encodeCollect(options: CollectOptions): string[] {
  const calldatas: string[] = [];

  const tokenId: string = toHex({ value: options.tokenId });
  const recipient: string = getChecksumAddress(options.recipient);
  const involvesETH: boolean =
    _isNative(options.expectedCurrencyOwed0.token) ||
    _isNative(options.expectedCurrencyOwed1.token);

  // collect
  const collectArgs: CollectArgs = {
    tokenId,
    recipient: involvesETH ? ADDRESS_ZERO : recipient,
    amount0Max: MAX_UINT_128_HEX,
    amount1Max: MAX_UINT_128_HEX,
  };
  calldatas.push(
    Ethereum_Module.encodeFunction({
      method: nfpmAbi("collect"),
      args: [paramsToJsonString(collectArgs)],
    }).unwrap()
  );

  if (involvesETH) {
    const ethAmount: BigInt = _isNative(options.expectedCurrencyOwed0.token)
      ? options.expectedCurrencyOwed0.amount
      : options.expectedCurrencyOwed1.amount;
    const token: Token = _isNative(options.expectedCurrencyOwed0.token)
      ? options.expectedCurrencyOwed1.token
      : options.expectedCurrencyOwed0.token;
    const tokenAmount: BigInt = _isNative(options.expectedCurrencyOwed0.token)
      ? options.expectedCurrencyOwed1.amount
      : options.expectedCurrencyOwed0.amount;

    calldatas.push(
      encodeUnwrapWETH9({
        amountMinimum: ethAmount,
        recipient,
        feeOptions: null,
      })
    );
    calldatas.push(
      encodeSweepToken({
        token,
        amountMinimum: tokenAmount,
        recipient,
        feeOptions: null,
      })
    );
  }

  return calldatas;
}

function nfpmAbi(methodName: string): string {
  if (methodName == "createAndInitializePoolIfNecessary") {
    return "function createAndInitializePoolIfNecessary(address token0, address token1, uint24 fee, uint160 sqrtPriceX96) external payable returns (address pool)";
  } else if (methodName == "collect") {
    return "function collect(tuple(uint256 tokenId, address recipient, uint128 amount0Max, uint128 amount1Max) calldata params) external payable returns (uint256 amount0, uint256 amount1)";
  } else if (methodName == "mint") {
    return "function mint(tuple(address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline) calldata params) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)";
  } else if (methodName == "increaseLiquidity") {
    return "function increaseLiquidity(tuple(uint256 tokenId, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, uint256 deadline) calldata params) external payable returns (uint128 liquidity, uint256 amount0, uint256 amount1)";
  } else if (methodName == "permit") {
    return "function permit(address spender, uint256  deadline, bytes32 r, bytes32 s) external payable";
  } else if (methodName == "decreaseLiquidity") {
    return "function decreaseLiquidity(tuple(uint256 tokenId, uint128 liquidity, uint256 amount0Min, uint256 amount1Min, uint256 deadline) calldata params) external payable returns (uint256 amount0, uint256 amount1)";
  } else if (methodName == "burn") {
    return "function burn(uint256 tokenId) external payable";
  } else if (methodName == "safeTransferFrom") {
    return "function safeTransferFrom(address from, address to, uint256 tokenId, bytes _data)";
  } else if (methodName == "_safeTransferFrom") {
    return "function safeTransferFrom(address from, address to, uint256 tokenId)";
  } else {
    throw new Error("Invalid method name: " + methodName);
  }
}

function paramsToJsonString<T>(params: T): string {
  if (params instanceof CollectArgs) {
    return `{
      "tokenId": "${params.tokenId}",
      "recipient": "${params.recipient}",
      "amount0Max": "${params.amount0Max}",
      "amount1Max": "${params.amount1Max}"
    }`;
  } else if (params instanceof MintArgs) {
    return `{
      "token0": "${params.token0}",
      "token1": "${params.token1}",
      "fee": ${params.fee},
      "tickLower": ${params.tickLower},
      "tickUpper": ${params.tickUpper},
      "amount0Desired": "${params.amount0Desired}",
      "amount1Desired": "${params.amount1Desired}",
      "amount0Min": "${params.amount0Min}",
      "amount1Min": "${params.amount1Min}",
      "recipient": "${params.recipient}",
      "deadline": "${params.deadline}"
    }`;
  } else if (params instanceof IncreaseLiquidityArgs) {
    return `{
      "tokenId": "${params.tokenId}",
      "amount0Desired": "${params.amount0Desired}",
      "amount1Desired": "${params.amount1Desired}",
      "amount0Min": "${params.amount0Min}",
      "amount1Min": "${params.amount1Min}",
      "deadline": "${params.deadline}"
    }`;
  } else if (params instanceof DecreaseLiquidityArgs) {
    return `{
      "tokenId": "${params.tokenId}",
      "liquidity": "${params.liquidity}",
      "amount0Min": "${params.amount0Min}",
      "amount1Min": "${params.amount1Min}",
      "deadline": "${params.deadline}"
    }`;
  } else {
    throw new Error("unknown router parameters type");
  }
}
