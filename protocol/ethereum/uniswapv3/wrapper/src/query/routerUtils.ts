/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  Ethereum_Query,
  FeeOptions,
  Input_encodeMulticall,
  Input_encodePermit,
  Input_encodeRouteToPath,
  Input_encodeSweepToken,
  Input_encodeUnwrapWETH9,
  Input_toHex,
  PermitOptions,
  Pool,
  Route,
  Token,
} from "./w3";
import { _wrapToken } from "../utils/tokenUtils";
import { tokenEquals } from "./token";
import { _getFeeAmount, _getPermitV } from "../utils/enumUtils";
import Fraction from "../utils/Fraction";
import { getChecksumAddress } from "../utils/addressUtils";

import { BigInt } from "@web3api/wasm-as";

class EncodeRouteStep {
  inToken: Token;
  path: string[];
  types: string[];
}

/**
 * Converts a big int to a hex string
 * @param input.bigint
 */
export function toHex(input: Input_toHex): string {
  const hex: string = input.value.toString(16);
  if (hex.length % 2 != 0) {
    return "0x0" + hex;
  }
  return "0x" + hex;
}

/**
 * Converts a route to a hex encoded path
 * @param input.route the v3 path to convert to an encoded path
 * @param input.exactOutput whether the route should be encoded in reverse, for making exact output swaps
 */
export function encodeRouteToPath(input: Input_encodeRouteToPath): string {
  const route: Route = input.route;
  const exactOutput: boolean = input.exactOutput;

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

  return Ethereum_Query.solidityPack({
    types: finalStep.types,
    values: finalStep.path,
  }).unwrap();
}

export function encodePermit(input: Input_encodePermit): string {
  const token: Token = input.token;
  const options: PermitOptions = input.options;
  const isAllowedPermit: boolean = options.nonce !== null;

  return isAllowedPermit
    ? Ethereum_Query.encodeFunction({
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
    : Ethereum_Query.encodeFunction({
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

export function encodeUnwrapWETH9(input: Input_encodeUnwrapWETH9): string {
  const amountMinimum: BigInt = input.amountMinimum;
  const recipient: string = getChecksumAddress(input.recipient);
  const feeOptions: FeeOptions | null = input.feeOptions;

  if (feeOptions !== null) {
    const feeBips: string = encodeFeeBips(feeOptions.fee);
    const feeRecipient: string = getChecksumAddress(feeOptions.recipient);

    return Ethereum_Query.encodeFunction({
      method: paymentsAbi("unwrapWETH9WithFee"),
      args: [toHex({ value: amountMinimum }), recipient, feeBips, feeRecipient],
    }).unwrap();
  } else {
    return Ethereum_Query.encodeFunction({
      method: paymentsAbi("unwrapWETH9"),
      args: [toHex({ value: amountMinimum }), recipient],
    }).unwrap();
  }
}

export function encodeSweepToken(input: Input_encodeSweepToken): string {
  const token: Token = input.token;
  const amountMinimum: BigInt = input.amountMinimum;
  const recipient: string = getChecksumAddress(input.recipient);
  const feeOptions: FeeOptions | null = input.feeOptions;

  if (feeOptions !== null) {
    const feeBips: string = encodeFeeBips(feeOptions.fee);
    const feeRecipient: string = getChecksumAddress(feeOptions.recipient);

    return Ethereum_Query.encodeFunction({
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
    return Ethereum_Query.encodeFunction({
      method: paymentsAbi("sweepToken"),
      args: [token.address, toHex({ value: amountMinimum }), recipient],
    }).unwrap();
  }
}

export function encodeRefundETH(): string {
  return Ethereum_Query.encodeFunction({
    method: paymentsAbi("refundETH"),
    args: null,
  }).unwrap();
}

export function encodeMulticall(input: Input_encodeMulticall): string {
  const calldatas: string[] = input.calldatas;
  return calldatas.length == 1
    ? calldatas[0]
    : Ethereum_Query.encodeFunction({
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
