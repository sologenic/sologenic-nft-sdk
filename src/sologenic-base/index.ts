import {
  SologenicBaseProps,
  Mode,
  NFT,
  SignTransactionOptions,
} from "../types";
import {
  Client,
  Wallet,
  Transaction,
  AccountInfoResponse,
  xrpToDrops,
  TxResponse,
} from "xrpl";
import errors from "../utils/errors";
import { clio_servers, getAllAccountNFTS, modes, toHex } from "../utils/index";
import moment from "moment";

export class SologenicBaseModule {
  protected _moduleName: string = "base";
  protected _moduleMode: Mode;
  protected _xrplClient: Client;
  protected _baseURL: string;
  protected _wallet: Wallet | null = null;
  protected _authHeaders: any = null;
  protected _clioClient: Client;

  constructor(props: SologenicBaseProps) {
    if (!props.mode)
      throw {
        ...errors.property_missing,
        message: errors.property_missing.message + "mode",
      };
    if (!props.xrpl_node)
      throw {
        ...errors.property_missing,
        message: errors.property_missing.message + "xrpl_node",
      };

    this._moduleMode = props.mode;
    this._xrplClient = new Client(props.xrpl_node);
    this._clioClient = new Client(clio_servers[props.mode]);
    this._baseURL = modes[props.mode];
  }

  getApiURL() {
    return {
      mode: this._moduleMode,
      url: modes[this._moduleMode],
    };
  }

  getWalletAddress() {
    try {
      const wallet: Wallet = this._checkWalletConnection();
      return wallet.classicAddress;
    } catch (e) {
      throw e;
    }
  }

  setAccount(seed: string) {
    this._wallet = Wallet.fromSecret(seed);
    this._setAuthHeaders();
    setInterval(this._setAuthHeaders.bind(this), 60000);
    return this._wallet;
  }

  async getAccountNFTS(account?: string) {
    try {
      await this._checkConnection();

      if (account) return await getAllAccountNFTS(this._xrplClient, account);

      const wallet = this._checkWalletConnection();
      return await getAllAccountNFTS(this._xrplClient, wallet.classicAddress);
    } catch (e) {
      throw e;
    }
  }

  protected _checkWalletConnection() {
    if (!this._wallet) throw errors.wallet_not_connected;
    return this._wallet;
  }

  protected _setAuthHeaders() {
    if (this._wallet)
      this._authHeaders = {
        authorization: this._generateAuthToken(),
        address: this._wallet.classicAddress,
      };
  }

  protected _generateAuthToken() {
    if (this._wallet) {
      console.info("Generating Authentication Token...");
      // Transaction to sign
      const tx: Transaction = {
        Account: this._wallet.classicAddress,
        TransactionType: "AccountSet",
        Memos: [
          {
            Memo: {
              MemoData: toHex(
                `sign_in___${moment().utc().format("YYYY-MM-DD HH:mm:ss.000")}`
              ),
            },
          },
        ],
      };

      return this._wallet.sign(tx).tx_blob;
    }
  }

  // TODO -> why is thie beineg exposed as a separate function when it's always being called right before submit?
  protected async _signTransaction(
    tx: Transaction,
    options?: SignTransactionOptions
  ): Promise<string> {
    try {
      console.info("Signing TX => ", tx);

      // TODO => fix control flow here. We absolute CANNOT do double assertions like this, becaue in principle we don't
      // actually know if wallet is truthy here. If typescript thinks it can be nullish, we should explicity comp for that.

      const wallet: Wallet = this._wallet as Wallet;
      // eg, the text line should simply be if (!wallet) throw ...

      // Instantiate a Wallet to sign with
      if (options?.autofill) {
        await this._checkConnection();

        const account_info = await this._xrplClient.request({
          command: "account_info",
          account: wallet.classicAddress,
          ledger_index: "current",
        });

        // same here, this double assertion is wrong and should be handled. we need additional null checks, not type assertions.

        const current_ledger_sequence: number = account_info.result
          .ledger_current_index as number;

        const current_account_sequence: number =
          account_info.result.account_data.Sequence;

        tx.LastLedgerSequence = current_ledger_sequence + 15;
        tx.Fee = xrpToDrops(0.001);
        tx.Sequence = current_account_sequence;
      }

      // Sign the Transaction and get tx_blob
      const { tx_blob } = wallet.sign(tx);

      return tx_blob;
    } catch (e) {
      throw e;
    }
  }

  protected async _submitSignedTxToLedger(tx_blob: string) {
    try {
      console.info("Submitting Transaction to the Ledger...");
      await this._checkConnection();

      // TODO => here also, we should add some if (!wallet) throw ...

      const result = await this._xrplClient.submitAndWait(tx_blob, {
        wallet: this._wallet as Wallet,
      });

      return result;
    } catch (e) {
      throw e;
    }
  }

  protected async _checkConnection(client: "clio" | "xrpl" = "xrpl") {
    try {
      switch (client) {
        case "clio":
          if (!this._clioClient.isConnected()) await this._clioClient.connect();
          break;
        case "xrpl":
          if (!this._xrplClient.isConnected()) await this._xrplClient.connect();
          break;
        default:
          throw "Need to pass a client type";
      }
    } catch (e) {
      throw e;
    }
  }
}
