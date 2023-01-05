import {
  Collection,
  SologenicMinterProps,
  CollectionData,
  NFTSlot,
  NFTokenMintResult,
  NFTPayload,
  BurnResult,
  BurnConfiguration,
  SignTransactionOptions,
  MintMultipleCopiesOptions,
  MintMultipleCopiesResult,
  MinterMode,
  NFT,
  NFTData,
} from "../types";

import {
  Transaction,
  Client,
  xrpToDrops,
  AccountInfoResponse,
  TxResponse,
  Wallet,
} from "xrpl";
import moment from "moment";
import axios, { AxiosResponse } from "axios";
import {
  encodeNFTTokenID,
  getBase64,
  toHex,
  modes,
  services,
  getAllAccountNFTS,
} from "../utils";
import errors from "../utils/errors";
import { version } from "../../package.json";

export class SologenicNFTManager {
  private _minterMode: MinterMode;
  private _xrplClient: Client;
  private _baseURL: string;

  private _wallet: Wallet | null = null;
  private _authHeaders: any = null;
  private _collectionData: Collection | null = null;
  private _collectionAddress: string | null = null;

  constructor(props: SologenicMinterProps) {
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

    this._minterMode = props.mode;
    this._xrplClient = new Client(props.xrpl_node);
    this._baseURL = modes[props.mode];

    console.info("Sologenic NFT Manager Initialized: v" + version);
  }

