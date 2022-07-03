import { MichelsonMap } from "@taquito/taquito";

export function parseValue(value: string): any {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`unable to parse '${value}'`)
  }
}

export function parseArgs(args?: string | null): unknown[] {
  if (!args) {
    return [];
  }
  const parsedArgs: unknown[] = JSON.parse(args);
  if (!Array.isArray(parsedArgs)) {
    throw new Error(`args must be a stringified array`)
  }
  for (let argKey in parsedArgs) {
    // TODO(abdul): deep parse all values for michelson maps
    // POC
    if (
      typeof parsedArgs[argKey] === "object" && 
      !Array.isArray(parsedArgs[argKey]) && 
      parsedArgs[argKey].isMichelsonMap === true && 
      parsedArgs[argKey].values
    ) {
      const map = new MichelsonMap();
      for (let mapValue of parsedArgs[argKey].values) {
        if (!(mapValue.key && mapValue.value)) {
          throw new Error(`michelson map should have a key and a value`)
        }
        map.set(mapValue.key, mapValue.value);
      }
      parsedArgs[argKey] = map
    }
  }
  return parsedArgs;
}

export function stringify(output: any): string {
  if (!output) {
    return ""
  }
  switch (typeof output) {
    case "number":
    case "string":
    case "boolean":
      output = output.toString();
      break;
    case "object":
      if (typeof output.valueOf() === 'string') {
        output = output.valueOf();
        break;
      }
      if (MichelsonMap.isMichelsonMap(output)) {
        const keys = output.keys()
        const michelsonObject: Record<string, string> = {}
        for (let key of keys) {
          michelsonObject[key] = output.get(key)
        }
        output = JSON.stringify(michelsonObject);
        break;
      }
      const keys = Object.keys(output)
      if (keys.length > 0) {
        let out: Record<string, any> = {};
        for (const key of keys) {
          out[key] = stringify(output[key]);
        }
        output = JSON.stringify(out);
      }
      break;  
  }
  return output;
}
