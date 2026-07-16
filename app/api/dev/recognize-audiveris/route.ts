import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { NextResponse } from "next/server";

import { extractMusicXMLFromMxl } from "../../../../lib/musicxml/mxlExtractor";
import { parseMusicXML } from "../../../../lib/musicxml/musicxmlParser";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 300_000;
const MAX_RETURNED_NOTES = 2000;
const missingAudiverisPathMessage =
  "AUDIVERIS_PATH is required for dev-only Audiveris API.";

let isAudiverisRunning = false;

function parseTimeoutMs() {
  const rawTimeout = process.env.AUDIVERIS_DEV_API_TIMEOUT_MS;
  const timeoutMs = Number(rawTimeout);

  return Number.isFinite(timeoutMs) && timeoutMs > 0
    ? timeoutMs
    : DEFAULT_TIMEOUT_MS;
}

function runAudiveris(
  audiverisPath: string,
  inputPdfPath: string,
  outputDir: string,
) {
  const timeoutMs = parseTimeoutMs();
  const args = ["-batch", "-export", "-output", outputDir, inputPdfPath];

  return new Promise<void>((resolve, reject) => {
    const child = spawn(audiverisPath, args, { stdio: "ignore" });
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("Audiveris execution timed out."));
    }, timeoutMs);

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error("Audiveris execution failed."));
    });
  });
}

async function findGeneratedMxl(dir: string): Promise<string | undefined> {
  const entries = await import("node:fs/promises").then(({ readdir }) =>
    readdir(/* turbopackIgnore: true */ dir, { withFileTypes: true }),
  );

  for (const entry of entries) {
    const entryPath = path.join(
      /* turbopackIgnore: true */ dir,
      entry.name,
    );
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".mxl")) {
      return entryPath;
    }
    if (entry.isDirectory()) {
      const nestedMxl = await findGeneratedMxl(entryPath);
      if (nestedMxl) return nestedMxl;
    }
  }

  return undefined;
}

export async function POST(request: Request) {
  if (process.env.AUDIVERIS_DEV_API_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const audiverisPath = process.env.AUDIVERIS_PATH;
  if (!audiverisPath) {
    return NextResponse.json(
      { error: missingAudiverisPathMessage, devOnly: true, implemented: true },
      { status: 500 },
    );
  }

  if (isAudiverisRunning) {
    return NextResponse.json(
      { error: "Audiveris dev API is busy.", devOnly: true, implemented: true },
      { status: 429 },
    );
  }

  isAudiverisRunning = true;

  let tempRootDir: string | undefined;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const includeNotes = formData.get("includeNotes");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "PDF file is required." },
        { status: 400 },
      );
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return NextResponse.json(
        { error: "Only PDF uploads are supported." },
        { status: 400 },
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "PDF upload must be 10 MB or smaller." },
        { status: 413 },
      );
    }

    tempRootDir = await mkdtemp(path.join(tmpdir(), "audiveris-dev-api-"));
    const tempInputPdf = path.join(tempRootDir, "input.pdf");
    const tempOutputDir = path.join(tempRootDir, "output");

    await mkdir(tempOutputDir);
    await writeFile(tempInputPdf, Buffer.from(await file.arrayBuffer()));
    await runAudiveris(audiverisPath, tempInputPdf, tempOutputDir);

    const generatedMxlPath = await findGeneratedMxl(tempOutputDir);
    if (!generatedMxlPath) {
      return NextResponse.json(
        { error: "Audiveris did not generate an .mxl file." },
        { status: 502 },
      );
    }

    const musicXml = extractMusicXMLFromMxl(
      new Uint8Array(
        await readFile(/* turbopackIgnore: true */ generatedMxlPath),
      ),
    );
    const parsedScore = parseMusicXML(musicXml);

    const shouldReturnFullNotes =
      includeNotes === "full" &&
      process.env.AUDIVERIS_DEV_API_RETURN_FULL_NOTES === "true";
    const returnedNotes = shouldReturnFullNotes
      ? parsedScore.notes.slice(0, MAX_RETURNED_NOTES)
      : [];

    return NextResponse.json({
      devOnly: true,
      implemented: true,
      source: "audiveris",
      inputType: "pdf",
      noteCount: parsedScore.notes.length,
      firstNotes: parsedScore.notes.slice(0, 10),
      ...(shouldReturnFullNotes
        ? {
            notes: returnedNotes,
            returnedNoteCount: returnedNotes.length,
            notesTruncated: parsedScore.notes.length > MAX_RETURNED_NOTES,
          }
        : {}),
    });
  } catch {
    return NextResponse.json(
      {
        error: "Audiveris dev recognition failed.",
        devOnly: true,
        implemented: true,
      },
      { status: 500 },
    );
  } finally {
    if (tempRootDir) {
      await rm(tempRootDir, { recursive: true, force: true });
    }
    isAudiverisRunning = false;
  }
}
