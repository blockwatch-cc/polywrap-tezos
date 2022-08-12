import { ChainId, Currency, Token, TokenAmount } from "../../../wrap";
import { getNative, getWETH, isNative, wrapAmount, wrapToken } from "../../..";
import { BigInt } from "@polywrap/wasm-as";

const Eth: Currency = {
  decimals: 18,
  name: "Ether",
  symbol: "ETH",
};
const WETH: Currency = {
  decimals: 18,
  symbol: "WETH",
  name: "Wrapped Ether",
};
export const MATIC: Currency = {
  decimals: 18,
  name: "Matic",
  symbol: "MATIC",
};
const MATIC_ADDRESS = "0x0000000000000000000000000000000000001010";

const USDC: Token = {
  chainId: ChainId.MAINNET,
  address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  currency: {
    decimals: 6,
    symbol: "USDC",
    name: "USD Coin",
  },
};

describe('Token utils', () => {

  it('getNative', () => {
    for (let i = ChainId.MAINNET; i < ChainId._MAX_; i++) {
      const result: Token = i == ChainId.POLYGON || i == ChainId.POLYGON_MUMBAI ? {
          chainId: i as ChainId,
          address: MATIC_ADDRESS,
          currency: MATIC,
        } : {
        chainId: i as ChainId,
        address: "",
        currency: Eth,
      }
      expect(getNative({ chainId: i as ChainId })).toStrictEqual(result);
    }

    const error = (): void => { getNative({ chainId: 999 }) };
    expect(error).toThrow("Unknown chain ID");
  });

  it('getWETH', () => {
    expect(getWETH({ chainId: ChainId.MAINNET })).toStrictEqual({
      chainId: ChainId.MAINNET,
      address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      currency: WETH,
    });
    expect(getWETH({ chainId: ChainId.ROPSTEN })).toStrictEqual({
      chainId: ChainId.ROPSTEN,
      address: "0xc778417E063141139Fce010982780140Aa0cD5Ab",
      currency: WETH,
    });
    expect(getWETH({ chainId: ChainId.RINKEBY })).toStrictEqual({
      chainId: ChainId.RINKEBY,
      address: "0xc778417E063141139Fce010982780140Aa0cD5Ab",
      currency: WETH,
    });
    expect(getWETH({ chainId: ChainId.GOERLI })).toStrictEqual({
      chainId: ChainId.GOERLI,
      address: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
      currency: WETH,
    });
    expect(getWETH({ chainId: ChainId.KOVAN })).toStrictEqual({
      chainId: ChainId.KOVAN,
      address: "0xd0A1E359811322d97991E03f863a0C30C2cF029C",
      currency: WETH,
    });
    expect(getWETH({ chainId: ChainId.OPTIMISM })).toStrictEqual({
      chainId: ChainId.OPTIMISM,
      address: "0x4200000000000000000000000000000000000006",
      currency: WETH,
    });
    expect(getWETH({ chainId: ChainId.OPTIMISTIC_KOVAN })).toStrictEqual({
      chainId: ChainId.OPTIMISTIC_KOVAN,
      address: "0x4200000000000000000000000000000000000006",
      currency: WETH,
    });
    expect(getWETH({ chainId: ChainId.ARBITRUM_ONE })).toStrictEqual({
      chainId: ChainId.ARBITRUM_ONE,
      address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      currency: WETH,
    });
    expect(getWETH({ chainId: ChainId.ARBITRUM_RINKEBY })).toStrictEqual({
      chainId: ChainId.ARBITRUM_RINKEBY,
      address: "0xB47e6A5f8b33b3F17603C83a0535A9dcD7E32681",
      currency: WETH,
    });

    expect(getWETH({ chainId: ChainId.POLYGON })).toStrictEqual({
      chainId: ChainId.POLYGON,
      address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
      currency: WETH,
    });
    expect(getWETH({ chainId: ChainId.POLYGON_MUMBAI })).toStrictEqual({
      chainId: ChainId.POLYGON_MUMBAI,
      address: "0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa",
      currency: WETH,
    });

    const error = (): void => { getWETH({ chainId: 999 }) };
    expect(error).toThrow("Unknown chain ID");
  });

  it('isNative', () => {
    const ethToken: Token = getNative({ chainId: ChainId.MAINNET });
    expect(isNative({ token: ethToken })).toStrictEqual(true);
    expect(isNative({ token: USDC })).toStrictEqual(false);
  });

  it('wrapToken', () => {
    const ethToken: Token = getNative({ chainId: ChainId.MAINNET });
    expect(wrapToken({ token: ethToken })).toStrictEqual(getWETH({ chainId: ethToken.chainId }));
    expect(wrapToken({ token: USDC })).toStrictEqual(USDC);
  });

  it('wrapAmount', () => {
    const ethAmount: TokenAmount = {
      token: getNative({ chainId: ChainId.MAINNET }),
      amount: BigInt.fromUInt16(100),
    };
    const wethAmount: TokenAmount = {
      token: getWETH({ chainId: ethAmount.token.chainId }),
      amount: BigInt.fromUInt16(100),
    };
    expect(wrapAmount({ amount: ethAmount })).toStrictEqual(wethAmount);

    const USDCAmount: TokenAmount = {
      token: USDC,
      amount: BigInt.fromUInt16(100),
    };
    expect(wrapAmount({ amount: USDCAmount })).toStrictEqual(USDCAmount);
  });

});