// translated to AS from https://github.com/Uniswap/uniswap-sdk-core/blob/main/src/entities/fractions/fraction.ts

import { Rounding } from "./enumUtils";
import { Token, TokenAmount, Price as PriceType } from "../wrap";
import { Fraction } from "./Fraction";
import { tokenEquals } from "../token";

import { BigInt } from "@polywrap/wasm-as";

export class Price extends Fraction {
  public readonly baseToken: Token; // input i.e. denominator
  public readonly quoteToken: Token; // output i.e. numerator
  public readonly scalar: Fraction; // used to adjust the raw fraction w/r/t the decimals of the {base,quote}Token

  // denominator and numerator _must_ be raw, i.e. in the native representation
  public constructor(
    baseToken: Token,
    quoteToken: Token,
    denominator: BigInt,
    numerator: BigInt
  ) {
    super(numerator, denominator);

    this.baseToken = baseToken;
    this.quoteToken = quoteToken;
    this.scalar = new Fraction(
      BigInt.pow(BigInt.fromUInt16(10), baseToken.currency.decimals),
      BigInt.pow(BigInt.fromUInt16(10), quoteToken.currency.decimals)
    );
  }

  public static from<T>(price: T): Price {
    if (price instanceof Price) return price;
    if (price instanceof PriceType) return Price.fromPriceType(price);
    throw new TypeError("Unsupported generic type " + nameof<T>(price));
  }

  public static fromPriceType(price: PriceType): Price {
    return new Price(
      price.baseToken,
      price.quoteToken,
      price.denominator,
      price.numerator
    );
  }

  // doesn't work: although this produces an equivalent value, the correct numerator and denominator cannot be recovered
  // public static fromString(
  //   baseToken: Token,
  //   quoteToken: Token,
  //   price: string
  // ): Price {
  //   const priceFraction: Fraction = Fraction.fromString(price).div(
  //     new Fraction(
  //       BigInt.pow(BigInt.fromUInt16(10), baseToken.currency.decimals),
  //       BigInt.pow(BigInt.fromUInt16(10), quoteToken.currency.decimals)
  //     )
  //   );
  //   return new Price(
  //     baseToken,
  //     quoteToken,
  //     priceFraction.denominator,
  //     priceFraction.numerator
  //   );
  // }

  public raw(): Fraction {
    return new Fraction(this.numerator, this.denominator);
  }

  public adjusted(): Fraction {
    return super.mul(this.scalar);
  }

  public invert(): Price {
    return new Price(
      this.quoteToken,
      this.baseToken,
      this.numerator,
      this.denominator
    );
  }

  public mul(other: Price): Price {
    if (!tokenEquals({ tokenA: this.quoteToken, tokenB: other.baseToken }))
      throw new Error(
        "Price multiply error: quoteToken of 'left' must be the same as baseToken of 'right'"
      );
    const fraction = super.mul(other);
    return new Price(
      this.baseToken,
      other.quoteToken,
      fraction.denominator,
      fraction.numerator
    );
  }

  // quote function does not work the same as in JS sdk
  public quote(tokenAmount: TokenAmount): Fraction {
    if (!tokenEquals({ tokenA: tokenAmount.token, tokenB: this.baseToken })) {
      throw new Error("Token of tokenAmount must be the same as baseToken");
    }
    const biAmount = tokenAmount.amount;
    return super.mul(new Fraction(biAmount));
  }

  public toSignificant(
    significantDigits: i32 = 6,
    rounding: Rounding = Rounding.ROUND_HALF_UP
  ): string {
    return this.adjusted().toSignificant(significantDigits, rounding);
  }

  public toFixed(
    decimalPlaces: i32 = 4,
    rounding: Rounding = Rounding.ROUND_HALF_UP
  ): string {
    return this.adjusted().toFixed(decimalPlaces, rounding);
  }

  public toPriceType(
    placesOrDigits: i32 = 18,
    rounding: Rounding = Rounding.ROUND_HALF_UP,
    toSignificant: boolean = false
  ): PriceType {
    return {
      baseToken: this.baseToken,
      quoteToken: this.quoteToken,
      denominator: this.denominator,
      numerator: this.numerator,
      price: toSignificant
        ? this.toSignificant(placesOrDigits, rounding)
        : this.toFixed(placesOrDigits, rounding),
    };
  }
}
