/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  ChainId,
  getChainIdKey,
  Args_fetchPoolFromAddress,
  Args_fetchToken,
  Pool,
  Token,
  Tick,
  Args_fetchTickList,
  Args_fetchPoolFromTokens,
  FeeAmount,
  ERC20_Module,
  Ethereum_Module,
  Subgraph_Module,
} from "../wrap";
import { createPool, getPoolAddress } from "../pool";
import { _wrapToken } from "../token";
import { getFeeAmountEnum } from "./enumUtils";

import { BigInt, JSON } from "@polywrap/wasm-as";

/**
 * returns token object constructed from on-chain token contract
 * @param args.address the Ethereum address of token's ERC20 contract
 * @param args.chainId the id of the chain to be queried
 */
export function fetchToken(args: Args_fetchToken): Token {
  const chainId: ChainId = args.chainId;
  const address: string = args.address;
  const symbol: string = ERC20_Module.symbol({
    address: address,
    connection: {
      node: null,
      networkNameOrChainId: getChainIdKey(chainId),
    },
  }).unwrap();
  const name: string = ERC20_Module.name({
    address: address,
    connection: {
      node: null,
      networkNameOrChainId: getChainIdKey(chainId),
    },
  }).unwrap();
  const decimals: i32 = ERC20_Module.decimals({
    address: address,
    connection: {
      node: null,
      networkNameOrChainId: getChainIdKey(chainId),
    },
  }).unwrap();
  return {
    chainId: chainId,
    address: address,
    currency: {
      decimals: <u8>decimals,
      symbol: symbol,
      name: name,
    },
  };
}

/**
 * returns pool object constructed from on-chain pool contract
 * @param args.tokenA a token in the pool
 * @param args.tokenB the other token in the pool
 * @param args.fee the pool's fee amount
 * @param args.fetchTicks if true, the full list of pool ticks will be fetched
 */
export function fetchPoolFromTokens(args: Args_fetchPoolFromTokens): Pool {
  let tokenA: Token = args.tokenA;
  let tokenB: Token = args.tokenB;
  const fee: FeeAmount = args.fee;
  const fetchTicks = args.fetchTicks;
  // wrap if ether
  tokenA = _wrapToken(tokenA);
  tokenB = _wrapToken(tokenB);
  // get pool address
  const address = getPoolAddress({
    tokenA,
    tokenB,
    fee,
    initCodeHashManualOverride: null,
  });
  const chainId: ChainId = tokenA.chainId;
  // fetch data
  const state: PoolState = fetchPoolState(address, chainId);
  const ticks: Tick[] | null = fetchTicks
    ? fetchTickList({ address, chainId })
    : null;

  return createPool({
    tokenA: tokenA,
    tokenB: tokenB,
    fee: fee,
    sqrtRatioX96: state.sqrtPriceX96,
    liquidity: state.liquidity,
    tickCurrent: state.tick,
    ticks: ticks,
  });
}

/**
 * returns pool object constructed from on-chain pool contract
 * @param args.address the Ethereum address of the pool contract
 * @param args.chainId the id of the chain to be queried
 * @param args.fetchTicks if true, the full list of pool ticks will be fetched
 */
export function fetchPoolFromAddress(args: Args_fetchPoolFromAddress): Pool {
  const chainId: ChainId = args.chainId;
  const address: string = args.address.toLowerCase();
  const fetchTicks = args.fetchTicks;
  // fetch data
  const immutables: PoolImmutables = fetchPoolImmutables(address, chainId);
  const state: PoolState = fetchPoolState(address, chainId);
  const ticks: Tick[] | null = fetchTicks
    ? fetchTickList({ address, chainId })
    : null;

  return createPool({
    tokenA: fetchToken({ address: immutables.token0, chainId: chainId }),
    tokenB: fetchToken({ address: immutables.token1, chainId: chainId }),
    fee: immutables.fee,
    sqrtRatioX96: state.sqrtPriceX96,
    liquidity: state.liquidity,
    tickCurrent: state.tick,
    ticks: ticks,
  });
}

/**
 * returns array of ticks from on-chain pool contract at given address
 * @param args.address the Ethereum address of the pool contract
 * @param args.chainId the id of the chain to be queried
 */
export function fetchTickList(args: Args_fetchTickList): Tick[] {
  return fetchPoolTicksSubgraph(args.address, args.chainId);
}

class PoolImmutables {
  token0: string;
  token1: string;
  fee: FeeAmount;
}

class PoolState {
  liquidity: BigInt;
  sqrtPriceX96: BigInt;
  tick: i32;
}

class SubgraphEndpoint {
  author: string;
  name: string;
}

function poolAbi(methodName: string): string {
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

function ethCallView(
  address: string,
  chainId: ChainId,
  method: string
): string {
  return Ethereum_Module.callContractView({
    address: address,
    method: method,
    args: [],
    connection: {
      node: null,
      networkNameOrChainId: getChainIdKey(chainId),
    },
  }).unwrap();
}

function fetchPoolImmutables(
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

function fetchPoolState(address: string, chainId: ChainId): PoolState {
  const liquidity: string = ethCallView(address, chainId, poolAbi("liquidity"));
  const slot0Str: string = ethCallView(address, chainId, poolAbi("slot0"));
  const slot0: string[] = slot0Str.split(",");
  return {
    liquidity: BigInt.fromString(liquidity),
    sqrtPriceX96: BigInt.fromString(slot0[0]),
    tick: I32.parseInt(slot0[1]),
  };
}

function fetchPoolTicksSubgraph(address: string, chainId: ChainId): Tick[] {
  const endpoint: SubgraphEndpoint = getSubgraphEndpoint(chainId);
  const query: JSON.Value = Subgraph_Module.subgraphQuery({
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
