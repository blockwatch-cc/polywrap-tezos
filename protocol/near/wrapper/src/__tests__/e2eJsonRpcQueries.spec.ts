import { NearPluginConfig } from "../../../plugin-js";
import {
  BlockChangeResult,
  NearProtocolConfig,
  ChangeResult,
  IdType,
  NodeStatusResult,
} from "./tsTypes";
import * as testUtils from "./testUtils";

import type { Finality } from "near-api-js/lib/providers/provider";
import { Web3ApiClient } from "@web3api/client-js";
import * as nearApi from "near-api-js";
import { BlockResult as NearBlockResult } from "near-api-js/lib/providers/provider";
import { buildAndDeployApi, initTestEnvironment, stopTestEnvironment } from "@web3api/test-env-js";
import path from "path";
import { LightClientProof, ChunkResult } from "../query/w3";
import { FinalExecutionOutcome } from "../../../plugin-js/build/w3";

const BN = require("bn.js");

jest.setTimeout(360000);
jest.retryTimes(5)

describe("e2e", () => {
  let client: Web3ApiClient;
  let apiUri: string;

  let nearConfig: NearPluginConfig;
  let near: nearApi.Near;
  let workingAccount: nearApi.Account;
  let sender: nearApi.Account;
  let receiver: nearApi.Account;
  let contractId: string;
  let transactionOutcome: nearApi.providers.FinalExecutionOutcome;
  let latestBlock: NearBlockResult;

  beforeAll(async () => {
    // set up test env and deploy api
    const { ethereum, ensAddress, ipfs } = await initTestEnvironment();
    const apiPath: string = path.resolve(__dirname + "/../../");
    const api = await buildAndDeployApi(apiPath, ipfs, ensAddress);

    apiUri = `ens/testnet/${api.ensDomain}`;
    // set up client
    nearConfig = await testUtils.setUpTestConfig();
    near = await nearApi.connect(nearConfig);

    const polywrapConfig = testUtils.getPlugins(ethereum, ensAddress, ipfs, nearConfig);
    client = new Web3ApiClient(polywrapConfig);
    latestBlock = await near.connection.provider.block({ finality: "final" });

    // set up contract account
    contractId = testUtils.generateUniqueString("test");
    workingAccount = await testUtils.createAccount(near);
    await testUtils.deployContract(workingAccount, contractId);

    sender = await testUtils.createAccount(near);
    receiver = await testUtils.createAccount(near);
    transactionOutcome = await sender.sendMoney(receiver.accountId, new BN("1"));
  });

  afterAll(async () => {
    await stopTestEnvironment();
    await sender.deleteAccount(testUtils.testAccountId);
    await receiver.deleteAccount(testUtils.testAccountId);
    await workingAccount.deleteAccount(testUtils.testAccountId)
  });

  // status  +
  it("Get node status", async () => {
    const result = await client.query<{ status: NodeStatusResult }>({
      uri: apiUri,
      query: `query {
        status
      }`,
    });
    const status = result.data!.status;
    const nearStatus = await near.connection.provider.status();
    const nearStatusValidators = nearStatus.validators.map(({ account_id }: any) => account_id);
    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();
    expect(status.chain_id).toBeTruthy();
    expect(status.rpc_addr).toBeTruthy();
    expect(status.sync_info).toBeTruthy();
    expect(status.validators).toBeTruthy();
    expect(status.version).toBeTruthy();
    expect(status.chain_id).toStrictEqual(nearStatus.chain_id);
    expect(status.rpc_addr).toStrictEqual(nearStatus.rpc_addr);
    expect(status.version.version).toStrictEqual(nearStatus.version.version);
    expect(status.validators.length).toStrictEqual(nearStatus.validators.length);
    expect(status.validators).toStrictEqual(nearStatusValidators);
    expect(status.sync_info.latest_block_hash).toStrictEqual(nearStatus.sync_info.latest_block_hash);
    expect(status.sync_info.latest_block_height).toStrictEqual(`${nearStatus.sync_info.latest_block_height}`);
    expect(status.sync_info.latest_block_time).toStrictEqual(nearStatus.sync_info.latest_block_time);
    expect(status.sync_info.latest_state_root).toStrictEqual(nearStatus.sync_info.latest_state_root);
    expect(status.sync_info.syncing).toStrictEqual(nearStatus.sync_info.syncing);
  });

  // gasPrice +
  it("Get gas price", async () => {
    const blockId = latestBlock.header.hash;
    const result = await client.query<{ gasPrice: BigInt }>({
      uri: apiUri,
      query: `query {
        gasPrice(
          blockId: $blockId
        )
      }`,
      variables: {
        blockId: blockId,
      },
    });
    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const gasPrice: BigInt = result.data!.gasPrice;

    expect(gasPrice).toBeTruthy();

    const { gas_price } = await near.connection.provider.gasPrice(blockId);
    expect(gasPrice.toString()).toStrictEqual(gas_price);
  });

  // blockChanges +
  it("Get block changes", async () => {
    const blockQuery = { block_id: latestBlock.header.hash, finality: null, syncCheckpoint: null };
    const result = await client.query<{ blockChanges: BlockChangeResult }>({
      uri: apiUri,
      query: `query {
        blockChanges(
          blockQuery: $blockQuery
        )
      }`,
      variables: {
        blockQuery: blockQuery,
      },
    });
    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const blockChanges: BlockChangeResult = result.data!.blockChanges;
    expect(blockChanges.block_hash).toBeTruthy();
    expect(blockChanges.changes).toBeInstanceOf(Array);

    const nearBlockChanges = await near.connection.provider.blockChanges({ blockId: blockQuery.block_id! });

    expect(blockChanges.block_hash).toStrictEqual(nearBlockChanges.block_hash);
    expect(blockChanges.changes.length).toEqual(nearBlockChanges.changes.length);
    //expect(blockChanges.changes).toEqual(nearBlockChanges.changes); //TODO change property changeType to type after https://github.com/polywrap/monorepo/issues/721
  });

  //experimental_protocolConfig +
  it("Get protocol config", async () => {
    const blockReference = { finality: "final" as Finality };
    const result = await client.query<{ experimental_protocolConfig: NearProtocolConfig }>({
      uri: apiUri,
      query: `query {
        experimental_protocolConfig(
          blockReference: $blockReference
        )
      }`,
      variables: {
        blockReference: blockReference,
      },
    });
    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const protocolConfig: NearProtocolConfig = result.data!.experimental_protocolConfig;
    expect(protocolConfig).toBeTruthy();
    expect(protocolConfig.runtime_config).toBeTruthy();

    const nearProtocolConfig = await near.connection.provider.experimental_protocolConfig(blockReference);
    expect(protocolConfig.runtime_config.storage_amount_per_byte).toStrictEqual(
      nearProtocolConfig.runtime_config.storage_amount_per_byte
    );
  });

  // chunk +
  it("json rpc fetch chunk info", async () => {
    const hash = latestBlock.chunks[0].chunk_hash;

    const result = await client.query<{ chunk: ChunkResult }>({
      uri: apiUri,
      query: `query {
        chunk(
          chunkId:$chunkId
        )
      }`,
      variables: {
        chunkId: hash,
      },
    });

    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();
    const chunk: ChunkResult = result.data!.chunk;

    expect(chunk.header.shard_id).toEqual("0");

    const nearChunk = await near.connection.provider.chunk(hash);

    expect(chunk.header.chunk_hash).toEqual(nearChunk.header.chunk_hash);
  });

  //lightClientProof +
  it("Get lightClientProof", async () => {
    async function waitForStatusMatching(isMatching: any) {
      const MAX_ATTEMPTS = 10;
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        await testUtils.sleep(500);
        const nodeStatus = await near.connection.provider.status();
        if (isMatching(nodeStatus)) {
          return nodeStatus;
        }
      }
      throw new Error(`Exceeded ${MAX_ATTEMPTS} attempts waiting for matching node status.`);
    }

    const comittedStatus = await waitForStatusMatching(
      //@ts-ignore
      (status: any) => status.sync_info.latest_block_hash !== transactionOutcome.transaction_outcome.block_hash
    );
    const BLOCKS_UNTIL_FINAL = 2;
    const finalizedStatus = await waitForStatusMatching(
      (status: any) =>
        status.sync_info.latest_block_height > comittedStatus.sync_info.latest_block_height + BLOCKS_UNTIL_FINAL
    );

    latestBlock = await near.connection.provider.block({ blockId: finalizedStatus.sync_info.latest_block_hash });
    const lightClientHead = latestBlock.header.last_final_block;

    const lightClientProofRequestBase = {
      light_client_head: lightClientHead,
      transaction_hash: transactionOutcome.transaction.hash!,
      sender_id: sender.accountId,
    };

    const wrapper_lightClientProofRequest = {
      type: 0,
      ...lightClientProofRequestBase,
    };

    const result = await client.query<{ lightClientProof: LightClientProof }>({
      uri: apiUri,
      query: `query {
        lightClientProof(
          request: $request
        )
      }`,
      variables: {
        request: wrapper_lightClientProofRequest,
      },
    });
    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const lightClientProof: LightClientProof = result.data!.lightClientProof;
    expect(lightClientProof).toBeTruthy();
    expect(lightClientProof.block_header_lite).toBeTruthy();
    expect(lightClientProof.block_proof).toBeTruthy();

    expect("prev_block_hash" in lightClientProof.block_header_lite).toBe(true);
    expect("inner_rest_hash" in lightClientProof.block_header_lite).toBe(true);
    expect("inner_lite" in lightClientProof.block_header_lite).toBe(true);

    expect("block_hash" in lightClientProof.outcome_proof).toBe(true);

    const api_lightClientProofRequest = {
      type: IdType.Transaction,
      ...lightClientProofRequestBase,
    };

    const nearLightClientProof = await near.connection.provider.lightClientProof(api_lightClientProofRequest);

    //expect(lightClientProof.block_header_lite).toContain(nearLightClientProof.block_header_lite);
    expect(lightClientProof.block_proof).toEqual(nearLightClientProof.block_proof);
    //expect(lightClientProof.outcome_proof).toEqual(nearLightClientProof.outcome_proof);
    //expect(lightClientProof.outcome_root_proof).toEqual(nearLightClientProof.outcome_root_proof);
  });

  // accessKeyChanges +
  it("Get access key changes", async () => {
    const blockQuery = { block_id: latestBlock.header.hash, finality: null, syncCheckpoint: null };
    const accountIdArray = [workingAccount.accountId];
    const result = await client.query<{ accessKeyChanges: ChangeResult }>({
      uri: apiUri,
      query: `query {
        accessKeyChanges(
          accountIdArray: $accountIdArray
          blockQuery: $blockQuery
        )
      }`,
      variables: {
        accountIdArray: accountIdArray,
        blockQuery: blockQuery,
      },
    });
    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const accessKeyChanges: ChangeResult = result.data!.accessKeyChanges;
    expect(accessKeyChanges.block_hash).toBeTruthy();
    expect(accessKeyChanges.changes).toBeInstanceOf(Array);

    const nearBlockChanges = await near.connection.provider.accessKeyChanges(accountIdArray, {
      blockId: blockQuery.block_id,
    });

    expect(accessKeyChanges.block_hash).toStrictEqual(nearBlockChanges.block_hash);
    expect(accessKeyChanges.changes.length).toEqual(nearBlockChanges.changes.length);
    expect(accessKeyChanges.changes).toEqual(nearBlockChanges.changes);
  });

  // accountChanges +
  it("Get account changes", async () => {
    const blockQuery = { block_id: latestBlock.header.hash, finality: null, syncCheckpoint: null };
    const accountIdArray = [workingAccount.accountId];
    const result = await client.query<{ accountChanges: ChangeResult }>({
      uri: apiUri,
      query: `query {
        accountChanges(
          accountIdArray: $accountIdArray
          blockQuery: $blockQuery
        )
      }`,
      variables: {
        accountIdArray: accountIdArray,
        blockQuery: blockQuery,
      },
    });
    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const accountChanges: ChangeResult = result.data!.accountChanges;
    expect(accountChanges.block_hash).toBeTruthy();
    expect(accountChanges.changes).toBeInstanceOf(Array);

    const nearBlockChanges = await near.connection.provider.accountChanges(accountIdArray, {
      blockId: blockQuery.block_id,
    });

    expect(accountChanges.block_hash).toStrictEqual(nearBlockChanges.block_hash);
    expect(accountChanges.changes.length).toEqual(nearBlockChanges.changes.length);
    expect(accountChanges.changes).toEqual(nearBlockChanges.changes);
  });

  // contractCodeChanges +
  it("Get contract code changes", async () => {
    const blockQuery = { block_id: latestBlock.header.hash, finality: null, syncCheckpoint: null };
    const accountIdArray = [workingAccount.accountId];
    const result = await client.query<{ contractCodeChanges: ChangeResult }>({
      uri: apiUri,
      query: `query {
        contractCodeChanges(
          accountIdArray: $accountIdArray
          blockQuery: $blockQuery
        )
      }`,
      variables: {
        accountIdArray: accountIdArray,
        blockQuery: blockQuery,
      },
    });
    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const contractCodeChanges: ChangeResult = result.data!.contractCodeChanges;
    expect(contractCodeChanges.block_hash).toBeTruthy();
    expect(contractCodeChanges.changes).toBeInstanceOf(Array);

    const nearBlockChanges = await near.connection.provider.contractCodeChanges(accountIdArray, {
      blockId: blockQuery.block_id,
    });

    expect(contractCodeChanges.block_hash).toStrictEqual(nearBlockChanges.block_hash);
    expect(contractCodeChanges.changes.length).toEqual(nearBlockChanges.changes.length);
    expect(contractCodeChanges.changes).toEqual(nearBlockChanges.changes);
  });

  //contractStateChanges +
  it("Get contract state changes", async () => {
    const blockQuery = { block_id: latestBlock.header.hash, finality: null, syncCheckpoint: null };
    const accountIdArray = [workingAccount.accountId];
    const keyPrefix = "";
    const result = await client.query<{ contractStateChanges: ChangeResult }>({
      uri: apiUri,
      query: `query {
        contractStateChanges(
          accountIdArray: $accountIdArray
          blockQuery: $blockQuery
          keyPrefix: $keyPrefix
        )
      }`,
      variables: {
        accountIdArray: accountIdArray,
        blockQuery: blockQuery,
        keyPrefix: keyPrefix,
      },
    });
    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const contractStateChanges: ChangeResult = result.data!.contractStateChanges;
    expect(contractStateChanges.block_hash).toBeTruthy();
    expect(contractStateChanges.changes).toBeInstanceOf(Array);

    const nearBlockChanges = await near.connection.provider.contractStateChanges(
      accountIdArray,
      {
        blockId: blockQuery.block_id,
      },
      keyPrefix
    );

    expect(contractStateChanges.block_hash).toStrictEqual(nearBlockChanges.block_hash);
    expect(contractStateChanges.changes.length).toEqual(nearBlockChanges.changes.length);
    expect(contractStateChanges.changes).toEqual(nearBlockChanges.changes);
  });

  //singleAccessKeyChanges +
  it("Get single access key changes", async () => {
    const blockQuery = { block_id: latestBlock.header.hash, finality: null, syncCheckpoint: null };
    const accessKeyArray = [
      {
        account_id: workingAccount.accountId,
        public_key: (
          await near.connection.signer.getPublicKey(workingAccount.accountId, testUtils.networkId)
        ).toString(),
      },
    ];
    const result = await client.query<{ singleAccessKeyChanges: ChangeResult }>({
      uri: apiUri,
      query: `query {
        singleAccessKeyChanges(
          accessKeyArray: $accessKeyArray
          blockQuery: $blockQuery
        )
      }`,
      variables: {
        accessKeyArray: accessKeyArray,
        blockQuery: blockQuery,
      },
    });
    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const singleAccessKeyChanges: ChangeResult = result.data!.singleAccessKeyChanges;
    expect(singleAccessKeyChanges.block_hash).toBeTruthy();
    expect(singleAccessKeyChanges.changes).toBeInstanceOf(Array);

    const nearBlockChanges = await near.connection.provider.singleAccessKeyChanges(accessKeyArray, {
      blockId: blockQuery.block_id,
    });

    expect(singleAccessKeyChanges.block_hash).toStrictEqual(nearBlockChanges.block_hash);
    expect(singleAccessKeyChanges.changes.length).toEqual(nearBlockChanges.changes.length);
    expect(singleAccessKeyChanges.changes).toEqual(nearBlockChanges.changes);
  });

  // txStatus +
  it("txStatus with string hash", async () => {
    const result = await client.query<{ txStatus: FinalExecutionOutcome }>({
      uri: apiUri,
      query: `query {
        txStatus(
          txHash: $txHash
          accountId: $accountId
        )
      }`,
      variables: {
        txHash: transactionOutcome.transaction.hash,
        accountId: sender.accountId,
      },
    });

    const nearTxStatus = await near.connection.provider.txStatus(transactionOutcome.transaction.hash, sender.accountId);
    const txStatus: FinalExecutionOutcome = result.data!.txStatus;
    const transactionOutcomeTxStatus = txStatus.transaction_outcome;
    const receiptsOutcomeFirst = txStatus.receipts_outcome[0].outcome;
    const receiptsOutcomeSecondary = txStatus.receipts_outcome[1].outcome;

    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();
    expect(receiptsOutcomeSecondary.gas_burnt).toEqual(`${nearTxStatus.receipts_outcome[1].outcome.gas_burnt}`);
    expect(receiptsOutcomeSecondary.receipt_ids).toEqual(nearTxStatus.receipts_outcome[1].outcome.receipt_ids);
    expect(receiptsOutcomeFirst.gas_burnt).toEqual(`${nearTxStatus.receipts_outcome[0].outcome.gas_burnt}`);
    expect(receiptsOutcomeFirst.receipt_ids).toEqual(nearTxStatus.receipts_outcome[0].outcome.receipt_ids);
    expect(receiptsOutcomeSecondary.logs).toEqual(nearTxStatus.receipts_outcome[1].outcome.logs);
    expect(txStatus.transaction.receiverId).toStrictEqual(nearTxStatus.transaction.receiver_id);
    expect(receiptsOutcomeFirst.logs).toEqual(nearTxStatus.receipts_outcome[0].outcome.logs);
    expect(transactionOutcomeTxStatus.id).toStrictEqual(nearTxStatus.transaction_outcome.id);
    expect(txStatus.transaction.signerId).toStrictEqual(nearTxStatus.transaction.signer_id);
    expect(txStatus.transaction.nonce).toStrictEqual(`${nearTxStatus.transaction.nonce}`);
    expect(txStatus.transaction.hash).toStrictEqual(nearTxStatus.transaction.hash);
    expect(transactionOutcomeTxStatus.outcome.gas_burnt).toStrictEqual(
      `${nearTxStatus.transaction_outcome.outcome.gas_burnt}`
    );
    expect(transactionOutcomeTxStatus.outcome.receipt_ids[0]).toStrictEqual(
      `${nearTxStatus.transaction_outcome.outcome.receipt_ids}`
    );
  });

  // txStatusReceipts - Failed parsing args: invalid length 2, expected fewer elements in array, https://docs.near.org/docs/api/rpc/transactions#transaction-status-with-receipts
  /* it("txStatusReceipts", async () => {
    const result = await client.query<{ txStatusReceipts: FinalExecutionOutcomeWithReceipts }>({
      uri: apiUri,
      query: `query {
        txStatusReceipts(
          txHash: $txHash
          accountId: $accountId
        )
      }`,
      variables: {
        txHash: transactionOutcome.transaction.hash,
        accountId: sender.accountId,
      },
    }); 
  });
    }); 
  });
    }); 
  });
    }); 

    // expect(result.errors).toBeFalsy();
    // expect(result.data).toBeTruthy();

    //const txStatusReceipts: FinalExecutionOutcomeWithReceipts = result.data!.txStatusReceipts;

    const nearTxStatusReceipts = await near.connection.provider.txStatusReceipts(
      Uint8Array.from(transactionOutcome.transaction.hash),
      sender.accountId,
    );

     expect("receipts" in txStatusReceipts).toBe(true);
    expect(txStatusReceipts.receipts.length).toBeGreaterThanOrEqual(1);
    expect(txStatusReceipts).toMatchObject(nearTxStatusReceipts); 
  }); */

  //validators +- response error :  [-32000] Server error: Validator info unavailable
  /* it("Get validators", async () => {
    const blockId = latestBlock.header.hash;

    const result = await client.query<{ validators: EpochValidatorInfo }>({
      uri: apiUri,
      query: `query {
        validators(
          blockId: $blockId
        )
      }`,
      variables: {
        blockId: blockId,
      },
    });

    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const validators: EpochValidatorInfo = result.data!.validators;
    expect(validators).toBeTruthy();
    expect(validators.current_validators).toBeTruthy();
    expect(validators.current_validators).toBeInstanceOf(Array);
    expect(validators.next_validators).toBeTruthy();
    expect(validators.next_validators).toBeInstanceOf(Array);
    expect(validators.current_fisherman).toBeTruthy();
    expect(validators.current_fisherman).toBeInstanceOf(Array);
    expect(validators.next_fisherman).toBeTruthy();
    expect(validators.next_fisherman).toBeInstanceOf(Array);
    expect(validators.current_proposals).toBeTruthy();
    expect(validators.current_proposals).toBeInstanceOf(Array);
    expect(validators.prev_epoch_kickout).toBeTruthy();
    expect(validators.prev_epoch_kickout).toBeInstanceOf(Array);
    expect(validators.epoch_height).toBeTruthy();
    expect(validators.epoch_start_height).toBeTruthy();

    const nearValidators = await near.connection.provider.validators(blockId);

    expect(validators.current_validators.length).toStrictEqual(nearValidators.current_validators.length);
    expect(validators.current_validators).toEqual(nearValidators.current_validators);

    expect(validators.next_validators.length).toStrictEqual(nearValidators.next_validators.length);
    expect(validators.next_validators).toEqual(nearValidators.next_validators);

    expect(validators.current_fisherman.length).toStrictEqual(nearValidators.current_fisherman.length);
    expect(validators.current_fisherman).toEqual(nearValidators.current_fisherman);

    expect(validators.next_fisherman.length).toStrictEqual(nearValidators.next_fisherman.length);
    expect(validators.next_fisherman).toEqual(nearValidators.next_fisherman);

    expect(validators.current_proposals.length).toStrictEqual(nearValidators.current_proposals.length);
    expect(validators.current_proposals).toEqual(nearValidators.current_proposals);

    expect(validators.prev_epoch_kickout.length).toStrictEqual(nearValidators.prev_epoch_kickout.length);
    expect(validators.prev_epoch_kickout).toEqual(nearValidators.prev_epoch_kickout);

    expect(validators.epoch_start_height).toEqual(nearValidators.epoch_start_height);
    //expect(validators.epoch_height)
  }); */
});
