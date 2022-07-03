import {
  AccessKeyWithPublicKey,
  BlockReference,
  BlockResult,
  LightClientProofRequest,
  NearProtocolConfig,
} from "../query/w3";
import { Near_Mutation } from "../mutation/w3";
import { JSON, JSONEncoder } from "@web3api/wasm-as";
import {
  fromBlockReference,
  fromLightClientProofRequest,
  fromViewFunction,
  toBlockResult,
  toProtocolResult,
} from "./jsonMap";

/**
 * Client class to interact with the NEAR RPC API.
 * @see {@link https://github.com/near/nearcore/tree/master/chain/jsonrpc}
 */
export default class JsonRpcProvider {
  /** @hidden */
  readonly url: string | null;

  /**
   * @param url RPC API endpoint URL
   */
  constructor(url: string | null) {
    this.url = url;
  }

  /**
   * Query for block info from the RPC
   * pass block_id OR finality as blockQuery, not both
   * @see {@link https://docs.near.org/docs/interaction/rpc#block}
   *
   * @param blockQuery {@link BlockReference} (passing a {@link BlockId} is deprecated)
   */
  block(blockQuery: BlockReference): BlockResult {
    const params: JSON.Obj = fromBlockReference(blockQuery);
    const json = this.sendJsonRpc("block", params);
    return toBlockResult(json);
  }

  /**
   * Query for protocol configuration
   * pass block_id OR finality as protocolQuery, not both
   * @see {@link https://docs.near.org/docs/interaction/rpc/protocol#protocol-config}
   *
   * @param protocolQuery {@link ProtocolReference} (passing a {@link BlockId} is deprecated)
   */

  protocolConfig(
    protocolQuery: BlockReference = { finality: "final", block_id: null, syncCheckpoint: null }
  ): NearProtocolConfig {
    const params: JSON.Obj = fromBlockReference(protocolQuery);
    const json = this.sendJsonRpc("EXPERIMENTAL_protocol_config", params);
    return toProtocolResult(json);
  }

  /**
   * Directly call the RPC specifying the method and params
   *
   * @param method RPC method
   * @param params Parameters to the method
   */
  sendJsonRpc(method: string, params: JSON.Value): JSON.Obj {
    return Near_Mutation.sendJsonRpc({ method, params }).unwrap() as JSON.Obj;
  }

  /**
   * Invoke a contract view function using the RPC API.
   * @see {@link https://docs.near.org/docs/develop/front-end/rpc#call-a-contract-function}
   *
   * @param contractId NEAR account where the contract is deployed
   * @param methodName The view-only method (no state mutations) name on the contract as it is written in the contract code
   * @param args Any arguments to the view contract method, wrapped in JSON
   * @returns {Promise<any>}
   */

  viewFunction(contractId: string, methodName: string, args: JSON.Value): JSON.Obj {
    const params: JSON.Obj = fromViewFunction(contractId, methodName, args);
    return this.sendJsonRpc("query", params);
  }

  status(): JSON.Obj {
    const encoder = new JSONEncoder();
    encoder.pushArray(null);
    encoder.popArray();
    const params: JSON.Arr = <JSON.Arr>JSON.parse(encoder.serialize());
    return this.sendJsonRpc("status", params);
  }

  txStatus(txHash: string, accountId: string): JSON.Obj {
    const encoder = new JSONEncoder();
    encoder.pushArray(null);
    encoder.setString(null, txHash);
    encoder.setString(null, accountId);
    encoder.popArray();
    const params: JSON.Arr = <JSON.Arr>JSON.parse(encoder.serialize());

    return this.sendJsonRpc("tx", params);
  }

  txStatusReceipts(txHash: string, accountId: string): JSON.Obj {
    const encoder = new JSONEncoder();
    encoder.pushArray(null);
    encoder.setString(null, txHash);
    encoder.setString(null, accountId);
    encoder.popArray();
    const params: JSON.Arr = <JSON.Arr>JSON.parse(encoder.serialize());

    return this.sendJsonRpc("EXPERIMENTAL_tx_status", params);
  }
  getChunk(chunkId: string): JSON.Obj {
    const encoder = new JSONEncoder();
    encoder.pushObject(null);
    encoder.setString("chunk_id", chunkId);
    encoder.popObject();
    const params: JSON.Obj = <JSON.Obj>JSON.parse(encoder.serialize());
    return this.sendJsonRpc("chunk", params);
  }

  gasPrice(blockId: string | null): JSON.Obj {
    const encoder = new JSONEncoder();
    encoder.pushArray(null);
    if (blockId !== null) {
      encoder.setString(null, blockId);
    }
    encoder.popArray();
    const params: JSON.Arr = <JSON.Arr>JSON.parse(encoder.serialize());
    return this.sendJsonRpc("gas_price", params);
  }

