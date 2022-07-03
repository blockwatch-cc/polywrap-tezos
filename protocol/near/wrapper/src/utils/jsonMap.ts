import {
  AccessKey,
  AccessKeyInfo,
  AccessKeyPermission,
  BlockReference,
  BlockResult,
  Chunk,
  Near_Action,
  Near_ExecutionStatus,
  Near_ExecutionProof,
  Near_ExecutionOutcome,
  Near_ExecutionOutcomeWithId,
  Near_Receipt,
  Near_ReceiptWithId,
  Near_FinalExecutionOutcome,
  Near_OutcomeMetaData,
  Near_GasProfile,
  Near_Transaction,
  NearProtocolConfig,
  NodeStatusResult,
  Near_FinalExecutionOutcomeWithReceipts,
  ChunkResult,
  BlockChangeResult,
  BlockChange,
  ChangeResult,
  EpochValidatorInfo,
  CurrentEpochValidatorInfo,
  NextEpochValidatorInfo,
  ValidatorStakeView,
  LightClientProof,
  LightClientProofRequest,
  LightClientBlockLiteView,
  ContractStateResult,
  getIdTypeKey,
  KeyValuePair,
} from "../query/w3";
import { BigInt, JSON, JSONEncoder } from "@web3api/wasm-as";
import { publicKeyFromStr } from "./typeUtils";
import * as bs58 from "as-base58";
import * as bs64 from "as-base64";

export function fromBlockReference(blockQuery: BlockReference): JSON.Obj {
  const encoder = new JSONEncoder();
  encoder.pushObject(null);
  if (blockQuery.block_id != null) {
    encoder.setString("block_id", blockQuery.block_id!);
  }
  if (blockQuery.finality != null) {
    encoder.setString("finality", blockQuery.finality!);
  }
  if (blockQuery.syncCheckpoint != null) {
    encoder.setString("sync_ checkpoint", blockQuery.syncCheckpoint!);
  }
  encoder.popObject();
  return <JSON.Obj>JSON.parse(encoder.serialize());
}

export function fromLightClientProofRequest(request: LightClientProofRequest): JSON.Obj {
  const encoder = new JSONEncoder();
  encoder.pushObject(null);
  encoder.setString("light_client_head", request.light_client_head);
  encoder.setString("type", getIdTypeKey(request.m_type));

  if (request.receipt_id !== null) {
    encoder.setString("receipt_id", request.receipt_id!);
  }
  if (request.receiver_id !== null) {
    encoder.setString("receiver_id", request.receiver_id!);
  }
  if (request.sender_id !== null) {
    encoder.setString("sender_id", request.sender_id!);
  }
  if (request.transaction_hash !== null) {
    encoder.setString("transaction_hash", request.transaction_hash!);
  }
  encoder.popObject();
  return <JSON.Obj>JSON.parse(encoder.serialize());
}

export function fromViewFunction(contractId: string, methodName: string, args: JSON.Value): JSON.Obj {
  const encoder = new JSONEncoder();
  encoder.pushObject(null);
  encoder.setString("request_type", "call_function");
  encoder.setString("account_id", contractId);
  encoder.setString("method_name", methodName);
  encoder.setString("args_base64", toBase64String(args.stringify()));
  encoder.setString("finality", "optimistic");
  encoder.popObject();
  return <JSON.Obj>JSON.parse(encoder.serialize());
}

export function toBlockChanges(json: JSON.Obj): BlockChangeResult {
  return {
    block_hash: json.getString("block_hash")!.valueOf(),
    changes: json
      .getArr("changes")!
      .valueOf()
      .map<BlockChange>((v) => {
        const change = <JSON.Obj>v;
        return {
          account_id: change.getString("account_id")!.valueOf(),
          changeType: change.getString("type")!.valueOf(),
        } as BlockChange;
      }),
  };
}

export function toContractStateResult(json: JSON.Obj): ContractStateResult {
  const values = json.getArr("values")!.valueOf();
  return {
    values: values.map<KeyValuePair>((v: JSON.Value) => {
      const val: JSON.Obj = <JSON.Obj>v;
      const proof = val.getArr("proof")!.valueOf();
      return {
        key: val.getString("key")!.valueOf(),
        value: val.getString("value")!.valueOf(),
        // proof: proof.map<Near_ExecutionProof>((v) => toExecutionProof(<JSON.Obj>v)),
      } as KeyValuePair;
    }),
  };
}

