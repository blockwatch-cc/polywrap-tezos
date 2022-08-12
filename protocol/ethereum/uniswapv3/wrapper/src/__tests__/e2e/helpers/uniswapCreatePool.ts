import { ethers } from "ethers";
import { Pool, Tick } from "@uniswap/v3-sdk";
import { Token } from "@uniswap/sdk-core";
import { abi as IUniswapV3PoolABI } from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
import { request } from 'graphql-request';

const ERC20ABI = [
  "function decimals() external pure returns (uint8)",
  "function symbol() external pure returns (string memory)",
  "function name() external pure returns (string memory)",
];

interface Immutables {
  token0: string;
  token1: string;
  fee: number;
  tickSpacing: number;
}

interface State {
  liquidity: ethers.BigNumber;
  sqrtPriceX96: ethers.BigNumber;
  tick: number;
}

async function getPoolImmutables(poolContract: ethers.Contract): Promise<Immutables> {
  const [token0, token1, fee, tickSpacing] =
    await Promise.all([
      poolContract.token0(),
      poolContract.token1(),
      poolContract.fee(),
      poolContract.tickSpacing(),
    ]);

  return {
    token0,
    token1,
    fee,
    tickSpacing,
  };
}

async function getPoolState(poolContract: ethers.Contract): Promise<State> {
  const [liquidity, slot] = await Promise.all([
    poolContract.liquidity(),
    poolContract.slot0(),
  ]);
  return {
    liquidity,
    sqrtPriceX96: slot[0],
    tick: slot[1],
  };
}

async function getPoolTicks(address: string): Promise<Tick[]> {
  const APIURL = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';
  const tokensQuery = `
    query {
      ticks(first: 1000, skip: 0, where: { poolAddress: "${address}" }, orderBy: tickIdx) {
        tickIdx
        liquidityGross
        liquidityNet
      }
    }`;
  const query = await request(APIURL, tokensQuery);

  return query.ticks.map((v: Record<string, string>) => ({
    index: parseInt(v.tickIdx),
    liquidityGross: v.liquidityGross,
    liquidityNet: v.liquidityNet,
  }));
}

async function getToken(tokenContract: ethers.Contract): Promise<Token> {
  const [decimals, symbol, name] = await Promise.all([
    tokenContract.decimals(),
    tokenContract.symbol(),
    tokenContract.name(),
  ]);
  return new Token(1, tokenContract.address, decimals, symbol, name);
}

export async function getUniswapPool(provider: ethers.providers.Provider, poolAddress: string, fetchTicks?: boolean, useTicks?: Tick[]): Promise<Pool> {

  const poolContract: ethers.Contract = new ethers.Contract(
    poolAddress,
    IUniswapV3PoolABI,
    provider
  );

  const immutables: Immutables = await getPoolImmutables(poolContract);

  const tokenContractA: ethers.Contract = new ethers.Contract(immutables.token0, ERC20ABI, provider);
  const tokenContractB: ethers.Contract = new ethers.Contract(immutables.token1, ERC20ABI, provider);

  const [state, tokenA, tokenB] = await Promise.all([
    getPoolState(poolContract),
    getToken(tokenContractA),
    getToken(tokenContractB),
  ]);

  let ticks: Tick[] | undefined;
  if (fetchTicks && !useTicks) {
    ticks = await getPoolTicks(poolAddress);
  } else {
    ticks = useTicks;
  }

  return new Pool(
    tokenA,
    tokenB,
    immutables.fee,
    state.sqrtPriceX96.toString(),
    state.liquidity.toString(),
    state.tick,
    ticks
  );
}