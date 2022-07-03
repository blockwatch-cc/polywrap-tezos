// copied and modified from https://github.com/near/near-api-js/blob/master/test/test-utils.js
import { nearPlugin, KeyPair, KeyStores, NearPluginConfig } from "../../../plugin-js";
import { KeyTypeEnum, PublicKey } from "./tsTypes";

import { ClientConfig } from "@web3api/client-js";
import { ensPlugin } from "@web3api/ens-plugin-js";
import { ethereumPlugin } from "@web3api/ethereum-plugin-js";
import { ipfsPlugin } from "@web3api/ipfs-plugin-js";
import * as fs from "fs/promises";
import * as nearApi from "near-api-js";
import * as path from "path";

const BN = require("bn.js");

export const networkId = "testnet";
export const testAccountId = "polydev.testnet";
const PRIVATE_KEY = "ed25519:4HbxvXyS76rvNdHcad3HegGzdVcpNid3LE1vbdZNMSqygZJrL2PRQDzPWZA5hopCBFuJNmp9kihyJKPEagVPsPEc";

export const HELLO_WASM_PATH = path.resolve(__dirname + "../../../node_modules/near-hello/dist/main.wasm");
const HELLO_WASM_BALANCE = new BN("1000000000000000000000000");
export const HELLO_WASM_METHODS = {
  viewMethods: ["getValue", "getLastResult"],
  changeMethods: ["setValue", "callPromise"],
};

// Length of a random account. Set to 40 because in the protocol minimal allowed top-level account length should be at least 32.
const RANDOM_ACCOUNT_LENGTH = 40;

export async function setUpTestConfig(): Promise<NearPluginConfig> {
  const keyStore = new KeyStores.InMemoryKeyStore();
  const keyPair = KeyPair.fromString(PRIVATE_KEY);
  const config: NearPluginConfig = {
    headers: {},
    networkId: networkId,
    keyStore: keyStore,
    nodeUrl: "https://rpc.testnet.near.org",
    walletUrl: "https://wallet.testnet.near.org",
    helperUrl: "https://helper.testnet.near.org",
    masterAccount: testAccountId,
    initialBalance: "1100000000000000000000000",
  };

  if (config.masterAccount) {
    await keyStore.setKey(networkId, config.masterAccount, keyPair);
  }

  return config;
}

// Generate some unique string of length at least RANDOM_ACCOUNT_LENGTH with a given prefix using the alice nonce.
export function generateUniqueString(prefix: string): string {
  let result = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000000)}`;
  const add_symbols = Math.max(RANDOM_ACCOUNT_LENGTH - result.length, 1);
  for (let i = add_symbols; i > 0; --i) result += "0";
  return result;
}

export async function createAccount(near: nearApi.Near): Promise<nearApi.Account> {
  const newAccountName = generateUniqueString("test");
  const newPublicKey = await near.connection.signer.createKey(newAccountName, networkId);
  await near.createAccount(newAccountName, newPublicKey);
  return new nearApi.Account(near.connection, newAccountName);
}

export async function deployContract(workingAccount: nearApi.Account, contractId: string): Promise<nearApi.Contract> {
  const newPublicKey = await workingAccount.connection.signer.createKey(contractId, networkId);
  const data = (await fs.readFile(HELLO_WASM_PATH)).valueOf();
  await workingAccount.createAndDeployContract(contractId, newPublicKey, data, HELLO_WASM_BALANCE);
  return new nearApi.Contract(workingAccount, contractId, HELLO_WASM_METHODS);
}

export const publicKeyToStr = (key: PublicKey): string => {
  const encodedData = nearApi.utils.serialize.base_encode(Uint8Array.from(key.data));
  return `ed25519:${encodedData}`;
};

export const publicKeyFromStr = (encodedKey: string): PublicKey => {
  const parts = encodedKey.split(":");
  if (parts.length == 1) {
    return { keyType: KeyTypeEnum.ed25519, data: Buffer.from(parts[0]) };
  } else if (parts.length == 2) {
    return { keyType: 0, data: Buffer.from(parts[1]) };
  } else {
    throw new Error("Invalid encoded key format, must be <curve>:<encoded key>");
  }
};

export const getPlugins = (
  ethereum: string,
  ensAddress: string,
  ipfs: string,
  nearConfig: NearPluginConfig
): Partial<ClientConfig> => {
  return {
    plugins: [
      {
        uri: "w3://ens/nearPlugin.web3api.eth",
        plugin: nearPlugin(nearConfig),
      },
      {
        uri: "w3://ens/ipfs.web3api.eth",
        plugin: ipfsPlugin({ provider: ipfs }),
      },
      {
        uri: "w3://ens/ens.web3api.eth",
        plugin: ensPlugin({ addresses: { testnet: ensAddress } }),
      },
      {
        uri: "w3://ens/ethereum.web3api.eth",
        plugin: ethereumPlugin({
          networks: {
            testnet: {
              provider: ethereum,
            },
          },
          defaultNetwork: "testnet",
        }),
      },
    ],
  };
};

export const sleep = (time: number) => {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
};

export const valuesToFormat = [
  "8999999999837087887",
  "8099099999837087887",
  "999998999999999837087887000",
  "9999989999999998370878870000000",
  "1" + "0".repeat(13),
  "000000000000000000000000",
  "1000000000000000000000000",
  "999999999999999999000000",
  "1003000000000000000000000",
  "3000000000000000000000",
  "03500000000000000000000",
  "10000000999999997410000000",
  "10100000999999997410000000",
  "10040000999999997410000000",
  "10999000999999997410000000",
  "1000000100000000000000000000000",
  "1000100000000000000000000000000",
  "910000000000000000000000"
];

export const valuesToParse = [
  "53",
  "5.3",
  "5",
  "1",
  "10",
  "0.000008999999999837087887",
  "0.000008099099999837087887",
  "999.998999999999837087887000",
  "0.000000000000001",
  "0.000",
  "0.000001",
  ".000001",
  "000000.000001",
  "1000000100000000000000000000000",
];
