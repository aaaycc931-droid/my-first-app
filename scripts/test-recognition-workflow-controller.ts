import assert from "node:assert/strict";

import type {
  AudiverisDevSummary,
  RecognitionApiClient,
} from "../lib/recognition/browserRecognitionApiClient.js";
import type { RecognitionFilePreviewPort } from "../lib/recognition/browserRecognitionFilePreview.js";
import {
  createRecognitionWorkflowController,
  type RecognitionWorkflowController,
} from "../lib/recognition/recognitionWorkflowController.js";
import type {
  RecognizedNote,
  RecognizeResponse,
} from "../lib/recognition/types.js";

type Deferred<T> = Readonly<{
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}>;

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const note = (pitch: string): RecognizedNote => ({
  pitch,
  note: pitch,
  duration: "quarter",
  measure: 1,
  beat: 1,
  confidence: 0.9,
});

const file = (name: string, type: string, size = 4) =>
  new File([new Uint8Array(size)], name, { type });

const createHarness = () => {
  const imageRequests: Array<{
    file: File;
    result: Deferred<RecognizeResponse>;
  }> = [];
  const musicXMLRequests: Array<{
    file: File;
    result: Deferred<RecognizeResponse>;
  }> = [];
  const audiverisRequests: Array<{
    file: File;
    includeFullNotes: boolean;
    result: Deferred<AudiverisDevSummary>;
  }> = [];
  const createdUrls: string[] = [];
  const revokedUrls: string[] = [];
  let invalidationCount = 0;
  let clearPlayErrorCount = 0;

  const apiClient: RecognitionApiClient = {
    recognizeImage(requestFile) {
      const result = deferred<RecognizeResponse>();
      imageRequests.push({ file: requestFile, result });
      return result.promise;
    },
    importMusicXML(requestFile) {
      const result = deferred<RecognizeResponse>();
      musicXMLRequests.push({ file: requestFile, result });
      return result.promise;
    },
    recognizeAudiverisPdf(requestFile, { includeFullNotes }) {
      const result = deferred<AudiverisDevSummary>();
      audiverisRequests.push({
        file: requestFile,
        includeFullNotes,
        result,
      });
      return result.promise;
    },
  };
  const previewPort: RecognitionFilePreviewPort = {
    createPreviewUrl(requestFile) {
      const url = `blob:${requestFile.name}:${createdUrls.length + 1}`;
      createdUrls.push(url);
      return url;
    },
    revokePreviewUrl(url) {
      revokedUrls.push(url);
    },
  };
  const controller = createRecognitionWorkflowController(
    apiClient,
    previewPort,
    {
      invalidateSharedResult: () => {
        invalidationCount += 1;
      },
      clearPlayError: () => {
        clearPlayErrorCount += 1;
      },
    },
  );

  return {
    controller,
    imageRequests,
    musicXMLRequests,
    audiverisRequests,
    createdUrls,
    revokedUrls,
    get invalidationCount() {
      return invalidationCount;
    },
    get clearPlayErrorCount() {
      return clearPlayErrorCount;
    },
  };
};

const selectImage = (
  controller: RecognitionWorkflowController,
  name = "score.png",
) => {
  const image = file(name, "image/png");
  assert.equal(controller.selectImage(image).accepted, true);
  return image;
};

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const testImageLifecycleAndBusyGuard = async () => {
  const harness = createHarness();
  assert.deepEqual(harness.controller.getState().recognizedNotes, []);
  assert.equal(harness.imageRequests.length, 0);

  const firstImage = selectImage(harness.controller);
  assert.equal(harness.controller.getState().fileName, firstImage.name);
  assert.equal(harness.controller.getState().recognizeStatus, "已上传");
  assert.equal(harness.createdUrls.length, 1);

  const firstRun = harness.controller.recognizeImage();
  void harness.controller.recognizeImage();
  assert.equal(harness.imageRequests.length, 1, "busy guard must reject a second request");
  harness.imageRequests[0]!.result.resolve({ notes: [note("C4")] });
  await firstRun;
  assert.equal(harness.controller.getState().recognizedNotes[0]?.note, "C4");
  assert.equal(harness.controller.getState().recognizeStatus, "识别完成");
  assert.equal(harness.controller.getState().isRecognizing, false);

  selectImage(harness.controller, "replacement.png");
  assert.deepEqual(harness.controller.getState().recognizedNotes, []);
  assert.deepEqual(harness.revokedUrls, [harness.createdUrls[0]]);
  harness.controller.dispose();
  assert.deepEqual(harness.revokedUrls, harness.createdUrls);
  harness.controller.dispose();
  assert.equal(harness.revokedUrls.length, 2, "dispose must be idempotent");
};

const testImageFailureAndStaleReplacement = async () => {
  const harness = createHarness();
  selectImage(harness.controller, "old.png");
  const staleRun = harness.controller.recognizeImage();
  selectImage(harness.controller, "new.png");
  harness.imageRequests[0]!.result.resolve({ notes: [note("D4")] });
  await staleRun;
  assert.deepEqual(
    harness.controller.getState().recognizedNotes,
    [],
    "a replaced image must reject a late success",
  );
  assert.equal(harness.controller.getState().recognizeStatus, "已上传");

  const currentRun = harness.controller.recognizeImage();
  harness.imageRequests[1]!.result.reject(new Error("network failed"));
  await currentRun;
  assert.equal(harness.controller.getState().recognizeStatus, "识别失败");
  assert.equal(harness.controller.getState().recognizeError, "network failed");
};

