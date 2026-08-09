import assert from "node:assert/strict";

import {
  createBlobAudioPlaybackController,
  createBrowserBlobAudioPlaybackPort,
  type BlobAudioPlaybackHandle,
  type BlobAudioPlaybackPort,
  type BlobAudioPlaybackRequest,
} from "../lib/audio/blobAudioPlayback.js";

const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const testBrowserPort = async () => {
  const revoked: string[] = [];
  let timerCallback: (() => void) | null = null;
  let timerDelay = 0;
  let clearedTimers = 0;
  let ended = 0;
  let errors = 0;
  const audio = {
    currentTime: 0,
    onended: null as (() => void) | null,
    onerror: null as (() => void) | null,
    play: async () => undefined,
    pause: () => undefined,
  };
  const port = createBrowserBlobAudioPlaybackPort({
    createObjectUrl: () => "blob:port-test",
    revokeObjectUrl: (url) => revoked.push(url),
    createAudio: () => audio,
    setTimer: (callback, delayMs) => {
      timerCallback = callback;
      timerDelay = delayMs;
      return 7 as unknown as ReturnType<typeof globalThis.setTimeout>;
    },
    clearTimer: () => { clearedTimers += 1; },
  });
  const handle = port.create({
    blob: new Blob(["voice"]),
    startMs: 1_250,
    durationMs: 50,
    onEnded: () => { ended += 1; },
    onError: () => { errors += 1; },
  });
  await handle.play();
  assert.equal(audio.currentTime, 1.25);
  assert.equal(timerDelay, 100);
  assert.ok(timerCallback);
  (timerCallback as () => void)();
  assert.equal(ended, 1);
  assert.equal(errors, 0);
  assert.deepEqual(revoked, ["blob:port-test"]);
  assert.equal(clearedTimers, 1);
  (timerCallback as () => void)();
  assert.equal(ended, 1, "a stale duration timer must be ignored");
  handle.stop();
  handle.dispose();
  assert.deepEqual(revoked, ["blob:port-test"], "stop must revoke exactly once");

  let browserErrors = 0;
  const errorAudio = {
    currentTime: 0,
    onended: null as (() => void) | null,
    onerror: null as (() => void) | null,
    play: async () => undefined,
    pause: () => undefined,
  };
  const errorRevokes: string[] = [];
  const errorHandle = createBrowserBlobAudioPlaybackPort({
    createObjectUrl: () => "blob:error",
    revokeObjectUrl: (url) => errorRevokes.push(url),
    createAudio: () => errorAudio,
  }).create({
    blob: new Blob(["voice"]),
    onEnded: () => undefined,
    onError: () => { browserErrors += 1; },
  });
  await errorHandle.play();
  errorAudio.onerror?.();
  errorAudio.onerror?.();
  errorHandle.stop();
  errorHandle.dispose();
  assert.equal(browserErrors, 1);
  assert.deepEqual(errorRevokes, ["blob:error"]);

  const rejectedAudio = {
    ...audio,
    play: async () => { throw new Error("blocked"); },
  };
  const rejectedRevokes: string[] = [];
  const rejectedHandle = createBrowserBlobAudioPlaybackPort({
    createObjectUrl: () => "blob:rejected",
    revokeObjectUrl: (url) => rejectedRevokes.push(url),
    createAudio: () => rejectedAudio,
  }).create({
    blob: new Blob(["voice"]),
    onEnded: () => undefined,
    onError: () => undefined,
  });
  await assert.rejects(rejectedHandle.play(), /blocked/);
  rejectedHandle.stop();
  rejectedHandle.dispose();
  assert.deepEqual(rejectedRevokes, ["blob:rejected"]);

  const disposeFirstRevokes: string[] = [];
  const disposeFirstHandle = createBrowserBlobAudioPlaybackPort({
    createObjectUrl: () => "blob:dispose-first",
    revokeObjectUrl: (url) => disposeFirstRevokes.push(url),
    createAudio: () => ({ ...audio }),
  }).create({
    blob: new Blob(["voice"]),
    onEnded: () => undefined,
    onError: () => undefined,
  });
  disposeFirstHandle.dispose();
  disposeFirstHandle.stop();
  assert.deepEqual(disposeFirstRevokes, ["blob:dispose-first"]);

  const exceptionalRevokes: string[] = [];
  const exceptionalHandle = createBrowserBlobAudioPlaybackPort({
    createObjectUrl: () => "blob:exceptional-cleanup",
    revokeObjectUrl: (url) => exceptionalRevokes.push(url),
    createAudio: () => ({
      currentTime: 0,
      onended: null,
      onerror: null,
      play: async () => undefined,
      pause: () => { throw new Error("pause failed"); },
    }),
    setTimer: () => 9 as unknown as ReturnType<typeof globalThis.setTimeout>,
    clearTimer: () => { throw new Error("clear failed"); },
  }).create({
    blob: new Blob(["voice"]),
    durationMs: 200,
    onEnded: () => undefined,
    onError: () => undefined,
  });
  await exceptionalHandle.play();
  exceptionalHandle.stop();
  exceptionalHandle.dispose();
  assert.deepEqual(
    exceptionalRevokes,
    ["blob:exceptional-cleanup"],
    "timer/pause cleanup failures must not skip the single URL revoke attempt",
  );
};