  getApiURL(): any {
    return {
      mode: this._minterMode,
      url: modes[this._minterMode],
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

  getCollectionAddress(): string {
    try {
      if (this._collectionAddress) return this._collectionAddress;

      throw errors.collection_not_set;
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

  async getCollectionNFTSlots(): Promise<NFTSlot[]> {
    try {
      if (this._collectionAddress) {
        this._collectionData = await this._getCollectionData();

        return this._collectionData.nfts;
      }

      throw errors.collection_not_set;
    } catch (e: any) {
      throw e;
    }
  }

  async getCollectionData(): Promise<Collection> {
    try {
      if (this._collectionAddress) {
        return (this._collectionData = await this._getCollectionData());
      }

      throw errors.collection_not_set;
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

  async getNFTData(nft_id: string): Promise<NFTData> {
    try {
      const nft_data: NFTData = await axios({
        method: "get",
        baseURL: `${this._baseURL}/${services.nfts}/nfts/${nft_id}`,
      })
        .then((r) => {
          delete r.data.internal_id;

          return r.data;
        })
        .catch((e) => {
          if (e.response.status === 404) throw errors.nft_not_found;

          throw e;
        });

      return nft_data;
    } catch (e: any) {
      throw e;
    }
  }

  async getAllCollections(): Promise<Collection[]> {
    try {
      this._checkWalletConnection();

      const collections: Collection[] = await axios({
        method: "get",
        headers: this._authHeaders,
        baseURL: `${this._baseURL}/${services.mint}/collection/all`,
      })
        .then((r) => {
          const colls: Collection[] = r.data.response.map((c: Collection) => {
            delete c.locked_at;
            delete c.minted_at;
            delete c.only_xrp;
            delete c.minted;

            return c;
          });

          return colls;
        })
        .catch((e) => {
          throw e;
        });

      return collections;
    } catch (e: any) {
      throw e;
    }
  }

  async generateNFTSlots(amount: number): Promise<BurnResult> {
    try {
      const wallet = this._checkWalletConnection();

      await this._xrplClient.connect();
      const burnConfig: BurnConfiguration = await this.getBurnConfiguration();

      const payment_tx: Transaction = {
        Account: wallet.classicAddress,
        TransactionType: "Payment",
        Amount: {
          currency: burnConfig.burn_currency,
          issuer: burnConfig.burn_issuer,
          value: String(amount * Number(burnConfig.burn_amount)),
        },
        Destination: burnConfig.burn_issuer,
        Memos: [
          {
            Memo: {
              MemoData: toHex(JSON.stringify({ type: "mint" })),
            },
          },
        ],
      };

      const signed_payment: string = await this._signTransaction(payment_tx, {
        autofill: true,
      });

      const result: TxResponse = await this._submitSignedTxToLedger(
        signed_payment
      );

      const burn_result: BurnResult = await this._submitBurnTxHash(
        result.result.hash
      );

      if (this._collectionAddress)
        this._collectionData = await this._getCollectionData();

      delete burn_result.type;
      delete burn_result.validated;

      return burn_result;
    } catch (e: any) {
      throw e;
    }
  }

  async createCollection(collectionData: CollectionData): Promise<Collection> {
    try {
      this._checkWalletConnection();

      const new_collection: Collection = await axios({
        method: "post",
        baseURL: `${this._baseURL}/${services.mint}/collection/assemble`,
        headers: this._authHeaders,
      })
        .then((r) => r.data.response)
        .catch((e) => {
          throw e;
        });

      await this.setCollectionAddress(new_collection.issuer);
      await this.updateCollection(collectionData);

      return this._collectionData as Collection;
    } catch (e: any) {
      throw e;
    }
  }

  async updateCollection(collectionData: CollectionData): Promise<Collection> {
    try {
      this._checkWalletConnection();

      if (!this._collectionData) throw errors.collection_not_set;

      await axios({
        method: "post",
        baseURL: `${this._baseURL}/${services.mint}/collection/cover`,
        data: {
          ...collectionData,
          ...(collectionData.cover
            ? { cover: await getBase64(collectionData.cover) }
            : { cover: "" }),
          ...(collectionData.thumbnail
            ? { thumbnail: await getBase64(collectionData.thumbnail) }
            : { thumbnail: "" }),
          uid: this._collectionData.uid,
          issuer: this._collectionAddress,
        },
        headers: this._authHeaders,
      })
        .then((r) => r.data.response.updated)
        .catch((e) => {
          if (
            e.response.data.response.error.message === "invalid_issuing_address"
          )
            throw errors.collection_already_sealed;

          throw e;
        });

      return (this._collectionData = await this._getCollectionData());
    } catch (e: any) {
      throw e;
    }
  }

  async setCollectionAddress(address: string): Promise<void> {
    this._collectionAddress = address;
    this._collectionData = await this._getCollectionData();
  }

  async mint(nftData: NFTPayload): Promise<NFTokenMintResult> {
    try {
      this._checkWalletConnection();

      console.info("Starting minting process...");
      // If collection address has not been set, throw error
      if (!this._collectionAddress) throw errors.collection_not_set;

      // Upload NFT Data
      const uploaded_nft_uid: string = await this._uploadNFTData(nftData);

      // Make sure collection is shipped
      await this._shipCollection();

      // Request NFTokenMint Transaction
      const mintTx: Transaction = await this._prepareMintTransaction(
        uploaded_nft_uid
      );

      // Sign NFTokenMint Transaction
      const tx_blob: string = await this._signTransaction(mintTx, {
        autofill: true,
      });

      // Submit Signed Transaction and receive nftoken_id of submitted transaction
      const nft_result: NFTokenMintResult = await this._submitSignedMintTx(
        tx_blob,
        uploaded_nft_uid
      );

      this._collectionData = await this._getCollectionData();

      return nft_result;
    } catch (e: any) {
      throw e;
    }
  }

  async mintMultipleCopies(
    nftData: NFTPayload,
    options: MintMultipleCopiesOptions
  ): Promise<MintMultipleCopiesResult> {
    try {
      this._checkWalletConnection();

      console.info(`Starting mint of ${options.numberOfCopies} copies`);
      let minted_nfts: NFTokenMintResult[] = [];
      let error: any = null;

      for (var i: any = 0; i < options.numberOfCopies; i++) {
        try {
          console.info("Minting copy #", i + 1);
          const minted = await this.mint(nftData);
          minted_nfts.push(minted);
        } catch (e: any) {
          if (e.error === errors.nft_slots_not_available.error) {
            if (options?.autoBurn) {
              await this.generateNFTSlots(1);
              const minted = await this.mint(nftData);

              minted_nfts.push(minted);
            } else {
              error = {
                message: e.message,
              };

              break;
            }
          } else {
            error = {
              message: e.message,
            };

            break;
          }
        }
      }

      return {
        copies_minted: minted_nfts.length,
        nfts: minted_nfts,
        error,
      };
    } catch (e: any) {
      throw e;
    }
  }

  async getBurnConfiguration(): Promise<BurnConfiguration> {
    try {
      console.info("Getting Burn Configuration...");
      const burn_config: BurnConfiguration = await axios({
        method: "get",
        baseURL: `${this._baseURL}/${services.mint}/solo/burn_config`,
      })
        .then((r) => r.data)
        .catch((e) => {
          throw e;
        });

      delete burn_config.burn_amount_issuance;
      delete burn_config.burn_amount_market_index;

      return burn_config;
    } catch (e: any) {
      throw e;
    }
  }

  // Private Methods
  private _getEmptyNFTSlot(): NFTSlot {
    console.info("Getting next available NFT slot...");
    const collection = this._collectionData as Collection;

    if (collection.nfts.length === 0) throw errors.nft_slots_not_available;

    const nft_slot: NFTSlot | undefined = this._collectionData?.nfts.find(
      (slot: NFTSlot) => slot.currency === null
    );

    if (!nft_slot) throw errors.nft_slots_not_available;

    return nft_slot;
  }

  private _setAuthHeaders(): void {
    if (this._wallet)
      this._authHeaders = {
        authorization: this._generateAuthToken(),
        address: this._wallet.classicAddress,
      };
  }

  private _generateAuthToken(): string | void {
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

  private _checkWalletConnection(): Wallet {
    if (!this._wallet) throw errors.wallet_not_connected;

    return this._wallet;
  }

  private async _submitBurnTxHash(tx_hash: string): Promise<BurnResult> {
    try {
      const response: Promise<BurnResult> = axios({
        method: "post",
        baseURL: `${this._baseURL}/${services.mint}/solo/burn`,
        headers: this._authHeaders,
        data: {
          hash: tx_hash,
          type: "mint",
        },
      })
        .then((r) => {
          return r.data;
        })
        .catch((e) => {
          throw e;
        });

      return response;
    } catch (e: any) {
      throw e;
    }
  }

  private async _submitSignedTxToLedger(tx_blob: string): Promise<TxResponse> {
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

  private async _submitSignedMintTx(
    tx_blob: string,
    nft_uid: string
  ): Promise<NFTokenMintResult> {
    try {
      console.info("Submitting Signed Transaction...");

      const tx_hash: Promise<NFTokenMintResult> = axios({
        baseURL: `${this._baseURL}/${services.mint}/nft/mint`,
        method: "post",
        data: {
          mint_tx_blob: tx_blob,
          uid: nft_uid,
        },
        headers: this._authHeaders,
      })
        .then(async (r) => {
          await this._xrplClient.connect();

          const tx: any = await this._xrplClient.request({
            command: "tx",
            transaction: r.data.response.hash,
          });

          const nftsequence = tx.result.meta.AffectedNodes.find((an: any) => {
            if (
              an.ModifiedNode &&
              an.ModifiedNode.LedgerEntryType === "AccountRoot"
            ) {
              return an;
            }
          });

          const nftTokenID = encodeNFTTokenID(
            tx.result.Flags,
            tx.result.TransferFee,
            tx.result.Account,
            tx.result.NFTokenTaxon,
            nftsequence.ModifiedNode.PreviousFields.MintedNFTokens
          );

          return {
            mint_tx_hash: r.data.response.hash,
            NFTokenID: nftTokenID,
          };
        })
        .catch((e) => {
          throw e;
        });

      return tx_hash;
    } catch (e: any) {
      throw e;
    }
  }

  private async _signTransaction(
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

  private async _prepareMintTransaction(nftUID: string): Promise<Transaction> {
    try {
      console.info("Preparing NFTokenMint Transaction...");
      const mint_transaction: Transaction = await axios({
        baseURL: `${this._baseURL}/${services.mint}/nft/prepareMint`,
        method: "post",
        headers: this._authHeaders,
        data: {
          uid: nftUID,
        },
      })
        .then((r) => r.data.response.tx)
        .catch((e) => {
          throw e;
        });

      return mint_transaction;
    } catch (e: any) {
      throw e;
    }
  }

  private async _uploadNFTData(nftData: NFTPayload): Promise<string> {
    try {
      const nftSlot: NFTSlot = this._getEmptyNFTSlot();
      console.info("Uploading NFT data...");
      console.info("Using NFT Slot => ", nftSlot);

      await axios({
        baseURL: `${this._baseURL}/${services.mint}/nft/upload`,
        method: "post",
        headers: this._authHeaders,
        data: {
          issuer: this._collectionAddress,
          payload: {
            ...nftData,
            file: await getBase64(nftData.file),
            thumbnail: await getBase64(nftData.thumbnail),
          },
          uid: nftSlot.uid,
        },
      })
        .then((r) => r.data)
        .catch((e) => {
          throw e;
        });

      return nftSlot.uid;
    } catch (e: any) {
      throw e;
    }
  }

  private async _shipCollection(): Promise<boolean> {
    try {
      const shipped: AxiosResponse = await axios({
        baseURL: `${this._baseURL}/${services.mint}/collection/ship`,
        method: "post",
        data: {
          issuer: this._collectionAddress,
          standard: "xls20d",
        },
        headers: this._authHeaders,
      });

      if (shipped.data?.response?.shipped) return true;

      throw errors.unknown;
    } catch (e: any) {
      throw e;
    }
  }

  private async _getCollectionData(): Promise<Collection> {
    try {
      this._checkWalletConnection();

      if (this._collectionAddress) {
        console.info("Getting Collection Data...");

        const collection = await axios({
          url: `${this._baseURL}/${services.mint}/collection/assemble`,
          method: "post",
          headers: this._authHeaders,
          data: { issuer: this._collectionAddress },
        })
          .then((res) => res.data.response)
          .catch((e: any) => {
            throw e;
          });

        delete collection.activated;
        delete collection.activation_fee;
        delete collection.burn_amount;
        delete collection.burn_address;
        delete collection.burn_currency;

        return collection;
      }
      throw errors.collection_not_set;
    } catch (e: any) {
      throw e;
    }
  }

  private async _checkConnection(): Promise<void> {
    try {
      if (!this._xrplClient.isConnected()) await this._xrplClient.connect();
    } catch (e: any) {
      throw e;
    }
  }
}
