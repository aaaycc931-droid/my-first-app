import { NextResponse } from "next/server";

const maxImageSize = 10 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png"]);

type RecognizedNote = {
  note: string;
  duration: "quarter" | "half" | "whole";
  confidence: number;
  measure: number;
  beat: number;
};

const mockRecognizedNotes: RecognizedNote[] = [
  { note: "C4", duration: "quarter", confidence: 0.95, measure: 1, beat: 1 },
  { note: "D4", duration: "quarter", confidence: 0.88, measure: 1, beat: 2 },
  { note: "E4", duration: "half", confidence: 0.68, measure: 1, beat: 3 },
  { note: "G4", duration: "quarter", confidence: 0.91, measure: 2, beat: 1 },
];

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

  return NextResponse.json({ notes: mockRecognizedNotes });
}
