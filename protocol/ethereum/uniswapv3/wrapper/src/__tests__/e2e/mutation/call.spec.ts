import { buildAndDeployApi, initTestEnvironment, stopTestEnvironment } from "@web3api/test-env-js";
import { ClientConfig, Web3ApiClient } from "@web3api/client-js";
import {
  ChainIdEnum,
  Ethereum_TxResponse,
  MethodParameters,
  Pool,
  Token,
  TokenAmount,
  Trade
} from "../types";
import path from "path";
import { getPlugins, getPoolFromAddress, getPools, getTokens } from "../testUtils";
import * as ethers from "ethers";
import { bestTradeExactOut, getNative, swapCallParameters } from "../wrappedQueries";
import erc20ABI from "../testData/erc20ABI.json";

jest.setTimeout(180000);

describe("Call (mainnet fork)", () => {

  const ROUTER_ADDRESS = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
  const USDC_ETH_03_ADDRESS = "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8";

  let client: Web3ApiClient;
  let ensUri: string;
  let ethersProvider: ethers.providers.JsonRpcProvider;
  let recipient: string;

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
    recipient = await ethersProvider.getSigner().getAddress();
  });

  afterAll(async () => {
    await stopTestEnvironment();
  });

  it("successfully approves token transfers", async () => {
    const tokens: Token[] = getTokens(await getPools(client, ensUri));
    for (const token of tokens) {
      if (token.currency.symbol === "USDT") continue; // TODO: why does USDT fail on the approve call?
      const txResponse = await client.invoke<Ethereum_TxResponse>({
        uri: ensUri,
        module: "mutation",
        method: "approve",
        input: { token },
      });
      expect(txResponse.error).toBeFalsy();
      expect(txResponse.data).toBeTruthy();

      const approve: string = txResponse.data!.hash;
      const approveTx = await ethersProvider.getTransaction(approve);
      const receipt = await approveTx.wait();
      expect(receipt.status).toBeTruthy();
    }
  });

  it("execCall: swap eth -> usdc", async () => {
    const pools: Pool[] = [await getPoolFromAddress(client, ensUri, USDC_ETH_03_ADDRESS, true)];
    const tokens: Token[] = getTokens(pools);

    // approve token transfers
    for (const token of tokens) {
      const txResponse = await client.invoke<Ethereum_TxResponse>({
        uri: ensUri,
        module: "mutation",
        method: "approve",
        input: { token },
      });
      const approve: string = txResponse.data!.hash;
      const approveTx = await ethersProvider.getTransaction(approve);
      await approveTx.wait();
    }

    const ETH: Token = await getNative(client, ensUri, ChainIdEnum.MAINNET);
    const USDC: Token = tokens.find(token => token.currency.symbol === "USDC") as Token;

    // eth -> usdc preparation
    const usdcOut: TokenAmount = { token: USDC, amount: "10000000000" }
    const ethUsdcTrade: Trade = (await bestTradeExactOut(client, ensUri, pools, ETH, usdcOut))[0];
    const ethUsdcParams: MethodParameters = await swapCallParameters(client, ensUri, [ethUsdcTrade], {
      slippageTolerance: "0.1",
      recipient,
      deadline: (new Date().getTime() / 1000 + 1800).toFixed(0),
    });

    // execCall eth -> usdc
    const ethUsdcQuery = await client.invoke<Ethereum_TxResponse>({
      uri: ensUri,
      module: "mutation",
      method: "execCall",
      input: {
        parameters: ethUsdcParams,
        address: ROUTER_ADDRESS,
        chainId: ChainIdEnum[ChainIdEnum.MAINNET],
      },
    });
    expect(ethUsdcQuery.error).toBeFalsy();
    expect(ethUsdcQuery.data).toBeTruthy();

    const ethUsdcHash: string = ethUsdcQuery.data?.hash ?? "";
    const ethUsdcTx = await ethersProvider.getTransaction(ethUsdcHash);
    const ethUsdcTxResponse = await ethUsdcTx.wait();
    expect(ethUsdcTxResponse.status).toBeTruthy();

    const usdcContract = new ethers.Contract(USDC.address, erc20ABI, ethersProvider);
    const usdcBalance: ethers.BigNumber = await usdcContract.balanceOf(recipient);
    expect(usdcBalance.eq(usdcOut.amount)).toBeTruthy();
  });
});
