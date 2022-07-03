import { PolywrapClient } from "@polywrap/client-js";
import { dateTimePlugin } from "../";

describe("e2e", () => {

  let client: PolywrapClient;
  const uri = "ens/datetime.polywrap.eth";

  beforeAll(() => {
    // Add the dateTimePlugin to the Web3ApiClient
    client = new PolywrapClient({
      plugins: [
        {
          uri: uri,
          plugin: dateTimePlugin({})
        }
      ]
    });
  });

  test("currentTimestamp", async () => {
    const result = await client.invoke<string>({
      uri,
      method: "currentTimestamp"
    });

    expect(result.error).toBeFalsy();
    expect(result.data).toBeTruthy();
    expect(typeof result.data).toBe("string");
  });
});