export function toBlockResult(json: JSON.Obj): BlockResult {
  const header: JSON.Obj = json.getObj("header")!;
  const chunks: JSON.Arr = json.getArr("chunks")!;
  return {
    author: json.getString("author")!.valueOf(),
    header: {
      height: BigInt.fromString(header.getValue("height")!.stringify()),
      epoch_id: header.getString("epoch_id")!.valueOf(),
      next_epoch_id: header.getString("next_epoch_id")!.valueOf(),
      hash: header.getString("hash")!.valueOf(),
      prev_hash: header.getString("prev_hash")!.valueOf(),
      prev_state_root: header.getString("prev_state_root")!.valueOf(),
      chunk_receipts_root: header.getString("chunk_receipts_root")!.valueOf(),
      chunk_headers_root: header.getString("chunk_headers_root")!.valueOf(),
      chunk_tx_root: header.getString("chunk_tx_root")!.valueOf(),
      outcome_root: header.getString("outcome_root")!.valueOf(),
      chunks_included: BigInt.fromString(header.getValue("chunks_included")!.stringify()),
      challenges_root: header.getString("challenges_root")!.valueOf(),
      timestamp: BigInt.fromString(header.getValue("timestamp")!.stringify()),
      timestamp_nanosec: header.getString("timestamp_nanosec")!.valueOf(),
      random_value: header.getString("random_value")!.valueOf(),
      validator_proposals: header.getArr("validator_proposals")!.valueOf(),
      chunk_mask: header
        .getArr("chunk_mask")!
        .valueOf()
        .map<boolean>((v: JSON.Value) => (<JSON.Bool>v).valueOf()),
      gas_price: header.getString("gas_price")!.valueOf(),
      rent_paid: header.getString("rent_paid")!.valueOf(),
      validator_reward: header.getString("validator_reward")!.valueOf(),
      total_supply: header.getString("total_supply")!.valueOf(),
      challenges_result: header.getArr("challenges_result")!.valueOf(),
      last_final_block: header.getString("last_final_block")!.valueOf(),
      last_ds_final_block: header.getString("last_ds_final_block")!.valueOf(),
      next_bp_hash: header.getString("next_bp_hash")!.valueOf(),
      block_merkle_root: header.getString("block_merkle_root")!.valueOf(),
      approvals: header
        .getArr("approvals")!
        .valueOf()
        .map<string | null>((v: JSON.Value) => (v.isNull ? null : (<JSON.Str>v).valueOf())),
      signature: header.getString("signature")!.valueOf(),
      latest_protocol_version: BigInt.fromString(header.getValue("latest_protocol_version")!.stringify()),
    },
    chunks: chunks.valueOf().map<Chunk>((v: JSON.Value, i: i32, s: JSON.Value[]) => {
      const chunk: JSON.Obj = <JSON.Obj>v;
      return {
        chunk_hash: chunk.getString("chunk_hash")!.valueOf(),
        prev_block_hash: chunk.getString("prev_block_hash")!.valueOf(),
        outcome_root: chunk.getString("outcome_root")!.valueOf(),
        prev_state_root: chunk.getString("prev_state_root")!.valueOf(),
        encoded_merkle_root: chunk.getString("encoded_merkle_root")!.valueOf(),
        encoded_length: BigInt.fromString(chunk.getValue("encoded_length")!.stringify()),
        height_created: BigInt.fromString(chunk.getValue("height_created")!.stringify()),
        height_included: BigInt.fromString(chunk.getValue("height_included")!.stringify()),
        shard_id: BigInt.fromString(chunk.getValue("shard_id")!.stringify()),
        gas_used: BigInt.fromString(chunk.getValue("gas_used")!.stringify()),
        gas_limit: BigInt.fromString(chunk.getValue("gas_limit")!.stringify()),
        rent_paid: chunk.getString("rent_paid")!.valueOf(),
        validator_reward: chunk.getString("validator_reward")!.valueOf(),
        balance_burnt: chunk.getString("balance_burnt")!.valueOf(),
        outgoing_receipts_root: chunk.getString("outgoing_receipts_root")!.valueOf(),
        tx_root: chunk.getString("tx_root")!.valueOf(),
        validator_proposals: chunk.getArr("validator_proposals")!.valueOf(),
        signature: chunk.getString("signature")!.valueOf(),
      };
    }),
  };
}

