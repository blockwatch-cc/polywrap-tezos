import {
  Tezos_TransferParams,
  Input_addOperator,
  Input_removeOperator,
  Input_swapDirect,
  Input_swapMultiHop,
  Input_invest,
  Input_divest,
  Input_transfer,
  Input_transferFrom
} from "./w3"
import { swap, getInvestAddAndRemoveOperations, generateTransferArg } from "./utils";
import { Tezos_Query } from "../query/w3"
import { getConnection, FA2 } from "../common";

export function addOperator(input: Input_addOperator): Tezos_TransferParams {
  const address = getConnection(input.network, input.custom);
  const fa2Token = new FA2(input.params.tokenId, input.contractAddress!)
  const owner = Tezos_Query.getWalletPKH({
    connection: address.connection,
  }).unwrap();
  return fa2Token.generateAddOperation(address.connection, owner, input.params.operator);
}

export function removeOperator(input: Input_removeOperator): Tezos_TransferParams {
  const address = getConnection(input.network, input.custom);
  const fa2Token = new FA2(input.params.tokenId, input.contractAddress!)
  const owner = Tezos_Query.getWalletPKH({
    connection: address.connection,
  }).unwrap();
  return fa2Token.generateRemoveOperation(address.connection, owner, input.params.operator);
}

export function swapDirect(input: Input_swapDirect): Tezos_TransferParams[] {
  const address = getConnection(input.network, input.custom);
  const owner = Tezos_Query.getWalletPKH({
    connection: address.connection,
  }).unwrap();
  return swap(address, owner, [{ pairId: input.params.pairId, direction: input.params.direction }], input.params.swapParams, input.sendParams);
}

export function swapMultiHop(input: Input_swapMultiHop): Tezos_TransferParams[] {
  const address = getConnection(input.network, input.custom);
  const owner = Tezos_Query.getWalletPKH({
    connection: address.connection,
  }).unwrap();
  return swap(address, owner, input.params.hops, input.params.swapParams, input.sendParams);
}

export function invest(input: Input_invest): Tezos_TransferParams[] {
  const address = getConnection(input.network,  input.custom);
  const owner = Tezos_Query.getWalletPKH({
    connection: address.connection,
  }).unwrap();
  const addAndRemoveOperations = getInvestAddAndRemoveOperations(address, owner, input.params);
  const investQueryOperation = Tezos_Query.getContractCallTransferParams({
    address: address.contractAddress,
    method: "invest",
    args: `[${input.params.pairId}, ${input.params.shares}, ${input.params.tokenAIn}, ${input.params.tokenBIn}, "${input.params.deadline}"]`,
    params: input.sendParams,
    connection: address.connection
  }).unwrap();
  const operations = addAndRemoveOperations.addOperations;
  operations.push(investQueryOperation);
  return operations.concat(addAndRemoveOperations.removeOperations);
}

export function divest(input: Input_divest): Tezos_TransferParams {
  const address = getConnection(input.network,  input.custom);
  return Tezos_Query.getContractCallTransferParams({
    address: address.contractAddress,
    method: "divest",
    args: `[${input.params.pairId}, ${input.params.minTokenAOut}, ${input.params.minTokenBOut}, ${input.params.shares}, "${input.params.deadline}"]`,
    params: input.sendParams,
    connection: address.connection
  }).unwrap();
}

export function transfer(input: Input_transfer): Tezos_TransferParams {
  const address = getConnection(input.network,  input.custom);
  const owner = Tezos_Query.getWalletPKH({
    connection: address.connection,
  }).unwrap();
  return Tezos_Query.getContractCallTransferParams({
    address: address.contractAddress,
    method: "transfer",
    args: generateTransferArg(owner, input.params.to, input.params.tokenId, input.params.amount),
    params: input.sendParams,
    connection: address.connection
  }).unwrap();
}

export function transferFrom(input: Input_transferFrom): Tezos_TransferParams {
  const address = getConnection(input.network,  input.custom);
  return Tezos_Query.getContractCallTransferParams({
    address: address.contractAddress,
    method: "transfer",
    args: generateTransferArg(input.m_from, input.params.to, input.params.tokenId, input.params.amount),
    params: input.sendParams,
    connection: address.connection
  }).unwrap();
}
