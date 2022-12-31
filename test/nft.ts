import fs from "fs";
import path from "path";

const __dirname = path.resolve();

const buffer = fs.readFileSync(
  path.join(__dirname + "/build/public/test_imgs/test-image.png")
);

export default {
  file: buffer,
  thumbnail: buffer,
  name: "Testing NFT 3",
  category: "art",
  only_xrp: false,
  is_explicit: false,
  transfer_fee: 10000,
  description: "Testing NFT description",
  external_url: "https://sologenic.org",
  attributes: [
    {
      trait_type: "attribute",
      value: "attr",
    },
    {
      trait_type: "attribute 2",
      value: 1,
      max_value: 2,
    },
  ],
};