export function toChangeResult(json: JSON.Obj): ChangeResult {
  return { block_hash: json.getString("block_hash")!.valueOf(), changes: json.getArr("changes")!.valueOf() };
}

export function toChunkResult(json: JSON.Obj): ChunkResult {
  const header = json.getObj("header")!;
  return {
    header: {
      chunk_hash: header.getString("chunk_hash")!.valueOf(),
      prev_block_hash: header.getString("prev_block_hash")!.valueOf(),
      prev_state_root: header.getString("prev_state_root")!.valueOf(),
      encoded_merkle_root: header.getString("encoded_merkle_root")!.valueOf(),
      encoded_length: BigInt.fromString(header.getValue("encoded_length")!.stringify()),
      height_created: BigInt.fromString(header.getValue("height_created")!.stringify()),
      height_included: BigInt.fromString(header.getValue("height_included")!.stringify()),
      shard_id: BigInt.fromString(header.getValue("shard_id")!.stringify()),
      gas_used: header.getValue("gas_used")!.stringify(),
      gas_limit: BigInt.fromString(header.getValue("gas_limit")!.stringify()),
      rent_paid: header.getString("rent_paid")!.valueOf(),
      validator_reward: header.getString("validator_reward")!.valueOf(),
      balance_burnt: header.getString("balance_burnt")!.valueOf(),
      outgoing_receipts_root: header.getString("outgoing_receipts_root")!.valueOf(),
      tx_root: header.getString("tx_root")!.valueOf(),
      validator_proposals: header.getArr("validator_proposals")!.valueOf(),
      signature: header.getString("signature")!.valueOf(),
    },
    receipts: json.getArr("receipts")!.valueOf(),
    transactions: json
      .getArr("transactions")!
      .valueOf()
      .map<Near_Transaction>((v) => toTransaction(<JSON.Obj>v)),
  };
}

export function toAccessKeyInfo(json: JSON.Obj): AccessKeyInfo {
  const jsonAccessKeyVal: JSON.Obj = json.getObj("access_key")!;
  const publicKey = json.getString("public_key")!.valueOf();
  return {
    publicKey: publicKey,
    accessKey: toAccessKey(jsonAccessKeyVal),
  };
}

export function toAccessKey(json: JSON.Obj): AccessKey {
  let nonce: BigInt = BigInt.fromString("0");
  let permission: AccessKeyPermission;
  const jsonPermVal: JSON.Value | null = json.getValue("permission");
  if (jsonPermVal == null || jsonPermVal.isString) {
    permission = {
      isFullAccess: true,
      receiverId: null,
      methodNames: null,
      allowance: null,
    };
  } else {
    const jsonFunCall = (<JSON.Obj>jsonPermVal).getObj("FunctionCall")!;
    const receiverId = jsonFunCall.getString("receiver_id")!.valueOf();
    const methodNames = jsonFunCall
      .getArr("method_names")!
      .valueOf()
      .map<string>((v: JSON.Value) => (<JSON.Str>v).valueOf());
    const allowance = BigInt.fromString(jsonFunCall.getString("allowance")!.valueOf());
    permission = {
      isFullAccess: false,
      receiverId,
      methodNames,
      allowance,
    };
  }
  const nonceVal = json.getValue("nonce");
  if (nonceVal != null) {
    nonce = BigInt.fromString(nonceVal.stringify());
  }
  return {
    nonce: nonce,
    permission: permission,
  };
}

export function toProtocolResult(json: JSON.Obj): NearProtocolConfig {
  const runtime_config: JSON.Obj = json.getObj("runtime_config")!;
  return {
    runtime_config: {
      storage_amount_per_byte: runtime_config.getString("storage_amount_per_byte")!.valueOf(),
    },
  };
}

export function toNodeStatus(json: JSON.Obj): NodeStatusResult {
  const version = json.getObj("version")!;
  const sync_info = json.getObj("sync_info")!;
  const validators = json.getArr("validators")!.valueOf();

  return {
    version: {
      build: version.getString("build")!.valueOf(),
      version: version.getString("version")!.valueOf(),
    },
    chain_id: json.getString("chain_id")!.valueOf(),
    rpc_addr: json.getString("rpc_addr")!.valueOf(),
    validators: validators.map<string>((v: JSON.Value) => (<JSON.Obj>v).getString("account_id")!.valueOf()),
    sync_info: {
      latest_block_hash: sync_info.getString("latest_block_hash")!.valueOf(),
      latest_block_height: BigInt.fromString(sync_info.getValue("latest_block_height")!.stringify()),
      latest_state_root: sync_info.getString("latest_state_root")!.valueOf(),
      latest_block_time: sync_info.getString("latest_block_time")!.valueOf(),
      syncing: sync_info.getBool("syncing")!.valueOf(),
    },
  };
}

