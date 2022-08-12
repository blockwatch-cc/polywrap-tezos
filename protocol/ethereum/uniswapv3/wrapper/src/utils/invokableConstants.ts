import {
  _FACTORY_ADDRESS,
  _POOL_INIT_CODE_HASH,
  _MIN_TICK,
  _MAX_TICK,
  _MIN_SQRT_RATIO,
  _MAX_SQRT_RATIO,
} from "./constants";
import {
  Args_FACTORY_ADDRESS,
  Args_MAX_SQRT_RATIO,
  Args_MAX_TICK,
  Args_MIN_SQRT_RATIO,
  Args_MIN_TICK,
  Args_POOL_INIT_CODE_HASH,
} from "../wrap";

import { BigInt } from "@polywrap/wasm-as";

export const FACTORY_ADDRESS = (_: Args_FACTORY_ADDRESS): string =>
  _FACTORY_ADDRESS;

export const POOL_INIT_CODE_HASH = (_: Args_POOL_INIT_CODE_HASH): string =>
  _POOL_INIT_CODE_HASH;

export const MIN_TICK = (_: Args_MIN_TICK): i32 => _MIN_TICK;

export const MAX_TICK = (_: Args_MAX_TICK): i32 => _MAX_TICK;

export const MIN_SQRT_RATIO = (_: Args_MIN_SQRT_RATIO): BigInt =>
  _MIN_SQRT_RATIO;

export const MAX_SQRT_RATIO = (_: Args_MAX_SQRT_RATIO): BigInt =>
  _MAX_SQRT_RATIO;
