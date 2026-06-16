import { NextResponse } from "next/server";

const missingAudiverisPathMessage = "AUDIVERIS_PATH is required for dev-only Audiveris API.";
const skeletonMessage = "Audiveris execution is not implemented in this skeleton.";

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

  let hasFile = false;

  try {
    const formData = await request.formData();
    hasFile = formData.has("file");
  } catch {
    hasFile = false;
  }

  return NextResponse.json(
    {
      error: skeletonMessage,
      devOnly: true,
      implemented: false,
      reason: "skeleton only",
      hasFile,
    },
    { status: 501 },
  );
}
