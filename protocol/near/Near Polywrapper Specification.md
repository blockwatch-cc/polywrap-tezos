# Near Polywrapper Specification

Under the scope of the current grant, we promised to (1) implement 2-4 functions in a Polywrapper and (2) produce a specification of a full Near Polywrapper for dApp developers. We exceeded our promise and implemented 16 functions, some of which are primarily WASM-based while others are written primarily in JavaScript. A mixed approach helped us implement functions iteratively and ensure the deliverable of this grant is useful. Under the scope of a new grant, we can proceed to move most of the existing JavaScript logic to AssemblyScript and add many additional functions to which Near's dApp developer community have become accustomed.

The full specification of a future Near Polywrapper is described in this document. The proposed interface is outlined in a series of three GraphQL schemas. The schemas contain notes clarifying which functions have already been imlemented and tested.

# Two Parts

The Polywrapper implementation has two parts:
1. Polywrapper: A WASM port of the near-api-js SDK
2. JavaScript Plugin: A Polywrap Client plugin used for actions that cannot be performed within a WASM module

# Polywrapper

The Polywrapper is a set of WASM modules that contain the bulk of the logic ported from the near-api-js JavaScript SDK. The Polywrapper calls the aforementioned JavaScript Plugin only when necessary to perform specific tasks.

A call to the Polywrapper might look something like this:
```typescript=
const result = await client.query<{ findAccessKey: AccessKeyInfo }>({
  uri: "w3://ens/near-api.web3api.eth",
  query: `query {
    findAccessKey(
      accountId: $accountId
    )
  }`,
  variables: {
    accountId: "polywraptest.testnet",
  }
});
```

A Polywrapper can have two WASM modules--a "Mutation" module and a "Query" module. As the names imply, functions in the Mutation module may change on-chain state while Query functions do not.

