import { cpSync } from "fs";
import { join, resolve } from "path";

const dirsToCopy: { [key: string]: string } = {
  ".output/chrome-mv2": "extension",
};

for (const key in dirsToCopy) {
  cpSync(resolve(key), resolve(join("../@obs-ui", dirsToCopy[key])), {
    recursive: true,
  });
}
