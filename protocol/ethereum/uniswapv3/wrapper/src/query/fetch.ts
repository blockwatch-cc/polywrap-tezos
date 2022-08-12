/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  ChainId,
  getChainIdKey,
  Input_fetchPoolFromAddress,
  Input_fetchToken,
  Pool,
  Token,
  Tick,
  Input_fetchTickList,
  Input_fetchPoolFromTokens,
  FeeAmount,
  ERC20_Query,
} from "./w3";
import { createPool, getPoolAddress } from "./pool";
import {
  fetchPoolImmutables,
  fetchPoolState,
  fetchPoolTicksSubgraph,
  PoolImmutables,
  PoolState,
} from "../utils/fetchUtils";
import { _wrapToken } from "../utils/tokenUtils";

/**
 * returns token object constructed from on-chain token contract
 * @param input.address the Ethereum address of token's ERC20 contract
 * @param input.chainId the id of the chain to be queried
 */
export function fetchToken(input: Input_fetchToken): Token {
  const chainId: ChainId = input.chainId;
  const address: string = input.address;
  const symbol: string = ERC20_Query.symbol({
    address: address,
    connection: {
      node: null,
      networkNameOrChainId: getChainIdKey(chainId),
    },
  }).unwrap();
  const name: string = ERC20_Query.name({
    address: address,
    connection: {
      node: null,
      networkNameOrChainId: getChainIdKey(chainId),
    },
  }).unwrap();
  const decimals: i32 = ERC20_Query.decimals({
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
 * @param input.tokenA a token in the pool
 * @param input.tokenB the other otken in the pool
 * @param input.fee the pool's fee amount
 * @param input.fetchTicks if true, the full list of pool ticks will be fetched
 */
export function fetchPoolFromTokens(input: Input_fetchPoolFromTokens): Pool {
  let tokenA: Token = input.tokenA;
  let tokenB: Token = input.tokenB;
  const fee: FeeAmount = input.fee;
  const fetchTicks: boolean = input.fetchTicks;
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
 * @param input.address the Ethereum address of the pool contract
 * @param input.chainId the id of the chain to be queried
 * @param input.fetchTicks if true, the full list of pool ticks will be fetched
 */
export function fetchPoolFromAddress(input: Input_fetchPoolFromAddress): Pool {
  const chainId: ChainId = input.chainId;
  const address: string = input.address.toLowerCase();
  const fetchTicks: boolean = input.fetchTicks;
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
 * @param input.address the Ethereum address of the pool contract
 * @param input.chainId the id of the chain to be queried
 */
export function fetchTickList(input: Input_fetchTickList): Tick[] {
  return fetchPoolTicksSubgraph(input.address, input.chainId);
}
