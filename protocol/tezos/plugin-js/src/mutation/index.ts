import {
  Module,
  Input_callContractMethod,
  Input_callContractMethodAndConfirmation,
  Input_batchContractCalls,
  Input_transfer,
  Input_transferAndConfirm,
  Input_signMessage,
  Input_originate,
  Input_originateAndConfirm,
  Input_connectTempleWallet,
  Input_walletContractCallMethod,
  Input_walletOriginate,
  Input_batchWalletContractCalls,
  TxOperation,
  CallContractMethodConfirmationResponse,
  TransferConfirmation,
  SignResult,
  OriginationResponse,
  OriginationConfirmationResponse,
  AccountDetails,
  Connection as SchemaConnection
} from "./w3";
import * as Mapping from "../common/mapping";
import { parseArgs } from "../common/parsing";
import { getConnection, Connections, Connection } from "../common/Connection";

import { char2Bytes } from "@taquito/utils";
import { TempleWallet, TempleDAppNetwork } from "@temple-wallet/dapp";
import { TransactionOperation } from "@taquito/taquito";

export interface MutationConfig extends Record<string, unknown> { 
  connections: Connections;
  defaultNetwork: string;
}

export class Mutation extends Module<MutationConfig> {
  private _connections: Connections;
  private _defaultNetwork: string;

  constructor(config: MutationConfig) {
    super(config);
    this._connections = config.connections;
    this._defaultNetwork = config.defaultNetwork;
  }

  public async callContractMethod(
    input: Input_callContractMethod
  ): Promise<TxOperation> {
    const transactionOperation = await this._callContractMethod(input);
    return Mapping.toTxOperation(transactionOperation);
  }

  public async callContractMethodAndConfirmation(
    input: Input_callContractMethodAndConfirmation
  ): Promise<CallContractMethodConfirmationResponse> {
    const res = await this._callContractMethod(input);
    const initialConfirmation = input.confirmations ? input.confirmations : 0;
    const timeout = input.timeout ? input.timeout : 180;
    const finalConfirmation = await res.confirmation(initialConfirmation, timeout);
    return {
      confirmation: finalConfirmation,
      operation: Mapping.toTxOperation(res),
    };
  }

  public async batchContractCalls(
    input: Input_batchContractCalls
  ): Promise<string> {
    const connection = await this._getConnection(input.connection);
    const paramsWithKind = input.params.map(Mapping.toTransferParamsWithTransactionKind)
    const batchCalls = connection.getProvider().contract.batch(paramsWithKind);
    const operation = await batchCalls.send()
    return operation.hash;
  }

  public async transfer(input: Input_transfer): Promise<string> {
    const connection = await this._getConnection(input.connection);
    const sendParams = Mapping.fromSendParams(input.params);
    const transferOperation = await connection
      .getProvider()
      .wallet
      .transfer(sendParams);
    const walletOperation = await transferOperation.send();
    return walletOperation.opHash;
  }

  public async transferAndConfirm(
    input: Input_transferAndConfirm
  ): Promise<TransferConfirmation> {
    const connection = await this._getConnection(input.connection);
    const sendParams = Mapping.fromSendParams(input.params);
    const transactionWalletOperation = await connection
      .getProvider()
      .wallet.transfer(sendParams);
    const confirmationResponse = await (
      await transactionWalletOperation.send()
    ).confirmation(input.confirmations);
    return Mapping.toTransferConfirmation(confirmationResponse);
  }

  public async signMessage(
    input: Input_signMessage
  ): Promise<SignResult> {
    const connection = await this._getConnection(input.connection);
    const bytes = char2Bytes(input.message);
    const result = await connection.getSigner().sign(bytes);
    return Mapping.toSignResult(result);
  }

  public async originate(
    input: Input_originate
  ): Promise<OriginationResponse> {
    try {
      const connection = await this._getConnection(input.connection);
      const originateParams = Mapping.fromOriginateParams(input.params);
      const originationOperation = await connection
        .getProvider()
        .contract.originate(originateParams);
      return {
        error: false,
        origination: Mapping.toOriginationOperation(originationOperation),
      };
    } catch (error) {
      return {
        error: true,
        reason: error.message,
      };
    }
  }

  public async originateAndConfirm(
    input: Input_originateAndConfirm
  ): Promise<OriginationConfirmationResponse> {
    const connection = await this._getConnection(input.connection);
    const originateParams = Mapping.fromOriginateParams(input.params);
    const originationOperation = await connection
      .getProvider()
      .contract.originate(originateParams);
    const initialConfirmation = input.confirmations
      ? input.confirmations
      : 0;
    const timeout = input.timeout ? input.timeout : 180;
    const finalConfirmation = await originationOperation.confirmation(
      initialConfirmation,
      timeout
    );
    return {
      confirmation: finalConfirmation,
      origination: Mapping.toOriginationOperation(originationOperation),
    };
  }

  public async connectTempleWallet(
    input: Input_connectTempleWallet
  ): Promise<AccountDetails> {
    const isAvailable = await TempleWallet.isAvailable();
    if (!isAvailable) {
      throw new Error('Temple Wallet is not available.');
    }
    const connection = await this._getConnection(input.connection);
    const wallet = new TempleWallet(input.appName);
    await wallet.connect(<TempleDAppNetwork>input.network);
    const provider = await connection.getProvider();
    provider.setWalletProvider(wallet);
    if (!wallet.connected) {
      throw new Error('Failed to connect Temple wallet ')
    }
    const accountPkh = await provider.wallet.pkh();
    const accountBalance = await provider.tz.getBalance(accountPkh);
    return {
      pkh: accountPkh,
      balance: accountBalance.toString()
    };
  }

  public async walletContractCallMethod(
    input: Input_walletContractCallMethod
  ): Promise<string> {
    const connection = await this._getConnection(input.connection);
    const contract = await connection.getProvider().wallet.at(input.address);
    const sendParams = input.params ? Mapping.fromSendParams(input.params) : {};
    const walletOperation = await contract.methods[input.method](...parseArgs(input.args)).send(sendParams);
    return walletOperation.opHash;
  }

  public async walletOriginate(
    input: Input_walletOriginate
  ): Promise<string> {
    const connection = await this._getConnection(input.connection);
    const originateParams = Mapping.fromOriginateParams(input.params);
    const originateWalletOperation = await connection.getProvider()
      .wallet
      .originate(originateParams)
      .send();
    return originateWalletOperation.opHash;
  }

  public async batchWalletContractCalls(
    input: Input_batchWalletContractCalls
  ): Promise<string> {
    const connection = await this._getConnection(input.connection);
    const paramsWithKind = input.params.map(Mapping.toTransferParamsWithTransactionKind)
    const batchCalls = connection.getProvider().wallet.batch(paramsWithKind);
    const operation = await batchCalls.send()
    return operation.opHash;
  }

  private async _callContractMethod(
    input: Input_callContractMethod
  ): Promise<TransactionOperation> {
    const connection = await this._getConnection(input.connection);
    const contract = await connection.getContract(input.address);
    const sendParams = input.params ? Mapping.fromSendParams(input.params) : {};
    return contract.methods[input.method](...parseArgs(input.args)).send(sendParams);
  }

  private async _getConnection(
    connection?: SchemaConnection | null
  ): Promise<Connection> {
    return getConnection(this._connections, this._defaultNetwork, connection);
  }
}
