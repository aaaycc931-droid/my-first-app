import { readFile } from "node:fs/promises";

const files = {
  recognizerFactory: "lib/recognition/recognizerFactory.ts",
  mainApi: "app/api/recognize/route.ts",
  devMusicXmlApi: "app/api/dev/recognize-musicxml/route.ts",
};

const errors = [];

async function readSource(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    errors.push(`Unable to read ${path}: ${error.message}`);
    return "";
  }
}

function assertSource(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

function hasImportOf(source, importedName) {
  return new RegExp(`import\\s+(?:[^;]*\\b${importedName}\\b[^;]*)\\s+from\\s+`, "m").test(source);
}

const recognizerFactory = await readSource(files.recognizerFactory);
const mainApi = await readSource(files.mainApi);
const devMusicXmlApi = await readSource(files.devMusicXmlApi);

assertSource(
  /const\s+defaultProvider\s*:\s*RecognizerProvider\s*=\s*["']mock["']\s*;/.test(recognizerFactory),
  `${files.recognizerFactory} must keep defaultProvider set to "mock".`,
);

assertSource(
  /export\s+function\s+getRecognizer\s*\(\s*\)\s*:\s*Recognizer\s*{[\s\S]*?return\s+createRecognizer\s*\(\s*defaultProvider\s*\)\s*;[\s\S]*?}/m.test(
    recognizerFactory,
  ),
  `${files.recognizerFactory} getRecognizer() must create the recognizer through the default provider.`,
);

assertSource(
  hasImportOf(mainApi, "getRecognizer") && /\bgetRecognizer\s*\(\s*\)/.test(mainApi),
  `${files.mainApi} must import and call getRecognizer() for the main image recognition flow.`,
);

assertSource(
  !/\bcreateRecognizer\s*\(\s*["']musicxml["']\s*\)/.test(mainApi),
  `${files.mainApi} must not directly call createRecognizer("musicxml").`,
);

assertSource(
  !/\bMusicXMLRecognizer\b/.test(mainApi),
  `${files.mainApi} must not import or call MusicXMLRecognizer.`,
);

assertSource(
  !/\bAudiveris\b|\baudiveris\b/.test(mainApi),
  `${files.mainApi} must not import or call Audiveris-related code.`,
);

assertSource(
  /process\.env\.MUSICXML_DEV_API_ENABLED\s*!==\s*["']true["']/.test(devMusicXmlApi),
  `${files.devMusicXmlApi} must remain guarded by MUSICXML_DEV_API_ENABLED.`,
);

assertSource(
  /\bcreateRecognizer\s*\(\s*["']musicxml["']\s*\)/.test(devMusicXmlApi),
  `${files.devMusicXmlApi} must keep the MusicXML recognizer isolated in the dev API route.`,
);

assertSource(
  !/\bcreateRecognizer\s*\(\s*["']musicxml["']\s*\)/.test(mainApi) &&
    /\bcreateRecognizer\s*\(\s*["']musicxml["']\s*\)/.test(devMusicXmlApi),
  `MusicXML recognition must stay in ${files.devMusicXmlApi}, not in ${files.mainApi}.`,
);

if (errors.length > 0) {
  console.error("Recognition boundary validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log("Recognition boundary validation passed.");
}
