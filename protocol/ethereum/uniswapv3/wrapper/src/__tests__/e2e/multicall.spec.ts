import { PolywrapClient } from "@polywrap/client-js";
import path from "path";
import { encodeMulticall } from "./helpers";

jest.setTimeout(120000);

describe('Multicall (SDK test replication)', () => {

  let client: PolywrapClient;
  let fsUri: string;

  beforeAll(async () => {
    // get client
    client = new PolywrapClient();
    // get uri
    const wrapperAbsPath: string = path.resolve(__dirname + "/../../../");
    fsUri = "fs/" + wrapperAbsPath + '/build';
  });

  describe('encodeMulticall', () => {
    it('works for string array with length 1', async () => {
      const calldata = await encodeMulticall(client, fsUri, ['0x01']);
      expect(calldata).toBe('0x01');
    });

    it('works for string array with length >1', async () => {
      const calldata = await encodeMulticall(client, fsUri, [
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
      ]);
      expect(calldata).toBe(
        '0xac9650d800000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000020aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0000000000000000000000000000000000000000000000000000000000000020bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
      );
    });
  });
});
