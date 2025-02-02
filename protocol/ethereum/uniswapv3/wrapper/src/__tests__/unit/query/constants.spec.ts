import {
  FACTORY_ADDRESS, MAX_SQRT_RATIO, MAX_TICK, MIN_SQRT_RATIO, MIN_TICK,
  POOL_INIT_CODE_HASH,
  POOL_INIT_CODE_HASH_OPTIMISM,
  POOL_INIT_CODE_HASH_OPTIMISM_KOVAN
} from "../../../query";

describe('Queryable constants', () => {
  it('FACTORY_ADDRESS', () => {
    expect(FACTORY_ADDRESS()).toStrictEqual("0x1F98431c8aD98523631AE4a59f267346ea31F984");
  });

  it('POOL_INIT_CODE_HASH', () => {
    expect(POOL_INIT_CODE_HASH()).toStrictEqual( "0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54");
  });

  it('POOL_INIT_CODE_HASH_OPTIMISM', () => {
    expect(POOL_INIT_CODE_HASH_OPTIMISM()).toStrictEqual("0x0c231002d0970d2126e7e00ce88c3b0e5ec8e48dac71478d56245c34ea2f9447");
  });

  it('POOL_INIT_CODE_HASH_OPTIMISM_KOVAN', () => {
    expect(POOL_INIT_CODE_HASH_OPTIMISM_KOVAN()).toStrictEqual("0x1fc830513acbdb1608b8c18fd3cf4a4bee3329c69bb41d56400401c40fe02fd0");
  });

  it('MIN_TICK', () => {
    expect(MIN_TICK()).toStrictEqual(-887272);
  });

  it('MAX_TICK', () => {
    expect(MAX_TICK()).toStrictEqual(887272);
  });

  it('MIN_SQRT_RATIO', () => {
    expect(MIN_SQRT_RATIO().toString()).toStrictEqual("4295128739");
  });

  it('MAX_SQRT_RATIO', () => {
    expect(MAX_SQRT_RATIO().toString()).toStrictEqual("1461446703485210103287273052203988822378723970342");
  });
});