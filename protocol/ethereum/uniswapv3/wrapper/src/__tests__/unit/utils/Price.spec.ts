import { ChainId, Token } from "../../../query/w3";
import Price from "../../../utils/Price";
import { BigInt } from "@web3api/wasm-as";
import { _getWETH } from "../../../utils/tokenUtils";

const USDC: Token = {
  chainId: ChainId.MAINNET,
  address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  currency: {
    decimals: 6,
    symbol: "USDC",
    name: "USD Coin",
  },
};
const DAI: Token = {
  chainId: ChainId.MAINNET,
  address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  currency: {
    decimals: 18,
    symbol: "DAI",
    name: "DAI Stablecoin",
  },
};

describe('Price', () => {

  it('inverts', () => {
    const price: Price = new Price(USDC, DAI, BigInt.fromUInt16(100), BigInt.fromUInt16(50));
    const invertedPrice: Price = price.invert();
    expect(invertedPrice.baseToken).toStrictEqual(price.quoteToken);
    expect(invertedPrice.quoteToken).toStrictEqual(price.baseToken);
    expect(invertedPrice.numerator).toStrictEqual(price.denominator);
    expect(invertedPrice.denominator).toStrictEqual(price.numerator);
  });

  it('throws when trying to quote token not involved in price', () => {
    const throws = (): void => {
      const price: Price = new Price(USDC, DAI, BigInt.fromUInt16(100), BigInt.fromUInt16(50));
      price.quote({
        token: _getWETH(ChainId.MAINNET),
        amount: BigInt.fromUInt16(100),
      });
    }
    expect(throws).toThrow("Token of tokenAmount must be the same as baseToken");
  });
});