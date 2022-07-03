export type UInt = number;
export type UInt8 = number;
export type UInt16 = number;
export type UInt32 = number;
export type Int = number;
export type Int8 = number;
export type Int16 = number;
export type Int32 = number;
export type Bytes = Uint8Array;
export type BigInt = string | number;
export type Json = string;
export type String = string;
export type Boolean = boolean;

export interface PublicKey {
  keyType: KeyType;
  data: Bytes;
}

export interface AccessKeyPermission {
  isFullAccess?: boolean | null;
  receiverId?: string | null;
  methodNames?: Array<string> | null;
  allowance?: BigInt | null;
}

export interface AccessKey {
  nonce: BigInt;
  permission: AccessKeyPermission;
}

export interface AccessKeyInfo {
  publicKey: PublicKey;
  accessKey: AccessKey;
}

export interface Action {
  code?: Bytes | null;
  methodName?: string | null;
  args?: Bytes | null;
  gas?: BigInt | null;
  deposit?: BigInt | null;
  stake?: BigInt | null;
  publicKey?: PublicKey | null;
  accessKey?: AccessKey | null;
  beneficiaryId?: string | null;
}

export interface BlockChange {
  chagneType: string;
  account_id: string;
}

export interface BlockChangeResult {
  block_hash: string;
  changes: BlockChange[];
}

export interface ChangeResult {
  block_hash: string;
  changes: [JSON];
}

export interface Transaction {
  signerId: string;
  publicKey: PublicKey;
  nonce: BigInt;
  receiverId: string;
  actions: Array<Action>;
  blockHash?: Bytes;
  hash?: string;
}

export interface Signature {
  keyType: KeyType;
  data: Bytes;
}

export interface SignedTransaction {
  transaction: Transaction;
  signature: Signature;
}

export interface SignTransactionResult {
  hash: Bytes;
  signedTx: SignedTransaction;
}

export interface FinalExecutionStatus {
  [x: string]: any;
  successValue?: string | null;
  failure?: Json | null;
}

export interface CurrentEpochValidatorInfo {
  account_id: string;
  public_key: string;
  is_slashed: boolean;
  stake: string;
  shards: [BigInt];
  num_produced_blocks: UInt;
  num_expected_blocks: UInt;
}

export interface NextEpochValidatorInfo {
  account_id: string;
  public_key: string;
  stake: string;
  shards: [BigInt];
}

export interface ValidatorStakeView {
  account_id: string;
  public_key: string;
  stake: string;
}

export interface EpochValidatorInfo {
  next_validators: [NextEpochValidatorInfo];
  current_validators: [CurrentEpochValidatorInfo];
  next_fisherman: [ValidatorStakeView];
  current_fisherman: [ValidatorStakeView];
  current_proposals: [ValidatorStakeView];
  prev_epoch_kickout: [ValidatorStakeView];
  epoch_start_height: BigInt;
  epoch_height: BigInt;
}

export interface ExecutionStatus {
  SuccessValue?: string | null;
  SuccessReceiptId?: string | null;
  failure?: Json | null;
}

export interface ExecutionOutcomeWithId {
  id: string;
  outcome: ExecutionOutcome;
}

export interface ExecutionOutcome {
  receipt_ids: Array<string>;
  gas_burnt: BigInt;
  logs: Array<string>;
  receiptIds: Array<string>;
  gasBurnt: BigInt;
  status: ExecutionStatus;
}

export interface FinalExecutionOutcome {
  status: FinalExecutionStatus;
  transaction: Transaction;
  transaction_outcome: ExecutionOutcomeWithId;
  receipts_outcome: Array<ExecutionOutcomeWithId>;
}

export interface FinalExecutionOutcomeWithReceipts extends FinalExecutionOutcome {
  receipts: [ReceiptWithId];
}

export interface ReceiptWithId {
  predecessor_id: string;
  receipt: Receipt;
  receipt_id: string;
  receiver_id: string;
}

