/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  ChainId,
  Ethereum_Query,
  FeeAmount,
  getChainIdKey,
  Subgraph_Query,
  Tick,
} from "../query/w3";
import { getFeeAmountEnum } from "./enumUtils";

import { BigInt, JSON } from "@web3api/wasm-as";

export class PoolImmutables {
  token0: string;
  token1: string;
  fee: FeeAmount;
}

export class PoolState {
  liquidity: BigInt;
  sqrtPriceX96: BigInt;
  tick: i32;
}

class SubgraphEndpoint {
  author: string;
  name: string;
}

export function poolAbi(methodName: string): string {
  if (methodName == "token0") {
    return "function token0() external view returns (address)";
  } else if (methodName == "token1") {
    return "function token1() external view returns (address)";
  } else if (methodName == "fee") {
    return "function fee() external view returns (uint24)";
  } else if (methodName == "liquidity") {
    return "function liquidity() external view returns (uint128)";
  } else if (methodName == "slot0") {
    return "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)";
  } else if (methodName == "ticks") {
    return "function ticks(int24 tick) external view returns (uint128 liquidityGross, int128 liquidityNet, uint256 feeGrowthOutside0X128, uint256 feeGrowthOutside1X128, int56 tickCumulativeOutside, uint160 secondsPerLiquidityOutsideX128, uint32 secondsOutside, bool initialized)";
  } else {
    throw new Error("Invalid method name: " + methodName);
  }
}

function getSubgraphEndpoint(chainId: ChainId): SubgraphEndpoint {
  switch (chainId) {
    case ChainId.MAINNET:
    case ChainId.RINKEBY:
      return { author: "uniswap", name: "uniswap-v3" };
    case ChainId.OPTIMISM:
      return { author: "ianlapham", name: "uniswap-optimism-dev" };
    case ChainId.ARBITRUM_ONE:
      return { author: "ianlapham", name: "arbitrum-minimal" };
    default:
      throw new Error("Unknown or Unsupported chain ID");
  }
}

export function ethCallView(
  address: string,
  chainId: ChainId,
  method: string
): string {
  return Ethereum_Query.callContractView({
    address: address,
    method: method,
    args: [],
    connection: {
      node: null,
      networkNameOrChainId: getChainIdKey(chainId),
    },
  }).unwrap();
}

export function fetchPoolImmutables(
  address: string,
  chainId: ChainId
): PoolImmutables {
  const token0: string = ethCallView(address, chainId, poolAbi("token0"));
  const token1: string = ethCallView(address, chainId, poolAbi("token1"));
  const fee: string = ethCallView(address, chainId, poolAbi("fee"));
  return {
    token0,
    token1,
    fee: getFeeAmountEnum(U32.parseInt(fee)),
  };
}

export function fetchPoolState(address: string, chainId: ChainId): PoolState {
  const liquidity: string = ethCallView(address, chainId, poolAbi("liquidity"));
  const slot0Str: string = ethCallView(address, chainId, poolAbi("slot0"));
  const slot0: string[] = slot0Str.split(",");
  return {
    liquidity: BigInt.fromString(liquidity),
    sqrtPriceX96: BigInt.fromString(slot0[0]),
    tick: I32.parseInt(slot0[1]),
  };
}

export function fetchPoolTicksSubgraph(
  address: string,
  chainId: ChainId
): Tick[] {
  const endpoint: SubgraphEndpoint = getSubgraphEndpoint(chainId);
  const query: JSON.Value = Subgraph_Query.subgraphQuery({
    subgraphAuthor: endpoint.author,
    subgraphName: endpoint.name,
    query: `
      query {
        ticks(first: 1000, skip: 0, where: { poolAddress: "${address}" }, orderBy: tickIdx) {
          tickIdx
          liquidityGross
          liquidityNet
        }
      }`,
  }).unwrap();
  return (<JSON.Obj>query)
    .getArr("ticks")!
    .valueOf()
    .map<Tick>(
      (v: JSON.Value, _i: i32, _arr: JSON.Value[]): Tick => {
        const jsonObj: JSON.Obj = <JSON.Obj>v;
        const index: string = jsonObj.getString("tickIdx")!.valueOf();
        const liqGross: string = jsonObj.getString("liquidityGross")!.valueOf();
        const liqNet: string = jsonObj.getString("liquidityNet")!.valueOf();
        return {
          index: I32.parseInt(index),
          liquidityGross: BigInt.fromString(liqGross),
          liquidityNet: BigInt.fromString(liqNet),
        };
      }
    );
}
