import { copyFileSync } from "fs";
import { copyDirectoryContents, resetDirectory } from "./utils";

const runner = async () => {
  await resetDirectory("../playground/public/wasms");
  await copyDirectoryContents(
    "dist",
    "../playground/public/wasms"
  );
  copyFileSync(
    './dist/chunks.json',
    '../playground/src/components/chunks.json'
  );
}

runner();
