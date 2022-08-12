/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  Ethereum_Module,
  FeeOptions,
  Args_encodeMulticall,
  Args_encodePermit,
  Args_encodeRouteToPath,
  Args_encodeSweepToken,
  Args_encodeUnwrapWETH9,
  Args_toHex,
  PermitOptions,
  Pool,
  Route,
  Token,
  Args_encodeRefundETH,
} from "../wrap";
import { tokenEquals, _wrapToken } from "../token";
import {
  _getFeeAmount,
  _getPermitV,
  Fraction,
  getChecksumAddress,
} from "../utils";

import { BigInt } from "@polywrap/wasm-as";

class EncodeRouteStep {
  inToken: Token;
  path: string[];
  types: string[];
}

/**
 * Converts a big int to a hex string
 * @param args.bigint
 */
export function toHex(args: Args_toHex): string {
  const hex: string = args.value.toString(16);
  if (hex.length % 2 != 0) {
    return "0x0" + hex;
  }
  return "0x" + hex;
}

/**
 * Converts a route to a hex encoded path
 * @param args.route the v3 path to convert to an encoded path
 * @param args.exactOutput whether the route should be encoded in reverse, for making exact output swaps
 */
export function encodeRouteToPath(args: Args_encodeRouteToPath): string {
  const route: Route = args.route;
  const exactOutput = args.exactOutput;

  const finalStep: EncodeRouteStep = route.pools.reduce<EncodeRouteStep>(
    (step: EncodeRouteStep, pool: Pool, index): EncodeRouteStep => {
      const outToken: Token = tokenEquals({
        tokenA: step.inToken,
        tokenB: pool.token0,
      })
        ? pool.token1
        : pool.token0;
      const fee: string = _getFeeAmount(pool.fee).toString();

      if (index === 0) {
        return {
          inToken: outToken,
          types: ["address", "uint24", "address"],
          path: [step.inToken.address, fee, outToken.address],
        };
      } else {
        return {
          inToken: outToken,
          types: step.types.concat(["uint24", "address"]),
          path: step.path.concat([fee, outToken.address]),
        };
      }
    },
    { inToken: _wrapToken(route.input), path: [], types: [] }
  );

  if (exactOutput) {
    finalStep.types.reverse();
    finalStep.path.reverse();
  }

  return Ethereum_Module.solidityPack({
    types: finalStep.types,
    values: finalStep.path,
  }).unwrap();
}

export function encodePermit(args: Args_encodePermit): string {
  const token: Token = args.token;
  const options: PermitOptions = args.options;
  const isAllowedPermit: boolean = options.nonce !== null;

  return isAllowedPermit
    ? Ethereum_Module.encodeFunction({
        method: selfPermitAbi("selfPermitAllowed"),
        args: [
          token.address,
          toHex({ value: options.nonce! }),
          toHex({ value: options.expiry! }),
          _getPermitV(options.v).toString(),
          options.r,
          options.s,
        ],
      }).unwrap()
    : Ethereum_Module.encodeFunction({
        method: selfPermitAbi("selfPermit"),
        args: [
          token.address,
          toHex({ value: options.amount! }),
          toHex({ value: options.deadline! }),
          _getPermitV(options.v).toString(),
          options.r,
          options.s,
        ],
      }).unwrap();
}

export function encodeUnwrapWETH9(args: Args_encodeUnwrapWETH9): string {
  const amountMinimum: BigInt = args.amountMinimum;
  const recipient: string = getChecksumAddress(args.recipient);
  const feeOptions: FeeOptions | null = args.feeOptions;

  if (feeOptions !== null) {
    const feeBips: string = encodeFeeBips(feeOptions.fee);
    const feeRecipient: string = getChecksumAddress(feeOptions.recipient);

    return Ethereum_Module.encodeFunction({
      method: paymentsAbi("unwrapWETH9WithFee"),
      args: [toHex({ value: amountMinimum }), recipient, feeBips, feeRecipient],
    }).unwrap();
  } else {
    return Ethereum_Module.encodeFunction({
      method: paymentsAbi("unwrapWETH9"),
      args: [toHex({ value: amountMinimum }), recipient],
    }).unwrap();
  }
}

export function encodeSweepToken(args: Args_encodeSweepToken): string {
  const token: Token = args.token;
  const amountMinimum: BigInt = args.amountMinimum;
  const recipient: string = getChecksumAddress(args.recipient);
  const feeOptions: FeeOptions | null = args.feeOptions;

  if (feeOptions !== null) {
    const feeBips: string = encodeFeeBips(feeOptions.fee);
    const feeRecipient: string = getChecksumAddress(feeOptions.recipient);

    return Ethereum_Module.encodeFunction({
      method: paymentsAbi("sweepTokenWithFee"),
      args: [
        token.address,
        toHex({ value: amountMinimum }),
        recipient,
        feeBips,
        feeRecipient,
      ],
    }).unwrap();
  } else {
    return Ethereum_Module.encodeFunction({
      method: paymentsAbi("sweepToken"),
      args: [token.address, toHex({ value: amountMinimum }), recipient],
    }).unwrap();
  }
}

export function encodeRefundETH(_: Args_encodeRefundETH): string {
  return Ethereum_Module.encodeFunction({
    method: paymentsAbi("refundETH"),
    args: null,
  }).unwrap();
}

export function encodeMulticall(args: Args_encodeMulticall): string {
  const calldatas: string[] = args.calldatas;
  return calldatas.length == 1
    ? calldatas[0]
    : Ethereum_Module.encodeFunction({
        method:
          "function multicall(bytes[] calldata data) external payable returns (bytes[] memory results)",
        args: ['["' + calldatas.join('", "') + '"]'],
      }).unwrap();
}

function selfPermitAbi(methodName: string): string {
  if (methodName == "selfPermit") {
    return "function selfPermit(address token, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external payable";
  } else if (methodName == "selfPermitAllowed") {
    return "function selfPermitAllowed(address token, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external payable";
  } else {
    throw new Error("Invalid method name: " + methodName);
  }
}

function encodeFeeBips(fee: string): string {
  const feeFraction: Fraction = Fraction.fromString(fee);
  const tenK: Fraction = new Fraction(BigInt.fromUInt32(10000));
  return toHex({ value: feeFraction.mul(tenK).quotient() });
}

function paymentsAbi(methodName: string): string {
  if (methodName == "unwrapWETH9WithFee") {
    return "function unwrapWETH9WithFee(uint256 amountMinimum, address recipient, uint256 feeBips, address feeRecipient) external payable";
  } else if (methodName == "unwrapWETH9") {
    return "function unwrapWETH9(uint256 amountMinimum, address recipient) external payable";
  } else if (methodName == "sweepTokenWithFee") {
    return "function sweepTokenWithFee(address token, uint256 amountMinimum, address recipient, uint256 feeBips, address feeRecipient) external payable";
  } else if (methodName == "sweepToken") {
    return "function sweepToken(address token, uint256 amountMinimum, address recipient) external payable";
  } else if (methodName == "refundETH") {
    return "function refundETH() external payable";
  } else {
    throw new Error("Invalid method name: " + methodName);
  }
}
