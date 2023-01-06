import {
  NFTBuyOffersResponse,
  NFTokenAcceptOffer,
  NFTokenCancelOffer,
  NFTokenCreateOffer,
  NFTokenCreateOfferFlags,
  TxResponse,
  xrpToDrops,
} from "xrpl";
import { NFTOffer, Amount } from "xrpl/dist/npm/models/common/index";
import { SologenicBaseModule } from "../sologenic-base/index";
import {
  SologenicNFTTraderProps,
  AcceptOfferOptions,
  NFTSaleOptions,
  BrokeredModeArgs,
  Bid,
} from "../types";
import errors from "../utils/errors";
import {
  convertToRippleTime,
  getMaxBrokerFee,
  validateOffersMatch,
} from "../utils/index";

export class SologenicNFTTrader extends SologenicBaseModule {
  _moduleName = "trader";

  constructor(props: SologenicNFTTraderProps) {
    super(props);
  }

  // Add fetch NFT offers by NFT ID
  async getNFTOffers(
    nft_id: string,
    side: "buy" | "sell"
  ): Promise<NFTOffer[]> {
    try {
      await this._checkConnection();

      const offers: NFTBuyOffersResponse = await this._xrplClient.request({
        command: `nft_${side}_offers`,
        nft_id: nft_id,
      });

      return offers.result.offers;
    } catch (e: any) {
      throw e;
    }
  }

  // Accept NFT Offer
  async acceptOffer(
    offer: NFTOffer | string,
    options: AcceptOfferOptions
  ): Promise<TxResponse> {
    try {
      const wallet = this._checkWalletConnection();

      const accept_offer_tx: NFTokenAcceptOffer = {
        TransactionType: "NFTokenAcceptOffer",
        Account: wallet.classicAddress,
        ...(options.isBuy
          ? {
              NFTokenBuyOffer:
                typeof offer === "string" ? offer : offer.nft_offer_index,
            }
          : {
              NFTokenSellOffer:
                typeof offer === "string" ? offer : offer.nft_offer_index,
            }),
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

  // Use Brokered mode
  async brokerNFTOffers(args: BrokeredModeArgs): Promise<TxResponse> {
    try {
      const wallet = this._checkWalletConnection();

      validateOffersMatch(
        args.sell_offer,
        args.buy_offer,
        wallet.classicAddress
      );

      const brokerFee = args.max_broker_fee
        ? getMaxBrokerFee(args.sell_offer, args.buy_offer)
        : args.broker_fee
        ? args.broker_fee
        : null;

      const brokered_tx: NFTokenAcceptOffer = {
        Account: wallet.classicAddress,
        TransactionType: "NFTokenAcceptOffer",
        NFTokenBuyOffer: args.buy_offer.nft_offer_index,
        NFTokenSellOffer: args.sell_offer.nft_offer_index,
        ...(brokerFee ? { NFTokenBrokerFee: brokerFee } : {}),
      };

      const signed_tx = await this._signTransaction(brokered_tx, {
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
  ): Promise<TxResponse> {
    try {
      const wallet = this._checkWalletConnection();

      const { expiration = null, destination = null, amount } = options;

      const sell_offer_tx: NFTokenCreateOffer = {
        TransactionType: "NFTokenCreateOffer",
        NFTokenID: nft_id,
        Account: wallet.classicAddress,
        Flags: NFTokenCreateOfferFlags.tfSellNFToken,
        Amount: amount,
        ...(destination ? { Destination: destination } : {}),
        ...(expiration
          ? {
              Expiration: convertToRippleTime(expiration),
            }
          : {}),
      };
      const signed_tx: string = await this._signTransaction(sell_offer_tx, {
        autofill: true,
      });
      const result: TxResponse = await this._submitSignedTxToLedger(signed_tx);

      return result;
    } catch (e: any) {
      throw e;
    }
  }

  // Place bid on NFT
  async placeBidOnNFT(nft_id: string, options: Bid): Promise<TxResponse> {
    try {
      const wallet = this._checkWalletConnection();

      if (options.amount.currency !== "xrp" && !options.amount.issuer)
        throw errors.invalid_amount;

      const bid_tx: NFTokenCreateOffer = {
        Account: wallet.classicAddress,
        TransactionType: "NFTokenCreateOffer",
        NFTokenID: nft_id,
        Amount:
          options.amount.currency === "xrp"
            ? xrpToDrops(options.amount.value)
            : (options.amount as Amount),
      };

      const signed_tx: string = await this._signTransaction(bid_tx, {
        autofill: true,
      });
      const result: TxResponse = await this._submitSignedTxToLedger(signed_tx);

      return result;
    } catch (e: any) {
      throw e;
    }
  }

  // Cancel NFT Offer
  async cancelNFTOffers(offers: string[]): Promise<TxResponse> {
    try {
      const wallet = this._checkWalletConnection();

      const cancel_tx: NFTokenCancelOffer = {
        TransactionType: "NFTokenCancelOffer",
        Account: wallet.classicAddress,
        NFTokenOffers: offers,
      };

      const signed_tx: string = await this._signTransaction(cancel_tx, {
        autofill: true,
      });
      const result: TxResponse = await this._submitSignedTxToLedger(signed_tx);

      return result;
    } catch (e: any) {
      throw e;
    }
  }

  // Retrieve Collection Trading Data

  // Fetch NFT Trading History
}
