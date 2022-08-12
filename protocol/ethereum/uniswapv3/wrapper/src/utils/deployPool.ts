import {
  Ethereum_TxResponse,
  FeeAmount,
  GasOptions,
  Args_deployPool,
  Args_deployPoolFromTokens,
  MethodParameters,
  Pool,
  Token,
} from "../wrap";
import { execCall } from "./call";
import { NFPM_ADDRESS } from "../utils";
import { createPool, poolChainId } from "../pool";
import { createCallParameters } from "../position";
import { getSqrtRatioAtTick } from "../tickList";

import { BigInt } from "@polywrap/wasm-as";

export function deployPool(args: Args_deployPool): Ethereum_TxResponse {
  const pool: Pool = args.pool;
  const gasOptions: GasOptions | null = args.gasOptions;

  const parameters: MethodParameters = createCallParameters({ pool });
  return execCall({
    parameters,
    address: NFPM_ADDRESS,
    chainId: poolChainId({ pool }),
    gasOptions,
  });
}

export function deployPoolFromTokens(
  args: Args_deployPoolFromTokens
): Ethereum_TxResponse {
  const tokenA: Token = args.tokenA;
  const tokenB: Token = args.tokenB;
  const fee: FeeAmount = args.fee;
  const gasOptions: GasOptions | null = args.gasOptions;

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
