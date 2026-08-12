import assert from "node:assert/strict";

import {
  createBrowserPracticeRecordingAnalysisPort,
  type PracticeRecordingAnalysisPort,
  type PracticeRecordingDecodedAudio,
} from "../lib/audio/practiceRecordingAnalysis.js";
import {
  canAppendPracticeRecordingPitchAttempt,
  calculatePracticeRecordingLevel,
  createPracticeRecordingAnalysisController,
  type PracticeRecordingPitchContext,
} from "../lib/practice/practiceRecordingAnalysisController.js";
import type { PitchEstimateResult } from "../lib/practice/pitchEstimate.js";
import type { AudioOnsetDetectionResult } from "../lib/rhythm/audioOnsetDetection.js";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
};

const recording = (arrayBuffer = async () => new ArrayBuffer(8)) =>
  ({ arrayBuffer }) as Blob;

const decoded = (
  channels: Float32Array[] = [new Float32Array([0.1, -0.2])],
): PracticeRecordingDecodedAudio => ({
  durationSeconds: 1.25,
  sampleRate: 48_000,
  channels,
});

const pitchResult: PitchEstimateResult = {
  estimatedFrequencyHz: 440,
  nearestNote: "A4",
  centsOffset: 0,
  confidence: 0.8,
  framesAnalyzed: 10,
  validPitchFrames: 8,
  frameFrequencyMinHz: 438,
  frameFrequencyMedianHz: 440,
  frameFrequencyMaxHz: 442,
  frameFrequencyRangeCents: 15.7,
  firstHalfMedianFrequencyHz: 439,
  secondHalfMedianFrequencyHz: 441,
  firstToSecondHalfDriftCents: 7.9,
};

const onsetResult = {
  sampleRate: 48_000,
  onsetCount: 1,
  candidates: [],
  timeline: [],
} as unknown as AudioOnsetDetectionResult;

const pitchContext = (
  recordingAttemptKey = 1,
): PracticeRecordingPitchContext => ({
  recordingAttemptKey,
  attemptHistoryGeneration: recordingAttemptKey,
  melodyStepId: `step-${recordingAttemptKey}`,
  melodyStepIndex: recordingAttemptKey - 1,
  targetNote: "A4",
  importedSegmentKey: `segment-${recordingAttemptKey}`,
  notationTargetKey: `notation-${recordingAttemptKey}`,
});

const createFakePort = () => {
  const requests: ReturnType<
    typeof deferred<PracticeRecordingDecodedAudio>
  >[] = [];
  const recordings: Blob[] = [];
  const port: PracticeRecordingAnalysisPort = {
    decode: (source) => {
      recordings.push(source);
      const request = deferred<PracticeRecordingDecodedAudio>();
      requests.push(request);
      return request.promise;
    },
  };
  return { port, requests, recordings };
};

const createController = (port: PracticeRecordingAnalysisPort) => {
  const pitchInputs: PracticeRecordingDecodedAudio[] = [];
  const onsetInputs: {
    samples: Float32Array;
    sampleRate: number;
    sensitivityPreset: unknown;
  }[] = [];
  const controller = createPracticeRecordingAnalysisController({
    port,
    estimatePitch: (audio) => {
      pitchInputs.push(audio);
      return pitchResult;
    },
    detectOnsets: (samples, sampleRate, options) => {
      onsetInputs.push({
        samples,
        sampleRate,
        sensitivityPreset: options.sensitivityPreset,
      });
      return onsetResult;
    },
  });
  return { controller, pitchInputs, onsetInputs };
};

