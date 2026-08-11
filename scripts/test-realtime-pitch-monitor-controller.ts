import assert from "node:assert/strict";

import type { BlobAudioPlaybackController } from "../lib/audio/blobAudioPlayback.js";
import type {
  MediaRecorderCaptureHandle,
  MediaRecorderCapturePort,
} from "../lib/audio/mediaRecorder.js";
import type {
  RealtimePitchInputHandle,
  RealtimePitchInputPort,
} from "../lib/audio/realtimePitchInput.js";
import { createRealtimePitchMonitorController } from "../lib/practice/realtimePitchMonitorController.js";

const stream = {} as MediaStream;
let samplesCallback:
  | ((samples: Float32Array, sampleRate: number) => void)
  | null = null;
let interruption:
  | ((kind: "track-ended" | "context-interrupted") => void)
  | null = null;
let inputDisposes = 0;
const inputHandle: RealtimePitchInputHandle = {
  stream,
  prepare: async () => undefined,
  start: (callback) => {
    samplesCallback = callback;
    callback(new Float32Array(4096), 48_000);
  },
  dispose: () => {
    inputDisposes += 1;
  },
};
const inputPort: RealtimePitchInputPort = {
  isSupported: () => true,
  request: async (request) => {
    interruption = request.onInterrupted;
    return inputHandle;
  },
};
let captureRequest: Parameters<MediaRecorderCapturePort["create"]>[0] | null =
  null;
let captureState: "inactive" | "recording" = "inactive";
let captureDisposes = 0;
const captureHandle: MediaRecorderCaptureHandle = {
  getState: () => captureState,
  start: () => {
    captureState = "recording";
  },
  stop: () => {
    captureState = "inactive";
    captureRequest?.onStopped(new Blob(["voice"]));
  },
  dispose: () => {
    captureState = "inactive";
    captureDisposes += 1;
  },
};
const recorderPort: MediaRecorderCapturePort = {
  isSupported: () => true,
  create: (request) => {
    captureRequest = request;
    return captureHandle;
  },
};
let playbackRequest: Parameters<BlobAudioPlaybackController["play"]>[0] | null =
  null;
