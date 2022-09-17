import { expect, test } from "@jest/globals";
import * as path from "path";
import { prepareTheme } from "../src/theme";

test("test runs",async () => {
  const repoPath = path.join(process.cwd(), "../dplantera.github.io-tech-blog/");
  const outputDir = path.join(process.cwd(), "./out");
  await prepareTheme({ repoPath, outputDir });

});