const testBrowserDecodePortAndCleanup = async () => {
  const contextCreationFailurePort =
    createBrowserPracticeRecordingAnalysisPort({
      createAudioContext: () => {
        throw new Error("context creation failed");
      },
    });
  await assert.rejects(
    contextCreationFailurePort.decode(recording()),
    /context creation failed/,
  );

  const firstChannel = new Float32Array([0.1, -0.2]);
  const secondChannel = new Float32Array([0.3, -0.4]);
  let closeCalls = 0;
  const context = {
    decodeAudioData: async () => ({
      duration: 2.5,
      sampleRate: 44_100,
      numberOfChannels: 2,
      getChannelData: (index: number) =>
        index === 0 ? firstChannel : secondChannel,
    }),
    close: async () => {
      closeCalls += 1;
    },
  } as unknown as AudioContext;
  const port = createBrowserPracticeRecordingAnalysisPort({
    createAudioContext: () => context,
  });
  const result = await port.decode(recording());
  assert.equal(result.durationSeconds, 2.5);
  assert.equal(result.sampleRate, 44_100);
  assert.deepEqual(result.channels, [firstChannel, secondChannel]);
  assert.notEqual(result.channels[0], firstChannel, "decoded channels are copied");
  firstChannel[0] = 0.9;
  assert.ok(
    Math.abs((result.channels[0]?.[0] ?? 0) - 0.1) < 1e-6,
    "adapter owns a stable copy",
  );
  assert.equal(closeCalls, 1);

  for (const failure of ["arrayBuffer", "decode", "channel"] as const) {
    let failureCloseCalls = 0;
    const failingContext = {
      decodeAudioData: async () => {
        if (failure === "decode") throw new Error("decode failed");
        return {
          duration: 1,
          sampleRate: 48_000,
          numberOfChannels: 1,
          getChannelData: () => {
            if (failure === "channel") throw new Error("copy failed");
            return new Float32Array([0]);
          },
        };
      },
      close: async () => {
        failureCloseCalls += 1;
      },
    } as unknown as AudioContext;
    const failingPort = createBrowserPracticeRecordingAnalysisPort({
      createAudioContext: () => failingContext,
    });
    await assert.rejects(
      failingPort.decode(
        recording(async () => {
          if (failure === "arrayBuffer") throw new Error("read failed");
          return new ArrayBuffer(8);
        }),
      ),
    );
    assert.equal(failureCloseCalls, 1, `${failure} failure closes context`);
  }

  const closeFailurePort = createBrowserPracticeRecordingAnalysisPort({
    createAudioContext: () =>
      ({
        decodeAudioData: async () => ({
          duration: 1,
          sampleRate: 48_000,
          numberOfChannels: 0,
          getChannelData: () => new Float32Array(),
        }),
        close: async () => {
          throw new Error("close failed");
        },
      }) as unknown as AudioContext,
  });
  assert.equal((await closeFailurePort.decode(recording())).durationSeconds, 1);

  const synchronousCloseFailurePort =
    createBrowserPracticeRecordingAnalysisPort({
      createAudioContext: () =>
        ({
          decodeAudioData: async () => ({
            duration: 3,
            sampleRate: 48_000,
            numberOfChannels: 0,
            getChannelData: () => new Float32Array(),
          }),
          close: () => {
            throw new Error("synchronous close failed");
          },
        }) as unknown as AudioContext,
    });
  assert.equal(
    (await synchronousCloseFailurePort.decode(recording())).durationSeconds,
    3,
    "a synchronous close failure must not mask successful decode",
  );

  const originalFailurePort = createBrowserPracticeRecordingAnalysisPort({
    createAudioContext: () =>
      ({
        decodeAudioData: async () => {
          throw new Error("original decode failure");
        },
        close: () => {
          throw new Error("secondary close failure");
        },
      }) as unknown as AudioContext,
  });
  await assert.rejects(
    originalFailurePort.decode(recording()),
    /original decode failure/,
    "cleanup failure must not replace the decode failure",
  );
};

