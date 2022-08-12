import {
  Currency,
  Args_currencyEquals,
  Args_tokenAmountEquals,
  Args_tokenEquals,
  Args_tokenSortsBefore,
  Token,
  TokenAmount,
} from "../wrap";

export * from "./utils";

// Checks if the current instance is equal to another (has an identical chainId and address).
export function currencyEquals(args: Args_currencyEquals): boolean {
  const currencyA: Currency = args.currencyA;
  const currencyB: Currency = args.currencyB;
  return (
    currencyA.name == currencyB.name &&
    currencyA.symbol == currencyB.symbol &&
    currencyA.decimals == currencyB.decimals
  );
}

// Checks if the current instance is equal to another (has an identical chainId and address).
export function tokenEquals(args: Args_tokenEquals): boolean {
  const tokenA: Token = args.tokenA;
  const tokenB: Token = args.tokenB;
  return tokenA.chainId == tokenB.chainId && tokenA.address == tokenB.address;
}

// compares two TokenAmount types for equality, returning true if they have the
// same token and same amount
export function tokenAmountEquals(args: Args_tokenAmountEquals): boolean {
  const amtA: TokenAmount = args.tokenAmountA;
  const amtB: TokenAmount = args.tokenAmountB;
  return (
    tokenEquals({ tokenA: amtA.token, tokenB: amtB.token }) &&
    amtA.amount == amtB.amount
  );
}

// Checks if the current instance sorts before another, by address.
export function tokenSortsBefore(args: Args_tokenSortsBefore): boolean {
  const tokenA: Token = args.tokenA;
  const tokenB: Token = args.tokenB;
  const tokenAddress: string = tokenA.address.toLowerCase();
  const otherAddress: string = tokenB.address.toLowerCase();
  return tokenAddress.localeCompare(otherAddress) < 0;
}
