/* eslint-disable @typescript-eslint/no-non-null-assertion */

import {
  ClaimOptions,
  Ethereum_Query,
  FullWithdrawOptions,
  IncentiveKey,
  Input_collectRewards,
  Input_encodeDeposit,
  Input_withdrawToken,
  MethodParameters,
} from "./w3";
import { encodeMulticall, toHex } from "./routerUtils";
import { getChecksumAddress } from "../utils/addressUtils";
import { getPoolAddress } from "./pool";
import { ZERO_HEX } from "../utils/constants";

import { BigInt } from "@web3api/wasm-as";

/**
 * Returns the calldatas for 'unstakeToken', 'claimReward', and 'stakeToken'.
 * Note:  A `tokenId` can be staked in many programs but to claim rewards and continue the program you must unstake, claim, and then restake.
 * @param input.incentiveKeys An array of IncentiveKeys that `tokenId` is staked in; claims rewards for each program.
 * @param input.options ClaimOptions to specify tokenId, recipient, and amount wanting to collect. Note that you can only specify one amount and one recipient across the various programs if you are collecting from multiple programs at once.
 */
export function collectRewards(input: Input_collectRewards): MethodParameters {
  const incentiveKeys: IncentiveKey[] = input.incentiveKeys;
  const options: ClaimOptions = input.options;

  let calldatas: string[] = [];

  for (let i = 0; i < incentiveKeys.length; i++) {
    // the unique program tokenId is staked in
    const incentiveKey: IncentiveKey = incentiveKeys[i];
    // unstakes and claims for the unique program
    calldatas = calldatas.concat(encodeClaim(incentiveKey, options));
    // re-stakes the position for the unique program
    calldatas.push(
      Ethereum_Query.encodeFunction({
        method: stakerAbi("stakeToken"),
        args: [
          encodeIncentiveKey(incentiveKey),
          toHex({ value: options.tokenId }),
        ],
      }).unwrap()
    );
  }
  return {
    calldata: encodeMulticall({ calldatas }),
    value: ZERO_HEX,
  };
}

/**
 * Returns calldata for unstaking, claiming, and withdrawing.
 * @param input.incentiveKeys A list of incentiveKeys to unstake from. Should include all incentiveKeys (unique staking programs) that `options.tokenId` is staked in.
 * @param input.options Options for producing claim calldata and withdraw calldata. Can't withdraw without unstaking all programs for `tokenId`.
 */
export function withdrawToken(input: Input_withdrawToken): MethodParameters {
  const incentiveKeys: IncentiveKey[] = input.incentiveKeys;
  const options: FullWithdrawOptions = input.options;

  let calldatas: string[] = [];

  const claimOptions: ClaimOptions = {
    tokenId: options.tokenId,
    recipient: options.recipient,
    amount: options.amount,
  };

  for (let i = 0; i < incentiveKeys.length; i++) {
    const incentiveKey: IncentiveKey = incentiveKeys[i];
    calldatas = calldatas.concat(encodeClaim(incentiveKey, claimOptions));
  }
  const owner: string = getChecksumAddress(options.owner);
  calldatas.push(
    Ethereum_Query.encodeFunction({
      method: stakerAbi("withdrawToken"),
      args: [
        toHex({ value: options.tokenId }),
        owner,
        options.data === null ? ZERO_HEX : options.data!,
      ],
    }).unwrap()
  );
  return {
    calldata: encodeMulticall({ calldatas }),
    value: ZERO_HEX,
  };
}

/**
 * Returns an encoded IncentiveKey as a string
 * @param input.incentiveKeys A single IncentiveKey or array of IncentiveKeys to be encoded and used in the data parameter in `safeTransferFrom`
 */
export function encodeDeposit(input: Input_encodeDeposit): string {
  const incentiveKeys: IncentiveKey[] = input.incentiveKeys;

  let data: string;

  if (incentiveKeys.length > 1) {
    const keys: string[] = [];
    for (let i = 0; i < incentiveKeys.length; i++) {
      keys.push(encodeIncentiveKey(incentiveKeys[i]));
    }
    data = Ethereum_Query.encodeParams({
      types: [`${stakerAbi("INCENTIVE_KEY_ABI")}[]`],
      values: ["[" + keys.join(", ") + "]"],
    }).unwrap();
  } else {
    data = Ethereum_Query.encodeParams({
      types: [stakerAbi("INCENTIVE_KEY_ABI")],
      values: [encodeIncentiveKey(incentiveKeys[0])],
    }).unwrap();
  }
  return data;
}

/**
 *  To claim rewards, must unstake and then claim.
 * @param incentiveKey The unique identifier of a staking program.
 * @param options Options for producing the calldata to claim. Can't claim unless you unstake.
 * @returns The calldatas for 'unstakeToken' and 'claimReward'.
 */
function encodeClaim(
  incentiveKey: IncentiveKey,
  options: ClaimOptions
): string[] {
  const calldatas: string[] = [];
  calldatas.push(
    Ethereum_Query.encodeFunction({
      method: stakerAbi("unstakeToken"),
      args: [
        encodeIncentiveKey(incentiveKey),
        toHex({ value: options.tokenId }),
      ],
    }).unwrap()
  );
  const recipient: string = getChecksumAddress(options.recipient);
  const amount: BigInt =
    options.amount === null ? BigInt.ZERO : options.amount!;
  calldatas.push(
    Ethereum_Query.encodeFunction({
      method: stakerAbi("claimReward"),
      args: [
        incentiveKey.rewardToken.address,
        recipient,
        toHex({ value: amount }),
      ],
    }).unwrap()
  );
  return calldatas;
}

/**
 *
 * @param incentiveKey An `IncentiveKey` which represents a unique staking program.
 * @returns An encoded IncentiveKey to be read by ethers
 */
function encodeIncentiveKey(incentiveKey: IncentiveKey): string {
  return `{
    "rewardToken": "${incentiveKey.rewardToken.address}",
    "pool": "${getPoolAddress({
      tokenA: incentiveKey.pool.token0,
      tokenB: incentiveKey.pool.token1,
      fee: incentiveKey.pool.fee,
      initCodeHashManualOverride: null,
    })}",
    "startTime": "${toHex({ value: incentiveKey.startTime })}",
    "endTime": "${toHex({ value: incentiveKey.endTime })}",
    "refundee": "${getChecksumAddress(incentiveKey.refundee)}"
  }`;
}

function stakerAbi(methodName: string): string {
  if (methodName == "INCENTIVE_KEY_ABI") {
    return "tuple(address rewardToken, address pool, uint256 startTime, uint256 endTime, address refundee)";
  } else if (methodName == "unstakeToken") {
    return `function unstakeToken(${stakerAbi("INCENTIVE_KEY_ABI")} memory key, uint256 tokenId) external`; // eslint-disable-line
  } else if (methodName == "stakeToken") {
    return `function stakeToken(${stakerAbi("INCENTIVE_KEY_ABI")} memory key, uint256 tokenId) external`; // eslint-disable-line
  } else if (methodName == "claimReward") {
    return "function claimReward(address rewardToken, address to, uint256 amountRequested) external returns (uint256 reward)";
  } else if (methodName == "withdrawToken") {
    return "function withdrawToken(uint256 tokenId, address to, bytes memory data) external";
  } else {
    throw new Error("Invalid method name: " + methodName);
  }
}
