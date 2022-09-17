import * as path from "path";
import { prepareTheme, SiteConfigType } from "./src/theme";

const repoPath = path.join(process.cwd(), "../dplantera.github.io-tech-blog/");
const outputDir = path.join(process.cwd(), "./out");

const siteConfig: SiteConfigType = require(path.join(repoPath, 'site.json'))
siteConfig.baseUrl = "";

prepareTheme({ repoPath, outputDir, siteConfig }).then(() => console.log("generated site")).catch(error => console.error(error));