The proposed GraphQL schema specification for the Query module:
```graphql=
#import { Query, Transaction, Action, PublicKey, KeyType, Signature } into Near from "w3://ens/nearPlugin.web3api.eth"

type Query {
"""
    Wallet Query Functions (Implemented, Not Tested)
"""

  requestSignIn(
    contractId: String
    methodNames: [String!]
    successUrl: String
    failureUrl: String
  ): Boolean!

  signOut: Boolean!

  isSignedIn: Boolean!

  getAccountId: String

"""
  RPC Query Functions not part of JsonRpcProvider (Implemented, Tested)
"""

  getAccountState(
    accountId: String!
  ): AccountView!

  findAccessKey(
    accountId: String!
  ): AccessKeyInfo

  getPublicKey(
    accountId: String!
  ): Near_PublicKey

"""
  RPC Query Functions not part of JsonRpcProvider (Implemented, Tested)
"""

  # get account balance
  getAccountBalance(
    accountId: String!
  ): AccountBalance!

  # get list of authorized applications
  getAccountDetails(
    accountId: String!
  ): [AccountAuthorizedApp]!

  # get all access keys associated with account
  getAccessKeys(
    accountId: String!
  ): [AccessKeyInfo]!

  # Invoke a contract view function using the RPC API
  viewFunction(
    contractId: String!
    methodName: String!
    args: JSON!
  ): JSON!

  viewContractState(
    prefix: (String | Bytes)!
    blockQuery: BlockReference!
  ): [KeyValuePair]!

"""
  Transaction Query Functions (Implemented, Tested)
"""

  # creates a transaction. If signerId is not provided, creates transaction with wallet.
  createTransaction(
    receiverId: String!
    actions: [Near_Action!]!
    signerId: String
  ): Near_Transaction!

  # signs a transaction without wallet
  signTransaction(
    transaction: Near_Transaction!
  ): SignTransactionResult!

"""
  Utility Functions (Implemented, Tested)
"""

  # takes amount in Near, returns amount in YoctoNear
  parseNearAmount(
    amount: BigInt!
  ): BigInt!

  # takes amount in YoctoNear, returns amount in Near
  formatNearAmount(
    amount: BigInt!
  ): BigInt!

"""
  JsonRpcProvider Query Functions (Implemented, Tested)
"""

getBlock(
  blockQuery: BlockReference!
): BlockResult!

"""
  JsonRpcProvider Query Functions (Implemented, Tested)
"""

  status(): NodeStatusResult!

  txStatus(
    txHash: (Bytes | String)!,
    accountId: String!
  ): FinalExecutionOutcome!

  txStatusReceipts(
    txHash: Bytes!
    accountId: String!
  ): FinalExecutionOutcome!

  blockChanges(
    blockQuery: BlockReference!
  ): BlockChangeResult!

  chunk(
    chunkId: (String | [BigInt!])! # chunk hash or [blockId, chunkId]
  ): ChunkResult!

  validators(
    blockId: BigInt
  ):   EpochValidatorInfo!

  experimental_protocolConfig(
    blockReference: BlockReference!
  ):   NearProtocolConfig!

  lightClientProof(
    request: LightClientProofRequest!
  ): LightClientProof!

  accessKeyChanges(
    accountIdArray: [String!]!
    blockQuery: BlockReference!
  ): ChangeResult!

  singleAccessKeyChanges(
    accessKeyArray: [AccessKeyWithPublicKey!]!,
    blockQuery: BlockReference
  ):   ChangeResult

  accountChanges(
    accountIdArray: [String!]!
    blockQuery: BlockReference!
  ): ChangeResult!

  contractStateChanges(
    accountIdArray: [String!]!
    blockQuery: BlockReference!
    keyPrefix: String
  ): ChangeResult!

  contractCodeChanges(
    accountIdArray: [String!]!
    blockQuery: BlockReference!
  ): ChangeResult!

  gasPrice(
    blockId: BigInt
  ): BigInt!
}

"""
  Query Types
"""

type AccountView {
  blockHeight: BigInt!
  blockHash: String!
  amount: String!
  locked: String!
  codeHash: String!
  storageUsage: BigInt!
  storagePaidAt: BigInt!
}

type AccountBalance {
  total: String!
  stateStaked: String!
  staked: String!
  available: String!
}

type AccountAuthorizedApp {
  contractId: String!
  amount: String!
  publicKey: String!
}

type BlockReference {
  blockId: String
  finality: String
  syncCheckpoint: String
}

type BlockHeader {
  height: BigInt!
  epoch_id: String!
  next_epoch_id: String!
  hash: String!
  prev_hash: String!
  prev_state_root: String!
  chunk_receipts_root: String!
  chunk_headers_root: String!
  chunk_tx_root: String!
  outcome_root: String!
  chunks_included: BigInt!
  challenges_root: String!
  timestamp: BigInt!
  timestamp_nanosec: String!
  random_value: String!
  validator_proposals: [JSON!]!
  chunk_mask: [Boolean!]!
  gas_price: String!
  rent_paid: String!
  validator_reward: String!
  total_supply: String!
  challenges_result: [JSON!]!
  last_final_block: String!
  last_ds_final_block: String!
  next_bp_hash: String!
  block_merkle_root: String!
  approvals: [String]!
  signature: String!
  latest_protocol_version: BigInt!
}

type Chunk {
  chunk_hash: String!
  prev_block_hash: String!
  outcome_root: String!
  prev_state_root: String!
  encoded_merkle_root: String!
  encoded_length: BigInt!
  height_created: BigInt!
  height_included: BigInt!
  shard_id: BigInt!
  gas_used: BigInt!
  gas_limit: BigInt!
  rent_paid: String!
  validator_reward: String!
  balance_burnt: String!
  outgoing_receipts_root: String!
  tx_root: String!
  validator_proposals: [JSON!]!
  signature: String!
}

type BlockResult {
  author: String!
  header: BlockHeader!
  chunks: [Chunk!]!
}

type ChunkHeader {
  balance_burnt: String!
  chunk_hash: String!
  encoded_length: BigInt!
  encoded_merkle_root: String!
  gas_limit: BigInt!
  gas_used: String!
  height_created: BigInt!
  height_included: BigInt!
  outgoing_receipts_root: String!
  prev_block_hash: String!
  prev_state_num_parts: BigInt!
  prev_state_root_hash: String!
  rent_paid: String!
  shard_id: BigInt!
  signature: String!
  tx_root: String!
  validator_proposals: [JSON!]!
  validator_reward: String!
}

type ChunkResult {
  header: ChunkHeader!
  receipts: [JSON!]!
  transactions: [Transaction!]!
}

type BlockChange {
  chagneType: String!
  account_id: String!
}

type BlockChangeResult {
  block_hash: String!
  changes: [BlockChange!]!
}

type SyncInfo {
  latest_block_hash: String!
  latest_block_height: BigInt!
  latest_block_time: String!
  latest_state_root: String!
  syncing: Boolean!
}

type Version {
  version: String!
  build: String!
}

type NodeStatusResult {
  chain_id: String!
  rpc_addr: String!
  sync_info: SyncInfo!
  validators: [String!]!
  version: Version!
}

type CurrentEpochValidatorInfo {
  account_id: String!
  public_key: String!
  is_slashed: Boolean!
  stake: String!
  shards: [BigInt!]!
  num_produced_blocks: UInt!
  num_expected_blocks: UInt!
}

type NextEpochValidatorInfo {
  account_id: String!
  public_key: String!
  stake: String!
  shards: [BigInt!]!
}

type ValidatorStakeView {
  account_id: String!
  public_key: String!
  stake: String!
}

type EpochValidatorInfo {
  next_validators: [NextEpochValidatorInfo!]!
  current_validators: [CurrentEpochValidatorInfo!]!
  next_fisherman: [ValidatorStakeView!]!
  current_fisherman: [ValidatorStakeView!]!
  current_proposals: [ValidatorStakeView!]!
  prev_epoch_kickout: [ValidatorStakeView!]!
  epoch_start_height: BigInt!
}

type NearProtocolConfig {
  runtime_config: NearProtocolRuntimeConfig!
}

type NearProtocolRuntimeConfig {
  storage_amount_per_byte: String!
}

type MerkleNode {
  hash: String!
  direction: String!
}

type BlockHeaderInnerLiteView {
  height: BigInt!
  epoch_id: String!
  next_epoch_id: String!
  prev_state_root: String!
  outcome_root: String!
  timestamp: BigInt!
  next_bp_hash: String!
  block_merkle_root: String!
}

type LightClientBlockLiteView {
  prev_block_hash: String!
  inner_rest_hash: String!
  inner_lite: BlockHeaderInnerLiteView!
}

type ExecutionOutcomeWithIdView {
  proof: [MerkleNode!]!
  block_hash: String!
  id: String!
  outcome: ExecutionOutcome!
}

type LightClientProof {
  outcome_proof: ExecutionOutcomeWithIdView!
  outcome_root_proof: [MerkleNode!]!
  block_header_lite: LightClientBlockLiteView!
  block_proof: [MerkleNode!]!
}

enum IdType {
  Transaction
  Receipt
}

type LightClientProofRequest {
  type: IdType!
  light_client_head: String!
  transaction_hash: String
  sender_id: String
  receipt_id: String
  receiver_id: String
}

type ChangeResult {
  block_hash: String!
  changes: [JSON!]!
}

type AccessKeyWithPublicKey {
  account_id: String!
  public_key: String!
}

type KeyValuePair {
  key: Bytes
  value: Bytes
}

"""
Common Types
"""

type SignedTransaction {
  transaction: Transaction!
  signature: Near_Signature!
}

# Return value of Mutation.signTransaction(...); contains transaction hash and signed transaction
type SignTransactionResult {
  hash: Bytes!
  signedTx: SignedTransaction!
}

type ExecutionStatus {
  successValue: String
  successReceiptId: String
  failure: JSON
}

type ExecutionOutcomeWithId {
  block_hash: String
  id: String!
  outcome: ExecutionOutcome!
  proof: [ExecutionProof!]
}

type ExecutionProof {
  direction: String!
  hash: String!
}

# Execution status of a sent transaction
type ExecutionOutcome {
  executor_id: String
  gas_burnt: BigInt!
  logs: [String!]
  metadata: OutcomeMetaData
  receipt_ids: [String!]!
  status: ExecutionStatus!
  tokens_burnt: String
}

type OutcomeMetaData {
  gas_profile: [GasProfile]!
  version: UInt!
}

type GasProfile {
  cost: String!
  cost_category: String!
  gas_used: String!
}

# Final outcome of a sent transaction
type FinalExecutionOutcome {
  status: ExecutionStatus!
  transaction: Transaction!
  transaction_outcome: ExecutionOutcomeWithId!
  receipts_outcome: [ExecutionOutcomeWithId!]!
}
```

