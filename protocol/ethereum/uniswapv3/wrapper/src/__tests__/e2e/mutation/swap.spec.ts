import { buildAndDeployApi, initTestEnvironment, stopTestEnvironment } from "@web3api/test-env-js";
import { ClientConfig, Web3ApiClient } from "@web3api/client-js";
import {
  ChainIdEnum,
  Ethereum_TxResponse, FeeAmountEnum,
  Pool,
  SwapOptions,
  Token,
  TokenAmount,
  Trade, TradeTypeEnum
} from "../types";
import path from "path";
import { getPlugins, getPoolFromAddress, getTokens } from "../testUtils";
import * as ethers from "ethers";
import { bestTradeExactIn, bestTradeExactOut, getNative } from "../wrappedQueries";
import erc20ABI from "../testData/erc20ABI.json";

jest.setTimeout(180000);

describe("Swap (mainnet fork)", () => {

  const getSwapParams = (recipient: string): SwapOptions => ({
    slippageTolerance: "0.1",
    recipient,
    deadline: (new Date().getTime() / 1000 + 1800).toFixed(0),
  });

  const USDC_ETH_03_ADDRESS = "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8";
  const WBTC_USDC_03_ADDRESS = "0x99ac8cA7087fA4A2A1FB6357269965A2014ABc35";

  let client: Web3ApiClient;
  let ensUri: string;
  let tokens: Token[];
  let pools: Pool[];
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
    // set up test case data
    pools = await Promise.all([
      getPoolFromAddress(client, ensUri, USDC_ETH_03_ADDRESS, true),
      getPoolFromAddress(client, ensUri, WBTC_USDC_03_ADDRESS, true),
    ]);
    tokens = getTokens(pools);
    // set up ethers provider
    ethersProvider = new ethers.providers.JsonRpcProvider("http://localhost:8546");
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
  });

  afterAll(async () => {
    await stopTestEnvironment();
  });

  it("execSwap: eth -> usdc -> wbtc -> eth", async () => {
    const recipient = await ethersProvider.getSigner(0).getAddress();

    const ETH: Token = await getNative(client, ensUri, ChainIdEnum.MAINNET);
    const USDC: Token = tokens.find(token => token.currency.symbol === "USDC") as Token;
    const WBTC: Token = tokens.find(token => token.currency.symbol === "WBTC") as Token;

    // eth -> usdc preparation
    const usdcOut: TokenAmount = { token: USDC, amount: "10000000000" }
    const ethUsdcTrade: Trade = (await bestTradeExactOut(client, ensUri, pools, ETH, usdcOut))[0];

    // execSwap eth -> usdc
    const ethUsdcQuery = await client.invoke<Ethereum_TxResponse>({
      uri: ensUri,
      module: "mutation",
      method: "execSwap",
      input: {
        trades: [ethUsdcTrade],
        swapOptions: getSwapParams(recipient),
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

    // usdc -> wbtc preparation
    const wbtcOut: TokenAmount = { token: WBTC, amount: "1000000" }
    const usdcWbtcTrade: Trade = (await bestTradeExactOut(client, ensUri, pools, USDC, wbtcOut))[0];

    // execSwap usdc -> wbtc
    const usdcWbtcQuery = await client.invoke<Ethereum_TxResponse>({
      uri: ensUri,
      module: "mutation",
      method: "execSwap",
      input: {
        trades: [usdcWbtcTrade],
        swapOptions: getSwapParams(recipient),
      },
    });
    expect(usdcWbtcQuery.error).toBeFalsy();
    expect(usdcWbtcQuery.data).toBeTruthy();

    const usdcWbtcHash: string = usdcWbtcQuery.data?.hash ?? "";
    const usdcWbtcTx = await ethersProvider.getTransaction(usdcWbtcHash);
    const usdcWbtcTxResponse = await usdcWbtcTx.wait();
    expect(usdcWbtcTxResponse.status).toBeTruthy();

    const wbtcContract = new ethers.Contract(WBTC.address, erc20ABI, ethersProvider);
    const wbtcBalance: ethers.BigNumber = await wbtcContract.balanceOf(recipient);
    expect(wbtcBalance.eq(wbtcOut.amount)).toBeTruthy();

    // wbtc -> eth preparation
    const wbtcIn: TokenAmount = { token: WBTC, amount: wbtcOut.amount }
    const wbtcEthTrade: Trade = (await bestTradeExactIn(client, ensUri, pools, wbtcIn, ETH))[0];

    // execSwap wbtc -> eth
    const wbtcEthQuery = await client.invoke<Ethereum_TxResponse>({
      uri: ensUri,
      module: "mutation",
      method: "execSwap",
      input: {
        trades: [wbtcEthTrade],
        swapOptions: getSwapParams(recipient),
      },
    });
    expect(wbtcEthQuery.error).toBeFalsy();
    expect(wbtcEthQuery.data).toBeTruthy();

    const wbtcEthHash: string = wbtcEthQuery.data?.hash ?? "";
    const wbtcEthTx = await ethersProvider.getTransaction(wbtcEthHash);
    const wbtcEthTxResponse = await wbtcEthTx.wait();
    expect(wbtcEthTxResponse.status).toBeTruthy();

    const finalWbtcBalance: ethers.BigNumber = await wbtcContract.balanceOf(recipient);
    expect(finalWbtcBalance.eq(0)).toBeTruthy();
  });

  it("swap: eth -> usdc", async () => {
    const recipient = await ethersProvider.getSigner(1).getAddress();

    const ETH: Token = await getNative(client, ensUri, ChainIdEnum.MAINNET);
    const USDC: Token = tokens.find(token => token.currency.symbol === "USDC") as Token;

    const ethUsdcQuery = await client.invoke<Ethereum_TxResponse>({
      uri: ensUri,
      module: "mutation",
      method: "swap",
      input: {
        inToken: ETH,
        outToken: USDC,
        fee: FeeAmountEnum.MEDIUM,
        amount: "1000000000",
        tradeType: TradeTypeEnum.EXACT_OUTPUT,
        swapOptions: getSwapParams(recipient),
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
    expect(usdcBalance.eq("1000000000")).toBeTruthy();
  });

  it("swap: eth -> usdc; swapWithPool: usdc -> wbtc", async () => {
    const recipient = await ethersProvider.getSigner().getAddress();

    const ETH: Token = await getNative(client, ensUri, ChainIdEnum.MAINNET);
    const USDC: Token = tokens.find(token => token.currency.symbol === "USDC") as Token;
    const WBTC: Token = tokens.find(token => token.currency.symbol === "WBTC") as Token;

    const usdcContract = new ethers.Contract(USDC.address, erc20ABI, ethersProvider.getSigner(2));
    const startUsdcBalance: ethers.BigNumber = await usdcContract.balanceOf(recipient);

    const wbtcContract = new ethers.Contract(WBTC.address, erc20ABI, ethersProvider);
    const startWbtcBalance: ethers.BigNumber = await wbtcContract.balanceOf(recipient);
    expect(startWbtcBalance.eq(0)).toBeTruthy()
    
    const usdcOut = "1000000000";

    // swap eth -> usdc
    const ethUsdcQuery = await client.invoke<Ethereum_TxResponse>({
      uri: ensUri,
      module: "mutation",
      method: "swap",
      input: {
        inToken: ETH,
        outToken: USDC,
        fee: FeeAmountEnum.MEDIUM,
        amount: usdcOut,
        tradeType: TradeTypeEnum.EXACT_OUTPUT,
        swapOptions: getSwapParams(recipient),
      },
    });
    expect(ethUsdcQuery.error).toBeFalsy();
    expect(ethUsdcQuery.data).toBeTruthy();

    const ethUsdcHash: string = ethUsdcQuery.data?.hash ?? "";
    const ethUsdcTx = await ethersProvider.getTransaction(ethUsdcHash);
    const ethUsdcTxResponse = await ethUsdcTx.wait();
    expect(ethUsdcTxResponse.status).toBeTruthy();

    const usdcBalance: ethers.BigNumber = await usdcContract.balanceOf(recipient);
    expect(usdcBalance.sub(usdcOut).eq(startUsdcBalance)).toBeTruthy();

    // swapWithPool usdc -> wbtc
    const usdcIn: TokenAmount = { token: USDC, amount: usdcBalance.toString() }
    const usdcWbtcQuery = await client.invoke<Ethereum_TxResponse>({
      uri: ensUri,
      module: "mutation",
      method: "swapWithPool",
      input: {
        address: WBTC_USDC_03_ADDRESS,
        amount: usdcIn,
        tradeType: TradeTypeEnum.EXACT_INPUT,
        swapOptions: getSwapParams(recipient),
      },
    });
    expect(usdcWbtcQuery.error).toBeFalsy();
    expect(usdcWbtcQuery.data).toBeTruthy();

    const usdcWbtcHash: string = usdcWbtcQuery.data?.hash ?? "";
    const usdcWbtcTx = await ethersProvider.getTransaction(usdcWbtcHash);
    const usdcWbtcTxResponse = await usdcWbtcTx.wait();
    expect(usdcWbtcTxResponse.status).toBeTruthy();

    const endUsdcBalance: ethers.BigNumber = await usdcContract.balanceOf(recipient);
    expect(endUsdcBalance.eq(0)).toBeTruthy();
    const endWbtcBalance: ethers.BigNumber = await wbtcContract.balanceOf(recipient);
    expect(endWbtcBalance.gt(0)).toBeTruthy();
  });
});