export interface Receipt {
  Action: ActionContainer;
}

export interface ActionContainer {
  actions: [Action];
}

export interface QueryResponseKind {
  blockHeight: BigInt;
  blockHash: string;
}

export interface AccountView {
  amount: string;
  locked: string;
  codeHash: string;
  storageUsage: BigInt;
  storagePaidAt: BigInt;
  blockHeight: BigInt;
  blockHash: string;
}

export enum KeyTypeEnum {
  ed25519,
}

export type KeyTypeString = "ed25519";

export type KeyType = KeyTypeEnum | KeyTypeString;

export interface BlockReference {
  blockId?: string;
  finality?: string;
  syncCheckpoint?: string;
}

export interface BlockHeader {
  height: string;
  epoch_id: string;
  next_epoch_id: string;
  hash: string;
  prev_hash: string;
  prev_state_root: string;
  chunk_receipts_root: string;
  chunk_headers_root: string;
  chunk_tx_root: string;
  outcome_root: string;
  chunks_included: string;
  challenges_root: string;
  timestamp: string;
  timestamp_nanosec: string;
  random_value: string;
  validator_proposals: string[];
  chunk_mask: boolean[];
  gas_price: string;
  rent_paid: string;
  validator_reward: string;
  total_supply: string;
  challenges_result: string[];
  last_final_block: string;
  last_ds_final_block: string;
  next_bp_hash: string;
  block_merkle_root: string;
  approvals: string[];
  signature: string;
  latest_protocol_version: string;
}

export interface Chunk {
  chunk_hash: string;
  prev_block_hash: string;
  outcome_root: string;
  prev_state_root: string;
  encoded_merkle_root: string;
  encoded_length: string;
  height_created: string;
  height_included: string;
  shard_id: string;
  gas_used: string;
  gas_limit: string;
  rent_paid: string;
  validator_reward: string;
  balance_burnt: string;
  outgoing_receipts_root: string;
  tx_root: string;
  validator_proposals: string[];
  signature: string;
}

export interface ChunkResult {
  header: Chunk;
  receipts: [JSON];
  transactions: [Transaction];
}

export interface BlockResult {
  author: string;
  header: BlockHeader;
  chunks: Chunk[];
}

export interface NodeStatusResult {
  chain_id: string;
  rpc_addr: string;
  sync_info: SyncInfo;
  validators: string[];
  version: Version;
}

export interface SyncInfo {
  latest_block_hash: string;
  latest_block_height: BigInt;
  latest_block_time: string;
  latest_state_root: string;
  syncing: string;
}
export interface Version {
  version: string;
  build: string;
}

export interface NearProtocolConfig {
  runtime_config: NearProtocolRuntimeConfig;
}

export interface NearProtocolRuntimeConfig {
  storage_amount_per_byte: string;
}

export enum IdType {
  Transaction = "transaction",
  Receipt = "receipt",
}

export interface LightClientProofRequest {
  type: IdType;
  light_client_head: string;
  transaction_hash?: string;
  sender_id?: string;
  receipt_id?: string;
  receiver_id?: string;
}

export interface BlockHeaderInnerLiteView {
  height: BigInt;
  epoch_id: string;
  next_epoch_id: string;
  prev_state_root: string;
  outcome_root: string;
  timestamp: BigInt;
  next_bp_hash: string;
  block_merkle_root: string;
}

export interface LightClientBlockLiteView {
  prev_block_hash: string;
  inner_rest_hash: string;
  inner_lite: BlockHeaderInnerLiteView;
}

export interface LightClientProof {
  outcome_proof: ExecutionOutcomeWithId;
  outcome_root_proof: [ExecutionProof];
  block_header_lite: LightClientBlockLiteView;
  block_proof: [ExecutionProof];
}

export interface ExecutionProof {
  direction: string;
  hash: string;
}
/// Imported Objects START ///

/// Imported Objects END ///

/// Imported Queries START ///

/// Imported Queries END ///