export function toAction(json: JSON.Obj): Near_Action {
  const action = {} as Near_Action;
  const obj = json.valueOf();
  //const keys = obj.keys();
  const values = <JSON.Obj>obj.values()[0];

  const depositValue = values.getString("deposit");
  const argsValue = values.getString("args");
  const gasValue = values.getString("args");
  const method_nameValue = values.getString("method_name");
  if (depositValue != null) {
    action.deposit = BigInt.fromString(depositValue.valueOf());
  }
  if (argsValue != null) {
    action.args = bs58.decode(argsValue.valueOf()).buffer;
  }
  if (gasValue != null) {
    action.gas = BigInt.fromString(gasValue.valueOf());
  }
  if (method_nameValue != null) {
    action.methodName = method_nameValue.valueOf();
  }
  return action;
}
export function toReceipt(json: JSON.Obj): Near_Receipt {
  const actions = json.getObj("Action")!.getArr("actions")!.valueOf();
  return { Action: { actions: actions.map<Near_Action>((v) => toAction(<JSON.Obj>v)) } };
}

export function toReceiptWithId(json: JSON.Obj): Near_ReceiptWithId {
  const receipt = json.getObj("receipt")!;
  return {
    predecessor_id: json.getString("predecessor_id")!.valueOf(),
    receipt: toReceipt(receipt),
    receipt_id: json.getString("receipt_id")!.valueOf(),
    receiver_id: json.getString("receiver_id")!.valueOf(),
  };
}

export function toExecutionOutcome(json: JSON.Obj): Near_ExecutionOutcome {
  const result: Near_ExecutionOutcome = {
    logs: json
      .getArr("logs")!
      .valueOf()
      .map<string>((v: JSON.Value) => v.stringify()),
    receipt_ids: json
      .getArr("receipt_ids")!
      .valueOf()
      .map<string>((v: JSON.Value) => v.toString()),
    gas_burnt: BigInt.fromString(json.getValue("gas_burnt")!.stringify()), //TODO change to BigNumber
    metadata: null,
    tokens_burnt: null,
    executor_id: json.getString("executor_id")!.valueOf(),
    status: toExecutionStatus(json.getObj("status")!),
  };

  const tokens_burntValue = json.getString("tokens_burnt");
  if (tokens_burntValue != null) {
    result.tokens_burnt = tokens_burntValue.valueOf();
  }

  const metadataValue = json.getObj("metadata");
  if (metadataValue != null) {
    result.metadata = toOutcomeMetadata(metadataValue);
  }
  return result;
}

export function toExecutionOutcomeWithId(json: JSON.Obj): Near_ExecutionOutcomeWithId {
  const outcome = json.getObj("outcome")!;
  const proof = json.getArr("proof")!.valueOf();

  return {
    id: json.getString("id")!.valueOf(),
    block_hash: json.getString("block_hash")!.valueOf(),
    outcome: toExecutionOutcome(outcome),
    proof: proof.map<Near_ExecutionProof>((v) => toExecutionProof(<JSON.Obj>v)),
  };
}

export function toTransaction(transaction: JSON.Obj): Near_Transaction {
  const result: Near_Transaction = {
    signerId: transaction.getString("signer_id")!.valueOf(),
    publicKey: publicKeyFromStr(transaction.getString("public_key")!.valueOf()),
    nonce: BigInt.fromString(transaction.getValue("nonce")!.stringify()), //TODO change to BigNumber
    receiverId: transaction.getString("receiver_id")!.valueOf(),
    actions: transaction
      .getArr("actions")!
      .valueOf()
      .map<Near_Action>((v: JSON.Value) => toAction(<JSON.Obj>v)),
  } as Near_Transaction;

  const blockHashValue = transaction.getString("block_hash");
  const hashValue = transaction.getString("hash");
  if (blockHashValue != null) {
    hashValue;
    result.blockHash = bs58.decode(blockHashValue.valueOf()).buffer;
  }
  if (hashValue != null) {
    result.hash = hashValue.valueOf();
  }
  return result;
}

