import {
  Input_getNative,
  Input_getWETH,
  Input_isNative,
  Input_wrapToken,
  Input_wrapAmount,
  Token,
  TokenAmount,
} from "./w3";
import {
  _getNative,
  _getWETH,
  _isNative,
  _wrapAmount,
  _wrapToken,
} from "../utils/tokenUtils";

export function getNative(input: Input_getNative): Token {
  return _getNative(input.chainId);
}

export function getWETH(input: Input_getWETH): Token {
  return _getWETH(input.chainId);
}

export function isNative(input: Input_isNative): boolean {
  return _isNative(input.token);
}

export function wrapToken(input: Input_wrapToken): Token {
  return _wrapToken(input.token);
}

export function wrapAmount(input: Input_wrapAmount): TokenAmount {
  return _wrapAmount(input.amount);
}
