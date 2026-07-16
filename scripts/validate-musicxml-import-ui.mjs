import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const pageUrl = new URL("../app/recognize/page.tsx", import.meta.url);
const routeUrl = new URL("../app/api/dev/recognize-musicxml/route.ts", import.meta.url);
const recognizeRouteUrl = new URL("../app/api/recognize/route.ts", import.meta.url);
const uiDocsUrl = new URL("../docs/musicxml-import-ui.md", import.meta.url);
const qaDocsUrl = new URL("../docs/musicxml-import-ui-qa.md", import.meta.url);

try {
  const pageSource = await readFile(pageUrl, "utf8");
  const routeSource = await readFile(routeUrl, "utf8");
  const recognizeRouteSource = await readFile(recognizeRouteUrl, "utf8");

  assert.match(pageSource, /process\.env\.NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED === "true"/, "MusicXML import UI must remain guarded by NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED=true.");
  assert.match(routeSource, /process\.env\.MUSICXML_DEV_API_ENABLED !== "true"/, "MusicXML dev API must remain guarded by MUSICXML_DEV_API_ENABLED=true.");
  assert.match(routeSource, /MAX_MUSICXML_FILE_SIZE_BYTES = 2 \* 1024 \* 1024/, "MusicXML dev API must enforce the 2 MB MVP upload limit.");
  assert.match(routeSource, /extension !== "musicxml" && extension !== "xml" && extension !== "mxl"/, "MusicXML dev API must accept only .musicxml, .xml, and .mxl extensions.");
  assert.match(routeSource, /extractMusicXMLFromMxl/, ".mxl extraction must stay in the dev-only MusicXML API route.");
  assert.doesNotMatch(recognizeRouteSource, /extractMusicXMLFromMxl|\.mxl|fflate/, "Main image recognition API must not include .mxl extraction.");
  assert.match(routeSource, /file\.size === 0/, "MusicXML dev API must reject empty files.");
  assert.match(pageSource, /fetch\("\/api\/dev\/recognize-musicxml"/, "MusicXML import UI must use the dev-only MusicXML API.");
  assert.match(pageSource, /支持 \.musicxml、\.xml、\.mxl；\.mxl 只会在 dev API 中解压验证/, "MusicXML import UI must describe dev-only .mxl support.");
  assert.doesNotMatch(pageSource, /改名为 \.zip|手动解压|人工解压/, "MusicXML import UI must not tell users to manually unzip .mxl files.");
  assert.doesNotMatch(pageSource, /extractMusicXMLFromMxl|fflate|unzipSync/, "Browser UI must not contain .mxl decompression logic.");
  assert.match(pageSource, /setRecognizedNotes\(importedNotes\)/, "Successful MusicXML imports must continue to reuse the recognized notes state.");
  assert.match(pageSource, /正在解析 MusicXML\.\.\./, "MusicXML import UI must show an importing status.");
  assert.match(pageSource, /导入成功，已解析 \{importedMusicXMLNoteCount\} 个音符/, "MusicXML import UI must show the imported note count.");
  assert.match(pageSource, /disabled=\{!musicXMLFile \|\| isImportingMusicXML\}/, "MusicXML import button must remain disabled without a valid file or while importing.");

  await Promise.all([access(uiDocsUrl), access(qaDocsUrl)]);

  console.log("MusicXML import UI static validation passed.");
} catch (error) {
  console.error("MusicXML import UI static validation failed.");
  console.error(error);
  process.exit(1);
}
