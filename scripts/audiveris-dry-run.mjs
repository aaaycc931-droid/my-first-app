import { createAudiverisDryRunCommand } from "../lib/audiveris/audiverisDryRunRunner.ts";

const [inputPath = "", outputDir = ""] = process.argv.slice(2);
const result = createAudiverisDryRunCommand({ inputPath, outputDir });

console.log(JSON.stringify(result, null, 2));

if (!result.success) {
  process.exitCode = 1;
}
