import {
  Interface,
  Interface_Module,
  Interface_LogLevel,
  Args_log,
  Args_debug,
  Args_info,
  Args_warn,
  Args_error
} from "./wrap";


export function log(input: Args_log): bool {
  const uris = Interface.getImplementations()
  for (let i = 0; i < uris.length; i++) {
    new Interface_Module(uris[i]).log({
      message: input.message,
      level: input.level
    }).unwrap()
  }
  return true
}

export function debug(input: Args_debug): bool {
  return log({
    message: input.message,
    level: Interface_LogLevel.DEBUG
  });
}

export function info(input: Args_info): bool {
  return log({
    message: input.message,
    level: Interface_LogLevel.INFO
  });
}

export function warn(input: Args_warn): bool {
  return log({
    message: input.message,
    level: Interface_LogLevel.WARN
  });
}

export function error(input: Args_error): bool {
  return log({
    message: input.message,
    level: Interface_LogLevel.ERROR
  });
}
