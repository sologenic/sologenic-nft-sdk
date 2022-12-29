import xrpl, { Transaction, Client } from "xrpl";
import moment from "moment";
import axios from "axios";
import { toHex } from "./utils";
import { Wallet, MinterAgentProps, Collection } from "./types";

export default class MinterAgent {
  apiUrl: string;
  authToken: string | undefined;
  collectionAddress: string;
  collectionData: Collection | undefined;
  xrplClient: Client | undefined;
  protected wallet: Wallet;

  constructor(props: MinterAgentProps) {
    if (!props.wallet) throw new Error("Wallet missing on constructor props.");
    if (!props.apiUrl) throw new Error("Api URL missing on constructor props.");
    if (!props.collectionAddress)
      throw new Error("Collection ID is missing on constructor props.");

    this.wallet = props.wallet;
    this.apiUrl = props.apiUrl;
    this.collectionAddress = props.collectionAddress;
    this.authToken = this.generateAuthToken();
  }

  generateAuthToken(): string {
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

    // Instantiate a Wallet to sign with
    const wallet = xrpl.Wallet.fromSecret(this.wallet.seed);

    // Sign the Transaction and get tx_blob
    const { tx_blob } = wallet.sign(tx);

    // Return tx_blob
    return tx_blob;
  }

  async getCollectionData(): Promise<Collection> {
    try {
      const collection = await axios({
        method: "post",
        headers: {
          authorization: this.authToken,
          address: this.wallet.address,
        },
        data: { issuer: this.collectionAddress },
      })
        .then((res) => res.data.response)
        .catch((e: any) => {
          throw e;
        });

      return collection;
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  }
}