The proposed GraphQL schema specification for the Mutation module:
```graphql=
#import { Query, Transaction, Action, PublicKey, Signature } into Near from "w3://ens/nearPlugin.web3api.eth"

type Mutation {

"""
  JsonRpcProvider Mutation Functions (Implemented, Tested)
"""

  # send a JSON RPC to Near node
  sendJsonRpc(
    method: String!
    params: JSON!
  ): JSON!

"""
  Generic Mutation Functions (Implemented, Tested)
"""

  # send one or more transactions to NEAR wallet to be signed and executed
  requestSignTransactions(
    # list of transactions to sign
    transactions: [Near_Transaction!]!
    # url NEAR Wallet will redirect to after transaction signing is complete
    callbackUrl: String
    # meta information NEAR Wallet will send back to the application. `meta` will be attached to the `callbackUrl` as a url search param
    meta: String
  ): Boolean!

  # sends a signed transaction and awaits execution
  sendTransaction(
    signedTx: SignedTransaction!
  ): FinalExecutionOutcome!

  # sends a signed transaction and immediately returns transaction hash
  sendTransactionAsync(
    signedTx: SignedTransaction!
  ): String!

  # creates, signs, and sends a transaction without wallet and awaits execution
  signAndSendTransaction(
    receiverId: String!
    actions: [Near_Action!]!
    signerId: String!
  ): FinalExecutionOutcome!

  # creates, signs, and sends a transaction without wallet and immediately returns transaction hash
  signAndSendTransactionAsync(
    receiverId: String!
    actions: [Near_Action!]!
    signerId: String!
  ): String!

"""
  Convenience Mutation Functions (Implemented, Tested)
"""

# create a new Near account
  createAccount(
    newAccountId: String!
    publicKey: Near_PublicKey! # | String
    amount: BigInt
    signerId: String!
  ): FinalExecutionOutcome!

  # delete Near account and transfer remaining funds to beneficiary
  deleteAccount(
    accountId: String!
    beneficiaryId: String!
    signerId: String!
  ): FinalExecutionOutcome!

  # deploy a contract
  deployContract(
    data: Bytes!
    contractId: String!
    signerId: String!
  ): FinalExecutionOutcome!

  # transfer Near from signer to receiver
  sendMoney(
    amount: BigInt!
    receiverId: String!,
    signerId: String!
  ): FinalExecutionOutcome!

  # call a contract function
  functionCall(
    contractId: String!
    methodName: String!
    args: JSON
    gas: BigInt
    deposit: BigInt
    walletMeta: String
    walletCallbackUrl: String
    SignerId: String
  ): FinalExecutionOutcome!

  # add access key to account
  addKey(
    publicKey: Near_PublicKey! # | String
    contractId: String
    methodNames: [String!],
    amount: BigInt
    signerId: String!
  ): FinalExecutionOutcome!

  # delete access key associated with public key
  deleteKey(
    publicKey: Near_PublicKey! # | String
    signerId: String!
  ): FinalExecutionOutcome!

  # Create a new account and deploy a contract to it
  createAndDeployContract(
    contractId: String!
    publicKey: (String | Near_PublicKey)!
    data: Bytes!
    amount: BigInt!
  ): Boolean!
}

"""
Common Types
"""

type SignedTransaction {
  transaction: Transaction!
  signature: Near_Signature!
}

# Return value of Mutation.signTransaction(...); contains transaction hash and signed transaction
type SignTransactionResult {
  hash: Bytes!
  signedTx: SignedTransaction!
}

type FinalExecutionStatus {
  successValue: String
  failure: JSON
}

type ExecutionStatus {
  successValue: String
  successReceiptId: String
  failure: JSON
}

type ExecutionOutcomeWithId {
  id: String!
  outcome: ExecutionOutcome!
}

# Execution status of a sent transaction
type ExecutionOutcome {
  logs: [String!]!
  receiptIds: [String!]!
  gasBurnt: BigInt!
  status: ExecutionStatus!
}

# Final outcome of a sent transaction
type FinalExecutionOutcome {
  status: FinalExecutionStatus!
  transaction: Transaction!
  transaction_outcome: ExecutionOutcomeWithId!
  receipts_outcome: [ExecutionOutcomeWithId!]!
}
```