  accessKeyChanges(account_ids: string[], blockQuery: BlockReference): JSON.Obj {
    const encoder = new JSONEncoder();
    encoder.pushObject(null);
    encoder.setString("changes_type", "all_access_key_changes");
    encoder.pushArray("account_ids");
    for (let i = 0; i < account_ids.length; i++) {
      encoder.setString(null, account_ids[i]);
    }
    encoder.popArray();

    if (blockQuery.block_id !== null) {
      encoder.setString("block_id", blockQuery.block_id!);
    }
    if (blockQuery.finality !== null) {
      encoder.setString("finality", blockQuery.finality!);
    }
    encoder.popObject();
    const params: JSON.Obj = <JSON.Obj>JSON.parse(encoder.serialize());
    return this.sendJsonRpc("EXPERIMENTAL_changes", params);
  }

  accountChanges(account_ids: string[], blockQuery: BlockReference): JSON.Obj {
    const encoder = new JSONEncoder();
    encoder.pushObject(null);
    encoder.setString("changes_type", "account_changes");
    encoder.pushArray("account_ids");
    for (let i = 0; i < account_ids.length; i++) {
      encoder.setString(null, account_ids[i]);
    }
    encoder.popArray();

    if (blockQuery.block_id !== null) {
      encoder.setString("block_id", blockQuery.block_id!);
    }
    if (blockQuery.finality !== null) {
      encoder.setString("finality", blockQuery.finality!);
    }
    encoder.popObject();
    const params: JSON.Obj = <JSON.Obj>JSON.parse(encoder.serialize());
    return this.sendJsonRpc("EXPERIMENTAL_changes", params);
  }

  contractStateChanges(account_ids: string[], blockQuery: BlockReference, keyPrefix: string): JSON.Obj {
    const encoder = new JSONEncoder();
    encoder.pushObject(null);
    encoder.setString("changes_type", "data_changes");
    encoder.pushArray("account_ids");
    for (let i = 0; i < account_ids.length; i++) {
      encoder.setString(null, account_ids[i]);
    }
    encoder.popArray();

    if (keyPrefix !== null) {
      encoder.setString("key_prefix_base64", keyPrefix);
    }

    if (blockQuery.block_id !== null) {
      encoder.setString("block_id", blockQuery.block_id!);
    }
    if (blockQuery.finality !== null) {
      encoder.setString("finality", blockQuery.finality!);
    }
    encoder.popObject();
    const params: JSON.Obj = <JSON.Obj>JSON.parse(encoder.serialize());
    return this.sendJsonRpc("EXPERIMENTAL_changes", params);
  }

  contractCodeChanges(account_ids: string[], blockQuery: BlockReference): JSON.Obj {
    const encoder = new JSONEncoder();
    encoder.pushObject(null);
    encoder.setString("changes_type", "contract_code_changes");
    encoder.pushArray("account_ids");
    for (let i = 0; i < account_ids.length; i++) {
      encoder.setString(null, account_ids[i]);
    }
    encoder.popArray();

    if (blockQuery.block_id !== null) {
      encoder.setString("block_id", blockQuery.block_id!);
    }
    if (blockQuery.finality !== null) {
      encoder.setString("finality", blockQuery.finality!);
    }
    encoder.popObject();
    const params: JSON.Obj = <JSON.Obj>JSON.parse(encoder.serialize());
    return this.sendJsonRpc("EXPERIMENTAL_changes", params);
  }

  blockChanges(blockQuery: BlockReference): JSON.Obj {
    const params: JSON.Obj = fromBlockReference(blockQuery);
    return this.sendJsonRpc("EXPERIMENTAL_changes_in_block", params);
  }

  lightClientProof(request: LightClientProofRequest): JSON.Obj {
    const params: JSON.Obj = fromLightClientProofRequest(request);
    return this.sendJsonRpc("EXPERIMENTAL_light_client_proof", params);
  }

  singleAccessKeyChanges(accessKeyArray: AccessKeyWithPublicKey[], blockQuery: BlockReference): JSON.Obj {
    const encoder = new JSONEncoder();
    encoder.pushObject(null);
    encoder.setString("changes_type", "single_access_key_changes");
    encoder.pushArray("keys");
    for (let i = 0; i < accessKeyArray.length; i++) {
      encoder.pushObject(null);
      encoder.setString("account_id", accessKeyArray[i].account_id);
      encoder.setString("public_key", accessKeyArray[i].public_key);
      encoder.popObject();
    }
    encoder.popArray();

    if (blockQuery.block_id !== null) {
      encoder.setString("block_id", blockQuery.block_id!);
    }
    if (blockQuery.finality !== null) {
      encoder.setString("finality", blockQuery.finality!);
    }
    encoder.popObject();
    const params: JSON.Obj = <JSON.Obj>JSON.parse(encoder.serialize());
    return this.sendJsonRpc("EXPERIMENTAL_changes", params);
  }

  validators(blockId: string | null): JSON.Obj {
    const encoder = new JSONEncoder();
    encoder.pushArray(null);

    if (blockId != null) {
      encoder.setString(null, blockId!);
    }

    encoder.popArray();

    const params: JSON.Arr = <JSON.Arr>JSON.parse(encoder.serialize());
    return this.sendJsonRpc("validators", params);
  }
}
