import dotenv from "dotenv";
import SologenicMinter, { categories } from "../build";
import { Collection, NFTokenMintResult } from "../build/agent/types";
import testNFT from "./nft.js";
import testCollection from "./collection.js";

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
  // GENERATE MORE NFT SLOTS
  // const nft_slots_generated = await minter.generateNFTSlots(1);

  // CREATE NEW COLLECTION
  // const new_collection: Collection = await minter.createCollection(
  //   testCollection
  // );

  // GET ALL COLLECTIONS
  // const collections: any = await minter.getAllCollections();

  // // SET DEFAULT COLLECTION
  // await minter.setCollectionAddress(collections[1].address);

  // // UPDATE DEFAULT COLLECTION
  // // await minter.updateCollection(testCollection);

  // // GET DEFAULT COLLECTION DATA
  // // const collection_data = minter.getCollectionData();

  // // GET DEFAULT COLLECTION NFT SLOTS
  // // const collection_slots = minter.getCollectionNFTSlots();

  // // MINT AN NFT
  // const nftResult: NFTokenMintResult = await minter.mint(testNFT);

  // console.log(nftResult);

  console.log("--------------------- Finished ---------------------");
}

main();