# Near JavaScript Plugin

A JavaScript plugin is necessary to perform the following actions that cannot be implemented directly within a Polywrapper due to limitations of WASM:
1. Browser interaction, including interaction with the Near Wallet
2. Filesystem interaction, such as reading and writing to local keystores
3. Sending HTTP requests, including JSON RPC queries

Likewise, Polywrapper execution is stateless and therefore the plugin is used to cache the network configuration parameters provided when instantiating the plugin. Configuration items can include a network ID, RPC URLs, a near-api-js KeyStore class instance, and other optional data developers might provide when instantiating a near-api-js Near class instance.

The plugin would typically be instantiated and configured when instantiating the Polywrap Client, like so:
```typescript=
import {
  nearPlugin,
  KeyStores
} from "@web3api/near-plugin-js";

const client = new Web3ApiClient({
  plugins: [{
    uri: "w3://ens/near-plugin-js.web3api.eth",
    plugin: nearPlugin({
      networkId: "testnet",
      keyStore: new KeyStores.BrowserLocalStorageKeyStore(),
      nodeUrl: "https://rpc.testnet.near.org",
      walletUrl: "https://wallet.testnet.near.org",
      helperUrl: "https://helper.testnet.near.org",
      explorerUrl: "https://explorer.testnet.near.org",
    })
  }]
})
```

