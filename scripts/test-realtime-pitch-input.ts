import assert from "node:assert/strict";

import { createBrowserRealtimePitchInputPort } from "../lib/audio/realtimePitchInput.js";

const tracks: Array<{ stopCalls: number; ended: (() => void) | null }> = [];
const track = {
  stopCalls: 0,
  ended: null as (() => void) | null,
  stop() {
    this.stopCalls += 1;
  },
  addEventListener(_type: string, listener: () => void) {
    this.ended = listener;
  },
};
tracks.push(track);
const stream = { getTracks: () => [track] } as unknown as MediaStream;
let constraints: MediaStreamConstraints | null = null;
let contextState: AudioContextState = "suspended";
let stateChange: (() => void) | null = null;
let timer: (() => void) | null = null;
let clearCalls = 0;
let disconnectCalls = 0;
let closeCalls = 0;
let contextCreates = 0;
const analyser = {
  fftSize: 0,
  smoothingTimeConstant: 1,
  getFloatTimeDomainData: (samples: Float32Array) => samples.fill(0.25),
};
const context = {
  get state() {
    return contextState;
  },
  sampleRate: 48_000,
  createMediaStreamSource: () => ({
    connect: () => undefined,
    disconnect: () => {
      disconnectCalls += 1;
    },
  }),
  createAnalyser: () => analyser,
  resume: async () => {
    contextState = "running";
  },
  close: async () => {
    closeCalls += 1;
    contextState = "closed";
  },
  addEventListener: (_type: string, listener: () => void) => {
    stateChange = listener;
  },
} as unknown as AudioContext;
const interruptions: string[] = [];
const port = createBrowserRealtimePitchInputPort({
  getUserMedia: async (value) => {
    constraints = value;
    return stream;
  },
  createContext: () => {
    contextCreates += 1;
    return context;
  },
  setTimer: (callback, delay) => {
    assert.equal(delay, 50);
    timer = callback;
    return 7;
  },
  clearTimer: () => {
    clearCalls += 1;
  },
});
const main = async () => {
  const handle = await port.request({
    onInterrupted: (kind) => interruptions.push(kind),
  });
  assert.deepEqual(constraints, {
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });
  await Promise.all([handle.prepare(), handle.prepare()]);
  assert.equal(contextCreates, 1);
  assert.equal(analyser.fftSize, 4096);
  assert.equal(analyser.smoothingTimeConstant, 0);
  const frames: Array<{ size: number; rate: number; first: number }> = [];
  handle.start((samples, rate) =>
    frames.push({ size: samples.length, rate, first: samples[0] ?? 0 }),
  );
  handle.start(() => {
    throw new Error("second start must be ignored");
  });
  assert.deepEqual(frames[0], { size: 4096, rate: 48_000, first: 0.25 });
  timer?.();
  assert.equal(frames.length, 2);
  track.ended?.();
  assert.deepEqual(interruptions, ["track-ended"]);
  contextState = "suspended";
  stateChange?.();
  assert.deepEqual(interruptions, ["track-ended", "context-interrupted"]);
  handle.dispose();
  handle.dispose();
  assert.equal(track.stopCalls, 1);
  assert.equal(disconnectCalls, 1);
  assert.equal(closeCalls, 1);
  assert.equal(clearCalls, 1);
  track.ended?.();
  stateChange?.();
  assert.equal(interruptions.length, 2);

  contextState = "suspended";
  let reentrantTimerCalls = 0;
  const reentrantPort = createBrowserRealtimePitchInputPort({
    getUserMedia: async () => stream,
    createContext: () => context,
    setTimer: () => {
      reentrantTimerCalls += 1;
      return 8;
    },
  });
  const reentrantHandle = await reentrantPort.request({
    onInterrupted: () => undefined,
  });
  await reentrantHandle.prepare();
  reentrantHandle.start(() => reentrantHandle.dispose());
  assert.equal(
    reentrantTimerCalls,
    0,
    "dispose during onSamples must not leave a stale timer",
  );

  const throwingCloseContext = {
    state: "running",
    sampleRate: 48_000,
    createMediaStreamSource: () => ({
      connect: () => undefined,
      disconnect: () => undefined,
    }),
    createAnalyser: () => ({ fftSize: 0, smoothingTimeConstant: 1 }),
    resume: async () => undefined,
    close: () => {
      throw new Error("synchronous close failure");
    },
    addEventListener: () => undefined,
  } as unknown as AudioContext;
  const throwingClosePort = createBrowserRealtimePitchInputPort({
    getUserMedia: async () => stream,
    createContext: () => throwingCloseContext,
  });
  const throwingCloseHandle = await throwingClosePort.request({
    onInterrupted: () => undefined,
  });
  await throwingCloseHandle.prepare();
  assert.doesNotThrow(
    () => throwingCloseHandle.dispose(),
    "sync context.close failure must not escape dispose",
  );

  console.log("Realtime pitch browser input port tests passed.");
};

void main();
