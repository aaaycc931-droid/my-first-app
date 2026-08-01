import type { RecognizedNote, RecognizeResponse } from "./types";

export type AudiverisDevSummary = {
  noteCount: number;
  firstNotes: RecognizedNote[];
  source: string;
  inputType: string;
  notes?: RecognizedNote[];
  returnedNoteCount?: number;
  notesTruncated?: boolean;
};

export type RecognitionApiClient = Readonly<{
  recognizeImage: (file: File) => Promise<RecognizeResponse>;
  importMusicXML: (file: File) => Promise<RecognizeResponse>;
  recognizeAudiverisPdf: (
    file: File,
    options: Readonly<{ includeFullNotes: boolean }>,
  ) => Promise<AudiverisDevSummary>;
}>;

export type RecognitionApiFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export const createBrowserRecognitionApiClient = (
  fetchRequest: RecognitionApiFetch = (input, init) => fetch(input, init),
): RecognitionApiClient => ({
  async recognizeImage(file) {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetchRequest("/api/recognize", {
      method: "POST",
      body: formData,
    });
    const data = (await response.json()) as RecognizeResponse;

    if (!response.ok) {
      throw new Error(data.error || "识别接口调用失败");
    }

    return data;
  },

  async importMusicXML(file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetchRequest("/api/dev/recognize-musicxml", {
      method: "POST",
      body: formData,
    });
    const data = (await response.json()) as RecognizeResponse;

    if (!response.ok || data.error) {
      throw new Error(data.error || "MusicXML 导入接口调用失败。");
    }

    return data;
  },

  async recognizeAudiverisPdf(file, { includeFullNotes }) {
    const formData = new FormData();
    formData.append("file", file);
    if (includeFullNotes) {
      formData.append("includeNotes", "full");
    }

    const response = await fetchRequest("/api/dev/recognize-audiveris", {
      method: "POST",
      body: formData,
    });
    const data = (await response.json()) as Partial<AudiverisDevSummary> & {
      error?: string;
    };

    if (!response.ok || data.error) {
      throw new Error(
        data.error || "仅开发使用的 Local Audiveris PDF 测试失败。",
      );
    }

    return {
      noteCount: data.noteCount ?? 0,
      firstNotes: data.firstNotes ?? [],
      source: data.source ?? "unknown",
      inputType: data.inputType ?? "unknown",
      notes: data.notes,
      returnedNoteCount: data.returnedNoteCount,
      notesTruncated: data.notesTruncated,
    };
  },
});