The GraphQL schema of the Near Plugin produced under the scope of the current grant (with types declarations removed for readability):
```graphql=
type Query {
  requestSignIn(
    contractId: String
    methodNames: [String!]
    successUrl: String
    failureUrl: String
  ): Boolean!

  signOut: Boolean!

  isSignedIn: Boolean!

  getAccountId: String

  getPublicKey(
    accountId: String!
  ): PublicKey

  """
  Creates a transaction.
  If signerId is provided, the transaction will be signed using data from the KeyStore in the plugin config.
  Otherwise, wallet authorization is expected.
  """
  createTransactionWithWallet(
    receiverId: String!
    actions: [Action!]!
  ): Transaction!

  # signs a transaction without wallet
  signTransaction(
    transaction: Transaction!
  ): SignTransactionResult!
}

type Mutation {
  sendJsonRpc(
    method: String!
    params: JSON!
  ): JSON!

  # send one or more transactions to NEAR wallet to be signed and executed
  requestSignTransactions(
    transactions: [Transaction!]!
    callbackUrl: String
    meta: String
  ): Boolean!

  # sends a signed transaction and awaits execution
  sendTransaction(
    signedTx: SignedTransaction!
  ): FinalExecutionOutcome!

  # sends a signed transaction and immediately returns transaction hash
  sendTransactionAsync(
    signedTx: SignedTransaction!
  ): String!
}
```

The proposed GraphQL schema specification for the Plugin:
```graphql=
type Query {
  """
  Wallet Query Functions (Implemented, Not Tested)
  """

  requestSignIn(
    contractId: String
    methodNames: [String!]
    successUrl: String
    failureUrl: String
  ): Boolean!

  signOut: Boolean!

  isSignedIn: Boolean!

  getAccountId: String

  createTransactionWithWallet(
    receiverId: String!
    actions: [Action!]!
  ): Transaction!


  """
  KeyStore, KeyPair, and Signer Query Functions (Implemented, Tested)
  """

  getPublicKey(
    accountId: String!
  ): PublicKey

  """
  KeyStore, KeyPair, and Signer Query Functions (Implemented, Testeds)
  """

  signMessage(
    message: Bytes!
    signerId: String!
  ): Signature!
}

type Mutation {

  """
  Generic Functions (Implemented, Tested)
  """

  sendJsonRpc(
    method: String!
    params: JSON!
  ): JSON!

  """
  Wallet Mutation Functions (Implemented, Not Tested)
  """

  # send one or more transactions to NEAR wallet to be signed and executed
  requestSignTransactions(
    transactions: [Transaction!]!
    callbackUrl: String
    meta: String
  ): Boolean!

  """
  KeyStore, KeyPair, and Signer Query Functions (Implemented, Tested)
  """

  createKey(
    accountId: String!
    networkId: String!
  ): PublicKey!
}

"""
Plugin Types (can be imported by Polywrapper to prevent redundancy)
"""

# Supported public key types
enum KeyType {
  ed25519
}

# Account public key data
type PublicKey {
  keyType: KeyType!
  data: Bytes!
}

type CreateAccount {}
type DeployContract { code: Bytes! }
type FunctionCall { methodName: String! args: JSON gas: BigInt! deposit: BigInt! }
type Transfer { deposit: BigInt! }
type Stake { stake: BigInt! publicKey: PublicKey! }
type AddKey { publicKey: PublicKey! accessKey: AccessKey! }
type DeleteKey { publicKey: PublicKey! }
type DeleteAccount { beneficiaryId: String! }
# Action types define the data necessary to complete a type of action in a transaction
type Action = ( CreateAccount | DeployContract | FunctionCall | Transfer | Stake | AddKey | DeleteKey | DeleteAccount)!

type Transaction {
  signerId: String!
  publicKey: PublicKey!
  nonce: BigInt!
  receiverId: String!
  actions: [Action!]!
  blockHash:  Bytes
  hash: String
}

type Signature {
  keyType: KeyType!
  data: Bytes!
}
```