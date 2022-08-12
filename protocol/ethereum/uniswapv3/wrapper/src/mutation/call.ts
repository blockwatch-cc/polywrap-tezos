/* eslint-disable @typescript-eslint/naming-convention */
import {
  ChainId,
  Ethereum_Mutation,
  Ethereum_TxResponse,
  GasOptions,
  getChainIdKey,
  Input_approve,
  Input_execCall,
  MethodParameters,
} from "./w3";
import { MAX_UINT_256, ROUTER_ADDRESS } from "../utils/constants";
import { toHex } from "../query";

import { BigInt, Nullable } from "@web3api/wasm-as";

export function execCall(input: Input_execCall): Ethereum_TxResponse {
  const methodParameters: MethodParameters = input.parameters;
  const chainId: ChainId = input.chainId;
  const address: string = input.address;
  const gasOptions: GasOptions | null = input.gasOptions;

  return Ethereum_Mutation.sendTransaction({
    tx: {
      to: address,
      m_from: null,
      nonce: Nullable.fromNull<u32>(),
      gasLimit: gasOptions === null ? null : gasOptions.gasLimit,
      gasPrice: gasOptions === null ? null : gasOptions.gasPrice,
      data: methodParameters.calldata,
      value: BigInt.fromString(methodParameters.value, 16),
      chainId: null,
      m_type: Nullable.fromNull<u32>(),
    },
    connection: {
      node: null,
      networkNameOrChainId: getChainIdKey(chainId),
    },
  }).unwrap();
}

export function approve(input: Input_approve): Ethereum_TxResponse {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const amount: BigInt = input.amount === null ? MAX_UINT_256 : input.amount!;
  const gasOptions: GasOptions | null = input.gasOptions;

  return Ethereum_Mutation.callContractMethod({
    address: input.token.address,
    method:
      "function approve(address spender, uint value) external returns (bool)",
    args: [ROUTER_ADDRESS, toHex({ value: amount })],
    connection: {
      node: null,
      networkNameOrChainId: getChainIdKey(input.token.chainId),
    },
    txOverrides: {
      value: null,
      gasLimit: gasOptions === null ? null : gasOptions.gasLimit,
      gasPrice: gasOptions === null ? null : gasOptions.gasPrice,
    },
  }).unwrap();
}
