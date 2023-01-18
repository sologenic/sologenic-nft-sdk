import {
  Collection,
  SologenicNFTManagerProps,
  CollectionData,
  NFTSlot,
  NFTokenMintResult,
  NFTPayload,
  BurnResult,
  BurnConfiguration,
  MintMultipleCopiesOptions,
  MintMultipleCopiesResult,
  MintOptions,
  NFTData,
  NFTActionsOptions,
  NFTAction,
  FullNFTData,
  NFTClio,
} from "../types";
import { version } from "../../package.json";
import {
  Transaction,
  TxResponse,
  NFTokenMint,
  AccountInfoRequest,
  AccountInfoResponse,
} from "xrpl";
import axios from "axios";
import { encodeNFTTokenID, getBase64, toHex, services } from "../utils/index";
import errors from "../utils/errors";
import { SologenicBaseModule } from "../sologenic-base/index";

export class SologenicNFTManager extends SologenicBaseModule {
  _moduleName = "manager";
  private _collectionData: Collection | null = null;
  private _collectionAddress: string | null = null;

  constructor(props: SologenicNFTManagerProps) {
    super(props);
    console.log(`Sologenic Manager Initialized: v${version}`);
  }

  getCollectionAddress() {
    try {
      if (this._collectionAddress) return this._collectionAddress;
      throw errors.collection_not_set;
    } catch (e) {
      throw e;
    }
  }

  async getCollectionNFTSlots() {
    try {
      if (this._collectionAddress) {
        this._collectionData = await this._getCollectionData();
        return this._collectionData.nfts;
      }
      throw errors.collection_not_set;
    } catch (e) {
      throw e;
    }
  }

  async getCollectionData() {
    try {
      if (this._collectionAddress) {
        return (this._collectionData = await this._getCollectionData());
      }
      throw errors.collection_not_set;
    } catch (e) {
      throw e;
    }
  }

