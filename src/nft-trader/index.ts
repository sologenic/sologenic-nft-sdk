import {
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
  NFTOffers,
  CollectionTradingData,
  NFTActionsOptions,
  NFTAction,
} from "../types";
import errors from "../utils/errors";
import {
  convertToRippleTime,
  getMaxBrokerFee,
  services,
  validateOffersMatch,
} from "../utils/index";
import { version } from "../../package.json";
import axios from "axios";

export class SologenicNFTTrader extends SologenicBaseModule {
  _moduleName = "Trader";
  constructor(props: SologenicNFTTraderProps) {
    super(props);

    console.log(`Sologenic Trader Initialized: v${version}`);
  }

  // Add fetch NFT offers by NFT ID
  async getNFTOffers(nft_id: string) {
    try {
      await this._checkConnection();

      const {
        result: { offers: sell_offers },
      } = await this._xrplClient.request({
        command: "nft_sell_offers",
        nft_id: nft_id,
      });

      const {
        result: { offers: buy_offers },
      } = await this._xrplClient.request({
        command: "nft_buy_offers",
        nft_id: nft_id,
      });

      return {
        sell_offers,
        buy_offers,
      };
    } catch (e) {
      throw e;
    }
  }

  // Accept NFT Offer
  async acceptOffer(offer: NFTOffer | string, options: AcceptOfferOptions) {
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

      return await this._submitSignedTxToLedger(signed_tx);
    } catch (e) {
      throw e;
    }
  }

  // Use Brokered mode
  async brokerNFTOffers(args: BrokeredModeArgs) {
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

      return await this._submitSignedTxToLedger(signed_tx);
    } catch (e) {
      throw e;
    }
  }

  // Put NFT for sale
  async setNFTForSale(nft_id: string, options: NFTSaleOptions) {
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

      const signed_tx = await this._signTransaction(sell_offer_tx, {
        autofill: true,
      });

      return await this._submitSignedTxToLedger(signed_tx);
    } catch (e: any) {
      throw e;
    }
  }

  // Place bid on NFT
  async placeBidOnNFT(nft_id: string, options: Bid) {
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

      return await this._submitSignedTxToLedger(signed_tx);
    } catch (e) {
      throw e;
    }
  }

  // Cancel NFT Offer
  async cancelNFTOffers(offers: string[]) {
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

      return await this._submitSignedTxToLedger(signed_tx);
    } catch (e) {
      throw e;
    }
  }

  // Retrieve Collection Trading Data
  async getCollectionTradingData(address: string) {
    try {
      const {
        data: { stats },
      } = await axios.get<{ stats: CollectionTradingData }>(
        `${this._baseURL}/${services["nfts"]}/collections/${address}`
      );

      return stats;
    } catch (e) {
      throw e;
    }
  }

  // Fetch NFT Trading History, this will only work for NFTs minted on the Sologenic Platform, or using the SologenicNFTManager
  async getNFTTrades(nft_id: string, options?: NFTActionsOptions) {
    try {
      const { data: trades } = await axios.get<NFTAction[]>(
        `${this._baseURL}/${services["nfts"]}/nfts/${nft_id}/actions`,
        {
          params: {
            types: "nft_sold",
            limit: options?.limit ? options.limit : 50,
            ...(options?.before_id ? { before_id: options.before_id } : {}),
          },
        }
      );

      return trades;
    } catch (e) {
      throw e;
    }
  }
}
