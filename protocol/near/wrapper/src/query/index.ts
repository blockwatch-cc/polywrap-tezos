import {
  BlockResult,
  EpochValidatorInfo,
  Input_accountChanges,
  Input_getAccountState,
  Input_createTransaction,
  Input_requestSignIn,
  Input_findAccessKey,
  Input_signTransaction,
  Input_getPublicKey,
  Input_getBlock,
  Near_PublicKey,
  Near_Query,
  Near_Transaction,
  Near_SignTransactionResult,
  Near_FinalExecutionOutcome,
  AccessKeyInfo,
  AccessKey,
  AccountView,
  ChangeResult,
  Input_accessKeyChanges,
  Input_getAccountBalance,
  Input_txStatus,
  Input_txStatusReceipts,
  Input_blockChanges,
  Input_singleAccessKeyChanges,
  Input_contractCodeChanges,
  Input_contractStateChanges,
  Input_lightClientProof,
  Input_validators,
  Input_experimental_protocolConfig,
  Input_parseNearAmount,
  Input_formatNearAmount,
  AccountBalance,
  NodeStatusResult,
  Near_FinalExecutionOutcomeWithReceipts,
  ChunkResult,
  BlockChangeResult,
  LightClientProof,
  NearProtocolConfig,
  KeyValuePair,
  Input_viewContractState,
  ContractStateResult,
  ViewContractCode,
} from "./w3";
import JsonRpcProvider from "../utils/JsonRpcProvider";
import * as bs58 from "as-base58";
import { BigInt, JSON, JSONEncoder } from "@web3api/wasm-as";
import { publicKeyFromStr, publicKeyToStr } from "../utils/typeUtils";
import {
  toAccessKey,
  toAccessKeyInfo,
  toBlockChanges,
  toChangeResult,
  toChunkResult,
  toContractStateResult,
  toEpochValidatorInfo,
  toFinalExecutionOutcome,
  toFinalExecutionOutcomeWithReceipts,
  toLightClientProof,
  toNodeStatus,
} from "../utils/jsonMap";
import * as formatUtils from "../utils/format";
import { AccountAuthorizedApp } from "./w3/AccountAuthorizedApp";

import {
  Input_chunk,
  Input_gasPrice,
  Input_getAccessKeys,
  Input_getAccountDetails,
  Input_viewFunction,
  Input_viewContractCode,
} from "./w3/Query/serialization";

export function requestSignIn(input: Input_requestSignIn): boolean {
  return Near_Query.requestSignIn({
    contractId: input.contractId,
    methodNames: input.methodNames,
    successUrl: input.successUrl,
    failureUrl: input.failureUrl,
  }).unwrap();
}

export function signOut(): boolean {
  return Near_Query.signOut({}).unwrap();
}

export function isSignedIn(): boolean {
  return Near_Query.isSignedIn({}).unwrap();
}

export function getAccountId(): string | null {
  return Near_Query.getAccountId({}).unwrap();
}

export function getBlock(input: Input_getBlock): BlockResult {
  const provider: JsonRpcProvider = new JsonRpcProvider(null);
  return provider.block(input.blockQuery);
}

export function getAccountState(input: Input_getAccountState): AccountView {
  // prepare params
  const encoder = new JSONEncoder();
  encoder.pushObject(null);
  encoder.setString("request_type", "view_account");
  encoder.setString("account_id", input.accountId);
  encoder.setString("finality", "optimistic");
  encoder.popObject();
  const params: JSON.Obj = <JSON.Obj>JSON.parse(encoder.serialize());
  // send rpc
  const provider: JsonRpcProvider = new JsonRpcProvider(null);
  const result: JSON.Obj = provider.sendJsonRpc("query", params);
  // parse and return result
  return {
    amount: result.getString("amount")!.valueOf(),
    locked: result.getString("locked")!.valueOf(),
    codeHash: result.getString("code_hash")!.valueOf(),
    storageUsage: BigInt.fromString(
      result.getValue("storage_usage")!.stringify()
    ),
    storagePaidAt: BigInt.fromString(
      result.getValue("storage_paid_at")!.stringify()
    ),
    blockHeight: BigInt.fromString(
      result.getValue("block_height")!.stringify()
    ),
    blockHash: result.getString("block_hash")!.valueOf(),
  };
}

