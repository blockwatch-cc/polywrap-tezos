import { buildAndDeployApi, initTestEnvironment, stopTestEnvironment } from "@web3api/test-env-js";
import { ClientConfig, Web3ApiClient } from "@web3api/client-js";
import { Currency, Pair, Token, TokenAmount, Trade, TxResponse } from "./types";
import path from "path";
import {
  approveToken, execSwap, execTrade,
  getBestTradeExactIn,
  getBestTradeExactOut,
  getPairData,
  getPlugins,
  getTokenList
} from "../testUtils";
import { Contract, ethers, providers } from "ethers";
import erc20ABI from "./testData/erc20ABI.json";

jest.setTimeout(360000);

const getTradeOptions = (recipient: string) => ({
  allowedSlippage: "0.1",
  recipient: recipient,
  unixTimestamp: parseInt((new Date().getTime() / 1000).toFixed(0)),
  ttl: 1800
});

describe("Swap", () => {

  let client: Web3ApiClient;
  let recipient: string;
  let ensUri: string;
  let tokens: Token[];
  let ethersProvider: providers.JsonRpcProvider;
  let ethCurrency: Currency;
  let dai: Token;
  let weth: Token;
  let usdc: Token;

  beforeAll(async () => {
    const { ethereum: testEnvEtherem, ensAddress, ipfs } = await initTestEnvironment();
    // get client
    const config: ClientConfig = getPlugins(testEnvEtherem, ipfs, ensAddress);
    client = new Web3ApiClient(config);

    // deploy api
    const apiPath: string = path.resolve(__dirname + "../../../../");
    const api = await buildAndDeployApi(apiPath, ipfs, ensAddress);
    ensUri = `ens/testnet/${api.ensDomain}`;
    ethersProvider = ethers.providers.getDefaultProvider("http://localhost:8546") as providers.JsonRpcProvider;
    recipient = await ethersProvider.getSigner().getAddress();

    // set up test case data -> pairs
    tokens = await getTokenList();

    dai = tokens.filter(token => token.currency.symbol === "DAI")[0];
    const daiTxResponse: TxResponse = await approveToken(dai, client, ensUri);
    const daiApproveTx = await ethersProvider.getTransaction(daiTxResponse.hash);
    await daiApproveTx.wait();

    usdc = tokens.filter(token => token.currency.symbol === "USDC")[0];
    const usdcTxResponse = await approveToken(usdc, client, ensUri);
    const usdcApproveTx = await ethersProvider.getTransaction(usdcTxResponse.hash);
    await usdcApproveTx.wait();

    weth = tokens.filter(token => token.currency.symbol === "WETH")[0];
    ethCurrency = {
      decimals: 18,
      name: "Ether",
      symbol: "ETH",
    };
  });

  afterAll(async () => {
    await stopTestEnvironment();
  });

  it("Should successfully EXEC ether -> dai -> usdc -> ether", async () => {
    const weth_dai: Pair = await getPairData(weth, dai, client, ensUri) as Pair;
    const dai_usdc: Pair = await getPairData(dai, usdc, client, ensUri) as Pair;
    const usdc_weth: Pair = await getPairData(usdc, weth, client, ensUri) as Pair;

    const daiContract = new Contract(dai.address, erc20ABI, ethersProvider);
    const usdcContract = new Contract(usdc.address, erc20ABI, ethersProvider);

    const etherDaiOut = "1000000000000000000000"; // $1,000
    const daiUsdcIn = "100000000000000000000"; // $100
    const usdcEthIn = "10000000"; // $10;
    const daiUsdcSwapOut = "100000000"; // $100
    const usdcDaiSwapIn = "100000000"; // $100
    
    // EXEC eth -> dai
    const etherDaiAmountOut: TokenAmount = {
        token: dai,
        amount: etherDaiOut,
      };
    const etherDaiBestTrades: Trade[] = await getBestTradeExactOut([weth_dai], weth, etherDaiAmountOut, null, client, ensUri);
    const etherDaiTrade: Trade = etherDaiBestTrades[0];
    etherDaiTrade.route.path[0].currency = ethCurrency;
    etherDaiTrade.route.pairs[0].tokenAmount1.token.currency = ethCurrency;
    etherDaiTrade.route.input.currency = ethCurrency;
    etherDaiTrade.inputAmount.token.currency = ethCurrency;
    const etherDaiTxResponse = await execTrade(etherDaiTrade, getTradeOptions(recipient), client, ensUri);
    const etherDaiTx = await ethersProvider.getTransaction(etherDaiTxResponse.hash);
    await etherDaiTx.wait();
    // CHECK eth -> dai
    expect((await daiContract.balanceOf(recipient)).gte(etherDaiOut)).toBeTruthy();

    // EXEC dai -> usdc
    const daiUsdcAmountIn: TokenAmount = {
      token: dai,
      amount: daiUsdcIn,
    };
    const daiUsdcBestTrades: Trade[] = await getBestTradeExactIn([dai_usdc], daiUsdcAmountIn, usdc, null, client, ensUri);
    const daiUsdcTrade: Trade = daiUsdcBestTrades[0];
    const daiUsdcTxResponse = await execTrade(daiUsdcTrade, getTradeOptions(recipient), client, ensUri);
    const daiUsdcTx = await ethersProvider.getTransaction(daiUsdcTxResponse.hash);
    await daiUsdcTx.wait();
    // CHECK dai -> usdc
    const daiBalanceAfterDaiUsdc = await daiContract.balanceOf(recipient);
    const expectedDaiBalanceAfterDaiUsdc = ethers.BigNumber.from(etherDaiOut).sub(daiUsdcIn);
    expect(daiBalanceAfterDaiUsdc.toString()).toBe(expectedDaiBalanceAfterDaiUsdc.toString());
    const usdcBalance = await usdcContract.balanceOf(recipient);
    expect(usdcBalance.gt("0")).toBeTruthy();

    // EXEC usdc -> eth
    const usdcEthAmountIn: TokenAmount = {
      token: usdc,
      amount: usdcEthIn,
    };
    const usdcEthBestTrades: Trade[] = await getBestTradeExactIn([usdc_weth], usdcEthAmountIn, weth, null, client, ensUri);
    const usdcEthTrade: Trade = usdcEthBestTrades[0];
    usdcEthTrade.route.path[1].currency = ethCurrency;
    usdcEthTrade.route.pairs[0].tokenAmount1.token.currency = ethCurrency;
    usdcEthTrade.route.output.currency = ethCurrency;
    usdcEthTrade.outputAmount.token.currency = ethCurrency;
    const usdcEthTxResponse = await execTrade(usdcEthTrade, getTradeOptions(recipient), client, ensUri);
    const usdcEthTx = await ethersProvider.getTransaction(usdcEthTxResponse.hash);
    await usdcEthTx.wait();
    // CHECK usdc -> eth
    const usdcBalanceAfterUsdcEth: ethers.BigNumber = await usdcContract.balanceOf(recipient);
    expect(usdcBalanceAfterUsdcEth.lt(usdcBalance)).toBeTruthy();

    // SWAP dai -> usdc
    const daiUsdcSwapTxResponse = await execSwap(dai, usdc, daiUsdcSwapOut, "EXACT_OUTPUT", getTradeOptions(recipient), client, ensUri);
    const daiUsdcSwapTx = await ethersProvider.getTransaction(daiUsdcSwapTxResponse.hash);
    await daiUsdcSwapTx.wait();
    // CHECK dai -> usdc swap
    const usdcBalanceAfterDaiUsdcSwap: ethers.BigNumber = await usdcContract.balanceOf(recipient);
    const expectedUsdcBalanceAfterDaiUsdcSwap = usdcBalanceAfterUsdcEth.add(daiUsdcSwapOut);
    expect(usdcBalanceAfterDaiUsdcSwap.toString()).toBe(expectedUsdcBalanceAfterDaiUsdcSwap.toString());
    expect((await daiContract.balanceOf(recipient)).lt(daiBalanceAfterDaiUsdc)).toBeTruthy();

    // SWAP usdc -> dai
    const usdcDaiSwapTxResponse = await execSwap(usdc,dai, usdcDaiSwapIn, "EXACT_INPUT", getTradeOptions(recipient), client, ensUri);
    const usdcDaiSwapTx = await ethersProvider.getTransaction(usdcDaiSwapTxResponse.hash);
    await usdcDaiSwapTx.wait();
    // CHECK usdc -> dai swap
    expect((await usdcContract.balanceOf(recipient)).toString()).toEqual(usdcBalanceAfterUsdcEth.toString());
  });
});