  // TODO => figure out why type inference is not properly happening for clio requests
  // TODO => Improve type inference for the NFTData call
  async getNFTData(nft_id: string): Promise<FullNFTData> {
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

  async getAllCollections() {
    try {
      this._checkWalletConnection();

      return await axios({
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
    } catch (e) {
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
    } catch (e) {
      throw e;
    }
  }

  async createCollection(collectionData: CollectionData) {
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
    } catch (e) {
      throw e;
    }
  }

  async updateCollection(collectionData: CollectionData) {
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

  async setCollectionAddress(address: string) {
    this._collectionAddress = address;
    this._collectionData = await this._getCollectionData();
  }

  // TODO => control flow in the try / catch makes it difficult to explicitly derive the return typ
  // this should be modified
  async mint(
    nftData: NFTPayload,
    options?: MintOptions
  ): Promise<NFTokenMintResult> {
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
      const mintTx: NFTokenMint = await this._prepareMintTransaction(
        uploaded_nft_uid,
        options?.onBehalf
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
      if (e.error === errors.nft_slots_not_available.error) {
        if (options?.autoBurn) {
          await this.generateNFTSlots(1);
          const minted = await this.mint(nftData, options);

          return minted;
        }

        throw e;
      }

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

          const minted = await this.mint(nftData, {
            onBehalf: options.onBehalf,
          });
          minted_nfts.push(minted);
        } catch (e: any) {
          if (e.error === errors.nft_slots_not_available.error) {
            if (options?.autoBurn) {
              await this.generateNFTSlots(1);
              const minted = await this.mint(nftData, {
                onBehalf: options.onBehalf,
              });

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
    } catch (e) {
      throw e;
    }
  }

  // TODO => instad of deleting, shouldn't we just return the correct keys in a new object?
  async getBurnConfiguration() {
    try {
      console.info("Getting Burn Configuration...");

      const { data: burn_config } = await axios.get<BurnConfiguration>(
        `${this._baseURL}/${services.mint}/solo/burn_config`
      );

      delete burn_config.burn_amount_issuance;
      delete burn_config.burn_amount_market_index;

      return burn_config;
    } catch (e) {
      throw e;
    }
  }

  async getNFTActions(nft_id: string, options?: NFTActionsOptions) {
    try {
      const typesFilter = options?.types ? options.types.join("&types=") : null;

      const queryUrl = `${this._baseURL}/${
        services["nfts"]
      }/nfts/${nft_id}/actions${typesFilter ? `?types=${typesFilter}` : ""}`;

      const { data: actions } = await axios.get<NFTAction[]>(queryUrl, {
        params: {
          limit: options?.limit ? options.limit : 50,
          ...(options?.before_id ? { before_id: options.before_id } : {}),
        },
      });

      return actions;
    } catch (e: any) {
      throw e;
    }
  }

  // Private Methods
  private _getEmptyNFTSlot() {
    console.info("Getting next available NFT slot...");
    const collection = this._collectionData as Collection;

    if (collection.nfts.length === 0) throw errors.nft_slots_not_available;

    const nft_slot = this._collectionData?.nfts?.find(
      (slot) => slot.currency === null
    );

    if (!nft_slot) throw errors.nft_slots_not_available;

    return nft_slot;
  }

  private async _submitBurnTxHash(tx_hash: string) {
    try {
      const { data } = await axios.post<BurnResult>(
        `${this._baseURL}/${services.mint}/solo/burn`,
        {
          headers: this._authHeaders,
          data: {
            hash: tx_hash,
            type: "mint",
          },
        }
      );

      return data;
    } catch (e) {
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
              an.ModifiedNode.LedgerEntryType === "AccountRoot" &&
              an.ModifiedNode.FinalFields.Account ===
                (tx.result.Issuer ? tx.result.Issuer : tx.result.Account)
            ) {
              return an;
            }
          });

          const nftTokenID = encodeNFTTokenID(
            tx.result.Flags,
            tx.result.TransferFee,
            tx.result.Issuer ? tx.result.Issuer : tx.result.Account,
            tx.result.NFTokenTaxon,
            nftsequence.ModifiedNode.PreviousFields.MintedNFTokens ?? 0
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

  private async _prepareMintTransaction(nftUID: string, onBehalf?: string) {
    try {
      console.info("Preparing NFTokenMint Transaction...");

      const { data } = await axios.post<{ response: { tx: NFTokenMint } }>(
        `${this._baseURL}/${services.mint}/nft/prepareMint`,
        {
          headers: this._authHeaders,
          data: {
            uid: nftUID,
            ...(onBehalf ? { on_behalf: onBehalf } : {}),
          },
        }
      );

      return data.response.tx;
    } catch (e: any) {
      throw e;
    }
  }

  // TODO => why are we reducing r -> r.data if we never use it?
  private async _uploadNFTData(nftData: NFTPayload): Promise<string> {
    try {
      const nftSlot = this._getEmptyNFTSlot();
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

  // XXX => good example of stripping to allow for inference
  private async _shipCollection(): Promise<boolean> {
    try {
      const { data } = await axios.post<{
        response: { shipped: boolean };
      }>(`${this._baseURL}/${services.mint}/collection/ship`, {
        headers: this._authHeaders,
        data: {
          issuer: this._collectionAddress,
          standard: "xls20d",
        },
      });

      if (data.response.shipped) return true;

      throw errors.unknown;
    } catch (e) {
      throw e;
    }
  }

  private async _getCollectionData() {
    try {
      this._checkWalletConnection();

      if (this._collectionAddress) {
        console.info("Getting Collection Data...");

        const {
          data: { response: collection },
        } = await axios.post<{ response: Collection }>(
          `${this._baseURL}/${services.mint}/collection/assemble`,
          {
            headers: this._authHeaders,
            data: { issuer: this._collectionAddress },
          }
        );

        delete collection.activated;
        delete collection.activation_fee;
        delete collection.burn_amount;
        delete collection.burn_address;
        delete collection.burn_currency;

        return collection;
      }
      throw errors.collection_not_set;
    } catch (e) {
      throw e;
    }
  }
}
