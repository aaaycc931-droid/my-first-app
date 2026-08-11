import assert from "node:assert/strict";

import type {
  BlobAudioPlaybackController,
  BlobAudioPlaybackSnapshot,
} from "../lib/audio/blobAudioPlayback.js";
import {
  createBrowserLocalRecordingInputPort,
  type LocalRecordingInputPort,
  type LocalRecordingPreviewPort,
} from "../lib/audio/localRecordingInput.js";
import type {
  MediaRecorderCaptureHandle,
  MediaRecorderCapturePort,
} from "../lib/audio/mediaRecorder.js";
import {
  createLocalRecordingController,
  type LocalRecordingController,
} from "../lib/practice/localRecordingController.js";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
};

const createStream = () => {
  let stopCalls = 0;
  const stream = {
    getTracks: () => [
      {
        stop: () => {
          stopCalls += 1;
        },
      },
    ],
  } as unknown as MediaStream;
  return { stream, getStopCalls: () => stopCalls };
};

class FakeCapture implements MediaRecorderCaptureHandle {
  state: "inactive" | "recording" = "inactive";
  disposeCalls = 0;
  startCalls = 0;
  stopCalls = 0;
  throwOnStart = false;
  throwOnStop = false;

  constructor(
    private readonly onStopped: (recording: Blob | null) => void,
    private readonly onError: () => void,
  ) {}

  getState = () => this.state;

  start = () => {
    this.startCalls += 1;
    if (this.throwOnStart) throw new Error("start failed");
    this.state = "recording";
  };

  stop = () => {
    this.stopCalls += 1;
    if (this.throwOnStop) throw new Error("stop failed");
    this.state = "inactive";
  };

  dispose = () => {
    this.disposeCalls += 1;
    this.state = "inactive";
  };

  finish = (recording: Blob | null) => {
    this.state = "inactive";
    this.onStopped(recording);
  };

  fail = () => this.onError();
}

const createRecorderPort = () => {
  const captures: FakeCapture[] = [];
  let supported = true;
  const port: MediaRecorderCapturePort = {
    isSupported: () => supported,
    create: (request) => {
      const capture = new FakeCapture(request.onStopped, request.onError);
      captures.push(capture);
      return capture;
    },
  };
  return {
    port,
    captures,
    setSupported: (next: boolean) => {
      supported = next;
    },
  };
};

const createPlayback = () => {
  let snapshot: BlobAudioPlaybackSnapshot = {
    status: "idle",
    key: null,
    error: "",
  };
  let stopCalls = 0;
  let disposeCalls = 0;
  let activeRequest: Parameters<BlobAudioPlaybackController["play"]>[0] | null =
    null;
  const controller: BlobAudioPlaybackController = {
    getSnapshot: () => snapshot,
    subscribe: () => () => undefined,
    play: async (request) => {
      activeRequest = request;
      snapshot = { status: "playing", key: request.key, error: "" };
      return true;
    },
    stop: () => {
      stopCalls += 1;
      activeRequest = null;
      snapshot = { status: "idle", key: null, error: "" };
    },
    dispose: () => {
      disposeCalls += 1;
      activeRequest = null;
      snapshot = { status: "idle", key: null, error: "" };
    },
  };
  return {
    controller,
    end: () => activeRequest?.onEnded?.(),
    fail: () => activeRequest?.onError?.("回放失败"),
    getStopCalls: () => stopCalls,
    getDisposeCalls: () => disposeCalls,
  };
};

const createController = ({
  inputPort,
  previewPort = {
    createUrl: () => "blob:practice-recording",
    revokeUrl: () => undefined,
  },
  recorderPort,
  playback,
}: {
  inputPort: LocalRecordingInputPort;
  previewPort?: LocalRecordingPreviewPort;
  recorderPort: MediaRecorderCapturePort;
  playback: BlobAudioPlaybackController;
}): LocalRecordingController =>
  createLocalRecordingController({
    inputPort,
    previewPort,
    recorderPort,
    playback,
    now: () => 1234,
  });

const testBrowserInputAdapter = async () => {
  const requested: MediaStreamConstraints[] = [];
  const owned = createStream();
  const port = createBrowserLocalRecordingInputPort({
    getUserMedia: async (constraints) => {
      requested.push(constraints);
      return owned.stream;
    },
  });
  assert.equal(port.isSupported(), false, "support follows the browser surface");
  assert.equal(await port.request(), owned.stream);
  assert.deepEqual(requested, [{ audio: true }]);
};

