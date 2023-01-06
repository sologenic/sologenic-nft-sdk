import { isNumber } from "lodash";
import {
  Client,
  decodeAccountID,
  isoTimeToRippleTime,
  unixTimeToRippleTime,
  xrpToDrops,
} from "xrpl";
import { Amount } from "xrpl/dist/npm/models/common/index";
import { NFT } from "../types";

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

export const services = {
  mint: "nft-minter",
  nfts: "nft-marketplace",
};

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
