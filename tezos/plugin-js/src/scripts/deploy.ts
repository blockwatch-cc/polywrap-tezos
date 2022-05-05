import { TezosToolkit } from '@taquito/taquito'
import { InMemorySigner } from '@taquito/signer'

export const SIMPLE_CONTRACT = `
{ parameter (or (int %decrement) (int %increment)) ;
    storage int ;
    code { DUP ;
           CDR ;
           DIP { DUP } ;
           SWAP ;
           CAR ;
           IF_LEFT
             { DIP { DUP } ;
               SWAP ;
               DIP { DUP } ;
               PAIR ;
               DUP ;
               CAR ;
               DIP { DUP ; CDR } ;
               SUB ;
               DIP { DROP 2 } }
             { DIP { DUP } ;
               SWAP ;
               DIP { DUP } ;
               PAIR ;
               DUP ;
               CAR ;
               DIP { DUP ; CDR } ;
               ADD ;
               DIP { DROP 2 } } ;
           NIL operation ;
           PAIR ;
           DIP { DROP 2 } } }
`

export const SIMPLE_CONTRACT_STORAGE = 0

export async function deployContract(url: string, privateKey: string, deployParams: any): Promise<string | undefined> {
  const Tezos = new TezosToolkit(url)
  Tezos.setProvider({
    config: {
      defaultConfirmationCount: 2,
      confirmationPollingTimeoutSecond: 10
    }
  })
  const signer = await InMemorySigner.fromSecretKey(privateKey)
  Tezos.setSignerProvider(signer)
  const originationOperation = await Tezos.contract.originate(deployParams)
  const contract = await originationOperation.contract(2)
  return contract.address
}