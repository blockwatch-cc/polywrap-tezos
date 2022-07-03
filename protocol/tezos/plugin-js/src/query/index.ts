import {
  Module,
  Input_getContractCallTransferParams,
  Input_callContractView,
  Input_encodeMichelsonExpressionToBytes,
  Input_getWalletPKH,
  Input_getOperationStatus,
  Input_getContractStorage,
  Input_executeTzip16View,
  Input_getPublicKey,
  Input_getPublicKeyHash,
  Input_getRevealEstimate,
  Input_getTransferEstimate,
  Input_getOriginateEstimate,
  Input_checkAddress,
  Input_getBalance,
  SendParams,
  OperationStatus,
  EstimateResult,
  Connection as SchemaConnection,
} from "./w3";
import * as Mapping from "../common/mapping";
import { parseArgs, parseValue, stringify } from "../common/parsing";
import { getOperation } from "../common/indexer";
import { getConnection, Connection, Connections } from "../common/Connection";

import { tzip16 } from "@taquito/tzip16";
import { Schema } from "@taquito/michelson-encoder";
import { MichelsonType, packDataBytes } from "@taquito/michel-codec";
import { MichelsonMap, BigMapAbstraction } from "@taquito/taquito";

export interface QueryConfig extends Record<string, unknown> {
  connections: Connections;
  defaultNetwork: string;
 }

export class Query extends Module<QueryConfig> {
  private _connections: Connections;
  private _defaultNetwork: string;

  constructor(config: QueryConfig) {
    super(config);
    this._connections = config.connections;
    this._defaultNetwork = config.defaultNetwork;
  }

  public async getContractCallTransferParams(
    input: Input_getContractCallTransferParams
  ): Promise<SendParams> {
    const connection = await this._getConnection(input.connection);
    const contract = await connection.getProvider().contract.at(input.address);
    const sendParams = input.params ? Mapping.fromSendParams(input.params) : {};
    const params = await contract.methods[input.method](...parseArgs(input.args)).toTransferParams(sendParams);
    return Mapping.toTransferParams(params);
  }

  public async callContractView(
    input: Input_callContractView
  ): Promise<string> {
    const connection = await this._getConnection(input.connection);
    const contract = await connection.getContract(input.address);
    return contract.views[input.view](...parseArgs(input.args)).read();
  }

  public async encodeMichelsonExpressionToBytes(
    input: Input_encodeMichelsonExpressionToBytes
  ): Promise<string> {
    const expression = parseValue(input.expression) as unknown as MichelsonType;
    const value: any = parseValue(input.value);
    const schema = new Schema(expression);
    const encoded = schema.Encode(value)
    const packed = packDataBytes(encoded, expression);
    return packed.bytes;
  }

  public async getWalletPKH(
    input: Input_getWalletPKH
  ): Promise<string> {
    const connection = await this._getConnection(input.connection);
    return await connection.getProvider().wallet.pkh();
  }

  public async getOperationStatus(
    input: Input_getOperationStatus
  ): Promise<OperationStatus> {
    const network = input.network.toString();
    const response = await getOperation(network, input.hash);
    return response;
  }

  public async getContractStorage(
    input: Input_getContractStorage
  ): Promise<string> {
    const connection = await this._getConnection(input.connection);
    const contract = await connection.getProvider().contract.at(input.address);
    const regex = /(\[[_,a-zA-Z.0-9\s"]+\])|([_a-zA-Z0-9]+)|([0-9]+)/g
    let storage = await contract.storage();
    let key = input.key.replaceAll("'", '"');
    const keys = key.match(regex) || [];
    for (let newKey of keys) {
      try {
        newKey = JSON.parse(newKey)
      } catch (error) {
        // pass
      }
      if (MichelsonMap.isMichelsonMap(storage) || storage instanceof BigMapAbstraction) {
        storage = await storage.get(newKey);
        // @ts-ignore
      } else if (typeof storage === 'object' && storage[newKey]) {
        // @ts-ignore
        storage = storage[newKey]
      } else {
        throw new Error(`Unsupported type: '${typeof storage}' is supported`)
      }
    }
    if(!!input.field) {
      let field = input.field;
      try {
        field = JSON.parse(<string>input.field);
      } catch (error) {
        // ignore if parsing string fails
      }
      if (storage instanceof BigMapAbstraction) {
        storage = await storage.get(field);
      } else {
        // @ts-ignore
        storage = storage[field];
      }
    }
    return stringify(storage);
  }

  public async executeTzip16View(
    input: Input_executeTzip16View
  ): Promise<string> {
    const connection = await this._getConnection(input.connection);
    const contract = await connection.getProvider().contract.at(input.address, tzip16);
    const views = await contract.tzip16().metadataViews()
    const data = await views[input.viewName]().executeView(...parseArgs(input.args))
    return stringify(data);
  }

  public async getPublicKey(
    input: Input_getPublicKey
  ): Promise<string> {
    const connection = await this._getConnection(input.connection);
    return await connection.getSigner().publicKey();
  }

  public async getPublicKeyHash(
    input: Input_getPublicKeyHash
  ): Promise<string> {
    const connection = await this._getConnection(input.connection);
    return await connection.getSigner().publicKeyHash();
  }

  public async getRevealEstimate(
    input: Input_getRevealEstimate
  ): Promise<EstimateResult> {
    try {
      const connection = await this._getConnection(input.connection);
      const revealParams = Mapping.fromRevealParams(input.params);
      const estimate = await connection
        .getProvider()
        .estimate.reveal(revealParams);
      if (!estimate) {
        throw Error("account is already revealed");
      }
      return {
        error: false,
        estimate: Mapping.toEstimate(estimate),
      };
    } catch (error) {
      return {
        error: true,
        reason: error.message,
      };
    }
  }

  public async getTransferEstimate(
    input: Input_getTransferEstimate
  ): Promise<EstimateResult> {
    try {
      const connection = await this._getConnection(input.connection);
      const sendParams = Mapping.fromSendParams(input.params);
      const estimate = await connection
        .getProvider()
        .estimate.transfer(sendParams);
      return {
        error: false,
        estimate: Mapping.toEstimate(estimate),
      };
    } catch (error) {
      return {
        error: true,
        reason: error.message,
      };
    }
  }

  public async getOriginateEstimate(
    input: Input_getOriginateEstimate
  
  ): Promise<EstimateResult> {
    try {
      const connection = await this._getConnection(input.connection);
      const originateParams = Mapping.fromOriginateParams(input.params);
      const estimate = await connection
        .getProvider()
        .estimate.originate(originateParams);
      return {
        error: false,
        estimate: Mapping.toEstimate(estimate),
      };
    } catch (error) {
      return {
        error: true,
        reason: error.message,
      };
    }
  }

  public async checkAddress(
    input: Input_checkAddress
  ): Promise<boolean> {
    try {
      const connection = await this._getConnection(input.connection);
      const balance = await connection
        .getProvider()
        .tz.getBalance(input.address);
      if (!balance.toString()) {
        return false;
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  public async getBalance(
    input: Input_getBalance
  ): Promise<string> {
    const connection = await this._getConnection(input.connection);
    const balance = await connection.getProvider().tz.getBalance(input.address);
    return balance.toString();
  }

  private async _getConnection(
    connection?: SchemaConnection | null
  ): Promise<Connection> {
    return getConnection(this._connections, this._defaultNetwork, connection);
  }
}
