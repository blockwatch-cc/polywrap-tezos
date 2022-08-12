import { Subscription, PolywrapClient } from "@polywrap/client-js"

import { Tezos_OperationStatus } from "../wrap"

export const getRandomString = () => {
    return (Math.floor(Math.random() * 1000000)).toString()
}

export const waitForConfirmation = async (client: PolywrapClient, hash: string, confirmations: number = 3) => {
    const getSubscription: Subscription<Tezos_OperationStatus> = client.subscribe<Tezos_OperationStatus>({
        uri: "wrap://ens/tezos.polywrap.eth",
        method: "getOperationStatus",
        args: {
          hash,
          network: "ghostnet"
        },
        frequency: { ms: 4500 },
      });

      for await (let query of getSubscription) {
        if (query.error) {
          continue
        }
        expect(query.error).toBeUndefined();
        const operationStatus = query.data;
        if (operationStatus !== undefined) {
          if (operationStatus.confirmations > confirmations) {
            break
          }
        }
      }   
}