import { getFeeAmountEnum } from "../../../utils/enumUtils";
import { FeeAmount, PermitV } from "../../../query/w3";
import { feeAmountToTickSpacing, getFeeAmount, getPermitV } from "../../../query";

describe('Enum utils', () => {

  it('getFeeAmount', () => {
    expect(getFeeAmount({ feeAmount: FeeAmount.LOWEST })).toStrictEqual(100);
    expect(getFeeAmount({ feeAmount: FeeAmount.LOW })).toStrictEqual(500);
    expect(getFeeAmount({ feeAmount: FeeAmount.MEDIUM })).toStrictEqual(3000);
    expect(getFeeAmount({ feeAmount: FeeAmount.HIGH })).toStrictEqual(10000);

    const error = (): void => { getFeeAmount({ feeAmount: 7 }) };
    expect(error).toThrow();
  });

  it('getFeeAmountEnum', () => {
    expect(getFeeAmountEnum(100)).toStrictEqual(FeeAmount.LOWEST);
    expect(getFeeAmountEnum(500)).toStrictEqual(FeeAmount.LOW);
    expect(getFeeAmountEnum(3000)).toStrictEqual(FeeAmount.MEDIUM);
    expect(getFeeAmountEnum(10000)).toStrictEqual(FeeAmount.HIGH);
    const error = (): void => { getFeeAmountEnum(7) };
    expect(error).toThrow();
  });

  it('getTickSpacings', () => {
    expect(feeAmountToTickSpacing({ feeAmount: FeeAmount.LOWEST})).toStrictEqual(1);
    expect(feeAmountToTickSpacing({ feeAmount: FeeAmount.LOW})).toStrictEqual(10);
    expect(feeAmountToTickSpacing({ feeAmount: FeeAmount.MEDIUM})).toStrictEqual(60);
    expect(feeAmountToTickSpacing({ feeAmount: FeeAmount.HIGH})).toStrictEqual(200);

    const error = (): void => { feeAmountToTickSpacing({ feeAmount: 7 }) };
    expect(error).toThrow();
  });

  it('getPermitV', () => {
    expect(getPermitV({ permitV: PermitV.v_0 })).toStrictEqual(0);
    expect(getPermitV({ permitV: PermitV.v_1 })).toStrictEqual(1);
    expect(getPermitV({ permitV: PermitV.v_27 })).toStrictEqual(27);
    expect(getPermitV({ permitV: PermitV.v_28 })).toStrictEqual(28);

    const error = (): void => { getPermitV({ permitV: 7 }) };
    expect(error).toThrow();
  });
});