let playbackStops = 0;
const playback = {
  getSnapshot: () => ({ status: "idle" as const, key: null, error: "" }),
  subscribe: () => () => undefined,
  play: async (request) => {
    playbackRequest = request;
    return true;
  },
  stop: () => {
    playbackStops += 1;
  },
  dispose: () => undefined,
} satisfies BlobAudioPlaybackController;
let time = 1_000;
const main = async () => {
  const controller = createRealtimePitchMonitorController({
    inputPort,
    recorderPort,
    playback,
    now: () => time,
  });
  const states: string[] = [];
  controller.subscribe(() =>
    states.push(
      `${controller.getSnapshot().status}:${controller.getSnapshot().recordingStatus}`,
    ),
  );
  assert.deepEqual(await controller.start(), { ok: true });
  assert.equal(controller.getSnapshot().status, "listening");
  assert.equal(controller.getSnapshot().listeningStartedAtMs, 1_000);
  assert.equal(controller.getSnapshot().curvePoints.length, 1);
  samplesCallback?.(new Float32Array(4096), 48_000);
  assert.equal(controller.getSnapshot().curvePoints.length, 2);
  time = 2_000;
  assert.equal(controller.startRecording(), true);
  assert.equal(captureRequest?.timesliceMs, 250);
  assert.equal(controller.getSnapshot().recordingStartedAtMs, 2_000);
  controller.stopRecording();
  assert.equal(controller.getSnapshot().recordingStatus, "ready");
  assert.equal(controller.getSnapshot().recordingBlob?.size, 5);
  await controller.playRecording();
  assert.equal(controller.getSnapshot().recordingStatus, "playing");
  playbackRequest?.onEnded?.();
  assert.equal(controller.getSnapshot().hasCompletedRecordingPlayback, true);
  assert.equal(controller.getSnapshot().recordingStatus, "ready");
  await controller.start();
  controller.suppressNextGlobalStop();
  controller.handleGlobalStop();
  assert.equal(controller.getSnapshot().status, "listening");
  controller.handleGlobalStop();
  assert.equal(controller.getSnapshot().status, "idle");
  await controller.start();
  interruption?.("track-ended");
  assert.equal(controller.getSnapshot().status, "error");
  assert.match(controller.getSnapshot().error, /媒体轨已中断/);
  controller.clear();
  assert.equal(controller.getSnapshot().recordingStatus, "empty");
  assert.equal(controller.getSnapshot().curvePoints.length, 0);
  await controller.start();
  assert.equal(controller.startRecording(), true);
  controller.detach();
  assert.ok(inputDisposes >= 1);
  assert.ok(captureDisposes >= 1);
  assert.ok(playbackStops >= 1);
  assert.ok(states.length > 0);

  const unsupported = createRealtimePitchMonitorController({
    inputPort: { isSupported: () => false, request: async () => inputHandle },
    recorderPort,
    playback,
  });
  const unsupportedResult = await unsupported.start();
  assert.equal(unsupportedResult.ok, false);
  assert.match(unsupported.getSnapshot().error, /不支持浏览器本地麦克风分析/);

  const pendingRequests: Array<{
    resolve: (handle: RealtimePitchInputHandle) => void;
    onInterrupted: (kind: "track-ended" | "context-interrupted") => void;
  }> = [];
  const switchingInputPort: RealtimePitchInputPort = {
    isSupported: () => true,
    request: ({ onInterrupted }) =>
      new Promise((resolve) =>
        pendingRequests.push({ resolve, onInterrupted }),
      ),
  };
  let oldSamples: ((samples: Float32Array, sampleRate: number) => void) | null =
    null;
  let currentSamples:
    | ((samples: Float32Array, sampleRate: number) => void)
    | null = null;
  let oldDisposes = 0;
  const oldHandle: RealtimePitchInputHandle = {
    stream,
    prepare: async () => undefined,
    start: (callback) => {
      oldSamples = callback;
      callback(new Float32Array(4096), 48_000);
    },
    dispose: () => {
      oldDisposes += 1;
    },
  };
  const currentHandle: RealtimePitchInputHandle = {
    stream,
    prepare: async () => undefined,
    start: (callback) => {
      currentSamples = callback;
      callback(new Float32Array(4096), 48_000);
    },
    dispose: () => undefined,
  };
  const switching = createRealtimePitchMonitorController({
    inputPort: switchingInputPort,
    recorderPort,
    playback,
    now: () => 3_000,
  });
  const oldStart = switching.start();
  pendingRequests[0]?.resolve(oldHandle);
  assert.deepEqual(await oldStart, { ok: true });
  const currentStart = switching.start();
  assert.equal(
    oldDisposes,
    1,
    "starting B must detach A before requesting the next input",
  );
  pendingRequests[1]?.resolve(currentHandle);
  assert.deepEqual(await currentStart, { ok: true });
  const currentCurveLength = switching.getSnapshot().curvePoints.length;
  (
    oldSamples as ((samples: Float32Array, sampleRate: number) => void) | null
  )?.(new Float32Array(4096), 48_000);
  pendingRequests[0]?.onInterrupted("track-ended");
  assert.equal(switching.getSnapshot().curvePoints.length, currentCurveLength);
  assert.equal(switching.getSnapshot().status, "listening");
  (
    currentSamples as
      | ((samples: Float32Array, sampleRate: number) => void)
      | null
  )?.(new Float32Array(4096), 48_000);
  assert.equal(
    switching.getSnapshot().curvePoints.length,
    currentCurveLength + 1,
  );

  for (const failurePoint of ["getState", "stop"] as const) {
    let failingInputDisposes = 0;
    let failingCaptureDisposes = 0;
    const failureMessages: string[] = [];
    const failingCapture: MediaRecorderCaptureHandle = {
      getState: () => {
        if (failurePoint === "getState") throw new Error("getState failure");
        return "recording";
      },
      start: () => undefined,
      stop: () => {
        throw new Error("stop failure");
      },
      dispose: () => {
        failingCaptureDisposes += 1;
      },
    };
    const failingController = createRealtimePitchMonitorController({
      inputPort: {
        isSupported: () => true,
        request: async () => ({
          stream,
          prepare: async () => undefined,
          start: () => undefined,
          dispose: () => {
            failingInputDisposes += 1;
          },
        }),
      },
      recorderPort: { isSupported: () => true, create: () => failingCapture },
      playback,
    });
    assert.deepEqual(await failingController.start(), { ok: true });
    assert.equal(
      failingController.startRecording((message) =>
        failureMessages.push(message),
      ),
      true,
    );
    assert.doesNotThrow(() => failingController.stop());
    assert.equal(
      failingInputDisposes,
      1,
      `${failurePoint} failure must not block input cleanup`,
    );
    assert.equal(failingCaptureDisposes, 1);
    assert.equal(failingController.getSnapshot().status, "idle");
    assert.equal(failingController.getSnapshot().recordingStatus, "error");
    assert.match(failureMessages[0] ?? "", /本次录音发生错误/);
  }

  const terminalCaptures: Array<{
    request: Parameters<MediaRecorderCapturePort["create"]>[0];
    handle: MediaRecorderCaptureHandle;
    disposeCalls: number;
  }> = [];
  const terminalInterruptions: Array<
    (kind: "track-ended" | "context-interrupted") => void
  > = [];
  let terminalInputDisposes = 0;
  const terminalController = createRealtimePitchMonitorController({
    inputPort: {
      isSupported: () => true,
      request: async ({ onInterrupted }) => {
        terminalInterruptions.push(onInterrupted);
        return {
          stream,
          prepare: async () => undefined,
          start: () => undefined,
          dispose: () => {
            terminalInputDisposes += 1;
          },
        };
      },
    },
    recorderPort: {
      isSupported: () => true,
      create: (request) => {
        let state: "inactive" | "recording" = "inactive";
        const capture = {
          request,
          disposeCalls: 0,
          handle: {
            getState: () => state,
            start: () => {
              state = "recording";
            },
            stop: () => {
              state = "inactive";
              request.onStopped(new Blob(["replacement"]));
            },
            dispose: () => {
              state = "inactive";
              capture.disposeCalls += 1;
            },
          },
        } satisfies (typeof terminalCaptures)[number];
        terminalCaptures.push(capture);
        return capture.handle;
      },
    },
    playback,
    now: () => 4_000,
  });
  assert.deepEqual(await terminalController.start(), { ok: true });
  const recorderFailures: string[] = [];
  assert.equal(
    terminalController.startRecording((message) =>
      recorderFailures.push(message),
    ),
    true,
  );
  const failedCapture = terminalCaptures[0]!;
  failedCapture.request.onError();
  assert.equal(failedCapture.disposeCalls, 1);
  assert.equal(terminalController.getSnapshot().recordingStatus, "error");
  assert.equal(terminalController.getSnapshot().recordingBlob, null);
  assert.equal(terminalController.getSnapshot().hasRecording, false);
  assert.equal(terminalController.getSnapshot().recordingStartedAtMs, null);
  assert.equal(recorderFailures.length, 1);
  failedCapture.request.onStopped(new Blob(["stale-after-error"]));
  failedCapture.request.onError();
  assert.equal(
    terminalController.getSnapshot().recordingStatus,
    "error",
    "late stop/error callbacks must not revive a failed recording",
  );
  assert.equal(terminalController.getSnapshot().recordingBlob, null);
  assert.equal(recorderFailures.length, 1);

  assert.equal(terminalController.startRecording(), true);
  const completedCapture = terminalCaptures[1]!;
  completedCapture.handle.stop();
  const completedRecording = terminalController.getSnapshot().recordingBlob;
  assert.equal(await completedRecording?.text(), "replacement");
  assert.equal(terminalController.getSnapshot().recordingStatus, "ready");
  terminalInterruptions[0]?.("track-ended");
  assert.equal(terminalController.getSnapshot().status, "error");
  assert.equal(
    terminalController.getSnapshot().recordingBlob,
    completedRecording,
    "an input interruption after a complete stop must preserve the ready Blob",
  );
  assert.equal(terminalController.getSnapshot().recordingStatus, "ready");

  const interruptionFailures: string[] = [];
  const recorderCallbacksDuringInterruption: string[] = [];
  assert.deepEqual(
    await terminalController.start((message) =>
      interruptionFailures.push(message),
    ),
    { ok: true },
  );
  assert.equal(
    terminalController.startRecording((message) =>
      recorderCallbacksDuringInterruption.push(message),
    ),
    true,
  );
  const interruptedCapture = terminalCaptures[2]!;
  terminalInterruptions[1]?.("context-interrupted");
  assert.equal(interruptedCapture.disposeCalls, 1);
  assert.equal(terminalController.getSnapshot().status, "error");
  assert.equal(terminalController.getSnapshot().recordingStatus, "error");
  assert.equal(terminalController.getSnapshot().recordingBlob, null);
  assert.equal(terminalController.getSnapshot().hasRecording, false);
  assert.equal(terminalController.getSnapshot().recordingStartedAtMs, null);
  assert.equal(interruptionFailures.length, 1);
  assert.equal(
    recorderCallbacksDuringInterruption.length,
    0,
    "the input interruption callback owns attempt invalidation and must not be duplicated",
  );
  interruptedCapture.request.onStopped(new Blob(["stale-after-interruption"]));
  interruptedCapture.request.onError();
  assert.equal(terminalController.getSnapshot().recordingStatus, "error");
  assert.equal(terminalController.getSnapshot().recordingBlob, null);
  assert.ok(terminalInputDisposes >= 2);

  const fallbackInterruptionFailures: string[] = [];
  assert.deepEqual(await terminalController.start(), { ok: true });
  assert.equal(
    terminalController.startRecording((message) =>
      fallbackInterruptionFailures.push(message),
    ),
    true,
  );
  const fallbackInterruptedCapture = terminalCaptures[3]!;
  terminalInterruptions[2]?.("track-ended");
  assert.equal(fallbackInterruptedCapture.disposeCalls, 1);
  assert.equal(fallbackInterruptionFailures.length, 1);
  assert.match(fallbackInterruptionFailures[0] ?? "", /媒体轨已中断/);
  fallbackInterruptedCapture.request.onStopped(new Blob(["stale-fallback"]));
  fallbackInterruptedCapture.request.onError();
  terminalInterruptions[2]?.("track-ended");
  assert.equal(fallbackInterruptionFailures.length, 1);
  assert.equal(terminalController.getSnapshot().recordingStatus, "error");
  assert.equal(terminalController.getSnapshot().recordingBlob, null);

  console.log("Realtime pitch monitor controller tests passed.");
};

void main();