const testUnsupportedAndPermissionFailure = async () => {
  const recorder = createRecorderPort();
  const playback = createPlayback();
  const unsupported = createController({
    inputPort: { isSupported: () => false, request: async () => createStream().stream },
    recorderPort: recorder.port,
    playback: playback.controller,
  });
  assert.equal(await unsupported.start(), false);
  assert.deepEqual(unsupported.getSnapshot(), {
    status: "error",
    recordingBlob: null,
    recordingUrl: null,
    recordingStartedAtMs: null,
    error: "此浏览器不支持本地录音。",
  });

  recorder.setSupported(false);
  const noRecorder = createController({
    inputPort: { isSupported: () => true, request: async () => createStream().stream },
    recorderPort: recorder.port,
    playback: playback.controller,
  });
  assert.equal(await noRecorder.start(), false);
  assert.equal(noRecorder.getSnapshot().error, "此浏览器不支持本地录音。");

  recorder.setSupported(true);
  const denied = createController({
    inputPort: {
      isSupported: () => true,
      request: async () => {
        throw new DOMException("denied", "NotAllowedError");
      },
    },
    recorderPort: recorder.port,
    playback: playback.controller,
  });
  assert.equal(await denied.start(), false);
  assert.equal(
    denied.getSnapshot().error,
    "需要麦克风权限才能录制本地练习。",
  );
};

const testPendingCancellationAndReplacement = async () => {
  const first = deferred<MediaStream>();
  const second = deferred<MediaStream>();
  const requests = [first, second];
  const recorder = createRecorderPort();
  const playback = createPlayback();
  const controller = createController({
    inputPort: {
      isSupported: () => true,
      request: () => requests.shift()!.promise,
    },
    recorderPort: recorder.port,
    playback: playback.controller,
  });

  const firstStart = controller.start();
  assert.equal(controller.getSnapshot().status, "requesting");
  controller.stop();
  assert.equal(controller.getSnapshot().status, "empty");
  const staleStream = createStream();
  first.resolve(staleStream.stream);
  assert.equal(await firstStart, false);
  assert.equal(staleStream.getStopCalls(), 1);
  assert.equal(recorder.captures.length, 0);

  const oldRequest = controller.start();
  const replacement = deferred<MediaStream>();
  requests.push(replacement);
  const newRequest = controller.start();
  const oldStream = createStream();
  second.resolve(oldStream.stream);
  assert.equal(await oldRequest, false);
  assert.equal(oldStream.getStopCalls(), 1);
  const currentStream = createStream();
  replacement.resolve(currentStream.stream);
  assert.equal(await newRequest, true);
  assert.equal(controller.getSnapshot().status, "recording");
  assert.equal(controller.getSnapshot().recordingStartedAtMs, 1234);
  assert.equal(recorder.captures.length, 1);

  controller.clear();
  assert.equal(controller.getSnapshot().status, "empty");
  assert.equal(currentStream.getStopCalls(), 1);
  assert.equal(recorder.captures[0]?.disposeCalls, 1);
};

