import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  useLocalScoreProjectTransport,
} from "../../components/piano/useLocalScoreProjectTransport";
import type {
  LocalScoreProjectMetronomeScheduler,
  LocalScoreProjectMetronomeSchedulerFactory,
} from "../../components/piano/useLocalScoreProjectMetronome";
import type { LocalPianoAudioChannelFactory } from "../../components/piano/useLocalPianoAudio";
import { stopAllBrowserAudio } from "../../lib/audio/browserAudioEngine";
import type { LocalNotationProjectScoreDocumentV1 } from "../../lib/music/scoreDocument";
import type {
  PianoVoiceHandle,
  PianoVoiceProvider,
} from "../../lib/piano/pianoAudioProvider";

type FakeScheduler = LocalScoreProjectMetronomeScheduler & {
  stopCalls: number;
};

const createDocument = (): LocalNotationProjectScoreDocumentV1 => ({
  schemaVersion: "score-document-v1",
  documentKind: "notation-project",
  documentId: "local.score-project.transport-test",
  revision: 1,
  reviewState: "draft",
  localOnly: true,
  sessionOnly: false,
  source: {
    kind: "local-score-project",
    projectId: "transport-test",
  },
  meter: "4/4",
  parts: [{
    partId: "part-1",
    staves: [{
      staffId: "staff-1",
      staffKind: "pitched",
      clef: "treble",
      voices: [{
        voiceId: "voice-1",
        measures: [{
          measureNumber: 1,
          events: [{
            id: "c4",
            type: "note",
            pitch: "C4",
            duration: "quarter",
            measure: 1,
          }, {
            id: "rest",
            type: "rest",
            pitch: null,
            duration: "quarter",
            measure: 1,
          }, {
            id: "d4",
            type: "note",
            pitch: "D4",
            duration: "half",
            measure: 1,
          }],
        }],
      }],
    }],
  }],
});

const createAudioHarness = () => {
  const channels: Array<{ stopped: boolean }> = [];
  const voices: number[] = [];
  const context = {} as AudioContext;
  const createAudioChannel: LocalPianoAudioChannelFactory = () => {
    const channel = {
      stopped: false,
      prepareForUserGesture: () => Promise.resolve(context),
      trackSource: <T extends AudioScheduledSourceNode>(source: T) => source,
      stop: () => {
        channel.stopped = true;
      },
    };
    channels.push(channel);
    return channel;
  };
  const voiceProvider: PianoVoiceProvider = {
    descriptor: {
      id: "transport-test-piano",
      version: "1",
      displayName: "测试钢琴",
      kind: "compatibility-synth",
      attribution: "test",
      license: "test",
      source: "test",
    },
    async startVoice({ event }) {
      voices.push(event.note);
      return {
        timbre: voiceProvider.descriptor,
        setVolume: vi.fn(),
        release: vi.fn(),
      } satisfies PianoVoiceHandle;
    },
  };
  return { channels, createAudioChannel, voiceProvider, voices };
};

function TransportHarness({
  scoreDocument,
  bpm,
  createAudioChannel,
  voiceProvider,
  createMetronomeScheduler,
}: {
  scoreDocument: LocalNotationProjectScoreDocumentV1;
  bpm: number;
  createAudioChannel: LocalPianoAudioChannelFactory;
  voiceProvider: PianoVoiceProvider;
  createMetronomeScheduler: LocalScoreProjectMetronomeSchedulerFactory;
}) {
  const transport = useLocalScoreProjectTransport({
    document: scoreDocument,
    bpm,
    createAudioChannel,
    voiceProvider,
    createMetronomeScheduler,
  });
  return (
    <div>
      <span data-mode={transport.mode}>{transport.mode}</span>
      <span data-notice>{transport.notice}</span>
      <button type="button" onClick={transport.playScore}>播放谱面</button>
      <button
        type="button"
        onClick={() => void transport.startMetronome()}
      >
        启动节拍器
      </button>
      <button type="button" onClick={transport.stop}>全部停止</button>
    </div>
  );
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

const flushMicrotasks = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const advance = async (milliseconds: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
  await flushMicrotasks();
};

const click = async (label: string) => {
  const button = Array.from(container?.querySelectorAll("button") ?? [])
    .find((candidate) => candidate.textContent === label);
  if (!button) throw new Error(`找不到按钮：${label}`);
  await act(async () => {
    button.dispatchEvent(new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    }));
  });
  await flushMicrotasks();
};

const renderTransport = async ({
  scoreDocument = createDocument(),
  bpm = 120,
  createAudioChannel,
  voiceProvider,
  createMetronomeScheduler,
}: {
  scoreDocument?: LocalNotationProjectScoreDocumentV1;
  bpm?: number;
  createAudioChannel: LocalPianoAudioChannelFactory;
  voiceProvider: PianoVoiceProvider;
  createMetronomeScheduler: LocalScoreProjectMetronomeSchedulerFactory;
}) => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <StrictMode>
        <TransportHarness
          scoreDocument={scoreDocument}
          bpm={bpm}
          createAudioChannel={createAudioChannel}
          voiceProvider={voiceProvider}
          createMetronomeScheduler={createMetronomeScheduler}
        />
      </StrictMode>,
    );
  });
  await flushMicrotasks();
};

const currentMode = () =>
  container?.querySelector("[data-mode]")?.textContent;

beforeEach(() => {
  vi.useFakeTimers();
  document.body.replaceChildren();
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "visible",
  });
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  container = null;
  vi.useRealTimers();
});

