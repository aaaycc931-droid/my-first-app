import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { NextResponse } from "next/server";

import { extractMusicXMLFromMxl } from "../../../../lib/musicxml/mxlExtractor";
import { parseMusicXML } from "../../../../lib/musicxml/musicxmlParser";

const MAX_PDF_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const DEFAULT_AUDIVERIS_TIMEOUT_MS = 300_000;
const missingAudiverisPathMessage = "AUDIVERIS_PATH is required for dev-only Audiveris API.";

let isAudiverisRunning = false;

function jsonError(error: string, status: number) {
  return NextResponse.json({ error, devOnly: true, implemented: true }, { status });
}

function getTimeoutMs(): number {
  const configuredTimeout = Number(process.env.AUDIVERIS_DEV_API_TIMEOUT_MS);
  return Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : DEFAULT_AUDIVERIS_TIMEOUT_MS;
}

function isPdfUpload(file: File): boolean {
  return file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
}

async function findMxlFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const mxlFiles: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      mxlFiles.push(...(await findMxlFiles(entryPath)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".mxl")) {
      mxlFiles.push(entryPath);
    }
  }

  return mxlFiles;
}

function runAudiveris(audiverisPath: string, inputPdfPath: string, outputDir: string): Promise<void> {
  const timeoutMs = getTimeoutMs();

  return new Promise((resolve, reject) => {
    let timedOut = false;
    const child = spawn(
      audiverisPath,
      ["-batch", "-export", "-output", outputDir, inputPdfPath],
      { stdio: ["ignore", "ignore", "ignore"] },
    );

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!child.killed) child.kill("SIGKILL");
      }, 2_000).unref();
    }, timeoutMs);

    child.on("error", () => {
      clearTimeout(timeout);
      reject(new Error("Audiveris could not be started."));
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (timedOut) {
        reject(new Error("Audiveris timed out before finishing."));
        return;
      }

      if (code !== 0) {
        reject(new Error("Audiveris failed to process the PDF."));
        return;
      }

      resolve();
    });
  });
}

export async function POST(request: Request) {
  if (process.env.AUDIVERIS_DEV_API_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const audiverisPath = process.env.AUDIVERIS_PATH;
  if (!audiverisPath) {
    return jsonError(missingAudiverisPathMessage, 500);
  }

  if (isAudiverisRunning) {
    return jsonError("Audiveris is already running in this dev server process.", 429);
  }

  let tempRootDir: string | undefined;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError('Upload a PDF through the multipart/form-data "file" field.', 400);
    }

    if (file.size === 0) {
      return jsonError("Uploaded PDF is empty.", 400);
    }

    if (file.size > MAX_PDF_UPLOAD_SIZE_BYTES) {
      return jsonError("Uploaded PDF is too large. Maximum size is 10 MB.", 400);
    }

    if (!isPdfUpload(file)) {
      return jsonError("Unsupported input format. This dev-only phase accepts PDF only.", 400);
    }

    isAudiverisRunning = true;
    tempRootDir = await mkdtemp(path.join(tmpdir(), "audiveris-dev-api-"));
    const tempInputPdfPath = path.join(tempRootDir, "input.pdf");
    const tempOutputDir = path.join(tempRootDir, "output");

    await mkdir(tempOutputDir);
    await writeFile(tempInputPdfPath, Buffer.from(await file.arrayBuffer()));
    await runAudiveris(audiverisPath, tempInputPdfPath, tempOutputDir);

    const mxlFiles = await findMxlFiles(tempOutputDir);
    if (mxlFiles.length === 0) {
      return jsonError("Audiveris finished but no MXL export was found.", 502);
    }

    const musicXml = extractMusicXMLFromMxl(new Uint8Array(await readFile(mxlFiles[0])));
    const parsed = parseMusicXML(musicXml);

    return NextResponse.json({
      devOnly: true,
      implemented: true,
      source: "audiveris",
      inputType: "pdf",
      noteCount: parsed.notes.length,
      firstNotes: parsed.notes.slice(0, 8).map(({ note, pitch, duration, measure, beat, confidence, source }) => ({
        note,
        pitch,
        duration,
        measure,
        beat,
        confidence,
        source,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Audiveris dev recognition failed.";
    return jsonError(message, message.includes("timed out") ? 504 : 502);
  } finally {
    isAudiverisRunning = false;
    if (tempRootDir) {
      await rm(tempRootDir, { recursive: true, force: true });
    }
  }
}
