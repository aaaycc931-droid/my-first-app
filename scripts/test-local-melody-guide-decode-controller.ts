import assert from "node:assert/strict";

import {
  createBrowserLocalMelodyGuideDecodePort,
  type LocalMelodyGuideDecodeFile,
  type LocalMelodyGuideDecodedAudio,
  type LocalMelodyGuideDecodePort,
} from "../lib/audio/localMelodyGuideDecode.js";
import {
  createLocalMelodyGuideDecodeController,
  localMelodyGuideDecodeError,
} from "../lib/practice/localMelodyGuideDecodeController.js";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
};

const file = (
  name: string,
  arrayBuffer = async () => new ArrayBuffer(8),
): LocalMelodyGuideDecodeFile => ({
  name,
  type: "audio/wav",
  size: 8,
  arrayBuffer,
});

const decoded = (sample = 0.25): LocalMelodyGuideDecodedAudio => ({
  channelData: new Float32Array([sample]),
  sampleRate: 48_000,
  durationSeconds: 1.5,
  channelCount: 1,
  analysisReady: true,
});

const createFakePort = () => {
  const requests: ReturnType<typeof deferred<LocalMelodyGuideDecodedAudio>>[] = [];
  const files: LocalMelodyGuideDecodeFile[] = [];
  const port: LocalMelodyGuideDecodePort = {
    decode: (selectedFile) => {
      files.push(selectedFile);
      const request = deferred<LocalMelodyGuideDecodedAudio>();
      requests.push(request);
      return request.promise;
    },
  };
  return { port, requests, files };
};

const testBrowserPortCopiesFirstChannelAndCleansUp = async () => {
  const firstChannel = new Float32Array([0.1, -0.2]);
  let closeCalls = 0;
  const port = createBrowserLocalMelodyGuideDecodePort({
    createAudioContext: () =>
      ({
        decodeAudioData: async () => ({
          duration: 2.5,
          sampleRate: 44_100,
          numberOfChannels: 2,
          getChannelData: (index: number) =>
            index === 0 ? firstChannel : new Float32Array([0.3]),
        }),
        close: async () => {
          closeCalls += 1;
        },
      }) as unknown as AudioContext,
  });
  const result = await port.decode(file("guide.wav"));
  assert.deepEqual(result, {
    channelData: firstChannel,
    sampleRate: 44_100,
    durationSeconds: 2.5,
    channelCount: 2,
    analysisReady: true,
  });
  assert.notEqual(result.channelData, firstChannel);
  firstChannel[0] = 0.9;
  assert.ok(Math.abs((result.channelData[0] ?? 0) - 0.1) < 1e-6);
  assert.equal(closeCalls, 1);

  for (const failure of ["read", "decode", "channel"] as const) {
    let failureCloseCalls = 0;
    const failingPort = createBrowserLocalMelodyGuideDecodePort({
      createAudioContext: () =>
        ({
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
        }) as unknown as AudioContext,
    });
    await assert.rejects(
      failingPort.decode(
        file("bad.wav", async () => {
          if (failure === "read") throw new Error("read failed");
          return new ArrayBuffer(8);
        }),
      ),
    );
    assert.equal(failureCloseCalls, 1);
  }

  const cleanupFailurePort = createBrowserLocalMelodyGuideDecodePort({
    createAudioContext: () =>
      ({
        decodeAudioData: async () => ({
          duration: 1,
          sampleRate: 48_000,
          numberOfChannels: 0,
          getChannelData: () => new Float32Array(),
        }),
        close: () => undefined,
      }) as unknown as AudioContext,
  });
  await assert.rejects(
    cleanupFailurePort.decode(file("empty.wav")),
    /no usable channels/,
  );

  const successfulCleanupFailurePort = createBrowserLocalMelodyGuideDecodePort({
    createAudioContext: () =>
      ({
        decodeAudioData: async () => ({
          duration: 1,
          sampleRate: 48_000,
          numberOfChannels: 1,
          getChannelData: () => new Float32Array([0.5]),
        }),
        close: () => {
          throw new Error("cleanup failed");
        },
      }) as unknown as AudioContext,
  });
  assert.equal(
    (await successfulCleanupFailurePort.decode(file("usable.wav")))
      .channelData[0],
    0.5,
  );

  const originalFailurePort = createBrowserLocalMelodyGuideDecodePort({
    createAudioContext: () =>
      ({
        decodeAudioData: async () => {
          throw new Error("original decode failure");
        },
        close: () => {
          throw new Error("secondary cleanup failure");
        },
      }) as unknown as AudioContext,
  });
  await assert.rejects(
    originalFailurePort.decode(file("original-failure.wav")),
    /original decode failure/,
  );
};

const testLatestSelectionWins = async () => {
  const fake = createFakePort();
  const controller = createLocalMelodyGuideDecodeController({ port: fake.port });
  let notices = 0;
  controller.subscribe(() => {
    notices += 1;
  });
  const firstFile = file("first.wav");
  const secondFile = file("second.wav");
  const first = controller.select(firstFile);
  const second = controller.select(secondFile);
  assert.equal(controller.getSnapshot().source?.fileName, "second.wav");
  assert.equal(controller.getSnapshot().source?.status, "decoding");
  fake.requests[0]?.resolve(decoded(0.1));
  assert.equal(await first, false);
  assert.equal(controller.getSnapshot().source?.fileName, "second.wav");
  fake.requests[1]?.resolve(decoded(0.2));
  assert.equal(await second, true);
  const snapshot = controller.getSnapshot();
  assert.equal(snapshot.source?.fileName, "second.wav");
  assert.equal(snapshot.source?.status, "decoded");
  assert.equal(snapshot.source?.decodedDurationSeconds, 1.5);
  assert.equal(snapshot.decodedAudio?.channelData[0], decoded(0.2).channelData[0]);
  assert.deepEqual(fake.files, [firstFile, secondFile]);
  assert.ok(notices >= 3);
};

const testFailureClearAndDetachInvalidatePendingWork = async () => {
  const fake = createFakePort();
  const controller = createLocalMelodyGuideDecodeController({ port: fake.port });
  const failing = controller.select(file("broken.wav"));
  fake.requests[0]?.reject(new Error("codec failure"));
  assert.equal(await failing, false);
  assert.equal(controller.getSnapshot().source?.status, "error");
  assert.equal(controller.getSnapshot().error, localMelodyGuideDecodeError);

  const pendingClear = controller.select(file("clear.wav"));
  controller.clear();
  fake.requests[1]?.resolve(decoded());
  assert.equal(await pendingClear, false);
  assert.deepEqual(controller.getSnapshot(), {
    source: null,
    decodedAudio: null,
    error: "",
  });

  const pendingDetach = controller.select(file("detach.wav"));
  controller.detach();
  fake.requests[2]?.resolve(decoded());
  assert.equal(await pendingDetach, false);
  assert.equal(await controller.select(file("ignored.wav")), false);
  controller.attach();
  assert.equal(await controller.select(null), false);
  assert.equal(controller.getSnapshot().source, null);
};

const main = async () => {
  await testBrowserPortCopiesFirstChannelAndCleansUp();
  await testLatestSelectionWins();
  await testFailureClearAndDetachInvalidatePendingWork();
  console.log("Local melody guide decode controller tests passed.");
};

void main();
