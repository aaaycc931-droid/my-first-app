#!/usr/bin/env node

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const supportedExtensions = new Set([".mxl", ".musicxml", ".xml"]);

function printHelp() {
  console.log(`Usage: npm run musicxml:inspect-local -- --input <path>

Local-only MusicXML/MXL inspector for developer validation.

Options:
  --input <path>  Path to a local .mxl, .musicxml, or .xml file.
  --help          Show this help message.

This script only reads the local file and prints a parser summary. It does not
run Audiveris, call Next.js APIs, upload files, import files into the web app,
or write generated files.`);
}

function parseArgs(argv) {
  const args = { help: false, input: undefined };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }

    if (arg === "--input") {
      args.input = argv[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

async function loadTypeScriptModule(relativePath) {
  const moduleUrl = new URL(relativePath, import.meta.url);
  const source = await readFile(moduleUrl, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const compiledModule = { exports: {} };

  vm.runInNewContext(outputText, {
    require,
    module: compiledModule,
    exports: compiledModule.exports,
    console,
  });

  return compiledModule.exports;
}

function formatNote(note, index) {
  const pitch = note.pitch ?? note.note ?? "unknown";
  const measure = note.measure ?? "unknown";
  const beat = note.beat ?? "unknown";
  const duration = note.duration ?? "unknown";

  return `${index + 1}. pitch=${pitch}, measure=${measure}, beat=${beat}, duration=${duration}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  if (!args.input) {
    throw new Error("Missing required --input <path> argument.");
  }

  const inputPath = resolve(args.input);

  if (!existsSync(inputPath)) {
    throw new Error(`Input file does not exist: ${inputPath}`);
  }

  const extension = extname(inputPath).toLowerCase();

  if (!supportedExtensions.has(extension)) {
    throw new Error("Unsupported input type. Expected .mxl, .musicxml, or .xml.");
  }

  const [{ parseMusicXML }, { extractMusicXMLFromMxl }] = await Promise.all([
    loadTypeScriptModule("../lib/musicxml/musicxmlParser.ts"),
    loadTypeScriptModule("../lib/musicxml/mxlExtractor.ts"),
  ]);

  const inputType = extension === ".mxl" ? "mxl" : "musicxml";
  const fileData = await readFile(inputPath);
  const musicXml =
    extension === ".mxl"
      ? extractMusicXMLFromMxl(new Uint8Array(fileData))
      : fileData.toString("utf8");
  const parsedScore = parseMusicXML(musicXml);
  const notes = Array.isArray(parsedScore.notes) ? parsedScore.notes : [];

  console.log("MusicXML local inspect summary");
  console.log(`Input path: ${inputPath}`);
  console.log(`Detected input type: ${inputType}`);
  console.log(`Extracted MusicXML character length: ${musicXml.length}`);
  console.log(`Parsed note count: ${notes.length}`);
  console.log("First 5 notes:");

  if (notes.length === 0) {
    console.log("  (none)");
    return;
  }

  for (const line of notes.slice(0, 5).map(formatNote)) {
    console.log(`  ${line}`);
  }
}

main().catch((error) => {
  console.error(`musicxml:inspect-local failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
