import { SHA3_Module } from "./wrap/imported/SHA3_Module";
import { UTS46_Module } from "./wrap/imported/UTS46_Module";

export function namehash(inputName: string): string {
  let node = "";
  for (let i: number = 0; i < 32; i++) {
    node += "00";
  }

  const name: string = normalize(inputName)

  if (name) {
    const labels: string[] = name.split('.');

    for(let i = labels.length - 1; i >= 0; i--) {
      let labelSha = SHA3_Module.keccak_256({ message: labels[i] }).unwrap()
      node = SHA3_Module.hex_keccak_256({ message: node + labelSha }).unwrap()
    }
  }

  return "0x" + node;
}

export function normalize(name: string): string {
  return name ? UTS46_Module.toAscii({ 
    value: name
  }).unwrap() : name
}

export function keccak256 (value: string): string {
  return "0x" + SHA3_Module.keccak_256({ message: value }).unwrap()
}