export function toFinalExecutionOutcome(json: JSON.Obj): Near_FinalExecutionOutcome {
  const status = json.getObj("status")!;
  const transaction = json.getObj("transaction")!;
  const transaction_outcome = json.getObj("transaction_outcome")!;
  const receipts_outcome = json.getArr("receipts_outcome")!;

  return {
    status: {
      SuccessValue: status.getString("SuccessValue")!.valueOf(),
    },
    transaction: toTransaction(transaction),
    transaction_outcome: toExecutionOutcomeWithId(transaction_outcome),
    receipts_outcome: receipts_outcome
      .valueOf()
      .map<Near_ExecutionOutcomeWithId>((v: JSON.Value) => toExecutionOutcomeWithId(<JSON.Obj>v)),
  } as Near_FinalExecutionOutcome;
}

export function toFinalExecutionOutcomeWithReceipts(json: JSON.Obj): Near_FinalExecutionOutcomeWithReceipts {
  //const txStatus = toFinalExecutionOutcome(json); // TODO change with this

  const status = json.getObj("status")!;
  const transaction = json.getObj("transaction")!;
  const transaction_outcome = json.getObj("transaction_outcome")!;
  const receipts_outcome = json.getArr("receipts_outcome")!;

  //txStatusReceipts.receipts = receipts;

  const receipts = json
    .getArr("receipts")!
    .valueOf()
    .map<Near_ReceiptWithId>((v) => toReceiptWithId(<JSON.Obj>v));

  const txStatusReceipts: Near_FinalExecutionOutcomeWithReceipts = {
    receipts: receipts,
    status: {
      SuccessValue: status.getString("SuccessValue")!.valueOf(),
    } as Near_ExecutionStatus,
    transaction: toTransaction(transaction),
    transaction_outcome: toExecutionOutcomeWithId(transaction_outcome),
    receipts_outcome: receipts_outcome
      .valueOf()
      .map<Near_ExecutionOutcomeWithId>((v: JSON.Value) => toExecutionOutcomeWithId(<JSON.Obj>v)),
  };

  return txStatusReceipts;
}

export function toEpochValidatorInfo(json: JSON.Obj): EpochValidatorInfo {
  const current_validators = json.getArr("current_validators")!.valueOf();
  const next_validators = json.getArr("next_validators")!.valueOf();
  const current_fisherman = json.getArr("current_fisherman")!.valueOf();
  const next_fisherman = json.getArr("next_fisherman")!.valueOf();
  const current_proposals = json.getArr("current_proposals")!.valueOf();
  const prev_epoch_kickout = json.getArr("prev_epoch_kickout")!.valueOf();

  return {
    current_validators: current_validators.map<CurrentEpochValidatorInfo>((v) =>
      toCurrentEpochValidatorInfo(<JSON.Obj>v)
    ),
    next_validators: next_validators.map<NextEpochValidatorInfo>((v) => toNextEpochValidatorInfo(<JSON.Obj>v)),
    current_fisherman: current_fisherman.map<ValidatorStakeView>((v) => toValidatorStakeView(<JSON.Obj>v)),
    next_fisherman: next_fisherman.map<ValidatorStakeView>((v) => toValidatorStakeView(<JSON.Obj>v)),
    current_proposals: current_proposals.map<ValidatorStakeView>((v) => toValidatorStakeView(<JSON.Obj>v)),
    prev_epoch_kickout: prev_epoch_kickout.map<ValidatorStakeView>((v) => toValidatorStakeView(<JSON.Obj>v)),
    epoch_start_height: BigInt.fromString(json.getValue("epoch_start_height")!.stringify()),
    epoch_height: BigInt.fromString(json.getValue("epoch_height")!.stringify()),
  } as EpochValidatorInfo;
}

function toCurrentEpochValidatorInfo(json: JSON.Obj): CurrentEpochValidatorInfo {
  return {
    account_id: json.getString("account_id")!.valueOf(),
    public_key: json.getString("public_key")!.valueOf(),
    is_slashed: json.getBool("is_slashed")!.valueOf(),
    stake: json.getString("stake")!.valueOf(),
    shards: json
      .getArr("shards")!
      .valueOf()
      .map<BigInt>((v) => BigInt.fromString((<JSON.Value>v).stringify())),
    num_produced_blocks: BigInt.fromString(json.getValue("num_produced_blocks")!.stringify()).toUInt32(),
    num_expected_blocks: BigInt.fromString(json.getValue("num_expected_blocks")!.stringify()).toUInt32(),
  };
}

