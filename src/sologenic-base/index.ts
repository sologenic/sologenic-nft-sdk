import { SologenicBaseProps, Mode } from "../types";
import { Client, Wallet, Transaction } from "xrpl";
import errors from "../utils/errors";
import { version } from "../../package.json";
import { modes, toHex } from "../utils/index";
import moment from "moment";

export class SologenicBaseModule {
  private _moduleName: string = "";

  protected _moduleMode: Mode;
  protected _xrplClient: Client;
  protected _baseURL: string;
  protected _wallet: Wallet | null = null;
  protected _authHeaders: any = null;

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
    this._baseURL = modes[props.mode];

    console.info(`Sologenic ${this._moduleName} Initialized: v${version}`);
  }

  getApiURL(): any {
    return {
      mode: this._moduleMode,
      url: modes[this._moduleMode],
    };
  }

  getWalletAddress(): string {
    try {
      const wallet: Wallet = this._checkWalletConnection();

      return wallet.classicAddress;
    } catch (e: any) {
      throw e;
    }
  }

  protected _checkWalletConnection(): Wallet {
    if (!this._wallet) throw errors.wallet_not_connected;

    return this._wallet;
  }

  protected _setAuthHeaders(): void {
    if (this._wallet)
      this._authHeaders = {
        authorization: this._generateAuthToken(),
        address: this._wallet.classicAddress,
      };
  }

  protected _generateAuthToken(): string | void {
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

      const { tx_blob } = this._wallet.sign(tx);

      // Return tx_blob
      return tx_blob;
    }
  }

  protected async _checkConnection(): Promise<void> {
    try {
      if (!this._xrplClient.isConnected()) await this._xrplClient.connect();
    } catch (e: any) {
      throw e;
    }
  }
}
