import fs from "fs";
import path from "path";

const __dirname = path.resolve();

const buffer = fs.readFileSync(
  path.join(__dirname + "/build/public/test_imgs/test-image.png")
);

export default {
  name: "New created collection 5",
  // cover: buffer,
  // thumbnail: buffer,
  description: "new created collection using sologenic minter",
  transfer_fee: 5000,
};