function toNextEpochValidatorInfo(json: JSON.Obj): NextEpochValidatorInfo {
  return {
    account_id: json.getString("account_id")!.valueOf(),
    public_key: json.getString("public_key")!.valueOf(),
    stake: json.getString("stake")!.valueOf(),
    shards: json
      .getArr("shards")!
      .valueOf()
      .map<BigInt>((v) => BigInt.fromString((<JSON.Value>v).stringify())),
  };
}

function toValidatorStakeView(json: JSON.Obj): ValidatorStakeView {
  return {
    account_id: json.getString("account_id")!.valueOf(),
    public_key: json.getString("public_key")!.valueOf(),
    stake: json.getString("stake")!.valueOf(),
  };
}

export function toLightClientProof(json: JSON.Obj): LightClientProof {
  const block_header_lite = json.getObj("block_header_lite")!;
  const block_proof = json.getArr("block_proof")!.valueOf();
  const outcome_proof = json.getObj("outcome_proof")!;
  const outcome_root_proof = json.getArr("outcome_root_proof")!.valueOf();

  return {
    block_header_lite: toBlockHeaderLite(block_header_lite),
    block_proof: block_proof.map<Near_ExecutionProof>((v) => toExecutionProof(<JSON.Obj>v)),
    outcome_proof: toExecutionOutcomeWithId(outcome_proof),
    outcome_root_proof: outcome_root_proof.map<Near_ExecutionProof>((v) => toExecutionProof(<JSON.Obj>v)),
  };
}

function toBlockHeaderLite(json: JSON.Obj): LightClientBlockLiteView {
  const inner_lite = json.getObj("inner_lite")!;
  return {
    inner_lite: {
      block_merkle_root: inner_lite.getString("block_merkle_root")!.valueOf(),
      epoch_id: inner_lite.getString("epoch_id")!.valueOf(),
      height: BigInt.fromString(inner_lite.getValue("height")!.stringify()),
      next_bp_hash: inner_lite.getString("next_bp_hash")!.valueOf(),
      next_epoch_id: inner_lite.getString("next_epoch_id")!.valueOf(),
      outcome_root: inner_lite.getString("outcome_root")!.valueOf(),
      prev_state_root: inner_lite.getString("prev_state_root")!.valueOf(),
      timestamp: BigInt.fromString(inner_lite.getValue("timestamp")!.stringify()),
    },
    inner_rest_hash: json.getString("inner_rest_hash")!.valueOf(),
    prev_block_hash: json.getString("prev_block_hash")!.valueOf(),
  } as LightClientBlockLiteView;
}

function toExecutionProof(json: JSON.Obj): Near_ExecutionProof {
  return { hash: json.getString("hash")!.valueOf(), direction: json.getString("direction")!.valueOf() };
}

function toOutcomeMetadata(json: JSON.Obj): Near_OutcomeMetaData {
  const metadata: Near_OutcomeMetaData = {
    gas_profile: [],
    version: BigInt.fromString(json.getValue("version")!.stringify()).toUInt32(),
  };
  const gas_profileValue = json.getArr("gas_profile");
  if (gas_profileValue != null) {
    metadata.gas_profile = gas_profileValue.valueOf().map<Near_GasProfile | null>((v: JSON.Value) => {
      const profile = <JSON.Obj>v;
      return {
        cost: profile.getString("cost")!.valueOf(),
        cost_category: profile.getString("cost_category")!.valueOf(),
        gas_used: profile.getString("gas_used")!.valueOf(),
      };
    });
  }
  return metadata;
}

function toExecutionStatus(json: JSON.Obj): Near_ExecutionStatus {
  const result = {} as Near_ExecutionStatus;

  const successValue = json.getString("SuccessValue");
  if (successValue != null) {
    result.SuccessValue = successValue.valueOf();
  }

  const successReceiptId = json.getString("SuccessReceiptId");
  if (successReceiptId != null) {
    result.SuccessReceiptId = successReceiptId.valueOf();
  }

  const failure = json.getValue("failure");
  if (failure != null) {
    result.failure = failure;
  }
  return result;
}

function toBase64String(value: string): string {
  const valueBuffer = String.UTF8.encode(value);
  const valueArray: Uint8Array = valueBuffer.byteLength > 0 ? Uint8Array.wrap(valueBuffer) : new Uint8Array(0);
  return bs64.encode(valueArray);
}
