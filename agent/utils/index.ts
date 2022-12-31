import { decodeAccountID } from "xrpl";
import { fileTypeFromBuffer } from "file-type";

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
  const fileType: any = await fileTypeFromBuffer(file);

  const dataPrefix = `data:${fileType.mime};base64,`;

  return dataPrefix + file.toString("base64");
}