describe("S1 本地乐谱项目统一 transport", () => {
  it("挂载后保持空闲，不自动播放谱面或启动节拍器", async () => {
    const audio = createAudioHarness();
    const schedulers: FakeScheduler[] = [];
    await renderTransport({
      ...audio,
      createMetronomeScheduler: () => {
        const scheduler: FakeScheduler = {
          start: async () => undefined,
          stopCalls: 0,
          stop() {
            scheduler.stopCalls += 1;
          },
        };
        schedulers.push(scheduler);
        return scheduler;
      },
    });

    expect(currentMode()).toBe("idle");
    expect(audio.channels).toHaveLength(0);
    expect(audio.voices).toEqual([]);
    expect(schedulers).toHaveLength(0);
  });

  it("score→metronome 与 metronome→score 均保持双向互斥", async () => {
    const audio = createAudioHarness();
    const schedulers: FakeScheduler[] = [];
    await renderTransport({
      ...audio,
      createMetronomeScheduler: () => {
        const scheduler: FakeScheduler = {
          start: async () => undefined,
          stopCalls: 0,
          stop() {
            scheduler.stopCalls += 1;
          },
        };
        schedulers.push(scheduler);
        return scheduler;
      },
    });

    await click("播放谱面");
    expect(currentMode()).toBe("score-playing");
    expect(audio.voices).toEqual([60]);
    await advance(100);

    await click("启动节拍器");
    expect(currentMode()).toBe("metronome-running");
    await advance(2_000);
    expect(audio.voices).toEqual([60]);
    expect(audio.channels.every((channel) => channel.stopped)).toBe(true);

    await click("播放谱面");
    expect(currentMode()).toBe("score-playing");
    expect(schedulers[0]?.stopCalls).toBeGreaterThan(0);
    expect(audio.voices).toEqual([60, 60]);
    act(() => stopAllBrowserAudio());
    await advance(2_000);
    expect(currentMode()).toBe("idle");
    expect(audio.voices).toEqual([60, 60]);
  });

  it("pending 节拍器被谱面播放或显式停止后不会复活", async () => {
    const audio = createAudioHarness();
    const pendingResolvers: Array<() => void> = [];
    const schedulers: FakeScheduler[] = [];
    await renderTransport({
      ...audio,
      createMetronomeScheduler: () => {
        const scheduler: FakeScheduler = {
          start: () => new Promise<void>((resolve) => {
            pendingResolvers.push(resolve);
          }),
          stopCalls: 0,
          stop() {
            scheduler.stopCalls += 1;
          },
        };
        schedulers.push(scheduler);
        return scheduler;
      },
    });

    await click("启动节拍器");
    expect(currentMode()).toBe("metronome-starting");
    await click("播放谱面");
    pendingResolvers[0]?.();
    await flushMicrotasks();
    expect(currentMode()).toBe("score-playing");
    expect(schedulers[0]?.stopCalls).toBeGreaterThan(0);

    await click("启动节拍器");
    expect(currentMode()).toBe("metronome-starting");
    await click("全部停止");
    pendingResolvers[1]?.();
    await flushMicrotasks();
    expect(currentMode()).toBe("idle");
    expect(schedulers[1]?.stopCalls).toBeGreaterThan(0);

    await click("启动节拍器");
    expect(currentMode()).toBe("metronome-starting");
    await act(async () => root?.unmount());
    root = null;
    pendingResolvers[2]?.();
    await flushMicrotasks();
    expect(schedulers[2]?.stopCalls).toBeGreaterThan(0);
  });

  it.each([
    ["blur", () => window.dispatchEvent(new Event("blur"))],
    ["hidden", () => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    }],
    ["pagehide", () => window.dispatchEvent(new Event("pagehide"))],
  ])("%s 会取消谱面未来定时事件", async (_name, dispatchLifecycle) => {
    const audio = createAudioHarness();
    const schedulers: FakeScheduler[] = [];
    await renderTransport({
      ...audio,
      createMetronomeScheduler: () => {
        const scheduler: FakeScheduler = {
          start: async () => undefined,
          stopCalls: 0,
          stop() {
            scheduler.stopCalls += 1;
          },
        };
        schedulers.push(scheduler);
        return scheduler;
      },
    });

    await click("播放谱面");
    await advance(100);
    await act(async () => dispatchLifecycle());
    await advance(2_000);

    expect(currentMode()).toBe("idle");
    expect(audio.voices).toEqual([60]);
    expect(audio.channels.every((channel) => channel.stopped)).toBe(true);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    await click("启动节拍器");
    expect(currentMode()).toBe("metronome-running");
    await act(async () => dispatchLifecycle());
    expect(currentMode()).toBe("idle");
    expect(schedulers[0]?.stopCalls).toBeGreaterThan(0);
  });

  it("切换意图及保存配置变化会清除旧模式提示", async () => {
    const audio = createAudioHarness();
    const createMetronomeScheduler: LocalScoreProjectMetronomeSchedulerFactory =
      () => ({
        start: async () => {
          throw new Error("blocked");
        },
        stop: vi.fn(),
      });
    await renderTransport({
      ...audio,
      createMetronomeScheduler,
    });

    await click("启动节拍器");
    expect(container?.querySelector("[data-notice]")?.textContent)
      .toContain("无法启动本机节拍器");
    await click("播放谱面");
    expect(container?.querySelector("[data-notice]")?.textContent).toBe("");

    await click("启动节拍器");
    expect(container?.querySelector("[data-notice]")?.textContent)
      .toContain("无法启动本机节拍器");
    await act(async () => {
      root?.render(
        <StrictMode>
          <TransportHarness
            scoreDocument={createDocument()}
            bpm={121}
            createAudioChannel={audio.createAudioChannel}
            voiceProvider={audio.voiceProvider}
            createMetronomeScheduler={createMetronomeScheduler}
          />
        </StrictMode>,
      );
    });
    expect(currentMode()).toBe("idle");
    expect(container?.querySelector("[data-notice]")?.textContent).toBe("");
  });
});
