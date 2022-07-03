import { PolywrapClient } from "@polywrap/client-js";
import { inMemoryCachePlugin } from "../";

describe("e2e", () => {

  let client: PolywrapClient;
  const uri = "ens/in-memory.cache.polywrap.eth";

  beforeAll(() => {
    client = new PolywrapClient({
      plugins: [
        {
          uri: uri,
          plugin: inMemoryCachePlugin({})
        }
      ]
    });
  });

  test("set", async () => {
    const setResult = await client.invoke({
      uri,
      method: "set",
      input: {
        key: "a",
        value: "1"
      }
    });

    expect(setResult.error).toBeFalsy();
    expect(setResult.data).toBeTruthy();

    const hasResult = await client.invoke({
      uri,
      method: "has",
      input: {
        key: "a",
      }
    });    

    expect(hasResult.error).toBeFalsy();
    expect(hasResult.data).toBeTruthy();
    expect(hasResult.data).toBe(true);

    const getResult = await client.invoke({
      uri,
      method: "get",
      input: {
        key: "a",
      }
    });    

    expect(getResult.error).toBeFalsy();
    expect(getResult.data).toBeTruthy();
    expect(getResult.data).toBe("1");
  });

  test("delete", async () => {
    const setResult = await client.invoke({
      uri,
      method: "set",
      input: {
        key: "a",
        value: "1"
      }
    });

    expect(setResult.error).toBeFalsy();
    expect(setResult.data).toBeTruthy();

    const deleteResult = await client.invoke({
      uri,
      method: "delete",
      input: {
        key: "a",
      }
    });    

    expect(deleteResult.error).toBeFalsy();
    expect(deleteResult.data).toBeTruthy();

    const hasResult = await client.invoke({
      uri,
      method: "has",
      input: {
        key: "a",
      }
    });    

    expect(hasResult.error).toBeFalsy();
    expect(hasResult.data).toBeFalsy();
  });
});
