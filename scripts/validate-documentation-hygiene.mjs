import process from "node:process";
import { validateDocumentationHygiene } from "./documentation-hygiene.mjs";

const problems = await validateDocumentationHygiene(process.cwd());

if (problems.length > 0) {
  console.error("Documentation hygiene validation failed:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exitCode = 1;
} else {
  console.log("Documentation hygiene validation passed.");
}
