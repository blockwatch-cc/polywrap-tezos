import { FeeAmount, PermitV } from "../query/w3";

export enum Rounding {
  ROUND_DOWN,
  ROUND_HALF_UP,
  ROUND_UP,
  _MAX_,
}

export function _feeAmountToTickSpacing(feeAmount: FeeAmount): i32 {
  switch (feeAmount) {
    case FeeAmount.LOWEST:
      return 1;
    case FeeAmount.LOW:
      return 10;
    case FeeAmount.MEDIUM:
      return 60;
    case FeeAmount.HIGH:
      return 200;
    default:
      throw new Error("Unknown FeeAmount");
  }
}

export function _getFeeAmount(feeAmount: FeeAmount): u32 {
  switch (feeAmount) {
    case FeeAmount.LOWEST:
      return 100;
    case FeeAmount.LOW:
      return 500;
    case FeeAmount.MEDIUM:
      return 3000;
    case FeeAmount.HIGH:
      return 10000;
    default:
      throw new Error("Unknown FeeAmount");
  }
}

export function getFeeAmountEnum(feeAmount: u32): FeeAmount {
  switch (feeAmount) {
    case 100:
      return FeeAmount.LOWEST;
    case 500:
      return FeeAmount.LOW;
    case 3000:
      return FeeAmount.MEDIUM;
    case 10000:
      return FeeAmount.HIGH;
    default:
      throw new Error("Unknown FeeAmount");
  }
}

export function _getPermitV(permitV: PermitV): i32 {
  switch (permitV) {
    case PermitV.v_0:
      return 0;
    case PermitV.v_1:
      return 1;
    case PermitV.v_27:
      return 27;
    case PermitV.v_28:
      return 28;
    default:
      throw new Error("Unknown value of 'v' in PermitOptions");
  }
}
