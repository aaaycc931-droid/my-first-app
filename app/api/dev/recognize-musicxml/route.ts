import { NextResponse } from "next/server";

import { extractMusicXMLFromMxl } from "../../../../lib/musicxml/mxlExtractor";
import { createRecognizer } from "../../../../lib/recognition/recognizerFactory";

const MAX_MUSICXML_FILE_SIZE_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  if (process.env.MUSICXML_DEV_API_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: '请通过 multipart/form-data 的 "file" 字段上传 MusicXML 文件。' },
        { status: 400 },
      );
    }

    const extension = file.name.toLowerCase().split(".").pop();

    if (extension !== "musicxml" && extension !== "xml" && extension !== "mxl") {
      return NextResponse.json(
        { error: "仅支持 .musicxml、.xml 或 .mxl 文件。" },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "MusicXML 文件为空，请选择包含乐谱内容的文件。" },
        { status: 400 },
      );
    }

    if (file.size > MAX_MUSICXML_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "MusicXML 文件过大，当前最大支持 2 MB。" },
        { status: 413 },
      );
    }

    const recognizer = createRecognizer("musicxml");
    const musicXMLFile =
      extension === "mxl"
        ? new File(
            [extractMusicXMLFromMxl(new Uint8Array(await file.arrayBuffer()))],
            file.name.replace(/\.mxl$/i, ".musicxml"),
            { type: "application/xml" },
          )
        : file;
    const response = await recognizer.recognize(musicXMLFile);

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "无法读取上传的 MusicXML 文件，请检查请求格式后重试。",
      },
      { status: 400 },
    );
  }
}