export function viewContractState(
  input: Input_viewContractState
): ContractStateResult {
  const encoder = new JSONEncoder();
  encoder.pushObject(null);
  encoder.setString("request_type", "view_state");
  // encoder.setString("account_id", '');
  if (input.blockQuery.block_id != null) {
    encoder.setString("block_id", input.blockQuery.block_id!);
  }
  if (input.blockQuery.finality != null) {
    encoder.setString("finality", input.blockQuery.finality!);
  }
  encoder.setString("account_id", input.accountId);
  encoder.setString("prefix_base64", "");
  encoder.popObject();
  const params: JSON.Obj = <JSON.Obj>JSON.parse(encoder.serialize());
  // send rpc
  const provider: JsonRpcProvider = new JsonRpcProvider(null);
  const result: JSON.Obj = provider.sendJsonRpc("query", params);
  return toContractStateResult(result);
}

export function viewContractCode(
  input: Input_viewContractCode
): ViewContractCode {
  const encoder = new JSONEncoder();
  encoder.pushObject(null);
  encoder.setString("request_type", "view_code");
  encoder.setString("account_id", input.accountId);
  encoder.setString("finality", "optimistic");
  encoder.popObject();
  const params: JSON.Obj = <JSON.Obj>JSON.parse(encoder.serialize());
  const provider: JsonRpcProvider = new JsonRpcProvider(null);
  const result: JSON.Obj = provider.sendJsonRpc("query", params);
  return {
    code_base64: result.getString("code_base64")!.valueOf(),
    hash: result.getString("hash")!.valueOf(),
    block_height: BigInt.fromString(
      result.getValue("block_height")!.stringify()
    ),
    block_hash: result.getString("block_hash")!.valueOf(),
  };
}

export function findAccessKey(
  input: Input_findAccessKey
): AccessKeyInfo | null {
  // get public key
  const publicKey: Near_PublicKey | null = getPublicKey({
    accountId: input.accountId,
  });
  if (publicKey == null) {
    return null;
  }
  // prepare params
  const encoder = new JSONEncoder();
  encoder.pushObject(null);
  encoder.setString("request_type", "view_access_key");
  encoder.setString("account_id", input.accountId);
  encoder.setString("public_key", publicKeyToStr(publicKey));
  encoder.setString("finality", "optimistic");
  encoder.popObject();
  const params: JSON.Obj = <JSON.Obj>JSON.parse(encoder.serialize());
  // send rpc
  const provider: JsonRpcProvider = new JsonRpcProvider(null);
  const result: JSON.Obj = provider.sendJsonRpc("query", params);
  return {
    accessKey: toAccessKey(result),
    publicKey: publicKeyToStr(publicKey),
  };
}

export function getPublicKey(input: Input_getPublicKey): Near_PublicKey | null {
  return Near_Query.getPublicKey({ accountId: input.accountId }).unwrap();
}

export function getAccountBalance(
  input: Input_getAccountBalance
): AccountBalance {
  // prepare params
  const encoder = new JSONEncoder();
  encoder.pushObject(null);
  encoder.setString("request_type", "view_account");
  encoder.setString("account_id", input.accountId);
  encoder.setString("finality", "optimistic");
  encoder.popObject();
  const params: JSON.Obj = <JSON.Obj>JSON.parse(encoder.serialize());
  // send rpc
  const provider: JsonRpcProvider = new JsonRpcProvider(null);
  const result: JSON.Obj = provider.sendJsonRpc("query", params);
  // parse and return result
  const state = getAccountState({ accountId: input.accountId });

  const protocolConfig = provider.protocolConfig();

  const costPerByte = protocolConfig.runtime_config.storage_amount_per_byte;

  const stateStaked = state.storageUsage.mul(BigInt.fromString(costPerByte));
  const staked = BigInt.fromString(state.locked);
  const totalBalance = BigInt.fromString(state.amount).add(staked);
  const minus = staked.gt(stateStaked) ? staked : stateStaked;
  const availableBalance = totalBalance.sub(minus);

  return {
    total: totalBalance.toString(),
    stateStaked: stateStaked.toString(),
    staked: staked.toString(),
    available: availableBalance.toString(),
  } as AccountBalance;
}

