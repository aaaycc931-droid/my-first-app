import assert from "node:assert/strict";

import {
  PREFERRED_MEDIA_RECORDER_MIME_TYPES,
  createBrowserMediaRecorderCapturePort,
} from "../lib/audio/mediaRecorder.js";

type RecorderEvent = { data: Blob };

class FakeRecorder {
  static supported = new Set<string>();
  static instances: FakeRecorder[] = [];
  static throwOnStart = false;
  static throwOnStop = false;
  static stopDuringStart = false;
  static errorDuringStart = false;
  static isTypeSupported = (mimeType: string) => FakeRecorder.supported.has(mimeType);

  readonly mimeType: string;
  state: "inactive" | "recording" = "inactive";
  ondataavailable: ((event: RecorderEvent) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readonly options: MediaRecorderOptions | undefined;
  startTimeslice: number | undefined;
  stopCalls = 0;

  constructor(_stream: MediaStream, options?: MediaRecorderOptions) {
    this.options = options;
    this.mimeType = options?.mimeType ?? "audio/browser-default";
    FakeRecorder.instances.push(this);
  }

  start(timeslice?: number) {
    if (FakeRecorder.throwOnStart) throw new Error("start failed");
    this.startTimeslice = timeslice;
    this.state = "recording";
    if (FakeRecorder.errorDuringStart) this.emitError();
    if (FakeRecorder.stopDuringStart) this.stop();
  }

  stop() {
    this.stopCalls += 1;
    if (FakeRecorder.throwOnStop) throw new Error("stop failed");
    this.state = "inactive";
    this.onstop?.();
  }

  emitData(data: Blob) {
    this.ondataavailable?.({ data });
  }

  emitError() {
    this.onerror?.();
  }
}

const resetFake = () => {
  FakeRecorder.supported = new Set<string>();
  FakeRecorder.instances = [];
  FakeRecorder.throwOnStart = false;
  FakeRecorder.throwOnStop = false;
  FakeRecorder.stopDuringStart = false;
  FakeRecorder.errorDuringStart = false;
};

const stream = {} as MediaStream;

const testSupportAndMimeSelection = () => {
  const unavailable = createBrowserMediaRecorderCapturePort({ getConstructor: () => undefined });
  assert.equal(unavailable.isSupported(), false);
  assert.throws(() => unavailable.create({
    stream,
    timesliceMs: 250,
    onStopped: () => undefined,
    onError: () => undefined,
  }), /unavailable/);

  resetFake();
  FakeRecorder.supported.add("audio/webm");
  const port = createBrowserMediaRecorderCapturePort({ getConstructor: () => FakeRecorder });
  assert.equal(port.isSupported(), true);
  const handle = port.create({
    stream,
    timesliceMs: 250,
    onStopped: () => undefined,
    onError: () => undefined,
  });
  handle.start();
  assert.deepEqual(PREFERRED_MEDIA_RECORDER_MIME_TYPES, [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ]);
  assert.equal(FakeRecorder.instances[0]?.options?.mimeType, "audio/webm");
  assert.equal(FakeRecorder.instances[0]?.startTimeslice, 250);
  assert.equal(handle.getState(), "recording");
  handle.dispose();

  resetFake();
  const fallbackPort = createBrowserMediaRecorderCapturePort({ getConstructor: () => FakeRecorder });
  const fallbackHandle = fallbackPort.create({
    stream,
    timesliceMs: 250,
    onStopped: () => undefined,
    onError: () => undefined,
  });
  fallbackHandle.start();
  assert.equal(FakeRecorder.instances[0]?.options, undefined);
  fallbackHandle.dispose();
};

const testChunksStopAndErrors = async () => {
  resetFake();
  FakeRecorder.supported.add("audio/webm;codecs=opus");
  const stopped: Array<Blob | null> = [];
  let errors = 0;
  const port = createBrowserMediaRecorderCapturePort({ getConstructor: () => FakeRecorder });
  const handle = port.create({
    stream,
    timesliceMs: 250,
    onStopped: (recording) => stopped.push(recording),
    onError: () => { errors += 1; },
  });
  handle.start();
  const recorder = FakeRecorder.instances[0]!;
  recorder.emitData(new Blob([]));
  recorder.emitData(new Blob(["first"]));
  recorder.emitData(new Blob(["second"]));
  recorder.emitError();
  assert.equal(errors, 1);
  handle.stop();
  assert.equal(handle.getState(), "inactive");
  assert.equal(stopped.length, 1);
  assert.equal(stopped[0]?.type, "audio/webm;codecs=opus");
  assert.equal(await stopped[0]?.text(), "firstsecond");
  recorder.emitData(new Blob(["stale"]));
  recorder.emitError();
  handle.stop();
  handle.dispose();
  assert.equal(errors, 1);
  assert.equal(stopped.length, 1);

  resetFake();
  const empty: Array<Blob | null> = [];
  const emptyHandle = createBrowserMediaRecorderCapturePort({ getConstructor: () => FakeRecorder }).create({
    stream,
    timesliceMs: 250,
    onStopped: (recording) => empty.push(recording),
    onError: () => undefined,
  });
  emptyHandle.start();
  emptyHandle.stop();
  assert.deepEqual(empty, [null]);
};

const testDisposeAndStartFailure = () => {
  resetFake();
  let stopped = 0;
  let errors = 0;
  const port = createBrowserMediaRecorderCapturePort({ getConstructor: () => FakeRecorder });
  const handle = port.create({
    stream,
    timesliceMs: 250,
    onStopped: () => { stopped += 1; },
    onError: () => { errors += 1; },
  });
  handle.start();
  const recorder = FakeRecorder.instances[0]!;
  recorder.emitData(new Blob(["discarded"]));
  const staleData = recorder.ondataavailable;
  const staleStop = recorder.onstop;
  const staleError = recorder.onerror;
  handle.dispose();
  handle.dispose();
  recorder.emitError();
  assert.equal(recorder.stopCalls, 1);
  assert.equal(stopped, 0);
  assert.equal(errors, 0);

  const replacementHandle = port.create({
    stream,
    timesliceMs: 250,
    onStopped: () => { stopped += 1; },
    onError: () => { errors += 1; },
  });
  replacementHandle.start();
  staleData?.({ data: new Blob(["stale-after-replacement"]) });
  staleStop?.();
  staleError?.();
  assert.equal(replacementHandle.getState(), "recording");
  assert.equal(stopped, 0);
  assert.equal(errors, 0);
  replacementHandle.dispose();

  resetFake();
  FakeRecorder.throwOnStart = true;
  const failedHandle = port.create({
    stream,
    timesliceMs: 250,
    onStopped: () => { stopped += 1; },
    onError: () => { errors += 1; },
  });
  assert.throws(() => failedHandle.start(), /start failed/);
  const failed = FakeRecorder.instances[0]!;
  assert.equal(failed.ondataavailable, null);
  assert.equal(failed.onstop, null);
  assert.equal(failed.onerror, null);

  resetFake();
  FakeRecorder.throwOnStop = true;
  const safeStopHandle = port.create({
    stream,
    timesliceMs: 250,
    onStopped: () => { stopped += 1; },
    onError: () => { errors += 1; },
  });
  safeStopHandle.start();
  assert.doesNotThrow(() => safeStopHandle.stop());
  assert.equal(safeStopHandle.getState(), "inactive");
  assert.equal(errors, 1);
  assert.doesNotThrow(() => safeStopHandle.dispose());

  resetFake();
  FakeRecorder.stopDuringStart = true;
  const synchronousStops: Array<Blob | null> = [];
  const synchronousHandle = port.create({
    stream,
    timesliceMs: 250,
    onStopped: (recording) => synchronousStops.push(recording),
    onError: () => undefined,
  });
  synchronousHandle.start();
  assert.deepEqual(synchronousStops, [null]);
  assert.equal(synchronousHandle.getState(), "inactive");
};

const main = async () => {
  testSupportAndMimeSelection();
  await testChunksStopAndErrors();
  testDisposeAndStartFailure();
  console.log("MediaRecorder capture browser port tests passed.");
};

void main();
