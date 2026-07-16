import {
  SharedBrowserAudioEngine,
  stopAllBrowserAudio,
  subscribeBrowserAudioStopAll,
} from "../lib/audio/browserAudioEngine.js";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

class FakeSource {
  stopped = false;
  disconnected = false;
  private ended: (() => void) | null = null;

  addEventListener(_type: string, listener: () => void) {
    this.ended = listener;
  }

  stop() {
    this.stopped = true;
    this.ended?.();
  }

  disconnect() {
    this.disconnected = true;
  }
}

const run = async () => {
let contextCreations = 0;
let resumeCalls = 0;
let suspendCalls = 0;
const fakeContext = {
  state: "suspended",
  resume: async () => {
    resumeCalls += 1;
    fakeContext.state = "running";
  },
  suspend: async () => {
    suspendCalls += 1;
    fakeContext.state = "suspended";
  },
};
const context = fakeContext as unknown as AudioContext;
const engine = new SharedBrowserAudioEngine(() => {
  contextCreations += 1;
  return context;
});
const first = engine.createChannel();
const second = engine.createChannel();

assert(first.getContext() === second.getContext(), "channels should share one context");
assert(contextCreations === 1, "the context must be created lazily once");
assert(context.state === "suspended", "reading a context must not resume audio");

await first.prepareForUserGesture();
assert(context.state === "running", "a user gesture must resume audio before playback");
assert(resumeCalls === 1, "audio should resume once for a shared context");

const firstSource = new FakeSource();
const secondSource = new FakeSource();
first.trackSource(firstSource as unknown as AudioScheduledSourceNode);
second.trackSource(secondSource as unknown as AudioScheduledSourceNode);
first.stop();

assert(firstSource.stopped, "stopping a channel should stop its sources");
assert(firstSource.disconnected, "stopped sources should be disconnected");
assert(!secondSource.stopped, "one channel must not stop another channel");
second.stop();
assert(secondSource.stopped, "the second channel should remain independently stoppable");

const globalFirstSource = new FakeSource();
const globalSecondSource = new FakeSource();
first.trackSource(globalFirstSource as unknown as AudioScheduledSourceNode);
second.trackSource(globalSecondSource as unknown as AudioScheduledSourceNode);
engine.stopAll();
assert(globalFirstSource.stopped, "global stop must stop the first active channel");
assert(globalSecondSource.stopped, "global stop must stop the second active channel");

await engine.suspendAll();
assert(context.state === "suspended", "suspend must release the running audio context");
assert(suspendCalls === 1, "suspend should only run for a running context");

let globalStopNotices = 0;
const unsubscribeThrowing = subscribeBrowserAudioStopAll(() => {
  throw new Error("subscriber failure");
});
const unsubscribe = subscribeBrowserAudioStopAll(() => {
  globalStopNotices += 1;
});
stopAllBrowserAudio();
assert(globalStopNotices === 1, "global stop subscribers must reset their UI state");
unsubscribe();
unsubscribeThrowing();
stopAllBrowserAudio();
assert(globalStopNotices === 1, "unsubscribed listeners must not be called");

console.log("browser audio engine tests passed");
};

void run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
