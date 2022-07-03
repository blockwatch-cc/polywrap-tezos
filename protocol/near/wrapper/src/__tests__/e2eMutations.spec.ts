import * as testUtils from "./testUtils";
import { Near_FinalExecutionOutcome } from "../w3";
import { KeyPair, NearPluginConfig } from "../../../plugin-js"; //TODO change to appropriate package

import { Web3ApiClient } from "@web3api/client-js";
import * as nearApi from "near-api-js";
import { buildAndDeployApi, initTestEnvironment, stopTestEnvironment } from "@web3api/test-env-js";
import path from "path";
import { BN } from "bn.js";
import * as fs from "fs";

import "localstorage-polyfill";

const MockBrowser = require("mock-browser").mocks.MockBrowser;
const mock = new MockBrowser();

global["document"] = mock.getDocument();
global["window"] = mock.getWindow();
global["localStorage"] = localStorage;

jest.setTimeout(360000);
jest.retryTimes(3)

describe("e2e", () => {
  let client: Web3ApiClient;
  let apiUri: string;
  let near: nearApi.Near;
  let nearConfig: NearPluginConfig;
  let contractId: string;
  let workingAccount: nearApi.Account;
  let masterAccount: nearApi.Account;

  beforeAll(async () => {
    // set up test env and deploy api
    const { ethereum, ensAddress, ipfs } = await initTestEnvironment();
    const apiPath: string = path.resolve(__dirname + "/../../");
    const api = await buildAndDeployApi(apiPath, ipfs, ensAddress);

    nearConfig = await testUtils.setUpTestConfig();
    near = await nearApi.connect(nearConfig);
    // set up client
    apiUri = `ens/testnet/${api.ensDomain}`;
    const polywrapConfig = testUtils.getPlugins(ethereum, ensAddress, ipfs, nearConfig);
    client = new Web3ApiClient(polywrapConfig);

    contractId = testUtils.generateUniqueString("test");
    workingAccount = await testUtils.createAccount(near);
    await testUtils.deployContract(workingAccount, contractId);

    masterAccount = await near.account(testUtils.testAccountId);
  });

  afterAll(async () => {
    await stopTestEnvironment();
    await workingAccount.deleteAccount(testUtils.testAccountId);
  });

  // create account +
  it("Create account", async () => {
    const newAccountId = testUtils.generateUniqueString("test");

    const accountToCreate = await near.account(newAccountId);

    expect(accountToCreate.state()).rejects.toThrow();

    const { amount } = await workingAccount.state();
    const newAmount = new BN(amount).div(new BN(10)).toString();

    const newPublicKey = await near.connection.signer.createKey(newAccountId, testUtils.networkId);

    const result = await client.query<{ createAccount: Near_FinalExecutionOutcome }>({
      uri: apiUri,
      query: `mutation {
        createAccount(
          newAccountId: $newAccountId
          publicKey: $publicKey
          amount: $amount
          signerId: $signerId
        )
      }`,
      variables: {
        newAccountId: newAccountId,
        publicKey: newPublicKey,
        amount: newAmount,
        signerId: testUtils.testAccountId,
      },
    });

    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const creationResult = result.data!.createAccount;

    expect(creationResult).toBeTruthy();
    expect(creationResult.status.failure).toBeFalsy();
    expect(creationResult.status.SuccessValue).toBeDefined();

    const accountCreated = await near.account(newAccountId);

    expect(accountCreated.state()).resolves;

    await accountCreated.deleteAccount(testUtils.testAccountId);
  });

  // delete account +
  it("Delete account", async () => {
    const accountToDelete = await testUtils.createAccount(near);

    expect(accountToDelete.state()).resolves;

    const result = await client.query<{ deleteAccount: Near_FinalExecutionOutcome }>({
      uri: apiUri,
      query: `mutation {
        deleteAccount(
          accountId: $accountId
          beneficiaryId: $beneficiaryId
          signerId: $signerId
          )
        }`,
      variables: {
        accountId: accountToDelete.accountId,
        beneficiaryId: testUtils.testAccountId,
        signerId: accountToDelete.accountId,
      },
    });

    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const deletionResult = result.data!.deleteAccount;

    expect(deletionResult).toBeTruthy();
    expect(deletionResult.status.failure).toBeFalsy();
    expect(deletionResult.status.SuccessValue).toBeDefined();
    expect(accountToDelete.state()).rejects.toThrow();
  });
  // add key +
  it("Add key", async () => {
    const newPublicKey = nearApi.utils.KeyPair.fromRandom("ed25519").getPublicKey();

    const { amount } = await workingAccount.state();
    const newAmount = new BN(amount).div(new BN(10)).toString();

    const detailsBefore = await workingAccount.getAccountDetails();

    const result = await client.query<{ addKey: Near_FinalExecutionOutcome }>({
      uri: apiUri,
      query: `mutation {
        addKey(
          publicKey: $publicKey
          contractId: $contractId
          methodNames: $methodNames
          amount: $amount
          signerId: $signerId
          )
        }`,
      variables: {
        publicKey: newPublicKey,
        contractId: contractId,
        methodNames: [],
        amount: newAmount,
        signerId: workingAccount.accountId,
      },
    });

    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const addKeyResult = result.data!.addKey;

    expect(addKeyResult).toBeTruthy();
    expect(addKeyResult.status.failure).toBeFalsy();
    expect(addKeyResult.status.SuccessValue).toBeDefined();

    const detailsAfter = await workingAccount.getAccountDetails();

    expect(detailsAfter.authorizedApps.length).toBeGreaterThan(detailsBefore.authorizedApps.length);
    expect(detailsAfter.authorizedApps).toEqual(
      expect.arrayContaining([
        {
          contractId: contractId,
          amount: newAmount,
          publicKey: newPublicKey.toString(),
        },
      ])
    );
  });

  // delete key +
  it("Delete key", async () => {
    const newPublicKey = nearApi.utils.KeyPair.fromRandom("ed25519").getPublicKey();

    const detailsBefore = await workingAccount.getAccountDetails();

    await workingAccount.addKey(newPublicKey, contractId, "", new BN(400000));

    const detailsAfterAddKey = await workingAccount.getAccountDetails();

    expect(detailsAfterAddKey.authorizedApps.length).toBeGreaterThan(detailsBefore.authorizedApps.length);

    const result = await client.query<{ deleteKey: Near_FinalExecutionOutcome }>({
      uri: apiUri,
      query: `mutation {
        deleteKey(
          publicKey: $publicKey
          signerId: $signerId
          )
        }`,
      variables: {
        publicKey: newPublicKey,
        signerId: workingAccount.accountId,
      },
    });

    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const deleteKeyResult = result.data!.deleteKey;

    expect(deleteKeyResult).toBeTruthy();
    expect(deleteKeyResult.status.failure).toBeFalsy();
    expect(deleteKeyResult.status.SuccessValue).toBeDefined();

    const detailsAfterDeleteKey = await workingAccount.getAccountDetails();

    expect(detailsBefore.authorizedApps.length).toEqual(detailsAfterDeleteKey.authorizedApps.length);
  });

  // send money +
  it("Send money", async () => {
    let receiver = masterAccount
    const receiverBalanceBefore = await receiver.getAccountBalance();

    const { amount } = await workingAccount.state();
    const newAmount = new BN(amount).div(new BN(10)).toString();

    const result = await client.query<{ sendMoney: Near_FinalExecutionOutcome }>({
      uri: apiUri,
      query: `mutation {
        sendMoney(
          amount: $amount
          receiverId: $receiverId
          signerId: $signerId
          )
        }`,
      variables: {
        amount: newAmount,
        receiverId: receiver.accountId,
        signerId: workingAccount.accountId,
      },
    });

    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const sendMoneyResult = result.data!.sendMoney;

    expect(sendMoneyResult).toBeTruthy();
    expect(sendMoneyResult.status.failure).toBeFalsy();
    expect(sendMoneyResult.status.SuccessValue).toBeDefined();

    const receiverBalanceAfter = await receiver.getAccountBalance();

    expect(new BN(receiverBalanceAfter.total).gt(new BN(receiverBalanceBefore.total))).toEqual(true);

    expect(new BN(receiverBalanceAfter.total).sub(new BN(newAmount)).toString()).toEqual(receiverBalanceBefore.total);

  });

  // createAndDeplyt contract +
  it("Create and deploy contract", async () => {
    const newContractId = testUtils.generateUniqueString("test_contract");

    const data = fs.readFileSync(testUtils.HELLO_WASM_PATH);

    const { amount } = await masterAccount.state();
    const newAmount = new BN(amount).div(new BN(100)).toString();

    const signerPublicKey = await masterAccount.connection.signer.getPublicKey(
      masterAccount.accountId,
      testUtils.networkId
    );

    const result = await client.query<{ createAndDeployContract: Near_FinalExecutionOutcome }>({
      uri: apiUri,
      query: `mutation {
        createAndDeployContract(
          contractId: $contractId
          publicKey: $publicKey
          data: $data
          amount: $amount
          signerId: $signerId
        )
      }`,
      variables: {
        contractId: newContractId,
        data: data,
        amount: newAmount,
        publicKey: signerPublicKey,
        signerId: masterAccount.accountId,
      },
    });

    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const createAndDeployContractResult = result.data!.createAndDeployContract;

    expect(createAndDeployContractResult).toBeTruthy();
    expect(createAndDeployContractResult.status.failure).toBeFalsy();
    expect(createAndDeployContractResult.status.SuccessValue).toBeDefined();
  });

  // deploy contract +
  it("Deploy contract", async () => {
    const newContractId = testUtils.generateUniqueString("test_contract");

    const data = fs.readFileSync(testUtils.HELLO_WASM_PATH);

    const keyPair = KeyPair.fromRandom("ed25519");
    const newPublicKey = keyPair.getPublicKey();

    const { amount } = await masterAccount.state();
    const newAmount = new BN(amount).div(new BN(100));

    await masterAccount.createAccount(newContractId, newPublicKey, newAmount);

    const result = await client.query<{ deployContract: Near_FinalExecutionOutcome }>({
      uri: apiUri,
      query: `mutation {
        deployContract(
          data: $data
          contractId: $contractId
          signerId: $signerId
        )
      }`,
      variables: {
        data: data,
        contractId: masterAccount.accountId,
        signerId: masterAccount.accountId,
      },
    });

    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const deployContractResult = result.data!.deployContract;

    expect(deployContractResult).toBeTruthy();
    expect(deployContractResult.status.failure).toBeFalsy();
    expect(deployContractResult.status.SuccessValue).toBeDefined();
  });

  // function call +
  it("FunctionCall with json stringified args", async () => {
    const jsonArgs = JSON.stringify({ name: "trex" });

    const result = await client.query<{ functionCall: Near_FinalExecutionOutcome }>({
      uri: apiUri,
      query: `mutation {
        functionCall(
          contractId: $contractId
          methodName: $methodName
          args: $args
          gas: $gas
          deposit: $deposit
          signerId: $signerId
        )
      }`,
      variables: {
        contractId: contractId,
        methodName: "hello",
        args: jsonArgs,
        gas: new BN("20000000000000").toString(),
        deposit: new BN("20000000000000").toString(),
        signerId: workingAccount.accountId,
      },
    });

    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const functionResult = result.data!.functionCall;

    expect(functionResult).toBeTruthy();
    expect(functionResult.status.failure).toBeFalsy();
    expect(functionResult.status.SuccessValue).toBeDefined();
  });
});
