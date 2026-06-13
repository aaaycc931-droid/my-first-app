import { NextResponse } from "next/server";

const mockRecognizedNotes = [
  { note: "C4", duration: "quarter" },
  { note: "D4", duration: "quarter" },
  { note: "E4", duration: "half" },
];

export async function POST(request: Request) {
  await request.formData();

  return NextResponse.json({ notes: mockRecognizedNotes });
}
