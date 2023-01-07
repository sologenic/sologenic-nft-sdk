import { isNumber } from "lodash";
import { Amount, NFTOffer } from "xrpl/dist/npm/models/common/index";
import { NFT } from "../types";
import errors from "./errors";
import BigNumber from "bignumber.js";
import {
  Client,
  decodeAccountID,
  dropsToXrp,
  isoTimeToRippleTime,
  unixTimeToRippleTime,
  xrpToDrops,
} from "xrpl";

export const categories = [
  "art",
  "motion",
  "music",
  "metaverse",
  "sports",
  "others",
  "tradingcards",
  "collectibles",
];

export const modes = {
  mainnet: "https://api.sologenic.org/api/v1",
  devnet: "https://api-devnet.test.sologenic.org/api/v1",
  testnet: "https://api-testnet.test.sologenic.org/api/v1",
};

export const clio_servers = {
  mainnet: "wss://s2-clio.ripple.com:51233/",
  testnet: "wss://clio.altnet.rippletest.net:51233/",
  devnet: "wss://clio.devnet.rippletest.net:51233/",
};

export const services = {
  mint: "nft-minter",
  nfts: "nft-marketplace",
};

export const parseAmount = (amount: Amount): any => {
  let amount_fields: any = { value: 0, currency: "" };

  if (typeof amount === "string") {
    amount_fields.currency = "xrp";
    amount_fields.value = dropsToXrp(amount);
  } else {
    amount_fields = amount;
  }

  return amount_fields;
};

// Validate NFT Offers and if they match
export const validateOffersMatch = (
  sell_offer: NFTOffer,
  buy_offer: NFTOffer,
  broker_address?: string
): void => {
  if (sell_offer.flags !== 1) throw errors.sell_offer_invalid;
  if (buy_offer.flags === 1) throw errors.buy_offer_invalid;

  if (
    sell_offer.destination &&
    ![...(broker_address ? [broker_address] : []), buy_offer.owner].includes(
      sell_offer.destination
    )
  )
    throw errors.sell_destination_invalid;

  const parsedSell = parseAmount(sell_offer.amount);
  const parsedBuy = parseAmount(buy_offer.amount);

  if (
    parsedSell.currency !== parsedBuy.currency ||
    parsedSell.issuer !== parsedBuy.issuer ||
    parsedSell.value > parsedBuy.value
  )
    throw errors.offers_not_match;
};

// Get Max Broker Fee
export function getMaxBrokerFee(
  sell_offer: NFTOffer,
  buy_offer: NFTOffer
): Amount {
  try {
    const parsedSell = parseAmount(sell_offer.amount);
    const parsedBuy = parseAmount(buy_offer.amount);

    const bigSell: BigNumber = new BigNumber(parsedSell.amount.value);
    const bigBuy: BigNumber = new BigNumber(parsedBuy.amount.value);

    const difference: BigNumber = bigSell.minus(bigBuy);

    const brokerFee: Amount =
      parsedSell.currency === "xrp"
        ? xrpToDrops(difference.toNumber())
        : {
            value: difference.toString(),
            currency: parsedSell.currency,
            issuer: parsedSell.issuer,
          };

    return brokerFee;
  } catch (e: any) {
    throw e;
  }
}

// Convert to Ripple Time
export const convertToRippleTime = (time: number | Date | string): number => {
  if (isNumber(time)) return unixTimeToRippleTime(time);

  return isoTimeToRippleTime(time);
};

// Helper function to convert to Hex
export const toHex = (string: string): string => {
  const s = unescape(encodeURIComponent(string));
  let h = "";

  for (let i = 0; i < s.length; i++) {
    h += s.charCodeAt(i).toString(16);
  }

  return h;
};

function unscrambleTaxon(taxon: number, tokenSeq: number): number {
  return (taxon ^ (384160001 * tokenSeq + 2459)) % 4294967296;
}

export const encodeNFTTokenID = (
  flags: number,
  royalty: number,
  issuer: string,
  taxon: number,
  nftsequence: number
) => {
  const encodedFlags = flags.toString(16).toUpperCase().padStart(4, "0");

  const encodedRoyalty = royalty.toString(16).toUpperCase().padStart(4, "0");

  const encodedIssuer = decodeAccountID(issuer).toString("hex").toUpperCase();

  const encodedTaxon = (unscrambleTaxon(taxon, nftsequence) >>> 0)
    .toString(16)
    .toUpperCase()
    .padStart(8, "0");

  const encodedSequence = nftsequence
    .toString(16)
    .toUpperCase()
    .padStart(8, "0");

  return (
    encodedFlags +
    encodedRoyalty +
    encodedIssuer +
    encodedTaxon +
    encodedSequence
  );
};

export async function getBase64(file: Buffer): Promise<any> {
  const fileReader = await import("file-type");

  const fileType: any = await fileReader.fileTypeFromBuffer(file);

  const dataPrefix = `data:${fileType.mime};base64,`;

  return dataPrefix + file.toString("base64");
}

export async function getAllAccountNFTS(
  client: Client,
  address: string,
  marker?: string
): Promise<NFT[]> {
  try {
    var nfts: NFT[] = [];

    await client
      .request({
        command: "account_nfts",
        account: address,
        limit: 100,
        ...(marker ? { marker } : {}),
      })
      .then(async (r) => {
        nfts = [...r.result.account_nfts];

        if (r.result.marker) {
          nfts = [
            ...nfts,
            ...(await getAllAccountNFTS(
              client,
              address,
              r.result.marker as string
            )),
          ];
        }
      })
      .catch((e) => {
        throw e;
      });

    return nfts;
  } catch (e: any) {
    console.log("E_GET_ACCOUNT_NFTS_UTILS =>", e);
    throw e;
  }
}
