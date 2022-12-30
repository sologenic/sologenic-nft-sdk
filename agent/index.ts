import {
  Transaction,
  Client,
  Wallet,
  xrpToDrops,
  AccountInfoResponse,
} from "xrpl";
import moment from "moment";
import axios from "axios";
import { categories, encodeNFTTokenID, toHex } from "./utils";
import {
  WalletInterface,
  SologenicMinterProps,
  Collection,
  NFTPayload,
  NFTSlot,
  SignTransactionOptions,
  NFTokenMintResult,
} from "./types";

export default class SologenicMinter {
  xrplClient: Client;
  private _collectionAddress: string | undefined;
  private _collectionData: Collection | undefined;
  private _apiUrl: string;

  private wallet: WalletInterface;

  constructor(props: SologenicMinterProps) {
    if (!props.wallet) throw new Error("Wallet missing on constructor props.");
    if (!props.apiUrl) throw new Error("Api URL missing on constructor props.");
    if (!props.xrpl_node)
      throw new Error("XRPL Node missing on constructor props.");

    this.xrplClient = new Client(props.xrpl_node);
    this.wallet = props.wallet;
    this._apiUrl = props.apiUrl;

    console.info("Sologenic Minter Initialized");
  }

  getCollectionAddress(): string | undefined {
    return this._collectionAddress;
  }

  getCollectionNFTSlots(): NFTSlot[] | undefined {
    return this._collectionData?.nfts;
  }

  async setCollectionAddress(address: string): Promise<void> {
    this._collectionAddress = address;
    this._collectionData = undefined;
    await this._getCollectionData();
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
      const tx_blob = await this._signTransaction(mintTx, { autofill: true });

      // Submit Signed Transaction and receive nftoken_id of submitted transaction
      const nft_result = await this._submitSignedMintTx(
        tx_blob,
        uploaded_nft_uid
      );

      return nft_result;
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
          address: this.wallet.address,
        },
      })
        .then(async (r) => {
          await this.xrplClient.connect();

          const tx: any = await this.xrplClient.request({
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
      const wallet = Wallet.fromSecret(this.wallet.seed);

      if (options?.autofill) {
        await this.xrplClient.connect();

        const account_info: AccountInfoResponse = await this.xrplClient.request(
          {
            command: "account_info",
            account: this.wallet.address,
            ledger_index: "current",
          }
        );

        const current_ledger_sequence: number = account_info.result
          .ledger_current_index as number;

        const current_account_sequence: number =
          account_info.result.account_data.Sequence;

        tx.LastLedgerSequence = current_ledger_sequence + 15;
        tx.Fee = xrpToDrops(0.001);
        tx.Sequence = current_account_sequence;

        await this.xrplClient.disconnect();
      }

      // Sign the Transaction and get tx_blob
      const { tx_blob } = wallet.sign(tx);

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
          address: this.wallet.address,
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

      const nftUploaded: any = await axios({
        baseURL: `${this._apiUrl}/nft/upload`,
        method: "post",
        headers: {
          authorization: await this._generateAuthToken(),
          address: this.wallet.address,
        },
        data: {
          issuer: this._collectionAddress,
          payload: nftData,
          uid: nftSlot.uid,
        },
      });

      if (nftUploaded.status !== 200) throw new Error(nftUploaded.data);

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
          address: this.wallet.address,
        },
      });

      if (shipped.data?.response?.shipped) return true;

      throw new Error("Unknown error");
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  }

  private async _getCollectionData(): Promise<void> {
    try {
      console.info("Getting Collection Data...");

      const collection = await axios({
        url: `${this._apiUrl}/collection/assemble`,
        method: "post",
        headers: {
          authorization: await this._generateAuthToken(),
          address: this.wallet.address,
        },
        data: { issuer: this._collectionAddress },
      })
        .then((res) => res.data.response)
        .catch((e: any) => {
          throw e;
        });

      this._collectionData = collection;
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  }

  private _getEmptyNFTSlot(): NFTSlot {
    console.info("Getting next available NFT slot");
    if (this._collectionData?.nfts.length === 0)
      throw new Error("No NFT Slots available");

    const nft_slot: NFTSlot | undefined = this._collectionData?.nfts.find(
      (slot) => slot.currency === null
    );

    if (!nft_slot) throw new Error("No NFT Slots available");

    return nft_slot;
  }

  private async _generateAuthToken(): Promise<string> {
    console.info("Generating Authentication Token");
    // Transaction to sign
    const tx: Transaction = {
      Account: this.wallet.address,
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
}