const testRecordingCompletionErrorsAndPlayback = async () => {
  const owned = createStream();
  const recorder = createRecorderPort();
  const playback = createPlayback();
  const revokedUrls: string[] = [];
  const controller = createController({
    inputPort: { isSupported: () => true, request: async () => owned.stream },
    previewPort: {
      createUrl: () => "blob:practice-recording",
      revokeUrl: (url) => revokedUrls.push(url),
    },
    recorderPort: recorder.port,
    playback: playback.controller,
  });

  assert.equal(await controller.start(), true);
  const capture = recorder.captures[0]!;
  assert.equal(capture.startCalls, 1);
  controller.stop();
  assert.equal(capture.stopCalls, 1);
  const recording = new Blob(["practice"], { type: "audio/webm" });
  capture.finish(recording);
  assert.equal(owned.getStopCalls(), 1);
  assert.equal(controller.getSnapshot().status, "ready");
  assert.equal(controller.getSnapshot().recordingBlob, recording);
  assert.equal(controller.getSnapshot().recordingUrl, "blob:practice-recording");

  assert.equal(await controller.play(), true);
  assert.equal(controller.getSnapshot().status, "playing");
  playback.end();
  assert.equal(controller.getSnapshot().status, "ready");
  assert.equal(await controller.play(), true);
  playback.fail();
  assert.equal(controller.getSnapshot().status, "error");
  assert.equal(controller.getSnapshot().recordingBlob, recording);
  assert.equal(controller.getSnapshot().error, "回放失败");
  assert.equal(await controller.play(), true, "a retained recording remains retryable");
  controller.handleGlobalStop();
  assert.equal(controller.getSnapshot().status, "ready");
  controller.clear();
  assert.deepEqual(revokedUrls, ["blob:practice-recording"]);
  assert.equal(controller.getSnapshot().status, "empty");

  const emptyStream = createStream();
  const emptyController = createController({
    inputPort: {
      isSupported: () => true,
      request: async () => emptyStream.stream,
    },
    recorderPort: recorder.port,
    playback: createPlayback().controller,
  });
  assert.equal(await emptyController.start(), true);
  recorder.captures.at(-1)!.finish(null);
  assert.equal(emptyController.getSnapshot().status, "error");
  assert.equal(
    emptyController.getSnapshot().error,
    "没有获得可回放的录音数据，请重试。",
  );
  assert.equal(emptyStream.getStopCalls(), 1);
};

const testCaptureFailuresFailClosed = async () => {
  const startFailureStream = createStream();
  const startFailureRecorder = createRecorderPort();
  const startFailureController = createController({
    inputPort: {
      isSupported: () => true,
      request: async () => startFailureStream.stream,
    },
    recorderPort: startFailureRecorder.port,
    playback: createPlayback().controller,
  });
  const originalCreate = startFailureRecorder.port.create;
  startFailureRecorder.port.create = (request) => {
    const capture = originalCreate(request) as FakeCapture;
    capture.throwOnStart = true;
    return capture;
  };
  assert.equal(await startFailureController.start(), false);
  assert.equal(startFailureController.getSnapshot().status, "error");
  assert.equal(
    startFailureController.getSnapshot().error,
    "无法开始本地录音，请重试。",
  );
  assert.equal(startFailureStream.getStopCalls(), 1);
  assert.equal(startFailureRecorder.captures[0]?.disposeCalls, 1);

  const runtimeFailureStream = createStream();
  const runtimeFailureRecorder = createRecorderPort();
  const runtimeFailureController = createController({
    inputPort: {
      isSupported: () => true,
      request: async () => runtimeFailureStream.stream,
    },
    recorderPort: runtimeFailureRecorder.port,
    playback: createPlayback().controller,
  });
  assert.equal(await runtimeFailureController.start(), true);
  runtimeFailureRecorder.captures[0]?.fail();
  assert.equal(runtimeFailureController.getSnapshot().status, "error");
  assert.equal(
    runtimeFailureController.getSnapshot().error,
    "本次录音发生错误，已安全停止。请重试录音。",
  );
  assert.equal(runtimeFailureStream.getStopCalls(), 1);
  assert.equal(runtimeFailureRecorder.captures[0]?.disposeCalls, 1);
};

const testStaleFailureAndDetach = async () => {
  const pending = deferred<MediaStream>();
  const recorder = createRecorderPort();
  const playback = createPlayback();
  const controller = createController({
    inputPort: { isSupported: () => true, request: () => pending.promise },
    recorderPort: recorder.port,
    playback: playback.controller,
  });
  const start = controller.start();
  controller.detach();
  const stream = createStream();
  pending.resolve(stream.stream);
  assert.equal(await start, false);
  assert.equal(stream.getStopCalls(), 1);
  assert.equal(playback.getDisposeCalls(), 1);
  assert.deepEqual(controller.getSnapshot(), {
    status: "empty",
    recordingBlob: null,
    recordingUrl: null,
    recordingStartedAtMs: null,
    error: "",
  });
};

const main = async () => {
  await testBrowserInputAdapter();
  await testUnsupportedAndPermissionFailure();
  await testPendingCancellationAndReplacement();
  await testRecordingCompletionErrorsAndPlayback();
  await testCaptureFailuresFailClosed();
  await testStaleFailureAndDetach();
  console.log("Practice local recording controller tests passed.");
};

void main();
