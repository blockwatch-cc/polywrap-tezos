import {
  Input_requestSignTransactions,
  Input_sendJsonRpc,
  Input_sendTransaction,
  Input_sendTransactionAsync,
  Input_signAndSendTransaction,
  Input_signAndSendTransactionAsync,
  Near_AccessKey,
  Near_Action,
  Near_Mutation,
  Near_Transaction,
  Near_PublicKey,
  Near_SignTransactionResult,
  Near_FinalExecutionOutcome,
  Input_addKey,
  Input_createAccount,
  Input_deleteAccount,
  Input_deployContract,
  Input_sendMoney,
  Input_functionCall,
  Input_deleteKey,
  Input_createAndDeployContract,
} from "./w3";
import JsonRpcProvider from "../utils/JsonRpcProvider";
import { BigInt, JSON } from "@web3api/wasm-as";
import { createTransaction, signTransaction } from "../query";
import { Input_createTransaction } from "../query/w3";
import * as action from "../utils/actionCreators";
import { fullAccessKey, functionCallAccessKey } from "../utils/typeUtils";

export function sendJsonRpc(input: Input_sendJsonRpc): JSON.Obj {
  const provider: JsonRpcProvider = new JsonRpcProvider(null);
  return provider.sendJsonRpc(input.method, input.params as JSON.Obj);
}

export function requestSignTransactions(input: Input_requestSignTransactions): boolean {
  return Near_Mutation.requestSignTransactions({
    transactions: input.transactions,
    callbackUrl: input.callbackUrl,
    meta: input.meta,
  }).unwrap();
}

export function sendTransaction(input: Input_sendTransaction): Near_FinalExecutionOutcome {
  return Near_Mutation.sendTransaction({ signedTx: input.signedTx }).unwrap();
}

export function sendTransactionAsync(input: Input_sendTransactionAsync): string {
  return Near_Mutation.sendTransactionAsync({ signedTx: input.signedTx }).unwrap();
}

export function signAndSendTransaction(input: Input_signAndSendTransaction): Near_FinalExecutionOutcome {
  const transaction: Near_Transaction = createTransaction({
    receiverId: input.receiverId,
    actions: input.actions,
    signerId: input.signerId,
  });
  const signedTxResult: Near_SignTransactionResult = signTransaction({ transaction: transaction });
  return sendTransaction({ signedTx: signedTxResult.signedTx });
}

export function signAndSendTransactionAsync(input: Input_signAndSendTransactionAsync): string {
  const transaction: Near_Transaction = createTransaction({
    receiverId: input.receiverId,
    actions: input.actions,
    signerId: input.signerId,
  });
  const signedTxResult: Near_SignTransactionResult = signTransaction({ transaction: transaction });
  return sendTransactionAsync({ signedTx: signedTxResult.signedTx });
}

export function addKey(input: Input_addKey): Near_FinalExecutionOutcome {
  // https://github.com/near/near-api-js/blob/e29a41812ac79579cc12b051f8ef04d2f3606a75/src/account.ts#L445
  let methodNames: string[] = [];
  if (input.methodNames !== null) {
    methodNames = <string[]>input.methodNames;
  }
  let accessKey: Near_AccessKey;
  if (input.contractId !== null && input.amount !== null) {
    accessKey = functionCallAccessKey(<string>input.contractId, methodNames, <BigInt>input.amount);
  } else {
    accessKey = fullAccessKey();
  }
  return signAndSendTransaction({
    receiverId: input.signerId,
    signerId: input.signerId,
    actions: [{ publicKey: input.publicKey, accessKey: accessKey } as Near_Action],
  });
}

export function createAccount(input: Input_createAccount): Near_FinalExecutionOutcome {
  return signAndSendTransaction({
    receiverId: input.newAccountId,
    signerId: input.signerId,
    actions: [action.createAccount(), action.transfer(input.amount), action.addKey(input.publicKey, fullAccessKey())],
  });
}

export function deleteAccount(input: Input_deleteAccount): Near_FinalExecutionOutcome {
  return signAndSendTransaction({
    receiverId: input.accountId,
    signerId: input.signerId,
    actions: [action.deleteAccount(input.beneficiaryId)],
  });
}

export function deployContract(input: Input_deployContract): Near_FinalExecutionOutcome {
  return signAndSendTransaction({
    receiverId: input.contractId,
    signerId: input.signerId,
    actions: [action.deployContract(input.data)],
  });
}

export function sendMoney(input: Input_sendMoney): Near_FinalExecutionOutcome {
  return signAndSendTransaction({
    receiverId: input.receiverId,
    signerId: input.signerId,
    actions: [action.transfer(input.amount)],
  });
}

export function functionCall(input: Input_functionCall): Near_FinalExecutionOutcome {
  const actions = [action.functionCall(input.methodName, input.args, input.gas, input.deposit)];
  if (input.signerId !== null) {
    return signAndSendTransaction({ receiverId: input.contractId, signerId: input.signerId!, actions: actions });
  }
  const transaction = createTransaction({
    receiverId: input.contractId,
    actions: actions,
  } as Input_createTransaction);

  const signedTxResult: Near_SignTransactionResult = signTransaction({ transaction: transaction });
  return sendTransaction({ signedTx: signedTxResult.signedTx });
}

export function deleteKey(input: Input_deleteKey): Near_FinalExecutionOutcome {
  return signAndSendTransaction({
    receiverId: input.signerId,
    signerId: input.signerId,
    actions: [action.deleteKey(input.publicKey)],
  });
}

export function createAndDeployContract(input: Input_createAndDeployContract): Near_FinalExecutionOutcome {
  return signAndSendTransaction({
    receiverId: input.contractId,
    signerId: input.signerId,
    actions: [
      action.createAccount(),
      action.transfer(input.amount),
      action.addKey(input.publicKey, fullAccessKey()),
      action.deployContract(input.data),
    ],
  });
}