export function getAccountDetails(
  input: Input_getAccountDetails
): AccountAuthorizedApp[] {
  const accessKeys = getAccessKeys({ accountId: input.accountId });

  const authorizedApps: AccountAuthorizedApp[] = [];

  for (let i = 0; i < accessKeys.length; i++) {
    const key = accessKeys[i];
    if (key.accessKey.permission.isFullAccess === true) continue;
    const permission = key.accessKey.permission;
    const allowance: BigInt =
      permission.allowance !== null ? permission.allowance! : BigInt.ZERO;
    const contractId: string =
      permission.receiverId !== null ? permission.receiverId! : "";

    const app: AccountAuthorizedApp = {
      contractId: contractId,
      amount: allowance.toString(),
      publicKey: key.publicKey,
    };
    authorizedApps.push(app);
  }

  return authorizedApps;
}

export function getAccessKeys(input: Input_getAccessKeys): AccessKeyInfo[] {
  // prepare params
  const encoder = new JSONEncoder();
  encoder.pushObject(null);
  encoder.setString("request_type", "view_access_key_list");
  encoder.setString("account_id", input.accountId);
  encoder.setString("finality", "optimistic");
  encoder.popObject();
  const params: JSON.Obj = <JSON.Obj>JSON.parse(encoder.serialize());
  // send rpc
  const provider: JsonRpcProvider = new JsonRpcProvider(null);
  const result: JSON.Obj = provider.sendJsonRpc("query", params);

  const keys = result.getArr("keys")!.valueOf();
  const accessKeysInfo: AccessKeyInfo[] = [];

  for (let i = 0; i < keys.length; i++) {
    const key: JSON.Obj = <JSON.Obj>keys[i];
    const accessKeyInfo: AccessKeyInfo = toAccessKeyInfo(key);
    accessKeysInfo.push(accessKeyInfo);
  }
  return accessKeysInfo;
}

export function viewFunction(input: Input_viewFunction): JSON.Obj {
  const provider: JsonRpcProvider = new JsonRpcProvider(null);
  return provider.viewFunction(input.contractId, input.methodName, input.args);
}

export function createTransaction(
  input: Input_createTransaction
): Near_Transaction {
  if (input.signerId == null) {
    return Near_Query.createTransactionWithWallet({
      receiverId: input.receiverId,
      actions: input.actions,
    }).unwrap();
  }
  const signerId: string = input.signerId!;
  const accessKeyInfo: AccessKeyInfo | null = findAccessKey({
    accountId: signerId,
  });
  if (accessKeyInfo == null) {
    throw new Error(
      `Can not sign transactions for account ${signerId} on requested network, no matching key pair found in signer.`
    );
  }
  const accessKey: AccessKey = accessKeyInfo.accessKey;
  const publicKey = accessKeyInfo.publicKey;
  const block: BlockResult = getBlock({
    blockQuery: {
      finality: "final",
      block_id: null,
      syncCheckpoint: null,
    },
  });
  const blockHash: ArrayBuffer = <ArrayBuffer>(
    bs58.decode(block.header.hash).buffer
  );
  const nonce = accessKey.nonce.addInt(1);
  return {
    signerId: signerId,
    publicKey: publicKeyFromStr(publicKey),
    nonce: nonce,
    receiverId: input.receiverId,
    blockHash: blockHash,
    actions: input.actions,
    hash: null,
  };
}

export function lightClientProof(
  input: Input_lightClientProof
): LightClientProof {
  const provider: JsonRpcProvider = new JsonRpcProvider(null);
  const lightClientProof = provider.lightClientProof(input.request);
  return toLightClientProof(lightClientProof);
}

export function signTransaction(
  input: Input_signTransaction
): Near_SignTransactionResult {
  return Near_Query.signTransaction({
    transaction: input.transaction,
  }).unwrap();
}

