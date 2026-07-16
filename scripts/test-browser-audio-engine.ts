import { SharedBrowserAudioEngine } from "../lib/audio/browserAudioEngine.js";

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

let contextCreations = 0;
const context = {
  state: "running",
  resume: async () => undefined,
} as unknown as AudioContext;
const engine = new SharedBrowserAudioEngine(() => {
  contextCreations += 1;
  return context;
});
const first = engine.createChannel();
const second = engine.createChannel();

assert(first.getContext() === second.getContext(), "channels should share one context");
assert(contextCreations === 1, "the context must be created lazily once");

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

console.log("browser audio engine tests passed");
