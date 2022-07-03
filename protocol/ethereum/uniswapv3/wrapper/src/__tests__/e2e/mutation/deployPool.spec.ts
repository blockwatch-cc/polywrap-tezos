import { buildAndDeployApi, initTestEnvironment, stopTestEnvironment } from "@web3api/test-env-js";
import { ClientConfig, Web3ApiClient } from "@web3api/client-js";
import { ChainIdEnum, Ethereum_TxResponse, FeeAmountEnum, Token, Pool } from "../types";
import path from "path";
import { getPlugins, getPoolFromAddress } from "../testUtils";
import * as ethers from "ethers";
import { getWETH } from "../wrappedQueries";

jest.setTimeout(360000);

describe("Deploy pool (mainnet fork)", () => {

  let client: Web3ApiClient;
  let ensUri: string;
  let ethersProvider: ethers.providers.JsonRpcProvider;

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
    // set up ethers provider
    ethersProvider = new ethers.providers.JsonRpcProvider("http://localhost:8546");
  });

  afterAll(async () => {
    await stopTestEnvironment();
  });

  it("successfully deploys pool from tokens", async () => {
    const WRAP: Token = {
      chainId: ChainIdEnum.MAINNET,
      address: "0xECCac17265D5b6daEBafb9c94430f3E1Cc41431d",
      currency: {
        name: "WRAP-IOU",
        symbol: "WRAP-IOU",
        decimals: 18
      }
    };
    const WETH: Token = await getWETH(client, ensUri, ChainIdEnum.MAINNET);

    const txResponse = await client.invoke<Ethereum_TxResponse>({
      uri: ensUri,
      module: "mutation",
      method: "deployPoolFromTokens",
      input: {
        tokenA: WRAP,
        tokenB: WETH,
        fee: FeeAmountEnum.MEDIUM,
      },
    });
    expect(txResponse.error).toBeFalsy();
    expect(txResponse.data).toBeTruthy();

    const txHash: string = txResponse.data!.hash;
    const tx = await ethersProvider.getTransaction(txHash);
    const receipt = await tx.wait();
    expect(receipt.status).toBeTruthy();

    const addressQuery = await client.invoke<string>({
      uri: ensUri,
      module: "query",
      method: "getPoolAddress",
      input: {
        tokenA: WRAP,
        tokenB: WETH,
        fee: FeeAmountEnum.MEDIUM,
      },
    });
    expect(addressQuery.error).toBeFalsy();
    expect(addressQuery.data).toBeTruthy();

    const pool: Pool = await getPoolFromAddress(client, ensUri, addressQuery.data!);
    expect(pool.token0).toStrictEqual(WETH);
    expect(pool.token1).toStrictEqual(WRAP);
    expect(pool.fee).toEqual(FeeAmountEnum.MEDIUM);
    expect(pool.liquidity).toEqual("0");
    expect(pool.tickCurrent).toEqual(0);
  });

});