const testLatestWinsController = async () => {
  const requests: Array<{
    request: BlobAudioPlaybackRequest;
    gate: ReturnType<typeof deferred>;
    stopped: number;
  }> = [];
  const port: BlobAudioPlaybackPort = {
    create: (request) => {
      const entry = { request, gate: deferred(), stopped: 0 };
      requests.push(entry);
      return {
        play: () => entry.gate.promise,
        stop: () => { entry.stopped += 1; },
        dispose: () => { entry.stopped += 1; },
      } satisfies BlobAudioPlaybackHandle;
    },
  };
  const controller = createBlobAudioPlaybackController(port);
  let endedKey = "";
  const a = controller.play({
    blob: new Blob(["a"]),
    key: "a",
    errorMessage: "A 失败",
    onEnded: () => { endedKey = "a"; },
  });
  const b = controller.play({
    blob: new Blob(["b"]),
    key: "b",
    errorMessage: "B 失败",
    onEnded: () => { endedKey = "b"; },
  });
  assert.equal(requests[0]?.stopped, 1);
  requests[0]?.gate.resolve();
  assert.equal(await a, false);
  requests[0]?.request.onEnded();
  requests[0]?.request.onError();
  assert.deepEqual(controller.getSnapshot(), { status: "starting", key: "b", error: "" });
  requests[1]?.gate.resolve();
  assert.equal(await b, true);
  assert.deepEqual(controller.getSnapshot(), { status: "playing", key: "b", error: "" });
  requests[0]?.request.onEnded();
  assert.equal(controller.getSnapshot().key, "b");
  requests[1]?.request.onEnded();
  assert.equal(endedKey, "b");
  assert.deepEqual(controller.getSnapshot(), { status: "idle", key: null, error: "" });

  const c = controller.play({
    blob: new Blob(["c"]),
    key: "c",
    errorMessage: "C 失败",
  });
  const d = controller.play({
    blob: new Blob(["d"]),
    key: "d",
    errorMessage: "D 失败",
  });
  requests[2]?.gate.reject(new Error("stale reject"));
  assert.equal(await c, false);
  assert.equal(controller.getSnapshot().key, "d");
  requests[3]?.gate.resolve();
  assert.equal(await d, true);
  controller.stop();
  assert.equal(requests[3]?.stopped, 1);
  assert.equal(controller.getSnapshot().status, "idle");
  requests[3]?.request.onError();
  assert.equal(controller.getSnapshot().status, "idle");

  let activeError = "";
  const e = controller.play({
    blob: new Blob(["e"]),
    key: "e",
    errorMessage: "E 媒体失败",
    playErrorMessage: "E 播放被阻止",
    onError: (message) => { activeError = message; },
  });
  requests[4]?.gate.reject(new Error("blocked"));
  assert.equal(await e, false);
  assert.equal(activeError, "E 播放被阻止");
  assert.deepEqual(controller.getSnapshot(), {
    status: "error",
    key: "e",
    error: "E 播放被阻止",
  });

  const f = controller.play({
    blob: new Blob(["f"]),
    key: "f",
    errorMessage: "F 媒体失败",
    playErrorMessage: "F 播放被阻止",
    onError: (message) => { activeError = message; },
  });
  requests[5]?.gate.resolve();
  assert.equal(await f, true);
  requests[5]?.request.onError();
  assert.equal(activeError, "F 媒体失败");
  assert.deepEqual(controller.getSnapshot(), {
    status: "error",
    key: "f",
    error: "F 媒体失败",
  });
  const g = controller.play({
    blob: new Blob(["g"]),
    key: "g",
    errorMessage: "G 失败",
  });
  controller.dispose();
  assert.equal(requests[6]?.stopped, 1, "dispose must release an active pending handle");
  requests[6]?.gate.resolve();
  assert.equal(await g, false);
  controller.dispose();
};

