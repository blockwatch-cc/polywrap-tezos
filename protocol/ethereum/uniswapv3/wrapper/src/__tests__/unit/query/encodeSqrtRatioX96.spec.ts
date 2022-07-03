import { encodeSqrtRatioX96 } from "../../../query";
import { Input_encodeSqrtRatioX96 } from "../../../query/w3";
import { BigInt } from "@web3api/wasm-as";
import { Q96 } from "../../../utils/constants";

describe('encodeSqrtRatioX96', () => {
  it('1/1', () => {
    const input: Input_encodeSqrtRatioX96 = { amount1: BigInt.ONE, amount0: BigInt.ONE };
    expect(encodeSqrtRatioX96(input)).toStrictEqual(Q96);
  });

  it('100/1', () => {
    const input: Input_encodeSqrtRatioX96 = { amount1: BigInt.fromUInt16(100), amount0: BigInt.ONE };
    expect(encodeSqrtRatioX96(input)).toStrictEqual(BigInt.fromString('792281625142643375935439503360'));
  });

  it('1/100', () => {
    const input: Input_encodeSqrtRatioX96 = { amount1: BigInt.ONE, amount0: BigInt.fromUInt16(100) };
    expect(encodeSqrtRatioX96(input)).toStrictEqual(BigInt.fromString('7922816251426433759354395033'));
  });

  it('111/333', () => {
    const input: Input_encodeSqrtRatioX96 = { amount1: BigInt.fromUInt16(111), amount0: BigInt.fromUInt16(333) };
    expect(encodeSqrtRatioX96(input)).toStrictEqual(BigInt.fromString('45742400955009932534161870629'));
  });

  it('333/111', () => {
    const input: Input_encodeSqrtRatioX96 = { amount1: BigInt.fromUInt16(333), amount0: BigInt.fromUInt16(111) };
    expect(encodeSqrtRatioX96(input)).toStrictEqual(BigInt.fromString('137227202865029797602485611888'));
  });
});