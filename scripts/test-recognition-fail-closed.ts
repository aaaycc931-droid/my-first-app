import {
  AIRecognizer,
  RecognitionProviderUnavailableError,
} from "../lib/recognition/aiRecognizer.js";
import { createRecognizer } from "../lib/recognition/recognizerFactory.js";
import {
  createBrowserRecognitionApiClient,
  type RecognitionApiFetch,
} from "../lib/recognition/browserRecognitionApiClient.js";
import { createBrowserRecognitionFilePreviewPort } from "../lib/recognition/browserRecognitionFilePreview.js";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const createJsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

const expectFailureMessage = async (
  operation: () => Promise<unknown>,
  expectedMessage: string,
) => {
  let failure: unknown;
  try {
    await operation();
  } catch (error) {
    failure = error;
  }
  assert(
    failure instanceof Error && failure.message === expectedMessage,
    `expected failure message: ${expectedMessage}`,
  );
};

const run = async () => {
  const recognizer = new AIRecognizer();
  let failure: unknown;
  try {
    await recognizer.recognize({} as File);
  } catch (error) {
    failure = error;
  }
  assert(
    failure instanceof RecognitionProviderUnavailableError,
    "an unavailable AI provider must fail closed instead of returning mock notes",
  );

  const mockResponse = await createRecognizer("mock").recognize({} as File);
  assert(mockResponse.metadata?.provider === "mock", "the explicit mock provider should remain available");

  const requests: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const responses = [
    createJsonResponse({ notes: [{ note: "C4" }] }),
    createJsonResponse({ notes: [{ note: "D4" }] }),
    createJsonResponse({
      noteCount: 2,
      firstNotes: [],
      source: "audiveris",
      inputType: "pdf",
      notes: [],
      returnedNoteCount: 0,
      notesTruncated: false,
    }),
  ];
  const fetchRequest: RecognitionApiFetch = async (input, init) => {
    requests.push({ input, init });
    const response = responses.shift();
    if (!response) throw new Error("unexpected recognition API request");
    return response;
  };
  const apiClient = createBrowserRecognitionApiClient(fetchRequest);
  const image = new File(["image"], "score.png", { type: "image/png" });
  const musicXML = new File(["<score-partwise/>"] , "score.musicxml", {
    type: "application/xml",
  });
  const pdf = new File(["pdf"], "score.pdf", { type: "application/pdf" });

  await apiClient.recognizeImage(image);
  await apiClient.importMusicXML(musicXML);
  const audiverisSummary = await apiClient.recognizeAudiverisPdf(pdf, {
    includeFullNotes: true,
  });

  assert(requests.length === 3, "the API client should issue one request per operation");
  assert(requests[0]?.input === "/api/recognize", "image recognition must keep its endpoint");
  assert(requests[1]?.input === "/api/dev/recognize-musicxml", "MusicXML import must keep its dev-only endpoint");
  assert(requests[2]?.input === "/api/dev/recognize-audiveris", "Audiveris must keep its dev-only endpoint");
  assert(requests.every(({ init }) => init?.method === "POST"), "all recognition requests must remain POST requests");
  assert((requests[0]?.init?.body as FormData).get("image") === image, "image recognition must keep the image FormData field");
  assert((requests[1]?.init?.body as FormData).get("file") === musicXML, "MusicXML import must keep the file FormData field");
  assert((requests[2]?.init?.body as FormData).get("file") === pdf, "Audiveris must keep the file FormData field");
  assert((requests[2]?.init?.body as FormData).get("includeNotes") === "full", "Audiveris full notes must keep the includeNotes=full flag");
  assert(audiverisSummary.source === "audiveris", "Audiveris summary fields must remain unchanged");

  const withoutFullNotesRequests: RequestInit[] = [];
  const withoutFullNotesClient = createBrowserRecognitionApiClient(async (_input, init) => {
    withoutFullNotesRequests.push(init ?? {});
    return createJsonResponse({});
  });
  const defaultSummary = await withoutFullNotesClient.recognizeAudiverisPdf(pdf, {
    includeFullNotes: false,
  });
  assert(
    !(withoutFullNotesRequests[0]?.body as FormData).has("includeNotes"),
    "Audiveris must omit includeNotes when the dev full-notes flag is disabled",
  );
  assert(
    defaultSummary.noteCount === 0 &&
      defaultSummary.firstNotes.length === 0 &&
      defaultSummary.source === "unknown" &&
      defaultSummary.inputType === "unknown",
    "Audiveris response defaults must remain unchanged",
  );

  await expectFailureMessage(
    () => createBrowserRecognitionApiClient(async () => createJsonResponse({}, 500)).recognizeImage(image),
    "识别接口调用失败",
  );
  await expectFailureMessage(
    () => createBrowserRecognitionApiClient(async () => createJsonResponse({ error: "MusicXML error" })).importMusicXML(musicXML),
    "MusicXML error",
  );
  await expectFailureMessage(
    () => createBrowserRecognitionApiClient(async () => createJsonResponse({}, 500)).recognizeAudiverisPdf(pdf, { includeFullNotes: false }),
    "仅开发使用的 Local Audiveris PDF 测试失败。",
  );

  const networkFailure = new Error("network failure");
  let propagatedFailure: unknown;
  try {
    await createBrowserRecognitionApiClient(async () => {
      throw networkFailure;
    }).recognizeImage(image);
  } catch (error) {
    propagatedFailure = error;
  }
  assert(
    propagatedFailure === networkFailure,
    "network and Abort-style failures must propagate unchanged to the existing page catch",
  );

  const previewFiles: File[] = [];
  const revokedPreviewUrls: string[] = [];
  const filePreviewPort = createBrowserRecognitionFilePreviewPort({
    createObjectUrl: (file) => {
      previewFiles.push(file);
      return "blob:recognition-preview";
    },
    revokeObjectUrl: (url) => {
      revokedPreviewUrls.push(url);
    },
  });
  const previewUrl = filePreviewPort.createPreviewUrl(image);
  filePreviewPort.revokePreviewUrl(previewUrl);

  assert(
    previewUrl === "blob:recognition-preview" && previewFiles[0] === image,
    "the recognition file preview port must delegate object URL creation without changing the selected file",
  );
  assert(
    revokedPreviewUrls.length === 1 && revokedPreviewUrls[0] === previewUrl,
    "the recognition file preview port must delegate exact object URL cleanup",
  );

  console.log("recognition fail-closed tests passed");
};

void run();
