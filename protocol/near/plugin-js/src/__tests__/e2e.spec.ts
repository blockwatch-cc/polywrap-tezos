import { Web3ApiClient } from "@web3api/client-js";
import { nearPlugin, NearPluginConfig } from "..";
import { PublicKey } from "../w3";
import "localstorage-polyfill";
import * as testUtils from "./testUtils";
import * as nearApi from "near-api-js";
import { KeyPair } from "near-api-js";

import BN from "bn.js";
const MockBrowser = require("mock-browser").mocks.MockBrowser;

import { HELLO_WASM_METHODS } from "./testUtils";

jest.setTimeout(360000);

describe("e2e", () => {
  const mock = new MockBrowser();

  let client: Web3ApiClient;
  const uri = "w3://ens/near.web3api.eth";

  let config: NearPluginConfig;

  global["document"] = mock.getDocument();
  global["window"] = mock.getWindow();
  global["localStorage"] = localStorage;

  let walletConnection: nearApi.WalletConnection;
  let near: nearApi.Near;
  let workingAccount: nearApi.Account;
  let contractId: string;

  beforeAll(async () => {
    config = await testUtils.setUpTestConfig();
    near = await nearApi.connect(config);
    client = new Web3ApiClient({
      plugins: [
        {
          uri: uri,
          plugin: nearPlugin(config),
        },
      ],
    });
  });

  beforeEach(async () => {
    // set up contract account
    contractId = testUtils.generateUniqueString("test");
    workingAccount = await testUtils.createAccount(near);
    await testUtils.deployContract(workingAccount, contractId);
    // set up access key
    const keyPair = KeyPair.fromRandom("ed25519");
    await workingAccount.addKey(
      keyPair.getPublicKey(),
      contractId,
      HELLO_WASM_METHODS.changeMethods,
      new BN("2000000000000000000000000")
    );
    await config.keyStore!.setKey(
      testUtils.networkId,
      workingAccount.accountId,
      keyPair
    );
    walletConnection = await new nearApi.WalletConnection(near, "polywrap");
  });

  it("Request sign transactions", async () => {
    const BLOCK_HASH = "244ZQ9cgj3CQ6bWBdytfrJMuMQ1jdXLFGnr4HhvtCTnM";
    const blockHash = nearApi.utils.serialize.base_decode(BLOCK_HASH);

    const actions = [nearApi.transactions.transfer(new BN("1"))];
    function createTransferTx() {
      return nearApi.transactions.createTransaction(
        "test.near",
        nearApi.utils.PublicKey.fromString(
          "Anu7LYDfpLtkP7E16LT9imXF694BdQaa9ufVkQiwTQxC"
        ),
        "whatever.near",
        1,
        actions,
        blockHash
      );
    }
    const transfer = createTransferTx();
    await walletConnection.requestSignTransactions({
      transactions: [transfer],
      callbackUrl: window.location.href,
      meta: "",
    });

    const result = await client.query<{
      requestSignTransactions: Boolean;
    }>({
      uri,
      query: `mutation {
      requestSignTransactions(
        transactions:$transactions
        callbackUrl:$callbackUrl
        meta:$meta
      )
    }`,
      variables: {
        transactions: [transfer],
        callbackUrl: "",
        meta: "",
      },
    });
    expect(result.errors).toBeFalsy();
    expect(result.data).toEqual({ requestSignTransactions: true });
    expect(result.errors).toEqual(undefined);
    const requestSuccess: Boolean = result.data!.requestSignTransactions;
    expect(requestSuccess).toEqual(true);
  });

  it("Create key", async () => {
    const result = await client.query<{
      createKey: Promise<PublicKey>;
    }>({
      uri,
      query: `mutation {
        createKey(
        accountId: $accountId,
        networkId: $networkId,
      )
    }`,
      variables: {
        accountId: testUtils.testAccountId,
        networkId: config.networkId,
      },
    });

    expect(result.errors).toBeFalsy();
    expect(result).toBeTruthy();
    expect(result.errors).toEqual(undefined);
    const requestSuccess: Promise<PublicKey> = result.data!.createKey;
    expect((await requestSuccess).data).toBeInstanceOf(Uint8Array);
    expect((await requestSuccess).keyType).toEqual(0);
    const key = await near.connection.signer.getPublicKey(
      testUtils.testAccountId,
      config.networkId
    );
    expect(await requestSuccess).toEqual(key);
  });
});
