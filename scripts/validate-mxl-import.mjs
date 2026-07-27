import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
import { strToU8, zipSync } from "fflate";

const require = createRequire(import.meta.url);
const extractorUrl = new URL("../lib/musicxml/mxlExtractor.ts", import.meta.url);
const source = await readFile(extractorUrl, "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const compiledModule = { exports: {} };
vm.runInNewContext(outputText, {
  require,
  module: compiledModule,
  exports: compiledModule.exports,
  console,
});
const { extractMusicXMLFromMxl } = compiledModule.exports;

const scoreXml = `<?xml version="1.0"?><score-partwise version="4.0"><part-list /></score-partwise>`;
const containerXml = `<?xml version="1.0"?><container><rootfiles><rootfile full-path="score.xml" /></rootfiles></container>`;
const mxl = (entries) => zipSync(Object.fromEntries(Object.entries(entries).map(([name, text]) => [name, strToU8(text)])));

assert.match(
  extractMusicXMLFromMxl(mxl({ "META-INF/container.xml": containerXml, "score.xml": scoreXml })),
  /<score-partwise\b/,
  "standard META-INF/container.xml rootfile should extract MusicXML.",
);
assert.match(
  extractMusicXMLFromMxl(mxl({ "nested/score.musicxml": scoreXml })),
  /<score-partwise\b/,
  "fallback should find a valid non-META-INF MusicXML entry.",
);
assert.throws(
  () => extractMusicXMLFromMxl(mxl({ "META-INF/container.xml": containerXml.replace("score.xml", "../score.xml"), "score.xml": scoreXml })),
  /路径穿越|\.\./,
  "rootfile path traversal should be rejected.",
);
assert.throws(
  () => extractMusicXMLFromMxl(mxl({ "../score.xml": scoreXml })),
  /路径穿越|\.\./,
  "fallback MusicXML path traversal should be rejected before extraction.",
);
assert.throws(
  () => extractMusicXMLFromMxl(mxl({ "META-INF/container.xml": containerXml, "score.xml": "<not-music />" })),
  /不像 MusicXML|score-partwise|score-timewise/,
  "non-MusicXML XML should be rejected.",
);
assert.throws(
  () => extractMusicXMLFromMxl(mxl({
    ...Object.fromEntries(Array.from({ length: 101 }, (_, index) => [`entry-${index}.txt`, "x"])),
    "score.xml": scoreXml,
  })),
  /100 个 entry/,
  "archives with more than 100 entries should be rejected before extraction.",
);
assert.throws(
  () => extractMusicXMLFromMxl(mxl({
    "score.xml": `<score-partwise>${" ".repeat(4 * 1024 * 1024)}</score-partwise>`,
  })),
  /4 MB/,
  "oversized MusicXML should be rejected from ZIP metadata before inflation.",
);
for (const path of ["/score.xml", "C:/score.xml", "folder\\score.xml"]) {
  assert.throws(
    () => extractMusicXMLFromMxl(mxl({
      "META-INF/container.xml": containerXml.replace("score.xml", path),
      "score.xml": scoreXml,
    })),
    /绝对路径|反斜杠/,
    `unsafe rootfile path should be rejected: ${path}`,
  );
}
assert.throws(
  () => extractMusicXMLFromMxl(new Uint8Array([1, 2, 3, 4])),
  /invalid zip data|unexpected EOF|invalid/,
  "damaged archives should fail closed.",
);

console.log("MXL import validation passed.");
