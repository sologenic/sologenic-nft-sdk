import dotenv from "dotenv";
import MinterAgent from "./agent";

// Testing
const minter = new MinterAgent({
  collectionAddress: process.env.COLLECTION_ADDRESS as string,
  apiUrl: process.env.SOLOGENIC_API_URL as string,
  wallet: {
    address: process.env.WALLET_ADDRESS as string,
    seed: process.env.WALLET_SEED as string,
  },
});

export default MinterAgent;
