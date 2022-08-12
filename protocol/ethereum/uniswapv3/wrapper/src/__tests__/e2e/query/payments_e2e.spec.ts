import { FeeOptions, Token } from "../types";
import { getFakeTestToken, getPlugins } from "../testUtils";
import {
  encodeUnwrapWETH9,
  encodeSweepToken,
  encodeRefundETH,
} from "../wrappedQueries";
import { ClientConfig, Web3ApiClient } from "@web3api/client-js";
import { buildAndDeployApi, initTestEnvironment, stopTestEnvironment } from "@web3api/test-env-js";
import path from "path";

jest.setTimeout(120000);

describe('Payments (SDK test replication)', () => {

  const recipient = '0x0000000000000000000000000000000000000003';
  const amount = 123;
  const feeOptions: FeeOptions = {
    fee: "0.001",
    recipient: '0x0000000000000000000000000000000000000009',
  }

  let token: Token;

  let client: Web3ApiClient;
  let ensUri: string;

  beforeAll(async () => {
    const { ipfs, ethereum, ensAddress, registrarAddress, resolverAddress } = await initTestEnvironment();
    // get client
    const config: ClientConfig = getPlugins(ethereum, ipfs, ensAddress);
    client = new Web3ApiClient(config);
    // deploy api
    const apiPath: string = path.resolve(__dirname + "/../../../../");
    const api = await buildAndDeployApi({
      apiAbsPath: apiPath,
      ipfsProvider: ipfs,
      ensRegistryAddress: ensAddress,
      ethereumProvider: ethereum,
      ensRegistrarAddress: registrarAddress,
      ensResolverAddress: resolverAddress,
    });
    ensUri = `ens/testnet/${api.ensDomain}`;
    // set up test case data
    token = getFakeTestToken(0);
  });

  afterAll(async () => {
    await stopTestEnvironment();
  });


  describe('encodeUnwrapWETH9', () => {
    it('works without feeOptions', async () => {
      const calldata: string = await encodeUnwrapWETH9(client, ensUri, amount, recipient);
      expect(calldata).toBe(
        '0x49404b7c000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000003'
      )
    })

    it('works with feeOptions', async () => {
      const calldata: string = await encodeUnwrapWETH9(client, ensUri, amount, recipient, feeOptions)
      expect(calldata).toBe(
        '0x9b2c0a37000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000009'
      )
    })
  })

  describe('encodeSweepToken', () => {
    it('works without feeOptions', async () => {
      const calldata: string = await encodeSweepToken(client, ensUri, token, amount, recipient)
      expect(calldata).toBe(
        '0xdf2ab5bb0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000003'
      )
    })

    it('works with feeOptions', async () => {
      const calldata: string = await encodeSweepToken(client, ensUri, token, amount, recipient, feeOptions)
      expect(calldata).toBe(
        '0xe0e189a00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000009'
      )
    })
  })

  it('encodeRefundETH', async () => {
    const calldata: string = await encodeRefundETH(client, ensUri);
    expect(calldata).toBe('0x12210e8a')
  })
})
