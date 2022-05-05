import { tezosDomainsPlugin } from "..";
import * as Types from "../w3";

import { Web3ApiClient } from "@web3api/client-js";

jest.setTimeout(360000)

describe("Tezos Domains Plugin", () => {
  let client: Web3ApiClient;
  let uri: string;

  beforeAll(async () => {
    uri = "w3://ens/tezos-domains.web3api.eth"

    client = new Web3ApiClient({
      plugins: [
        {
          uri,
          plugin: tezosDomainsPlugin({
            defaultNetwork: "mainnet"
          }),
        },
      ],
    });
  });

  describe("Query", () => {
    describe("getAcquisitionInfo", () => {
      it("returns the acquisition state of the domain name", async () => {
        const response  = await client.query<{ getAcquisitionInfo: Types.AcquisitionInfo }>({
          uri,
          query: `
            query {
              getAcquisitionInfo(
                domain: "zillow.tez", 
                duration: ${2}
              )
            }
          `
        })

        expect(response.errors).toBeUndefined()
        expect(response.data?.getAcquisitionInfo.state).toBe("Taken")
      })

      it("returns the acquisition state of the domain name", async () => {
        const response  = await client.query<{ getAcquisitionInfo: Types.AcquisitionInfo }>({
          uri,
          query: `
            query {
              getAcquisitionInfo(
                domain: "zillow-hopefully-no-one-creates-a-domain-long-as-this-1292.tez", 
              )
            }
          `
        })

        expect(response.errors).toBeUndefined()
        expect(response.data?.getAcquisitionInfo.state).toBe("CanBeBought")
        expect(response.data?.getAcquisitionInfo.cost).toBeDefined()
        expect(response.data?.getAcquisitionInfo.duration).toBeDefined()
      })
    })

    describe("bytesToHex", () => {
      it("encode bytes string to hex", async () => {
        const response  = await client.query<{ bytesToHex: string }>({
          uri,
          query: `
            query {
              bytesToHex(
                bytes: "05070707070a00000006636f6d6d69740a0000001600007128c922351e2a0b591f36ce638880052891b9f6009ada90d503"
              )
            }
          `
        })
  
        expect(response.errors).toBeUndefined()
        expect(response.data?.bytesToHex).toBeDefined()
        expect(response.data?.bytesToHex).toBe("7b90cd2abd2ca06e4349e63e1913f7f25351cc1ac432cafc24033941fbfb88f40c91386b2449e33aac7a3b99e9be37da70270138cb06db702a92243874324913")
      })
    })

    describe("char2Bytes", () => {
      it("encodes characters to bytes", async () => {
        const response  = await client.query<{ char2Bytes: string }>({
          uri,
          query: `
            query {
              char2Bytes(
                text: "commit"
              )
            }
          `
        })
    
        expect(response.errors).toBeUndefined()
        expect(response.data?.char2Bytes).toBeDefined()
        expect(response.data?.char2Bytes).toBe("636f6d6d6974")
      })
    })
  })
});
