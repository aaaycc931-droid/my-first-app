import assert from "node:assert/strict";
import { findDocumentationHygieneProblems } from "./documentation-hygiene.mjs";

assert.deepEqual(findDocumentationHygieneProblems("# Status\n\nClean.\n", "clean.md"), []);

for (const marker of [
  "Warning: truncated output (original token count: 12000)",
  "Total output lines: 900",
  "…326 tokens truncated…",
  "...12 tokens truncated...",
]) {
  assert.equal(findDocumentationHygieneProblems(`# Status\n${marker}\n`, "marker.md").length, 1);
}

assert.equal(
  findDocumentationHygieneProblems("## Repeated\n\n## Repeated\n", "duplicate.md").length,
  1,
);
assert.deepEqual(
  findDocumentationHygieneProblems("## Reused\nContent\n## Reused\n", "valid.md"),
  [],
);

console.log("Documentation hygiene focused tests passed.");
