import {
  FACTORY_ADDRESS as UNI_FACTORY_ADDRESS,
  POOL_INIT_CODE_HASH as UNI_POOL_INIT_CODE_HASH,
  POOL_INIT_CODE_HASH_OPTIMISM as UNI_POOL_INIT_CODE_HASH_OPTIMISM,
  POOL_INIT_CODE_HASH_OPTIMISM_KOVAN as UNI_POOL_INIT_CODE_HASH_OPTIMISM_KOVAN,
  MIN_TICK as UNI_MIN_TICK,
  MAX_TICK as UNI_MAX_TICK,
  MIN_SQRT_RATIO as UNI_MIN_SQRT_RATIO,
  MAX_SQRT_RATIO as UNI_MAX_SQRT_RATIO,
} from "../utils/constants";

import { BigInt } from "@web3api/wasm-as";

export const FACTORY_ADDRESS = (): string => UNI_FACTORY_ADDRESS;

export const POOL_INIT_CODE_HASH = (): string => UNI_POOL_INIT_CODE_HASH;

export const POOL_INIT_CODE_HASH_OPTIMISM = (): string =>
  UNI_POOL_INIT_CODE_HASH_OPTIMISM;

export const POOL_INIT_CODE_HASH_OPTIMISM_KOVAN = (): string =>
  UNI_POOL_INIT_CODE_HASH_OPTIMISM_KOVAN;

export const MIN_TICK = (): i32 => UNI_MIN_TICK;

export const MAX_TICK = (): i32 => UNI_MAX_TICK;

export const MIN_SQRT_RATIO = (): BigInt => UNI_MIN_SQRT_RATIO;

export const MAX_SQRT_RATIO = (): BigInt => UNI_MAX_SQRT_RATIO;