const testReentrantLatestWins = async () => {
  let creates = 0;
  const stoppedDuringStarting = createBlobAudioPlaybackController({
    create: () => {
      creates += 1;
      return {
        play: async () => undefined,
        stop: () => undefined,
        dispose: () => undefined,
      };
    },
  });
  stoppedDuringStarting.subscribe(() => {
    if (stoppedDuringStarting.getSnapshot().status === "starting") {
      stoppedDuringStarting.stop();
    }
  });
  assert.equal(await stoppedDuringStarting.play({
    blob: new Blob(["a"]),
    key: "a",
    errorMessage: "A 失败",
  }), false);
  assert.equal(creates, 0, "a synchronous stop subscriber must prevent stale handle creation");

  const createdKeys: string[] = [];
  const reentrant = createBlobAudioPlaybackController({
    create: (request) => {
      createdKeys.push(request.blob.size === 1 ? "b" : "unexpected");
      return {
        play: async () => undefined,
        stop: () => undefined,
        dispose: () => undefined,
      };
    },
  });
  let replacement: Promise<boolean> | null = null;
  reentrant.subscribe(() => {
    const current = reentrant.getSnapshot();
    if (current.status === "starting" && current.key === "a" && !replacement) {
      replacement = reentrant.play({
        blob: new Blob(["b"]),
        key: "b",
        errorMessage: "B 失败",
      });
    }
  });
  assert.equal(await reentrant.play({
    blob: new Blob(["stale-a"]),
    key: "a",
    errorMessage: "A 失败",
  }), false);
  assert.equal(await replacement, true);
  assert.deepEqual(createdKeys, ["b"]);
  assert.deepEqual(reentrant.getSnapshot(), { status: "playing", key: "b", error: "" });
  reentrant.stop();

  const stoppedDuringPlaying = createBlobAudioPlaybackController({
    create: () => ({
      play: async () => undefined,
      stop: () => undefined,
      dispose: () => undefined,
    }),
  });
  stoppedDuringPlaying.subscribe(() => {
    if (stoppedDuringPlaying.getSnapshot().status === "playing") {
      stoppedDuringPlaying.stop();
    }
  });
  assert.equal(await stoppedDuringPlaying.play({
    blob: new Blob(["playing"]),
    key: "playing",
    errorMessage: "播放失败",
  }), false);
  assert.deepEqual(stoppedDuringPlaying.getSnapshot(), {
    status: "idle",
    key: null,
    error: "",
  });

  const completionRequests: BlobAudioPlaybackRequest[] = [];
  const completionController = createBlobAudioPlaybackController({
    create: (request) => {
      completionRequests.push(request);
      return {
        play: async () => undefined,
        stop: () => undefined,
        dispose: () => undefined,
      };
    },
  });
  let completionPhase: "none" | "ending" | "erroring" = "none";
  let completionReplacement: Promise<boolean> | null = null;
  completionController.subscribe(() => {
    const current = completionController.getSnapshot();
    if (completionPhase === "ending" && current.status === "idle") {
      completionPhase = "none";
      completionReplacement = completionController.play({
        blob: new Blob(["ended-replacement"]),
        key: "ended-replacement",
        errorMessage: "替换失败",
      });
    } else if (completionPhase === "erroring" && current.status === "error") {
      completionPhase = "none";
      completionReplacement = completionController.play({
        blob: new Blob(["error-replacement"]),
        key: "error-replacement",
        errorMessage: "替换失败",
      });
    }
  });
  let staleEnded = 0;
  assert.equal(await completionController.play({
    blob: new Blob(["ended-source"]),
    key: "ended-source",
    errorMessage: "源失败",
    onEnded: () => { staleEnded += 1; },
  }), true);
  completionPhase = "ending";
  completionRequests[0]?.onEnded();
  assert.equal(await completionReplacement, true);
  assert.equal(staleEnded, 0, "an idle subscriber replacement must suppress the old ended callback");

  let staleError = 0;
  assert.equal(await completionController.play({
    blob: new Blob(["error-source"]),
    key: "error-source",
    errorMessage: "源媒体失败",
    onError: () => { staleError += 1; },
  }), true);
  completionPhase = "erroring";
  completionRequests[2]?.onError();
  assert.equal(await completionReplacement, true);
  assert.equal(staleError, 0, "an error subscriber replacement must suppress the old error callback");

  const playingController = createBlobAudioPlaybackController({
    create: () => ({
      play: async () => undefined,
      stop: () => undefined,
      dispose: () => undefined,
    }),
  });
  let playingReplacement: Promise<boolean> | null = null;
  playingController.subscribe(() => {
    const current = playingController.getSnapshot();
    if (current.status === "playing" && current.key === "playing-a" && !playingReplacement) {
      playingReplacement = playingController.play({
        blob: new Blob(["playing-b"]),
        key: "playing-b",
        errorMessage: "B 失败",
      });
    }
  });
  assert.equal(await playingController.play({
    blob: new Blob(["playing-a"]),
    key: "playing-a",
    errorMessage: "A 失败",
  }), false);
  assert.equal(await playingReplacement, true);
  assert.deepEqual(playingController.getSnapshot(), {
    status: "playing",
    key: "playing-b",
    error: "",
  });
  playingController.stop();
};