const testLevelCalculation = () => {
  assert.deepEqual(calculatePracticeRecordingLevel(decoded([])), {
    durationSeconds: 1.25,
    peakLevel: 0,
    rmsLevel: 0,
    simpleLevelHint: "录音可能太轻",
  });
  assert.equal(
    calculatePracticeRecordingLevel(
      decoded([new Float32Array([0.98]), new Float32Array([0.1])]),
    ).simpleLevelHint,
    "录音可能削波",
  );
  const usable = calculatePracticeRecordingLevel(
    decoded([new Float32Array([0.1, -0.2]), new Float32Array([0.3, -0.4])]),
  );
  assert.ok(Math.abs(usable.peakLevel - 0.4) < 1e-6);
  assert.ok(Math.abs(usable.rmsLevel - Math.sqrt(0.3 / 4)) < 1e-6);
  assert.equal(usable.simpleLevelHint, "录音电平看起来可用");
};

const testSuccessContextsAndIndependentSlots = async () => {
  const fake = createFakePort();
  const { controller, pitchInputs, onsetInputs } = createController(fake.port);
  let notices = 0;
  const unsubscribe = controller.subscribe(() => {
    notices += 1;
  });
  const source = recording();
  const level = controller.analyzeLevel(source);
  const context = pitchContext();
  const pitch = controller.estimatePitch(source, context);
  const onset = controller.detectOnsets(source, "sensitive");
  assert.equal(controller.getSnapshot().level.status, "running");
  assert.equal(controller.getSnapshot().pitch.status, "running");
  assert.equal(controller.getSnapshot().onset.status, "running");
  assert.equal(fake.recordings.every((item) => item === source), true);

  fake.requests[0]?.resolve(decoded([new Float32Array([0.2])]));
  fake.requests[1]?.resolve(decoded());
  fake.requests[2]?.resolve(
    decoded([new Float32Array([1, 0]), new Float32Array([0, 1])]),
  );
  assert.equal(await level, true);
  assert.equal(await pitch, true);
  assert.equal(await onset, true);
  assert.equal(controller.getSnapshot().level.status, "ready");
  assert.deepEqual(controller.getSnapshot().pitch.result?.context, context);
  assert.notEqual(controller.getSnapshot().pitch.result?.context, context);
  assert.equal(controller.getSnapshot().pitch.result?.estimate, pitchResult);
  assert.equal(pitchInputs.length, 1);
  assert.deepEqual(onsetInputs, [
    {
      samples: new Float32Array([1, 0]),
      sampleRate: 48_000,
      sensitivityPreset: "sensitive",
    },
  ]);
  assert.ok(notices >= 6);
  unsubscribe();
};

const testMissingAndFailureMessages = async () => {
  const fake = createFakePort();
  const { controller } = createController(fake.port);
  assert.equal(await controller.analyzeLevel(null), false);
  assert.equal(
    controller.getSnapshot().level.error,
    "请先录制一次本地练习，再运行本地音频分析。",
  );
  assert.equal(await controller.estimatePitch(null, pitchContext()), false);
  assert.equal(
    controller.getSnapshot().pitch.error,
    "请先录制一次本地练习，再进行本地音高估计。",
  );
  assert.equal(await controller.detectOnsets(null, "balanced"), false);
  assert.equal(
    controller.getSnapshot().onset.error,
    "请先录制一次本地练习，再运行浏览器本地起音检测。",
  );

  const level = controller.analyzeLevel(recording());
  fake.requests.at(-1)?.reject(new Error("private decode detail"));
  assert.equal(await level, false);
  assert.equal(
    controller.getSnapshot().level.error,
    "此浏览器无法完成本地音频分析。",
  );
  const pitch = controller.estimatePitch(recording(), pitchContext());
  fake.requests.at(-1)?.reject(new Error("音频太短，无法进行可靠音高估计。"));
  assert.equal(await pitch, false);
  assert.equal(
    controller.getSnapshot().pitch.error,
    "音频太短，无法进行可靠音高估计。",
  );
  const onset = controller.detectOnsets(recording(), "balanced");
  fake.requests.at(-1)?.reject("decode failed");
  assert.equal(await onset, false);
  assert.equal(
    controller.getSnapshot().onset.error,
    "此浏览器无法完成本地起音检测。音频不会上传，也不会调用 AI。",
  );
};

