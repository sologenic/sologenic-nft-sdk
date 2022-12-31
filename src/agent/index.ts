import {
  Transaction,
  Client,
  xrpToDrops,
  AccountInfoResponse,
  TxResponse,
  Wallet,
} from "xrpl";
import moment from "moment";
import axios from "axios";
import { categories, encodeNFTTokenID, getBase64, toHex } from "../utils";

export class SologenicMinter {
  private _xrplClient: Client;
  private _collectionAddress: string | undefined;
  private _collectionData: Collection | undefined;
  private _apiUrl: string;
  private _wallet: Wallet;

  constructor(props: SologenicMinterProps) {
    if (!props.wallet) throw new Error("Wallet missing on constructor props.");
    if (!props.apiUrl) throw new Error("Api URL missing on constructor props.");
    if (!props.xrpl_node)
      throw new Error("XRPL Node missing on constructor props.");

    this._xrplClient = new Client(props.xrpl_node);
    this._wallet = Wallet.fromSecret(props.wallet.seed);
    this._apiUrl = props.apiUrl;

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
      const collections: Collection[] = await axios({
        method: "get",
        headers: {
          authorization: await this._generateAuthToken(),
          address: this._wallet.classicAddress,
        },
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
      console.error(e);
      throw e;
    }
  }

  async generateNFTSlots(amount: number): Promise<BurnResult> {
    try {
      await this._xrplClient.connect();
      const burnConfig = await this.getBurnConfiguration();

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

      const signed_payment = await this._signTransaction(payment_tx, {
        autofill: true,
        withClient: false,
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
        headers: {
          authorization: await this._generateAuthToken(),
          address: this._wallet.classicAddress,
        },
      })
        .then((r) => r.data.response)
        .catch((e) => {
          throw e;
        });

      await this.setCollectionAddress(new_collection.issuer);
      await this.updateCollection({ ...collectionData });

      return this._collectionData as Collection;
    } catch (e: any) {
      console.error(e);
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
        headers: {
          authorization: await this._generateAuthToken(),
          address: this._wallet.classicAddress,
        },
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
      console.error(e);
      throw e;
    }
  }

  async setCollectionAddress(address: string): Promise<void> {
    this._collectionAddress = address;
    this._collectionData = await this._getCollectionData();
  }

  async mint(nftData: NFTPayload): Promise<NFTokenMintResult> {
    try {
      if (!categories.includes(nftData.category))
        throw new Error(
          nftData.category +
            " Category not supported. Categories supported " +
            JSON.stringify(categories)
        );

      console.info("Starting minting process...");
      // If collection address has not been set, throw error
      if (!this._collectionAddress) throw new Error("Collection not set");

      // Upload NFT Data
      const uploaded_nft_uid: string = await this._uploadNFTData(nftData);

      // Make sure collection is shipped
      await this._shipCollection();

      // Request NFTokenMint Transaction
      const mintTx = await this._prepareMintTransaction(uploaded_nft_uid);

      // Sign NFTokenMint Transaction
      const tx_blob = await this._signTransaction(mintTx, {
        autofill: true,
        withClient: true,
      });

      // Submit Signed Transaction and receive nftoken_id of submitted transaction
      const nft_result = await this._submitSignedMintTx(
        tx_blob,
        uploaded_nft_uid
      );

      return nft_result;
    } catch (e: any) {
      // console.error(e);
      throw e;
    }
  }

  async getBurnConfiguration(): Promise<BurnConfiguration> {
    try {
      console.error("Getting Burn Configuration...");
      const burn_config = await axios({
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
      const response: BurnResult = await axios({
        method: "post",
        baseURL: `${this._apiUrl}/solo/burn`,
        headers: {
          authorization: await this._generateAuthToken(),
          address: this._wallet.classicAddress,
        },
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

      const tx_hash: NFTokenMintResult = await axios({
        baseURL: `${this._apiUrl}/nft/mint`,
        method: "post",
        data: {
          mint_tx_blob: tx_blob,
          uid: nft_uid,
        },
        headers: {
          authorization: await this._generateAuthToken(),
          address: this._wallet.classicAddress,
        },
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
        if (options.withClient) await this._checkConnection();

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
        headers: {
          authorization: await this._generateAuthToken(),
          address: this._wallet.classicAddress,
        },
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
      console.error(e);
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
        headers: {
          authorization: await this._generateAuthToken(),
          address: this._wallet.classicAddress,
        },
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
          console.log("UPLOAD NFT", e.response.data.response.data);

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

      const shipped = await axios({
        baseURL: `${this._apiUrl}/collection/ship`,
        method: "post",
        data: {
          issuer: this._collectionAddress,
          standard: "xls20d",
        },
        headers: {
          authorization: await this._generateAuthToken(),
          address: this._wallet.classicAddress,
        },
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

      const collection = await axios({
        url: `${this._apiUrl}/collection/assemble`,
        method: "post",
        headers: {
          authorization: await this._generateAuthToken(),
          address: this._wallet.classicAddress,
        },
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

      // this._collectionData = collection;
      return collection;
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  }

  private async _generateAuthToken(): Promise<string> {
    console.info("Generating Authentication Token");
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

    const tx_blob = await this._signTransaction(tx);

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
