import {
  Ethereum_TxResponse,
  FeeAmount,
  GasOptions,
  Input_deployPool,
  Input_deployPoolFromTokens,
  MethodParameters,
  Pool,
  Token,
} from "./w3";
import {
  createCallParameters,
  createPool,
  getSqrtRatioAtTick,
  poolChainId,
} from "../query";
import { execCall } from "./call";
import { NFPM_ADDRESS } from "../utils/constants";

import { BigInt } from "@web3api/wasm-as";

export function deployPool(input: Input_deployPool): Ethereum_TxResponse {
  const pool: Pool = input.pool;
  const gasOptions: GasOptions | null = input.gasOptions;

  const parameters: MethodParameters = createCallParameters({ pool });
  return execCall({
    parameters,
    address: NFPM_ADDRESS,
    chainId: poolChainId({ pool }),
    gasOptions,
  });
}

export function deployPoolFromTokens(
  input: Input_deployPoolFromTokens
): Ethereum_TxResponse {
  const tokenA: Token = input.tokenA;
  const tokenB: Token = input.tokenB;
  const fee: FeeAmount = input.fee;
  const gasOptions: GasOptions | null = input.gasOptions;

  const pool: Pool = createPool({
    tokenA,
    tokenB,
    fee,
    sqrtRatioX96: getSqrtRatioAtTick({ tick: 0 }),
    liquidity: BigInt.ZERO,
    tickCurrent: 0,
    ticks: null,
  });
  return deployPool({ pool, gasOptions });
}
