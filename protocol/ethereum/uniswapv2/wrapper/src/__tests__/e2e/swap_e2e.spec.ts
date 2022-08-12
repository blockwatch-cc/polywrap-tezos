import {ClientConfig, PolywrapClient} from "@polywrap/client-js";
import path from "path";
import {
  approveToken, execSwap, execTrade,
  getBestTradeExactIn,
  getBestTradeExactOut,
  getPairData,
  getTokenList
} from "../testUtils";
import { getPlugins, initInfra, stopInfra } from "../infraUtils";
import { Contract, ethers, providers } from "ethers";
import erc20ABI from "./testData/erc20ABI.json";
import * as App from "./types/wrap"

jest.setTimeout(360000);
jest.retryTimes(5)

const getTradeOptions = (recipient: string): App.TradeOptions => ({
  allowedSlippage: "0.1",
  recipient: recipient,
  unixTimestamp: parseInt((new Date().getTime() / 1000).toFixed(0)),
  ttl: 1800
});

describe("Swap", () => {

  let client: PolywrapClient;
  let recipient: string;
  let fsUri: string;
  let tokens: App.Token[];
  let ethersProvider: providers.JsonRpcProvider;
  let ethCurrency: App.Currency;
  let dai: App.Token;
  let weth: App.Token;
  let usdc: App.Token;
  let usdt: App.Token;
  let wbtc: App.Token;

  beforeAll(async () => {
    await initInfra();
    // get client
    const config: Partial<ClientConfig> = getPlugins();
    client = new PolywrapClient(config);
    // deploy api
    const wrapperAbsPath: string = path.resolve(__dirname + "/../../..");
    fsUri = "fs/" + wrapperAbsPath + '/build';
    ethersProvider = ethers.providers.getDefaultProvider("http://localhost:8546") as providers.JsonRpcProvider;
    recipient = await ethersProvider.getSigner().getAddress();

    // set up test case data
    tokens = await getTokenList();
    dai = tokens.filter(token => token.currency.symbol === "DAI")[0];
    usdc = tokens.filter(token => token.currency.symbol === "USDC")[0];
    usdt = tokens.filter(token => token.currency.symbol === "USDT")[0];
    wbtc = tokens.filter(token => token.currency.symbol === "WBTC")[0];
    for (const token of [dai, usdc, usdt, wbtc]) {
      const txResponse: App.Ethereum_TxResponse = await approveToken(token, client, fsUri);
      const approveTx = await ethersProvider.getTransaction(txResponse.hash);
      await approveTx.wait();
    }

    weth = tokens.filter(token => token.currency.symbol === "WETH")[0];
    ethCurrency = {
      decimals: 18,
      name: "Ether",
      symbol: "ETH",
    };
  });

  afterAll(async () => {
    await stopInfra();
  });

  it("Should successfully EXEC ether -> dai -> usdc -> ether", async () => {
    const weth_dai: App.Pair = await getPairData(weth, dai, client, fsUri) as App.Pair;
    const dai_usdc: App.Pair = await getPairData(dai, usdc, client, fsUri) as App.Pair;
    const usdc_weth: App.Pair = await getPairData(usdc, weth, client, fsUri) as App.Pair;

    const daiContract = new Contract(dai.address, erc20ABI, ethersProvider);
    const usdcContract = new Contract(usdc.address, erc20ABI, ethersProvider);

    const etherDaiOut = "1000000000000000000000"; // $1,000
    const daiUsdcIn = "100000000000000000000"; // $100
    const usdcEthIn = "10000000"; // $10;
    
    // EXEC eth -> dai
    const etherDaiAmountOut: App.TokenAmount = {
        token: dai,
        amount: etherDaiOut,
      };
    const etherDaiBestTrades: App.Trade[] = await getBestTradeExactOut([weth_dai], weth, etherDaiAmountOut, null, client, fsUri);
    const etherDaiTrade: App.Trade = etherDaiBestTrades[0];
    etherDaiTrade.route.path[0].currency = ethCurrency;
    etherDaiTrade.route.pairs[0].tokenAmount1.token.currency = ethCurrency;
    etherDaiTrade.route.input.currency = ethCurrency;
    etherDaiTrade.inputAmount.token.currency = ethCurrency;
    const etherDaiTxResponse = await execTrade(etherDaiTrade, getTradeOptions(recipient), client, fsUri);
    const etherDaiTx = await ethersProvider.getTransaction(etherDaiTxResponse.hash);
    await etherDaiTx.wait();
    // CHECK eth -> dai
    expect((await daiContract.balanceOf(recipient)).gte(etherDaiOut)).toBeTruthy();

    // EXEC dai -> usdc
    const daiUsdcAmountIn: App.TokenAmount = {
      token: dai,
      amount: daiUsdcIn,
    };
    const daiUsdcBestTrades: App.Trade[] = await getBestTradeExactIn([dai_usdc], daiUsdcAmountIn, usdc, null, client, fsUri);
    const daiUsdcTrade: App.Trade = daiUsdcBestTrades[0];
    const daiUsdcTxResponse = await execTrade(daiUsdcTrade, getTradeOptions(recipient), client, fsUri);
    const daiUsdcTx = await ethersProvider.getTransaction(daiUsdcTxResponse.hash);
    await daiUsdcTx.wait();
    // CHECK dai -> usdc
    const daiBalanceAfterDaiUsdc = await daiContract.balanceOf(recipient);
    const expectedDaiBalanceAfterDaiUsdc = ethers.BigNumber.from(etherDaiOut).sub(daiUsdcIn);
    expect(daiBalanceAfterDaiUsdc.toString()).toBe(expectedDaiBalanceAfterDaiUsdc.toString());
    const usdcBalance = await usdcContract.balanceOf(recipient);
    expect(usdcBalance.gt("0")).toBeTruthy();

    // EXEC usdc -> eth
    const usdcEthAmountIn: App.TokenAmount = {
      token: usdc,
      amount: usdcEthIn,
    };
    const usdcEthBestTrades: App.Trade[] = await getBestTradeExactIn([usdc_weth], usdcEthAmountIn, weth, null, client, fsUri);
    const usdcEthTrade: App.Trade = usdcEthBestTrades[0];
    usdcEthTrade.route.path[1].currency = ethCurrency;
    usdcEthTrade.route.pairs[0].tokenAmount1.token.currency = ethCurrency;
    usdcEthTrade.route.output.currency = ethCurrency;
    usdcEthTrade.outputAmount.token.currency = ethCurrency;
    const usdcEthTxResponse = await execTrade(usdcEthTrade, getTradeOptions(recipient), client, fsUri);
    const usdcEthTx = await ethersProvider.getTransaction(usdcEthTxResponse.hash);
    await usdcEthTx.wait();
    // CHECK usdc -> eth
    const usdcBalanceAfterUsdcEth: ethers.BigNumber = await usdcContract.balanceOf(recipient);
    expect(usdcBalanceAfterUsdcEth.lt(usdcBalance)).toBeTruthy();
  });

  it("Should successfully SWAP ether -> usdt -> wbtc -> ether", async () => {
    const usdtContract = new Contract(usdt.address, erc20ABI, ethersProvider);
    const wbtcContract = new Contract(wbtc.address, erc20ABI, ethersProvider);

    const ethToken: App.Token = {
      chainId: App.ChainIdEnum.MAINNET,
      address: "",
      currency: ethCurrency,
    }

    const ethUsdtIn = "1000000000000000000"; // 1 Eth
    const usdtWbtcIn = "500000000"; // $500
    const wbtcEthOut = "100000000000000000"; // 0.1 Eth;

    // EXEC eth -> Usdt
    const ethUsdtStart = await ethersProvider.getBalance(recipient);
    const ethUsdtTxResponse = await execSwap(ethToken, usdt, ethUsdtIn, App.TradeTypeEnum.EXACT_INPUT, getTradeOptions(recipient), client, fsUri);
    const ethUsdtTx = await ethersProvider.getTransaction(ethUsdtTxResponse.hash);
    await ethUsdtTx.wait();
    const ethUsdtEnd = await ethersProvider.getBalance(recipient);
    // CHECK eth -> usdt
    // bounding tests to account for unknown gas cost
    const ethUsdtUpper = ethUsdtStart.sub(ethUsdtIn);
    const ethUsdtLower = ethUsdtStart.sub(ethUsdtIn).sub("10000000000000000");
    expect(ethUsdtEnd.lte(ethUsdtUpper)).toBeTruthy();
    expect(ethUsdtEnd.gte(ethUsdtLower)).toBeTruthy();

    // EXEC Usdt -> wbtc
    const usdtWbtcStart: ethers.BigNumber = await usdtContract.balanceOf(recipient);
    const usdtWbtcTxResponse = await execSwap(usdt, wbtc, usdtWbtcIn, App.TradeTypeEnum.EXACT_INPUT, getTradeOptions(recipient), client, fsUri);
    const usdtWbtcTx = await ethersProvider.getTransaction(usdtWbtcTxResponse.hash);
    await usdtWbtcTx.wait();
    // CHECK usdt -> wbtc
    const usdtWbtcEnd: ethers.BigNumber = await usdtContract.balanceOf(recipient);
    const expectedUsdtAfterUsdtWbtc = usdtWbtcStart.sub(usdtWbtcIn);
    expect(usdtWbtcEnd.eq(expectedUsdtAfterUsdtWbtc)).toBeTruthy();
    const wbtcBalance = await wbtcContract.balanceOf(recipient);
    expect(wbtcBalance.gte(0)).toBeTruthy();

    // EXEC wbtc -> eth
    const wbtcEthStart = await ethersProvider.getBalance(recipient);
    const wbtcEthTxResponse =  await execSwap(wbtc, ethToken, wbtcEthOut, App.TradeTypeEnum.EXACT_OUTPUT, getTradeOptions(recipient), client, fsUri);
    const wbtcEthTx = await ethersProvider.getTransaction(wbtcEthTxResponse.hash);
    await wbtcEthTx.wait();
    const wbtcEthEnd = await ethersProvider.getBalance(recipient);
    // CHECK wbtc -> eth
    // bounding tests to account for unknown gas cost
    const wbtcEthUpper = wbtcEthStart.add(wbtcEthOut);
    const wbtcEthLower = wbtcEthStart.add(wbtcEthOut).sub("10000000000000000");
    expect(wbtcEthEnd.lte(wbtcEthUpper)).toBeTruthy();
    expect(wbtcEthEnd.gte(wbtcEthLower)).toBeTruthy();
    // expect to have less wbtc
    const wbtcBalanceAfterWbtcEth: ethers.BigNumber = await wbtcContract.balanceOf(recipient);
    expect(wbtcBalanceAfterWbtcEth.lt(wbtcBalance)).toBeTruthy();
  });
});

