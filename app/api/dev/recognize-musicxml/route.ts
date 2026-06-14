import { NextResponse } from "next/server";

import { createRecognizer } from "../../../../lib/recognition/recognizerFactory";

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

    const recognizer = createRecognizer("musicxml");
    const response = await recognizer.recognize(file);

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: "无法读取上传的 MusicXML 文件，请检查请求格式后重试。" },
      { status: 400 },
    );
  }
}
