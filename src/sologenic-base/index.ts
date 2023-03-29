import {
  SologenicBaseProps,
  Mode,
  NFT,
  SignTransactionOptions,
  FullNFTData,
  NFTClio,
  NFTData,
  NFTStandard,
  PublicCollection,
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
import axios from "axios";
import { services } from "../utils/index";

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

  setAccount(seed: string): Wallet {
    this._wallet = Wallet.fromSecret(seed);
    this._setAuthHeaders();
    setInterval(this._setAuthHeaders.bind(this), 60000);

    return this._wallet;
  }

  async getNFT(nft_id: string): Promise<FullNFTData> {
    try {
      await this._checkConnection();
      await this._checkConnection("clio");

      const nft_info = await this._clioClient.request({
        command: "nft_info",
        nft_id,
      });

      const nft_data: NFTData = await axios({
        method: "get",
        baseURL: `${this._baseURL}/${services.nfts}/nfts/${nft_id}`,
      })
        .then((r) => {
          delete r.data.internal_id;
          return r.data;
        })
        .catch((e) => {
          if (e.response.status === 404) return null;

          throw e;
        });

      return {
        sologenic_info: nft_data,
        xrpl_info: nft_info.result as NFTClio,
      };
    } catch (e: any) {
      throw e;
    }
  }

  async getMultipleNFTS(nft_ids: string[]): Promise<FullNFTData[]> {
    try {
      await this._checkConnection();
      await this._checkConnection("clio");

      return await axios({
        method: "post",
        url: `${this._baseURL}/${services.nfts}/nfts`,
        data: nft_ids,
      })
        .then((r) => {
          const n: FullNFTData[] = r.data.ids.map(async (x: any) => {
            let xrpl_info;

            if (x.standard === NFTStandard.XLS20) {
              try {
                const nft_info = await this._clioClient.request({
                  command: "nft_info",
                  nft_id: x.id,
                });

                xrpl_info = nft_info.result;
              } catch (e) {
                console.log(e);
              }
            }

            return { sologenic_info: x, xrpl_info };
          });

          return n;
        })
        .catch((e) => {
          throw e;
        });
    } catch (e: any) {
      throw e;
    }
  }

  async getCollection(collection_id: string): Promise<PublicCollection> {
    try {
      const c = await axios({
        method: "get",
        url: `${this._baseURL}/${services.nfts}/collections/${collection_id}`,
      });

      return c.data;
    } catch (e: any) {
      throw e;
    }
  }

  async getMultipleCollections(
    collection_ids: string[]
  ): Promise<PublicCollection[]> {
    try {
      if (collection_ids.length > 20)
        throw new Error("Maximum collection_ids per request: 20");

      const encoded = window
        ? window.btoa(JSON.stringify(collection_ids))
        : Buffer.from(JSON.stringify(collection_ids)).toString("base64");

      const colls = await axios({
        method: "get",
        url: `${this._baseURL}/${services.nfts}/collections`,
        params: {
          collection_ids: encoded,
        },
      });

      return colls.data;
    } catch (e: any) {
      throw e;
    }
  }

  async countNFTCopies(nft_id: string): Promise<number> {
    try {
      const data = await this.getNFT(nft_id);

      const count = await axios({
        method: "get",
        url: `${this._baseURL}/${services.nfts}/count`,
        params: {
          md5_hash: data.sologenic_info?.md5_hash,
        },
      });

      return count.data;
    } catch (e: any) {
      throw e;
    }
  }

  async getAccountNFTS(account?: string): Promise<NFT[]> {
    try {
      await this._checkConnection();

      if (account) return await getAllAccountNFTS(this._xrplClient, account);

      const wallet = this._checkWalletConnection();
      return await getAllAccountNFTS(this._xrplClient, wallet.classicAddress);
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

  protected async _signTransaction(
    tx: Transaction,
    options?: SignTransactionOptions
  ): Promise<string> {
    try {
      console.info("Signing TX => ", tx);

      const wallet: Wallet = this._wallet as Wallet;
      // Instantiate a Wallet to sign with
      if (options?.autofill) {
        await this._checkConnection();

        const account_info: AccountInfoResponse =
          await this._xrplClient.request({
            command: "account_info",
            account: wallet.classicAddress,
            ledger_index: "current",
          });

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
    } catch (e: any) {
      throw e;
    }
  }

  protected async _submitSignedTxToLedger(
    tx_blob: string
  ): Promise<TxResponse> {
    try {
      console.info("Submitting Transaction to the Ledger...");
      await this._checkConnection();

      const result: TxResponse = await this._xrplClient.submitAndWait(tx_blob, {
        wallet: this._wallet as Wallet,
      });

      return result;
    } catch (e: any) {
      throw e;
    }
  }

  protected async _checkConnection(
    client: "clio" | "xrpl" = "xrpl"
  ): Promise<void> {
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
    } catch (e: any) {
      throw e;
    }
  }
}
