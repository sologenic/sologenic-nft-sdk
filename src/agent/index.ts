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
} from "../types";

import {
  Transaction,
  Client,
  xrpToDrops,
  AccountInfoResponse,
  TxResponse,
  Wallet,
  decode,
} from "xrpl";
import moment from "moment";
import axios, { AxiosResponse } from "axios";
import { encodeNFTTokenID, getBase64, toHex } from "../utils";

export class SologenicMinter {
  private _xrplClient: Client;
  private _collectionAddress: string | undefined;
  private _collectionData: Collection | undefined;
  private _apiUrl: string;
  private _wallet: Wallet;
  private _authHeaders: any;

  constructor(props: SologenicMinterProps) {
    if (!props.seed) throw new Error("Wallet missing on constructor props.");
    if (!props.apiUrl) throw new Error("Api URL missing on constructor props.");
    if (!props.xrpl_node)
      throw new Error("XRPL Node missing on constructor props.");

    this._xrplClient = new Client(props.xrpl_node);
    this._wallet = Wallet.fromSecret(props.seed);
    this._apiUrl = props.apiUrl;

    this._setAuthHeaders();
    setInterval(this._setAuthHeaders.bind(this), 60000);

    console.info("Sologenic Minter Initialized");
  }

  getApiURL(): string {
    return this._apiUrl;
  }

  getWalletAddress(): string {
    return this._wallet.classicAddress;
  }

  getCollectionAddress(): string | undefined {
    return this._collectionAddress;
  }

  getCollectionNFTSlots(): NFTSlot[] | undefined {
    return this._collectionData?.nfts;
  }

  getCollectionData(): Collection | undefined {
    return this._collectionData;
  }

  async getAllCollections(): Promise<Collection[]> {
    try {
      const collections: Promise<Collection[]> = axios({
        method: "get",
        headers: this._authHeaders,
        baseURL: `${this._apiUrl}/collection/all`,
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
      await this._xrplClient.connect();
      const burnConfig: BurnConfiguration = await this.getBurnConfiguration();

      const payment_tx: Transaction = {
        Account: this._wallet.classicAddress,
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
      console.error(e);
      throw e;
    }
  }

  async createCollection(collectionData: CollectionData): Promise<Collection> {
    try {
      const new_collection: Collection = await axios({
        method: "post",
        baseURL: `${this._apiUrl}/collection/assemble`,
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

  async updateCollection(collectionData: CollectionData): Promise<void> {
    try {
      if (!this._collectionData)
        throw new Error("Need to set a collection address first.");

      await axios({
        method: "post",
        baseURL: `${this._apiUrl}/collection/cover`,
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
            throw new Error(
              "This collection has been finalized, cannot be updated anymore."
            );

          throw e;
        });

      this._collectionData = await this._getCollectionData();
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
      console.info("Starting minting process...");
      // If collection address has not been set, throw error
      if (!this._collectionAddress) throw new Error("Collection not set");

      // Upload NFT Data
      const uploaded_nft_uid: string = await this._uploadNFTData(nftData);

      console.log(uploaded_nft_uid);

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

  async getBurnConfiguration(): Promise<BurnConfiguration> {
    try {
      console.error("Getting Burn Configuration...");
      const burn_config: BurnConfiguration = await axios({
        method: "get",
        baseURL: `${this._apiUrl}/solo/burn_config`,
      })
        .then((r) => r.data)
        .catch((e) => {
          throw e;
        });

      delete burn_config.burn_amount_issuance;
      delete burn_config.burn_amount_market_index;

      return burn_config;
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  }

  // Private Methods
  private _getEmptyNFTSlot(): NFTSlot {
    console.info("Getting next available NFT slot");
    if (this._collectionData?.nfts.length === 0)
      throw new Error("No NFT Slots available");

    const nft_slot: NFTSlot | undefined = this._collectionData?.nfts.find(
      (slot: NFTSlot) => slot.currency === null
    );

    if (!nft_slot) throw new Error("No NFT Slots available");

    return nft_slot;
  }

  private async _submitBurnTxHash(tx_hash: string): Promise<BurnResult> {
    try {
      const response: Promise<BurnResult> = axios({
        method: "post",
        baseURL: `${this._apiUrl}/solo/burn`,
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
      console.error(e);
      throw e;
    }
  }

  private async _submitSignedTxToLedger(tx_blob: string): Promise<TxResponse> {
    try {
      console.info("Submitting Transaction to the Ledger...");
      await this._checkConnection();

      const result: TxResponse = await this._xrplClient.submitAndWait(tx_blob, {
        wallet: this._wallet,
      });

      return result;
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  }

  private async _submitSignedMintTx(
    tx_blob: string,
    nft_uid: string
  ): Promise<NFTokenMintResult> {
    try {
      console.info("Submitting Signed Transaction =>", tx_blob);

      const tx_hash: Promise<NFTokenMintResult> = axios({
        baseURL: `${this._apiUrl}/nft/mint`,
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

          console.log("TX RESULT =>", tx);

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
      console.error();
      throw e;
    }
  }

  private async _signTransaction(
    tx: Transaction,
    options?: SignTransactionOptions
  ): Promise<string> {
    try {
      console.info("Signing TX => ", tx);
      // Instantiate a Wallet to sign with
      if (options?.autofill) {
        await this._checkConnection();

        const account_info: AccountInfoResponse =
          await this._xrplClient.request({
            command: "account_info",
            account: this._wallet.classicAddress,
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
      const { tx_blob } = this._wallet.sign(tx);

      return tx_blob;
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  }

  private async _prepareMintTransaction(nftUID: string): Promise<Transaction> {
    try {
      console.info("Preparing NFTokenMint Transaction");
      const mint_transaction: Transaction = await axios({
        baseURL: `${this._apiUrl}/nft/prepareMint`,
        method: "post",
        headers: this._authHeaders,
        data: {
          uid: nftUID,
        },
      })
        .then((r) => r.data.response.tx)
        .catch((e) => {
          console.error(e.response.data.response);
          throw e;
        });

      return mint_transaction;
    } catch (e: any) {
      throw e;
    }
  }

  private async _uploadNFTData(nftData: NFTPayload): Promise<string> {
    try {
      console.info("Uploading NFT data...");
      const nftSlot: NFTSlot = this._getEmptyNFTSlot();
      console.log("Using NFT Slot => ", nftSlot);

      await axios({
        baseURL: `${this._apiUrl}/nft/upload`,
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
      console.error(e);
      throw e;
    }
  }

  private async _shipCollection(): Promise<boolean> {
    try {
      console.info("Shipping Collection...");

      const shipped: AxiosResponse = await axios({
        baseURL: `${this._apiUrl}/collection/ship`,
        method: "post",
        data: {
          issuer: this._collectionAddress,
          standard: "xls20d",
        },
        headers: this._authHeaders,
      });

      if (shipped.data?.response?.shipped) return true;

      throw new Error("Unknown error");
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  }

  private async _getCollectionData(): Promise<Collection> {
    try {
      console.info("Getting Collection Data...");

      const collection: Collection = await axios({
        url: `${this._apiUrl}/collection/assemble`,
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
    } catch (e: any) {
      throw e;
    }
  }

  private _setAuthHeaders(): void {
    this._authHeaders = {
      authorization: this._generateAuthToken(),
      address: this._wallet.classicAddress,
    };
  }

  private _generateAuthToken(): string {
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

  private async _checkConnection(): Promise<void> {
    try {
      if (!this._xrplClient.isConnected()) await this._xrplClient.connect();
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  }
}
