import dotenv from "dotenv";
import SologenicMinter from "../agent";
import { NFTokenMintResult } from "../agent/types";
import testNFT from "./nft";

dotenv.config();

// Testing
const minter = new SologenicMinter({
  apiUrl: process.env.SOLOGENIC_API_URL as string,
  xrpl_node: process.env.XRPL_NODE as string,
  wallet: {
    address: process.env.WALLET_ADDRESS as string,
    seed: process.env.WALLET_SEED as string,
  },
});

async function main() {
  await minter.setCollectionAddress(process.env.COLLECTION_ADDRESS as string);
  const nftResult: NFTokenMintResult = await minter.mint(testNFT);

  console.log("FINISHED", nftResult);
}

main();
