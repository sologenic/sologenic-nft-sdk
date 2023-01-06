import { isNumber } from "lodash";
import {
  isoTimeToRippleTime,
  NFTBuyOffersResponse,
  NFTokenAcceptOffer,
  NFTokenCreateOffer,
  TxResponse,
  unixTimeToRippleTime,
} from "xrpl";
import { SologenicBaseModule } from "../sologenic-base/index";
import {
  SologenicNFTTraderProps,
  Bid,
  AcceptOfferOptions,
  NFTSaleOptions,
} from "../types";
import errors from "../utils/errors";
import { convertToRippleTime, convertToXRPLAmount } from "../utils/index";

export class SologenicNFTTrader extends SologenicBaseModule {
  _moduleName = "trader";

  constructor(props: SologenicNFTTraderProps) {
    super(props);
  }

  // Add fetch NFT bids by NFT ID
  async getBidsForNFT(nft_id: string, marker?: string): Promise<Bid[]> {
    try {
      const bids: NFTBuyOffersResponse = await this._xrplClient.request({
        command: "nft_buy_offers",
        nft_id: nft_id,
        ...(marker ? { marker } : {}),
      });

      if (bids.status === "success") {
        return bids.result.offers;
      }

      throw errors.unknown;
    } catch (e: any) {
      throw e;
    }
  }

  // Accept NFT Offer
  async acceptOffer(
    offerID: string,
    options: AcceptOfferOptions
  ): Promise<TxResponse> {
    try {
      const wallet = this._checkWalletConnection();

      const accept_offer_tx: NFTokenAcceptOffer = {
        TransactionType: "NFTokenAcceptOffer",
        Account: wallet.classicAddress,
        ...(options.isBuy
          ? { NFTokenBuyOffer: offerID }
          : { NFTokenSellOffer: offerID }),
      };

      const signed_tx = await this._signTransaction(accept_offer_tx, {
        autofill: true,
      });
      const result = await this._submitSignedTxToLedger(signed_tx);

      return result;
    } catch (e: any) {
      throw e;
    }
  }

  // Put NFT for sale
  async setNFTForSale(
    nft_id: string,
    options: NFTSaleOptions
  ): Promise<string> {
    try {
      const wallet = this._checkWalletConnection();

      const { expiration = null, destination = null, amount } = options;

      const sell_offer_tx: NFTokenCreateOffer = {
        TransactionType: "NFTokenCreateOffer",
        NFTokenID: nft_id,
        Amount: amount,
        ...(destination ? { Destination: destination } : {}),
        ...(expiration
          ? {
              Expiration: convertToRippleTime(expiration),
            }
          : {}),
      };
    } catch (e: any) {
      throw e;
    }
  }
  // Retrieve Collection Trading Data
  // Fetch NFT Trading History
}