const testBrowserTimerLatestWins = async () => {
  const timers: Array<{ callback: () => void; cleared: boolean }> = [];
  const revoked: string[] = [];
  let urlNumber = 0;
  const controller = createBlobAudioPlaybackController(createBrowserBlobAudioPlaybackPort({
    createObjectUrl: () => `blob:timer-${++urlNumber}`,
    revokeObjectUrl: (url) => revoked.push(url),
    createAudio: () => ({
      currentTime: 0,
      onended: null,
      onerror: null,
      play: async () => undefined,
      pause: () => undefined,
    }),
    setTimer: (callback) => {
      const entry = { callback, cleared: false };
      timers.push(entry);
      return entry as unknown as ReturnType<typeof globalThis.setTimeout>;
    },
    clearTimer: (timer) => {
      (timer as unknown as { cleared: boolean }).cleared = true;
    },
  }));
  assert.equal(await controller.play({
    blob: new Blob(["a"]),
    key: "a",
    durationMs: 400,
    errorMessage: "A 失败",
  }), true);
  const staleTimer = timers[0];
  assert.equal(await controller.play({
    blob: new Blob(["b"]),
    key: "b",
    durationMs: 500,
    errorMessage: "B 失败",
  }), true);
  assert.equal(staleTimer?.cleared, true);
  staleTimer?.callback();
  assert.deepEqual(controller.getSnapshot(), { status: "playing", key: "b", error: "" });
  assert.deepEqual(revoked, ["blob:timer-1"]);
  controller.stop();
  assert.deepEqual(revoked, ["blob:timer-1", "blob:timer-2"]);
};

const testSynchronousBrowserEnded = async () => {
  let audio: {
    currentTime: number;
    onended: (() => void) | null;
    onerror: (() => void) | null;
    play: () => Promise<void>;
    pause: () => void;
  };
  let ended = 0;
  const revoked: string[] = [];
  audio = {
    currentTime: 0,
    onended: null,
    onerror: null,
    play: async () => { audio.onended?.(); },
    pause: () => undefined,
  };
  const controller = createBlobAudioPlaybackController(createBrowserBlobAudioPlaybackPort({
    createObjectUrl: () => "blob:sync-ended",
    revokeObjectUrl: (url) => revoked.push(url),
    createAudio: () => audio,
  }));
  assert.equal(await controller.play({
    blob: new Blob(["voice"]),
    key: "sync-ended",
    errorMessage: "媒体失败",
    onEnded: () => { ended += 1; },
  }), false);
  assert.equal(ended, 1);
  assert.deepEqual(controller.getSnapshot(), { status: "idle", key: null, error: "" });
  assert.deepEqual(revoked, ["blob:sync-ended"]);
};

const main = async () => {
  await testBrowserPort();
  await testLatestWinsController();
  await testReentrantLatestWins();
  await testBrowserTimerLatestWins();
  await testSynchronousBrowserEnded();
  console.log("Blob audio playback port/controller tests passed.");
};

void main();
