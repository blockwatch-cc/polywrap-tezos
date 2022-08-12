import {
  Currency,
  Input_currencyEquals,
  Input_tokenAmountEquals,
  Input_tokenEquals,
  Input_tokenSortsBefore,
  Token,
  TokenAmount,
} from "./w3";

// Checks if the current instance is equal to another (has an identical chainId and address).
export function currencyEquals(input: Input_currencyEquals): boolean {
  const currencyA: Currency = input.currencyA;
  const currencyB: Currency = input.currencyB;
  return (
    currencyA.name == currencyB.name &&
    currencyA.symbol == currencyB.symbol &&
    currencyA.decimals == currencyB.decimals
  );
}

// Checks if the current instance is equal to another (has an identical chainId and address).
export function tokenEquals(input: Input_tokenEquals): boolean {
  const tokenA: Token = input.tokenA;
  const tokenB: Token = input.tokenB;
  return tokenA.chainId == tokenB.chainId && tokenA.address == tokenB.address;
}

// compares two TokenAmount types for equality, returning true if they have the
// same token and same amount
export function tokenAmountEquals(input: Input_tokenAmountEquals): boolean {
  const amtA: TokenAmount = input.tokenAmountA;
  const amtB: TokenAmount = input.tokenAmountB;
  return (
    tokenEquals({ tokenA: amtA.token, tokenB: amtB.token }) &&
    amtA.amount == amtB.amount
  );
}

// Checks if the current instance sorts before another, by address.
export function tokenSortsBefore(input: Input_tokenSortsBefore): boolean {
  const tokenA: Token = input.tokenA;
  const tokenB: Token = input.tokenB;
  const tokenAddress: string = tokenA.address.toLowerCase();
  const otherAddress: string = tokenB.address.toLowerCase();
  return tokenAddress.localeCompare(otherAddress) < 0;
}