export function status(): NodeStatusResult {
  const provider: JsonRpcProvider = new JsonRpcProvider(null);
  const statusJson = provider.status();
  return toNodeStatus(statusJson);
}

export function txStatus(input: Input_txStatus): Near_FinalExecutionOutcome {
  const provider: JsonRpcProvider = new JsonRpcProvider(null);
  const txStatus = provider.txStatus(input.txHash, input.accountId);
  return toFinalExecutionOutcome(txStatus);
}

export function txStatusReceipts(
  input: Input_txStatusReceipts
): Near_FinalExecutionOutcomeWithReceipts {
  const provider: JsonRpcProvider = new JsonRpcProvider(null);
  const txStatus = provider.txStatusReceipts(input.txHash, input.accountId);
  return toFinalExecutionOutcomeWithReceipts(txStatus);
}

export function chunk(input: Input_chunk): ChunkResult {
  const provider: JsonRpcProvider = new JsonRpcProvider(null);
  const chunk = provider.getChunk(input.chunkId);
  return toChunkResult(chunk);
}

export function gasPrice(input: Input_gasPrice): BigInt {
  const provider: JsonRpcProvider = new JsonRpcProvider(null);
  let blockId: string | null = null;
  if (input.blockId !== null) {
    blockId = input.blockId!;
  }
  const gasPrice = provider.gasPrice(blockId);
  return BigInt.fromString(gasPrice.getString("gas_price")!.valueOf());
}

export function accessKeyChanges(input: Input_accessKeyChanges): ChangeResult {
  const provider: JsonRpcProvider = new JsonRpcProvider(null);
  const accessKeyChanges = provider.accessKeyChanges(
    input.accountIdArray,
    input.blockQuery
  );
  return toChangeResult(accessKeyChanges);
}

export function accountChanges(input: Input_accountChanges): ChangeResult {
  const provider: JsonRpcProvider = new JsonRpcProvider(null);
  const accountChanges = provider.accountChanges(
    input.accountIdArray,
    input.blockQuery
  );
  return toChangeResult(accountChanges);
}

export function blockChanges(input: Input_blockChanges): BlockChangeResult {
  const provider: JsonRpcProvider = new JsonRpcProvider(null);

  const blockChanges = provider.blockChanges(input.blockQuery);
  return toBlockChanges(blockChanges);
}

export function contractStateChanges(
  input: Input_contractStateChanges
): ChangeResult {
  const provider: JsonRpcProvider = new JsonRpcProvider(null);

  const contractStateChanges = provider.contractStateChanges(
    input.accountIdArray,
    input.blockQuery,
    input.keyPrefix!
  );
  return toChangeResult(contractStateChanges);
}

export function contractCodeChanges(
  input: Input_contractCodeChanges
): ChangeResult {
  const provider: JsonRpcProvider = new JsonRpcProvider(null);

  const contractCodeChanges = provider.contractCodeChanges(
    input.accountIdArray,
    input.blockQuery
  );
  return toChangeResult(contractCodeChanges);
}

export function singleAccessKeyChanges(
  input: Input_singleAccessKeyChanges
): ChangeResult {
  const provider: JsonRpcProvider = new JsonRpcProvider(null);
  const singleAccessKeyChanges = provider.singleAccessKeyChanges(
    input.accessKeyArray,
    input.blockQuery!
  );
  return toChangeResult(singleAccessKeyChanges);
}

export function validators(input: Input_validators): EpochValidatorInfo {
  const provider: JsonRpcProvider = new JsonRpcProvider(null);
  let blockId: string | null = null;
  if (input.blockId !== null) {
    blockId = input.blockId!;
  }
  const validators = provider.validators(blockId);
  return toEpochValidatorInfo(validators);
}

export function experimental_protocolConfig(
  input: Input_experimental_protocolConfig
): NearProtocolConfig {
  const provider: JsonRpcProvider = new JsonRpcProvider(null);
  return provider.protocolConfig(input.blockReference);
}

export function parseNearAmount(input: Input_parseNearAmount): String {
  return formatUtils.parseNearAmount(input.amount);
}

export function formatNearAmount(input: Input_formatNearAmount): String {
  return formatUtils.formatNearAmount(input.amount);
}
