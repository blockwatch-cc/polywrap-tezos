import { JSON } from "assemblyscript-json"; 

export function getString(object: JSON.Obj, key: string): string {
    let initValue = <JSON.Str>object.getString(key)
    let value = ""
    if (initValue != null) {
      value = initValue.valueOf()
    }
    return value
}