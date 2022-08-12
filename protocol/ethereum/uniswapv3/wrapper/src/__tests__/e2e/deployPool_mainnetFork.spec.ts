import { PolywrapClient } from "@polywrap/client-js";
import {
  ChainIdEnum, Ethereum_TxResponse, FeeAmountEnum, Token, Pool,
  getPoolFromAddress,
  getWETH,
  initInfra,
  getPlugins,
  stopInfra
} from "./helpers";
import path from "path";
import * as ethers from "ethers";

jest.setTimeout(360000);

describe("Deploy pool (mainnet fork)", () => {

  let client: PolywrapClient;
  let fsUri: string;
  let ethersProvider: ethers.providers.JsonRpcProvider;

  beforeAll(async () => {
    await initInfra();
    // get client
    const config = getPlugins();
    client = new PolywrapClient(config);
    // get uri
    const wrapperAbsPath: string = path.resolve(__dirname + "/../../../");
    fsUri = "fs/" + wrapperAbsPath + '/build';
    // set up ethers provider
    ethersProvider = new ethers.providers.JsonRpcProvider("http://localhost:8546");
  });

  afterAll(async () => {
    await stopInfra();
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
    const WETH: Token = await getWETH(client, fsUri, ChainIdEnum.MAINNET);

    const txResponse = await client.invoke<Ethereum_TxResponse>({
      uri: fsUri,
      method: "deployPoolFromTokens",
      args: {
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
      uri: fsUri,
      method: "getPoolAddress",
      args: {
        tokenA: WRAP,
        tokenB: WETH,
        fee: FeeAmountEnum.MEDIUM,
      },
    });
    expect(addressQuery.error).toBeFalsy();
    expect(addressQuery.data).toBeTruthy();

    const pool: Pool = await getPoolFromAddress(client, fsUri, addressQuery.data!);
    expect(pool.token0).toStrictEqual(WETH);
    expect(pool.token1).toStrictEqual(WRAP);
    expect(pool.fee).toEqual(FeeAmountEnum.MEDIUM);
    expect(pool.liquidity).toEqual("0");
    expect(pool.tickCurrent).toEqual(0);
  });

});
