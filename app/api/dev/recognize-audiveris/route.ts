import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextResponse } from "next/server";

const missingAudiverisPathMessage = "AUDIVERIS_PATH is required for dev-only Audiveris API.";
const skeletonMessage = "Audiveris execution is not implemented in this skeleton.";
const maxUploadBytes = 10 * 1024 * 1024;
const devApiTimeoutMs = 120_000;

let isAudiverisRunning = false;

export async function POST(request: Request) {
  if (process.env.AUDIVERIS_DEV_API_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!process.env.AUDIVERIS_PATH) {
    return NextResponse.json(
      {
        error: missingAudiverisPathMessage,
        devOnly: true,
        implemented: false,
        reason: "skeleton only",
      },
      { status: 500 },
    );
  }

  if (isAudiverisRunning) {
    return NextResponse.json(
      {
        error: "Audiveris dev API is busy. Try again after the current request finishes.",
        devOnly: true,
      },
      { status: 429 },
    );
  }

  isAudiverisRunning = true;

  let tempDir: string | undefined;

  try {
    const formData = await request.formData();
    const upload = formData.get("file");

    if (!(upload instanceof File)) {
      return NextResponse.json(
        { error: "A PDF file upload is required.", devOnly: true },
        { status: 400 },
      );
    }

    if (upload.size > maxUploadBytes) {
      return NextResponse.json(
        { error: "Uploaded PDF exceeds the dev API size limit.", devOnly: true, maxUploadBytes },
        { status: 400 },
      );
    }

    if (upload.type !== "application/pdf" && !upload.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF uploads are accepted by this dev-only Audiveris API.", devOnly: true },
        { status: 400 },
      );
    }

    tempDir = await mkdtemp(join(tmpdir(), "audiveris-dev-api-"));
    const inputPath = join(tempDir, "input.pdf");
    await writeFile(inputPath, Buffer.from(await upload.arrayBuffer()));

    return NextResponse.json(
      {
        error: skeletonMessage,
        devOnly: true,
        implemented: false,
        reason: "skeleton only",
        input: {
          name: upload.name,
          size: upload.size,
          type: upload.type || "application/pdf",
        },
        limits: {
          maxUploadBytes,
          timeoutMs: devApiTimeoutMs,
        },
      },
      { status: 501 },
    );
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
    isAudiverisRunning = false;
  }
}