const testMusicXMLValidationAndCrossFlowStaleness = async () => {
  const invalidCases: Array<[File, string]> = [
    [
      file("score.txt", "text/plain"),
      "请选择 .musicxml、.xml 或 .mxl 文件。",
    ],
    [
      file("empty.musicxml", "application/xml", 0),
      "MusicXML 文件为空，请选择包含乐谱内容的文件。",
    ],
    [
      file("large.mxl", "application/octet-stream", 2 * 1024 * 1024 + 1),
      "MusicXML 文件过大，当前最大支持 2 MB。",
    ],
  ];
  for (const [invalidFile, message] of invalidCases) {
    const harness = createHarness();
    assert.equal(harness.controller.selectMusicXML(invalidFile).accepted, false);
    assert.equal(harness.controller.getState().musicXMLImportError, message);
    assert.equal(harness.controller.getState().musicXMLImportStatus, "error");
  }

  for (const name of ["score.musicxml", "score.XML", "score.MxL"]) {
    const harness = createHarness();
    assert.equal(
      harness.controller.selectMusicXML(
        file(name, "application/octet-stream"),
      ).accepted,
      true,
    );
  }

  const harness = createHarness();
  selectImage(harness.controller);
  const staleImageRun = harness.controller.recognizeImage();
  const musicXML = file("replacement.musicxml", "application/xml");
  harness.controller.selectMusicXML(musicXML);
  const importRun = harness.controller.importMusicXML();
  assert.equal(harness.musicXMLRequests[0]?.file, musicXML);
  harness.imageRequests[0]!.result.resolve({ notes: [note("E4")] });
  harness.musicXMLRequests[0]!.result.resolve({ notes: [note("F4"), note("G4")] });
  await Promise.all([staleImageRun, importRun]);
  assert.deepEqual(
    harness.controller.getState().recognizedNotes.map(({ note }) => note),
    ["F4", "G4"],
  );
  assert.equal(harness.controller.getState().importedMusicXMLNoteCount, 2);
  assert.equal(harness.controller.getState().musicXMLImportStatus, "success");

  harness.controller.selectMusicXML(file("failure.xml", "application/xml"));
  const failureRun = harness.controller.importMusicXML();
  harness.musicXMLRequests[1]!.result.reject(new Error("invalid score"));
  await failureRun;
  assert.equal(harness.controller.getState().musicXMLImportError, "invalid score");
  assert.equal(harness.controller.getState().musicXMLImportStatus, "error");
};

const testRejectedMusicXMLSelectionPreservesPendingImage = async () => {
  for (const rejectedFile of [null, file("score.txt", "text/plain")]) {
    const harness = createHarness();
    selectImage(harness.controller);
    const imageRun = harness.controller.recognizeImage();

    assert.equal(
      harness.controller.selectMusicXML(rejectedFile).accepted,
      false,
    );
    assert.equal(
      harness.controller.getState().isRecognizing,
      true,
      "a rejected MusicXML selection must not cancel or unlock a pending image request",
    );

    harness.imageRequests[0]!.result.resolve({ notes: [note("A4")] });
    await imageRun;
    assert.equal(harness.controller.getState().isRecognizing, false);
    assert.equal(harness.controller.getState().recognizeStatus, "识别完成");
    assert.equal(harness.controller.getState().recognizedNotes[0]?.note, "A4");
  }
};

const testAudiverisIsolationAndStaleness = async () => {
  const harness = createHarness();
  assert.equal(
    harness.controller.selectAudiverisPdf(file("score.png", "image/png"))
      .accepted,
    false,
  );
  assert.equal(
    harness.controller.getState().audiverisDevError,
    "仅开发使用的 Local Audiveris 面板只接受 PDF 文件。",
  );

  const firstPdf = file("first.PDF", "application/octet-stream");
  assert.equal(harness.controller.selectAudiverisPdf(firstPdf).accepted, true);
  const staleRun = harness.controller.recognizeAudiverisPdf(true);
  assert.equal(harness.audiverisRequests[0]?.includeFullNotes, true);
  const secondPdf = file("second.pdf", "application/pdf");
  harness.controller.selectAudiverisPdf(secondPdf);
  harness.audiverisRequests[0]!.result.resolve({
    noteCount: 1,
    firstNotes: [note("A4")],
    source: "audiveris",
    inputType: "pdf",
  });
  await staleRun;
  assert.equal(harness.controller.getState().audiverisDevSummary, null);

  const currentRun = harness.controller.recognizeAudiverisPdf(false);
  const summary: AudiverisDevSummary = {
    noteCount: 2,
    firstNotes: [note("B4")],
    source: "audiveris",
    inputType: "pdf",
  };
  harness.audiverisRequests[1]!.result.resolve(summary);
  await currentRun;
  assert.equal(harness.controller.getState().audiverisDevSummary, summary);
  assert.deepEqual(
    harness.controller.getState().recognizedNotes,
    [],
    "Audiveris dev results must not enter the main result",
  );
};

const testDisposeRejectsLateCompletion = async () => {
  const harness = createHarness();
  selectImage(harness.controller);
  const run = harness.controller.recognizeImage();
  const snapshot = harness.controller.getState();
  harness.controller.dispose();
  harness.imageRequests[0]!.result.resolve({ notes: [note("C5")] });
  await run;
  await flush();
  assert.equal(
    harness.controller.getState(),
    snapshot,
    "dispose must reject every late state write",
  );
};

const run = async () => {
  await testImageLifecycleAndBusyGuard();
  await testImageFailureAndStaleReplacement();
  await testMusicXMLValidationAndCrossFlowStaleness();
  await testRejectedMusicXMLSelectionPreservesPendingImage();
  await testAudiverisIsolationAndStaleness();
  await testDisposeRejectsLateCompletion();
  console.log("recognition workflow controller tests passed");
};

void run();
