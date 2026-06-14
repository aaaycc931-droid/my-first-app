import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const pageUrl = new URL("../app/page.tsx", import.meta.url);
const routeUrl = new URL("../app/api/dev/recognize-musicxml/route.ts", import.meta.url);
const uiDocsUrl = new URL("../docs/musicxml-import-ui.md", import.meta.url);
const qaDocsUrl = new URL("../docs/musicxml-import-ui-qa.md", import.meta.url);

try {
  const pageSource = await readFile(pageUrl, "utf8");
  const routeSource = await readFile(routeUrl, "utf8");

  assert.match(
    pageSource,
    /process\.env\.NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED === "true"/,
    "MusicXML import UI must remain guarded by NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED=true.",
  );
  assert.match(
    routeSource,
    /MAX_MUSICXML_FILE_SIZE_BYTES = 2 \* 1024 \* 1024/,
    "MusicXML dev API must enforce the 2 MB MVP upload limit.",
  );
  assert.match(
    routeSource,
    /extension !== "musicxml" && extension !== "xml"/,
    "MusicXML dev API must only accept .musicxml and .xml extensions.",
  );
  assert.match(
    routeSource,
    /当前不支持 \.mxl，请先将文件改名为 \.zip 并解压内部 XML/,
    "MusicXML dev API must reject .mxl with manual extraction guidance.",
  );
  assert.match(
    routeSource,
    /file\.size === 0/,
    "MusicXML dev API must reject empty files.",
  );
  assert.match(
    pageSource,
    /fetch\("\/api\/dev\/recognize-musicxml"/,
    "MusicXML import UI must use the dev-only MusicXML API.",
  );
  assert.match(
    pageSource,
    /当前网页导入仅支持 \.musicxml\/\.xml，请先将 \.mxl 改名为 \.zip 并解压出内部 XML 文件。/,
    "MusicXML import UI must explain how to handle unsupported .mxl files.",
  );
  assert.match(
    pageSource,
    /setRecognizedNotes\(importedNotes\)/,
    "Successful MusicXML imports must continue to reuse the recognized notes state.",
  );
  assert.match(
    pageSource,
    /正在解析 MusicXML\.\.\./,
    "MusicXML import UI must show an importing status.",
  );
  assert.match(
    pageSource,
    /导入成功，已解析 \{importedMusicXMLNoteCount\} 个音符/,
    "MusicXML import UI must show the imported note count.",
  );
  assert.match(
    pageSource,
    /disabled=\{!musicXMLFile \|\| isImportingMusicXML\}/,
    "MusicXML import button must remain disabled without a valid file or while importing.",
  );

  await Promise.all([access(uiDocsUrl), access(qaDocsUrl)]);

  console.log("✓ MusicXML import UI feature flag guard found.");
  console.log("✓ Dev-only MusicXML API endpoint found.");
  console.log("✓ Dev-only MusicXML API 2 MB and empty-file limits found.");
  console.log("✓ Dev-only MusicXML API extension restrictions found.");
  console.log("✓ .mxl rejection guidance found.");
  console.log("✓ Existing recognized notes state reuse found.");
  console.log("✓ MusicXML importing and success status feedback found.");
  console.log("✓ MusicXML import button disabled states found.");
  console.log("✓ MusicXML import UI documentation and QA checklist found.");
  console.log("MusicXML import UI static validation passed.");
} catch (error) {
  console.error("MusicXML import UI static validation failed.");
  console.error(error);
  process.exit(1);
}