const testLatestWinsResetAndDetach = async () => {
  const fake = createFakePort();
  const { controller, pitchInputs, onsetInputs } = createController(fake.port);
  const first = controller.estimatePitch(recording(), pitchContext(1));
  const second = controller.estimatePitch(recording(), pitchContext(2));
  fake.requests[0]?.resolve(decoded());
  assert.equal(await first, false);
  assert.equal(
    pitchInputs.length,
    0,
    "a stale decoded request must not run the expensive pitch algorithm",
  );
  assert.equal(controller.getSnapshot().pitch.status, "running");
  fake.requests[1]?.resolve(decoded());
  assert.equal(await second, true);
  assert.equal(
    controller.getSnapshot().pitch.result?.context.recordingAttemptKey,
    2,
  );

  const oldRejection = controller.detectOnsets(recording(), "sensitive");
  const replacement = controller.detectOnsets(recording(), "conservative");
  fake.requests[2]?.reject(new Error("late failure"));
  assert.equal(await oldRejection, false);
  assert.equal(controller.getSnapshot().onset.status, "running");
  fake.requests[3]?.resolve(decoded());
  assert.equal(await replacement, true);
  assert.equal(onsetInputs.length, 1);

  const cleared = controller.analyzeLevel(recording());
  controller.clear();
  assert.equal(controller.getSnapshot().level.status, "idle");
  fake.requests[4]?.resolve(decoded());
  assert.equal(await cleared, false);
  assert.equal(controller.getSnapshot().level.status, "idle");

  const detached = controller.estimatePitch(recording(), pitchContext(3));
  controller.detach();
  controller.detach();
  fake.requests[5]?.reject(new Error("late after detach"));
  assert.equal(await detached, false);
  assert.equal(controller.getSnapshot().pitch.status, "idle");
  const requestCountAfterDetach = fake.requests.length;
  assert.equal(await controller.analyzeLevel(recording()), false);
  assert.equal(
    fake.requests.length,
    requestCountAfterDetach,
    "a detached controller must not start decode work",
  );
  controller.attach();
  const afterAttach = controller.analyzeLevel(recording());
  fake.requests.at(-1)?.resolve(decoded());
  assert.equal(await afterAttach, true);
};

const testFrozenContextAndAttemptGate = async () => {
  const fake = createFakePort();
  const { controller } = createController(fake.port);
  const context = pitchContext(4);
  const pending = controller.estimatePitch(recording(), context);
  context.targetNote = "C5";
  context.attemptHistoryGeneration = 99;
  fake.requests[0]?.resolve(decoded());
  assert.equal(await pending, true);
  const frozen = controller.getSnapshot().pitch.result?.context;
  assert.equal(frozen?.targetNote, "A4");
  assert.equal(frozen?.attemptHistoryGeneration, 4);
  assert.equal(
    canAppendPracticeRecordingPitchAttempt({
      context: frozen!,
      currentRecordingAttemptKey: 4,
      currentHistoryGeneration: 4,
      recordedPracticeAttemptKey: null,
    }),
    true,
  );
  assert.equal(
    canAppendPracticeRecordingPitchAttempt({
      context: frozen!,
      currentRecordingAttemptKey: 4,
      currentHistoryGeneration: 5,
      recordedPracticeAttemptKey: null,
    }),
    false,
    "clearing history while an estimate is pending blocks the late append",
  );
  assert.equal(
    canAppendPracticeRecordingPitchAttempt({
      context: frozen!,
      currentRecordingAttemptKey: 4,
      currentHistoryGeneration: 4,
      recordedPracticeAttemptKey: 4,
    }),
    false,
    "a StrictMode effect replay cannot append the same recording twice",
  );
};

const main = async () => {
  await testBrowserDecodePortAndCleanup();
  testLevelCalculation();
  await testSuccessContextsAndIndependentSlots();
  await testMissingAndFailureMessages();
  await testLatestWinsResetAndDetach();
  await testFrozenContextAndAttemptGate();
  console.log("Practice recording analysis controller tests passed.");
};

void main();
