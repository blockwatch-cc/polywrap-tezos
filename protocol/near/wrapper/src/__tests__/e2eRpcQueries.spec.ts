import { NearPluginConfig } from "../../../plugin-js"; //TODO change to appropriate package
import { BlockReference, BlockResult, AccountView, PublicKey, AccessKeyInfo } from "./tsTypes";
import * as testUtils from "./testUtils";
import { ContractStateResult } from "../query/w3";
import { ViewContractCode } from "../query/w3";

import { Web3ApiClient } from "@web3api/client-js";
import * as nearApi from "near-api-js";
import { buildAndDeployApi, initTestEnvironment, stopTestEnvironment } from "@web3api/test-env-js";
import path from "path";
import { AccountAuthorizedApp, AccountBalance } from "near-api-js/lib/account";

jest.setTimeout(360000);
jest.retryTimes(3);

describe("e2e", () => {
  let client: Web3ApiClient;
  let apiUri: string;

  let nearConfig: NearPluginConfig;
  let near: nearApi.Near;
  let workingAccount: nearApi.Account;
  let contractId: string;

  beforeAll(async () => {
    // set up test env and deploy api
    const { ethereum, ensAddress, ipfs } = await initTestEnvironment();
    const apiPath: string = path.resolve(__dirname + "/../../");

    const api = await buildAndDeployApi(apiPath, ipfs, ensAddress);
    apiUri = `ens/testnet/${api.ensDomain}`;
    // set up client
    nearConfig = await testUtils.setUpTestConfig();
    near = await nearApi.connect(nearConfig);

    const plugins = testUtils.getPlugins(ethereum, ensAddress, ipfs, nearConfig);
    client = new Web3ApiClient(plugins);

    // set up contract account
    contractId = testUtils.generateUniqueString("test");

    workingAccount = await testUtils.createAccount(near);
    await testUtils.deployContract(workingAccount, contractId);

    // set up access key
    /*
    const keyPair = KeyPair.fromRandom("ed25519");
    // set up access key
    await workingAccount.addKey(
      keyPair.getPublicKey(),
      contractId,
      testUtils.HELLO_WASM_METHODS.changeMethods,
      new BN("2000000000000000000000000")
    );

    await nearConfig.keyStore!.setKey(testUtils.networkId, workingAccount.accountId, keyPair);
    */
  });

  afterAll(async () => {
    await stopTestEnvironment();
    await workingAccount.deleteAccount(testUtils.testAccountId);
  });

  // block +
  it("Get block information", async () => {
    const blockQuery: BlockReference = { finality: "final" };
    const result = await client.query<{ getBlock: BlockResult }>({
      uri: apiUri,
      query: `query {
        getBlock(
          blockQuery: $blockQuery
        )
      }`,
      variables: {
        blockQuery: blockQuery,
      },
    });
    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const block: BlockResult = result.data!.getBlock;
    expect(block.author).toBeTruthy();
    expect(block.header).toBeTruthy();
    expect(block.chunks.length).toBeGreaterThan(0);
    expect(block.chunks[0]).toBeTruthy();

    const nearBlock = await (near.connection.provider as nearApi.providers.JsonRpcProvider).block({
      blockId: Number.parseInt(block.header.height),
    });
    expect(block.author).toStrictEqual(nearBlock.author);
    expect(block.header.hash).toStrictEqual(nearBlock.header.hash);
    expect(block.header.signature).toStrictEqual(nearBlock.header.signature);
    expect(block.chunks[0].chunk_hash).toStrictEqual(nearBlock.chunks[0].chunk_hash);
  });

  // account state +
  it("Get account state", async () => {
    const result = await client.query<{ getAccountState: AccountView }>({
      uri: apiUri,
      query: `query {
        getAccountState(
          accountId: $accountId
        )
      }`,
      variables: {
        accountId: workingAccount.accountId,
      },
    });
    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const state: AccountView = result.data!.getAccountState;
    expect(state).toBeTruthy();

    const nearState = await workingAccount.state();

    expect(state.amount).toStrictEqual(nearState.amount);
    expect(state.locked).toStrictEqual(nearState.locked);
    expect(state.codeHash).toStrictEqual(nearState.code_hash);
    expect(state.storagePaidAt).toStrictEqual(nearState.storage_paid_at.toString());
    expect(state.storageUsage).toStrictEqual(nearState.storage_usage.toString());
  });

  // contract state +
  it("Get contract state", async () => {
    const blockQuery = { block_id: null, finality: "final", syncCheckpoint: null };
    const result = await client.query<{ viewContractState: ContractStateResult }>({
      uri: apiUri,
      query: `query {
        viewContractState(
          prefix: $prefix
          blockQuery: $blockQuery,
          accountId: $accountId
        )
      }`,
      variables: {
        prefix: "",
        blockQuery: blockQuery,
        accountId: workingAccount.accountId,
      },
    });
    const state: ContractStateResult = result.data!.viewContractState;
    const resultState = await workingAccount.viewState("final");
    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();
    expect(state).toBeTruthy();
    expect(result.data).toEqual({ viewContractState: { values: [] } });
    expect(result.errors).toEqual(undefined);
    expect(resultState).toBeTruthy();
    expect(resultState).toEqual([]);
  });

  // contract code
  it("Get contract code", async () => {
    const result = await client.query<{ viewContractCode: ViewContractCode }>({
      uri: apiUri,
      query: `query {
        viewContractCode(
          accountId: $accountId
        )
      }`,
      variables: {
        accountId: contractId,
      },
    });

    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const response = await near.connection.provider.query({
      account_id: contractId,
      finality: "optimistic",
      request_type: "view_code",
    });

    expect(response).toBeTruthy();
    //@ts-ignore
    expect(response?.code_base64).toStrictEqual(result.data?.viewContractCode.code_base64);
  });

  // account balance +
  it("Get account balance", async () => {
    const result = await client.query<{ getAccountBalance: AccountBalance }>({
      uri: apiUri,
      query: `query {
        getAccountBalance(
          accountId: $accountId
        )
      }`,
      variables: {
        accountId: workingAccount.accountId,
      },
    });

    const resultBalance: AccountBalance = result.data!.getAccountBalance;
    const actualBalance = await workingAccount.getAccountBalance();
    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();
    expect(resultBalance).toBeTruthy();
    expect(resultBalance.available).toStrictEqual(actualBalance.available);
    expect(resultBalance.staked).toStrictEqual(actualBalance.staked);
    expect(resultBalance.stateStaked).toStrictEqual(actualBalance.stateStaked);
    expect(resultBalance.total).toStrictEqual(actualBalance.total);
  });

  // account details +
  it("Get account details", async () => {
    const result = await client.query<{ getAccountDetails: AccountAuthorizedApp[] }>({
      uri: apiUri,
      query: `query {
        getAccountDetails(
          accountId: $accountId
        )
      }`,
      variables: {
        accountId: workingAccount.accountId,
      },
    });
    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const authorizedApps: AccountAuthorizedApp[] = result.data!.getAccountDetails;
    expect(authorizedApps).toBeTruthy();
    expect(authorizedApps).toBeInstanceOf(Array);

    const { authorizedApps: nearAuthorizedApps } = await workingAccount.getAccountDetails();

    expect(authorizedApps.length).toEqual(nearAuthorizedApps.length);
    expect(authorizedApps).toEqual(nearAuthorizedApps);
  });

  // account details +- TODO
  it("Get access keys", async () => {
    const result = await client.query<{ getAccessKeys: AccessKeyInfo[] }>({
      uri: apiUri,
      query: `query {
        getAccessKeys(
          accountId: $accountId
        )
      }`,
      variables: {
        accountId: workingAccount.accountId,
      },
    });
    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const accessKeys: AccessKeyInfo[] = result.data!.getAccessKeys;
    expect(accessKeys).toBeTruthy();
    expect(accessKeys).toBeInstanceOf(Array);

    const nearAccessKeys = await workingAccount.getAccessKeys();

    expect(accessKeys.length).toEqual(nearAccessKeys.length);
    //expect(accessKeys).toEqual(nearAccessKeys);
  });

  // get public key +
  it("Get public key", async () => {
    const result = await client.query<{ getPublicKey: PublicKey }>({
      uri: apiUri,
      query: `query {
        getPublicKey(
          accountId: $accountId
        )
      }`,
      variables: {
        accountId: workingAccount.accountId,
      },
    });
    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const publicKey: PublicKey = result.data!.getPublicKey;

    expect(publicKey).toBeTruthy();

    const nearKey = await near.connection.signer.getPublicKey(workingAccount.accountId, testUtils.networkId);
    expect(publicKey.data).toStrictEqual(nearKey.data);

    const publicKeyStr: string = testUtils.publicKeyToStr(publicKey);
    const nearKeyStr = nearApi.utils.PublicKey.from(nearKey).toString();
    expect(publicKeyStr).toStrictEqual(nearKeyStr);
  });

  // find access key +
  it("Find access key", async () => {
    const result = await client.query<{ findAccessKey: AccessKeyInfo }>({
      uri: apiUri,
      query: `query {
        findAccessKey(
          accountId: $accountId
        )
      }`,
      variables: {
        accountId: workingAccount.accountId,
      },
    });
    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const accessKeyInfo: AccessKeyInfo = result.data!.findAccessKey;

    expect(accessKeyInfo.publicKey).toBeTruthy();
    expect(accessKeyInfo.accessKey).toBeTruthy();

    //const apiKey: AccessKey = accessKeyInfo.accessKey;

    const nearAccessKey = await workingAccount.findAccessKey(workingAccount.accountId, []);

    expect(accessKeyInfo.publicKey).toEqual(nearAccessKey.publicKey.toString());

    /* 
    const nearPermission = nearAccessKey.accessKey.permission;
    console.log("apiKey", apiKey);
    console.log("nearAccessKey", nearAccessKey);

    expect(apiKey.permission).toEqual(nearPermission); 
    */

    // access key
    /* // TODO What is this ? 
    if (nearPermission === "FullAccess") {
      // this should never happen
      throw Error("This should never happen");
    } else {
      expect(apiKey.permission.isFullAccess).toBeFalsy();
      expect(apiKey.permission.receiverId).toStrictEqual(nearPermission.FunctionCall.receiver_id);
      expect(apiKey.permission.methodNames).toStrictEqual(nearPermission.FunctionCall.method_names);
      expect(apiKey.permission.allowance).toStrictEqual(nearPermission.FunctionCall.allowance.toString());
    } 
    */

    expect(accessKeyInfo.publicKey).toStrictEqual(nearAccessKey.publicKey.toString());
  });

  // view function +-
  it("view function via account", async () => {
    const methodName = "hello"; // this is the function defined in hello.wasm file that we are calling
    const args = { name: "world" };

    const result = await client.query<{ viewFunction: any }>({
      uri: apiUri,
      query: `query {
        viewFunction(
          contractId: $contractId
          methodName: $methodName
          args: $args
        )
      }`,
      variables: {
        contractId: contractId,
        methodName: methodName,
        args: JSON.stringify(args),
      },
    });

    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const viewFunctionResult = result.data!.viewFunction;

    expect(viewFunctionResult).toBeTruthy();
    const fnResult = JSON.parse(viewFunctionResult).result;
    expect(fnResult).toBeTruthy();

    const parsedResult = new TextDecoder().decode(Uint8Array.from(fnResult).buffer).replace(/\"/g, "");

    const nearViewFunctionResult = await workingAccount.viewFunction(contractId, methodName, args);

    expect(parsedResult).toEqual(nearViewFunctionResult);
  });
});
