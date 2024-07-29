import { copyFileSync } from "fs";
import { copyDirectoryContents, resetDirectory } from "./utils";

const runner = async () => {
  await resetDirectory("../coder/public/wasms");
  await copyDirectoryContents(
    "dist",
    "../coder/public/wasms"
  );
  copyFileSync(
    './dist/chunks.json',
    '../coder/src/chunks.json'
  );
}

runner();
