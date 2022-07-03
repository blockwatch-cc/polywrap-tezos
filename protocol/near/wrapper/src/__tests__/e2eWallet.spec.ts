/* eslint-disable import/order */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/naming-convention */
import { Input_requestSignIn, Input_signOut, Input_isSignedIn, Input_getAccountId } from "../query/w3";
import * as testUtils from "./testUtils";
import "localstorage-polyfill";
import { buildAndDeployApi, initTestEnvironment } from "@web3api/test-env-js";
import { Web3ApiClient } from "@web3api/client-js";
import * as nearApi from "near-api-js";
import { NearPluginConfig } from "../../../plugin-js/build";
import path from "path";

const MockBrowser = require("mock-browser").mocks.MockBrowser;

jest.setTimeout(360000);
jest.retryTimes(3)

describe("e2e", () => {
  let apiUri: string;
  let client: Web3ApiClient;
  let nearConfig: NearPluginConfig;
  let contractId: string;
  let workingAccount: nearApi.Account;
  let near: nearApi.Near;

  const mock = new MockBrowser();

  beforeAll(async () => {
    global["document"] = mock.getDocument();
    global["window"] = mock.getWindow();
    global["localStorage"] = localStorage;

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
  });

  afterAll(async () => {
    await workingAccount.deleteAccount(testUtils.testAccountId);
  });

  // requestSignIn +
  it("Request sign in", async () => {
    const result = await client.query<{
      requestSignIn: Input_requestSignIn;
    }>({
      uri: apiUri,
      query: `query {
              requestSignIn(
                contractId: $contractId,
                methodNames: $methodNames,
                successUrl: $successUrl,
                failureUrl: $failureUrl,
            )
          }`,
      variables: {
        contractId: contractId,
        methodNames: ["hello"],
        successUrl: "http://example.com/success",
        failureUrl: "http://example.com/fail",
      },
    });
    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const requestSignInSuccess = result.data?.requestSignIn;

    expect(requestSignInSuccess).toBeTruthy();
  });

  // signOut +
  it("Sign out", async () => {
    const result = await client.query<{
      signOut: Input_signOut;
    }>({
      uri: apiUri,
      query: `query {
              signOut
          }`,
      variables: {},
    });

    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const signOutSuccess = result.data?.signOut;

    expect(signOutSuccess).toBeTruthy();
  });

  // isSignedIn +
  it("Is signed in", async () => {
    const result = await client.query<{
      isSignedIn: Input_isSignedIn;
    }>({
      uri: apiUri,
      query: `query {
        isSignedIn
          }`,
      variables: {},
    });
    expect(result.errors).toBeFalsy();
    expect(result).toBeTruthy();
  });

  // getAccountId +
  it("Get account id", async () => {
    const result = await client.query<{
      getAccountId: Input_getAccountId;
    }>({
      uri: apiUri,
      query: `query {
        getAccountId
          }`,
      variables: {},
    });
    expect(result.errors).toBeFalsy();
    expect(result.data).toBeTruthy();

    const getAccountIdSuccess = result.data?.getAccountId;

    expect(getAccountIdSuccess).toBeDefined();
  });
});
