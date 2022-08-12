import {
  FeeOptions,
  Token,
  encodeUnwrapWETH9,
  encodeSweepToken,
  encodeRefundETH,
  getFakeTestToken
} from "./helpers";
import { PolywrapClient } from "@polywrap/client-js";
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

  let client: PolywrapClient;
  let fsUri: string;

  beforeAll(async () => {
    // get client
    client = new PolywrapClient();
    // get uri
    const wrapperAbsPath: string = path.resolve(__dirname + "/../../../");
    fsUri = "fs/" + wrapperAbsPath + '/build';
    // set up test case data
    token = getFakeTestToken(0);
  });


  describe('encodeUnwrapWETH9', () => {
    it('works without feeOptions', async () => {
      const calldata: string = await encodeUnwrapWETH9(client, fsUri, amount, recipient);
      expect(calldata).toBe(
        '0x49404b7c000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000003'
      )
    })

    it('works with feeOptions', async () => {
      const calldata: string = await encodeUnwrapWETH9(client, fsUri, amount, recipient, feeOptions)
      expect(calldata).toBe(
        '0x9b2c0a37000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000009'
      )
    })
  })

  describe('encodeSweepToken', () => {
    it('works without feeOptions', async () => {
      const calldata: string = await encodeSweepToken(client, fsUri, token, amount, recipient)
      expect(calldata).toBe(
        '0xdf2ab5bb0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000003'
      )
    })

    it('works with feeOptions', async () => {
      const calldata: string = await encodeSweepToken(client, fsUri, token, amount, recipient, feeOptions)
      expect(calldata).toBe(
        '0xe0e189a00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000009'
      )
    })
  })

  it('encodeRefundETH', async () => {
    const calldata: string = await encodeRefundETH(client, fsUri);
    expect(calldata).toBe('0x12210e8a')
  })
})
