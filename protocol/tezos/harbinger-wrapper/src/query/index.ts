import {
  Tezos_Query,
  Input_getAssetData,
  Input_getNormalizedPrice,
  Providers,
  Input_listAssets,
  Input_getCandle,
  AssetCandle,
} from "./w3";
import { 
  getString, 
  getConnection,
  normalizeValue,
} from "../utils/common"

import { JSON } from "assemblyscript-json"; 

// Provide default oracle contract addresses for network
// @link for contract references - https://github.com/tacoinfra/harbinger
// Below are contract addresses
// NB: Florencenet is not supported because there are no available public rpc node
// MainNet    -> KT1Jr5t9UvGiqkvvsuUbPJHaYx24NzdUwNW9
// Granadanet -> KT1ENR6CK7cBWCtZt1G3PovwTw3FgSW472mS

export function listProviders(): Providers[] {
  return [
    {
      Provider: "Coinbase",
      ProviderNetworks: [
        {
          Network: "mainnet",
          Kind: "Storage",
          ContractAddress: "KT1Jr5t9UvGiqkvvsuUbPJHaYx24NzdUwNW9"
        },
        {
          Network: "mainnet",
          Kind: "Normalizer",
          ContractAddress: "KT1AdbYiPYb5hDuEuVrfxmFehtnBCXv4Np7r"
        },
        {
          Network: "granadanet",
          Kind: "Storage",
          ContractAddress: "KT1ENR6CK7cBWCtZt1G3PovwTw3FgSW472mS"
        },
        {
          Network: "granadanet",
          Kind: "Normalizer",
          ContractAddress: "KT1MwuujtBodVQFm1Jk1KTGNc49wygqoLvpe"
        }
      ]
    },
    {
      Provider: "Binance",
      ProviderNetworks: [
        {
          Network: "mainnet",
          Kind: "Storage",
          ContractAddress: "KT1Mx5sFU4BZqnAaJRpMzqaPbd2qMCFmcqea"
        },
        {
          Network: "mainnet",
          Kind: "Normalizer",
          ContractAddress: "KT1SpD9Xh3PcmBGwbZPhVmHUM8shTwYhQFBa"
        }
      ]
    },
    {
      Provider: "OKEx",
      ProviderNetworks: [
        {
          Network: "mainnet",
          Kind: "Storage",
          ContractAddress: "KT1G3UMEkhxso5cdx2fvoJRJu5nUjBWKMrET"
        },
        {
          Network: "mainnet",
          Kind: "Normalizer",
          ContractAddress: "KT1SUP27JhX24Kvr11oUdWswk7FnCW78ZyUn"
        }
      ]
    },
  ]
};

export function listAssets(input: Input_listAssets): string {
  const connectionDetails = getConnection(input.network, input.providerAddress, input.custom);
  return Tezos_Query.getContractStorage({
    address: connectionDetails.contractAddress,
    connection: connectionDetails.connection,
    key: "assetCodes",
    field: ""
  }).unwrap();
}

export function getCandle(input: Input_getCandle): AssetCandle {
  const connectionDetails = getConnection(input.network, input.providerAddress, input.custom);
  const storage = Tezos_Query.getContractStorage({
    address: connectionDetails.contractAddress,
    connection: connectionDetails.connection,
    key: "oracleData",
    field: input.assetCode
  }).unwrap();
  const assetData = <JSON.Obj>JSON.parse(storage);
  return {
      low:  normalizeValue(parseFloat(getString(assetData, "4"))),
      open: normalizeValue(parseFloat(getString(assetData, "2"))),
      high: normalizeValue(parseFloat(getString(assetData, "3"))),
      asset: input.assetCode,
      close: normalizeValue(parseFloat(getString(assetData, "5"))),
      volume: normalizeValue(parseFloat(getString(assetData, "6"))),
      endPeriod: getString(assetData, "1"),
      startPeriod: getString(assetData, "0"),
  };
}

export function getNormalizedPrice(input: Input_getNormalizedPrice): string {
  const connectionDetails = getConnection(input.network, input.providerAddress, input.custom);
  const storage = Tezos_Query.getContractStorage({
    address: connectionDetails.contractAddress,
    connection: connectionDetails.connection,
    key: "assetMap",
    field: input.assetCode
  }).unwrap();
  const assetData = <JSON.Obj>JSON.parse(storage);
  return getString(assetData, "computedPrice")
}



export function getAssetData(input: Input_getAssetData): AssetCandle {
  const connectionDetails = getConnection(input.network, input.providerAddress, input.custom);
  const storageValue = Tezos_Query.getContractStorage({
    address: connectionDetails.contractAddress,
    connection: connectionDetails.connection,
    key: "oracleData",
    field: input.assetCode
  }).unwrap();
  const assetData = <JSON.Obj>JSON.parse(storageValue);
  return {
      low:  normalizeValue(parseFloat(getString(assetData, "4"))),
      open: normalizeValue(parseFloat(getString(assetData, "2"))),
      high: normalizeValue(parseFloat(getString(assetData, "3"))),
      asset: input.assetCode,
      close: normalizeValue(parseFloat(getString(assetData, "5"))),
      volume: normalizeValue(parseFloat(getString(assetData, "6"))),
      endPeriod: getString(assetData, "1"),
      startPeriod: getString(assetData, "0"),
  };
}