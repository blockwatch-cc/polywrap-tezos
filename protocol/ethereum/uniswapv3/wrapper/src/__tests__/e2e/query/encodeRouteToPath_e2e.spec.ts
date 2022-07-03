import { ClientConfig, Web3ApiClient } from "@web3api/client-js";
import { ChainIdEnum, FeeAmountEnum, Pool, Route, Token } from "../types";
import { buildAndDeployApi, initTestEnvironment, stopTestEnvironment } from "@web3api/test-env-js";
import { getFakeTestToken, getPlugins } from "../testUtils";
import path from "path";
import { createPool, encodeSqrtRatioX96, createRoute, encodeRouteToPath } from "../wrappedQueries";

jest.setTimeout(120000);

describe('encodeRouteToPath (SDK test replication)', () => {

  const ETHER: Token = {
    chainId: ChainIdEnum.MAINNET,
    address: "",
    currency: {
      decimals: 18,
      name: "Ether",
      symbol: "ETH",
    },
  }
  const weth: Token = {
    chainId: ChainIdEnum.MAINNET,
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    currency: {
      decimals: 18,
      symbol: "WETH",
      name: "Wrapped Ether",
    },
  }
  let token0: Token;
  let token1: Token;
  let token2: Token;
  let pool_0_1_medium: Pool;
  let pool_1_2_low: Pool;
  let pool_0_weth: Pool;
  let pool_1_weth: Pool;
  let route_0_1: Route;
  let route_0_1_2: Route;
  let route_0_weth: Route;
  let route_0_1_weth: Route;
  let route_weth_0: Route;
  let route_weth_0_1: Route;

  let client: Web3ApiClient;
  let ensUri: string;

  beforeAll(async () => {
    const { ipfs, ethereum, ensAddress, registrarAddress, resolverAddress } = await initTestEnvironment();
    // get client
    const config: ClientConfig = getPlugins(ethereum, ipfs, ensAddress);
    client = new Web3ApiClient(config);
    // deploy api
    const apiPath: string = path.resolve(__dirname + "/../../../../");
    const api = await buildAndDeployApi({
      apiAbsPath: apiPath,
      ipfsProvider: ipfs,
      ensRegistryAddress: ensAddress,
      ethereumProvider: ethereum,
      ensRegistrarAddress: registrarAddress,
      ensResolverAddress: resolverAddress,
    });
    ensUri = `ens/testnet/${api.ensDomain}`;
    // set up test case data
    token0 = getFakeTestToken(0);
    token1 = getFakeTestToken(1);
    token2 = getFakeTestToken(2);
    pool_0_1_medium = await createPool(client, ensUri, token0, token1, FeeAmountEnum.MEDIUM, await encodeSqrtRatioX96(client, ensUri,1, 1), 0, 0, []);
    pool_1_2_low = await createPool(client, ensUri, token1, token2, FeeAmountEnum.LOW, await encodeSqrtRatioX96(client, ensUri,1, 1), 0, 0, []);
    pool_0_weth = await createPool(client, ensUri, token0, weth, FeeAmountEnum.MEDIUM, await encodeSqrtRatioX96(client, ensUri,1, 1), 0, 0, []);
    pool_1_weth = await createPool(client, ensUri, token1, weth, FeeAmountEnum.MEDIUM, await encodeSqrtRatioX96(client, ensUri,1, 1), 0, 0, []);
    route_0_1 = await createRoute(client, ensUri, [pool_0_1_medium], token0, token1);
    route_0_1_2 = await createRoute(client, ensUri, [pool_0_1_medium, pool_1_2_low], token0, token2);
    route_0_weth = await createRoute(client, ensUri, [pool_0_weth], token0, ETHER);
    route_0_1_weth = await createRoute(client, ensUri, [pool_0_1_medium, pool_1_weth], token0, ETHER);
    route_weth_0 = await createRoute(client, ensUri, [pool_0_weth], ETHER, token0);
    route_weth_0_1 = await createRoute(client, ensUri, [pool_0_weth, pool_0_1_medium], ETHER, token1);
  });

  afterAll(async () => {
    await stopTestEnvironment();
  });

  it('packs them for exact input single hop', async () => {
    expect(await encodeRouteToPath(client, ensUri, route_0_1, false)).toEqual(
      '0x0000000000000000000000000000000000000001000bb80000000000000000000000000000000000000002'
    )
  })

  it('packs them correctly for exact output single hop', async () => {
    expect(await encodeRouteToPath(client, ensUri, route_0_1, true)).toEqual(
      '0x0000000000000000000000000000000000000002000bb80000000000000000000000000000000000000001'
    )
  })

  it('packs them correctly for multihop exact input', async () => {
    expect(await encodeRouteToPath(client, ensUri, route_0_1_2, false)).toEqual(
      '0x0000000000000000000000000000000000000001000bb800000000000000000000000000000000000000020001f40000000000000000000000000000000000000003'
    )
  })

  it('packs them correctly for multihop exact output', async () => {
    expect(await encodeRouteToPath(client, ensUri, route_0_1_2, true)).toEqual(
      '0x00000000000000000000000000000000000000030001f40000000000000000000000000000000000000002000bb80000000000000000000000000000000000000001'
    )
  })

  it('wraps ether input for exact input single hop', async () => {
    expect(await encodeRouteToPath(client, ensUri, route_weth_0, false)).toEqual(
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000bb80000000000000000000000000000000000000001'
    )
  })
  it('wraps ether input for exact output single hop', async () => {
    expect(await encodeRouteToPath(client, ensUri, route_weth_0, true)).toEqual(
      '0x0000000000000000000000000000000000000001000bb8c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
    )
  })
  it('wraps ether input for exact input multihop', async () => {
    expect(await encodeRouteToPath(client, ensUri, route_weth_0_1, false)).toEqual(
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000bb80000000000000000000000000000000000000001000bb80000000000000000000000000000000000000002'
    )
  })
  it('wraps ether input for exact output multihop', async () => {
    expect(await encodeRouteToPath(client, ensUri, route_weth_0_1, true)).toEqual(
      '0x0000000000000000000000000000000000000002000bb80000000000000000000000000000000000000001000bb8c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
    )
  })

  it('wraps ether output for exact input single hop', async () => {
    expect(await encodeRouteToPath(client, ensUri, route_0_weth, false)).toEqual(
      '0x0000000000000000000000000000000000000001000bb8c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
    )
  })
  it('wraps ether output for exact output single hop', async () => {
    expect(await encodeRouteToPath(client, ensUri, route_0_weth, true)).toEqual(
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000bb80000000000000000000000000000000000000001'
    )
  })
  it('wraps ether output for exact input multihop', async () => {
    expect(await encodeRouteToPath(client, ensUri, route_0_1_weth, false)).toEqual(
      '0x0000000000000000000000000000000000000001000bb80000000000000000000000000000000000000002000bb8c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
    )
  })
  it('wraps ether output for exact output multihop', async () => {
    expect(await encodeRouteToPath(client, ensUri, route_0_1_weth, true)).toEqual(
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000bb80000000000000000000000000000000000000002000bb80000000000000000000000000000000000000001'
    )
  })
})
