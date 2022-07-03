import { PolywrapClient } from "@polywrap/client-js";
import {
  initTestEnvironment,
  runCLI,
  stopTestEnvironment,
} from "@polywrap/test-env-js";
import { getPlugins } from "./utils";

jest.setTimeout(300000);

describe("e2e", () => {
  let client: PolywrapClient;
  let ensUri: string;

  const POLYWRAP_CLI = `${__dirname}/../../node_modules/polywrap/bin/polywrap`;

  beforeAll(async () => {
    await initTestEnvironment(POLYWRAP_CLI);
    // get cliente
    await runCLI({
      args: ["build"],
      cwd: `${__dirname}/integration`,
      cli: POLYWRAP_CLI,
    });
    const clientConfig = getPlugins();
    client = new PolywrapClient({ ...clientConfig, tracingEnabled: true });
    ensUri = `fs/${__dirname}/integration/build`;
  });

  afterAll(async () => {
    await stopTestEnvironment();
  });

  test("asyncBatchFetch", async () => {
    const result = await client.invoke({
      uri: ensUri,
      method: "asyncBatchFetch",
      args: { delays: ["1", "2", "3"] },
    });
    expect(result.error).toBeFalsy();
    expect(result.data).toBeTruthy();
    expect(result.data).toHaveLength(3);
  });

  test("batchFetch", async () => {
    const result = await client.invoke({
      uri: ensUri,
      method: "batchFetch",
      args: { delays: ["1", "2", "3"] },
    });
    expect(result.error).toBeFalsy();
    expect(result.data).toBeTruthy();
    expect(result.data).toHaveLength(3);
  });
});
