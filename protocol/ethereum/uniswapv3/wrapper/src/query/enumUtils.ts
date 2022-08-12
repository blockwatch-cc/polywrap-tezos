import {
  Input_feeAmountToTickSpacing,
  Input_getFeeAmount,
  Input_getPermitV,
} from "./w3";
import {
  _feeAmountToTickSpacing,
  _getFeeAmount,
  _getPermitV,
} from "../utils/enumUtils";

export function feeAmountToTickSpacing(
  input: Input_feeAmountToTickSpacing
): i32 {
  return _feeAmountToTickSpacing(input.feeAmount);
}

export function getFeeAmount(input: Input_getFeeAmount): u32 {
  return _getFeeAmount(input.feeAmount);
}

export function getPermitV(input: Input_getPermitV): i32 {
  return _getPermitV(input.permitV);
}
