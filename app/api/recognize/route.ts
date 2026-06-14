import { NextResponse } from "next/server";

import { getRecognizer } from "../../../lib/recognition/recognizerFactory";

const maxImageSize = 10 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png"]);

export async function POST(request: Request) {
  const formData = await request.formData();
  const image = formData.get("image");

  if (!(image instanceof File)) {
    return NextResponse.json({ error: "请上传图片文件。" }, { status: 400 });
  }

  if (!allowedImageTypes.has(image.type)) {
    return NextResponse.json({ error: "仅支持 JPG、JPEG 或 PNG 图片。" }, { status: 400 });
  }

  if (image.size > maxImageSize) {
    return NextResponse.json({ error: "图片大小不能超过 10MB。" }, { status: 400 });
  }

  const recognizer = getRecognizer();
  const response = await recognizer.recognize(image);

  return NextResponse.json(response);
}
