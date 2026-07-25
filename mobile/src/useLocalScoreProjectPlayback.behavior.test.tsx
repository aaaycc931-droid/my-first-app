import { StrictMode, useState } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocalScoreProjectNumberedPreview } from "../../components/music/LocalScoreProjectNumberedPreview";
import { LocalScoreProjectStaffPreview } from "../../components/music/LocalScoreProjectStaffPreview";
import { useLocalScoreProjectPlayback } from "../../components/piano/useLocalScoreProjectPlayback";
import type { LocalPianoAudioChannelFactory } from "../../components/piano/useLocalPianoAudio";
import { stopAllBrowserAudio } from "../../lib/audio/browserAudioEngine";
import type {
  LocalNotationProjectScoreDocumentV3,
} from "../../lib/music/scoreDocument";
import type {
  PianoVoiceHandle,
  PianoVoiceProvider,
} from "../../lib/piano/pianoAudioProvider";

const createReleaseSpy = () => vi.fn<(immediately?: boolean) => void>();

type StartedVoice = {
  midi: number;
  release: ReturnType<typeof createReleaseSpy>;
};

const createAudioHarness = () => {
  const channels: Array<{ stopped: boolean }> = [];
  const voices: StartedVoice[] = [];
  const context = {} as AudioContext;
  const createChannel: LocalPianoAudioChannelFactory = () => {
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
      id: "test-piano",
      version: "1",
      displayName: "测试钢琴",
      kind: "compatibility-synth",
      attribution: "test",
      license: "test",
      source: "test",
    },
    async startVoice({ event }) {
      const startedVoice: StartedVoice = {
        midi: event.note,
        release: createReleaseSpy(),
      };
      voices.push(startedVoice);
      return {
        timbre: voiceProvider.descriptor,
        setVolume: vi.fn(),
        release: startedVoice.release,
      } satisfies PianoVoiceHandle;
    },
  };
  return { channels, createChannel, voiceProvider, voices };
};

const createDocument = (
  revision = 1,
): LocalNotationProjectScoreDocumentV3 => ({
  schemaVersion: "score-document-v3",
  documentKind: "notation-project",
  documentId: "local.score-project.hook-test",
  revision,
  reviewState: "draft",
  localOnly: true,
  sessionOnly: false,
  source: {
    kind: "local-score-project",
    projectId: "hook-test",
  },
  meter: "4/4",
  keySignature: { fifths: 0 },
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
            augmentationDots: 0,
            tieToNext: false,
            lyric: null,
          }, {
            id: "rest",
            type: "rest",
            pitch: null,
            duration: "quarter",
            measure: 1,
            augmentationDots: 0,
          }, {
            id: "d4",
            type: "note",
            pitch: "D4",
            duration: "half",
            measure: 1,
            augmentationDots: 0,
            tieToNext: false,
            lyric: null,
          }],
        }],
      }],
    }],
  }],
});

const createTiedDocument = (): LocalNotationProjectScoreDocumentV3 => ({
  schemaVersion: "score-document-v3",
  documentKind: "notation-project",
  documentId: "local.score-project.hook-tie-test",
  revision: 1,
  reviewState: "draft",
  localOnly: true,
  sessionOnly: false,
  source: {
    kind: "local-score-project",
    projectId: "hook-tie-test",
  },
  meter: "4/4",
  keySignature: { fifths: 0 },
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
            id: "tie-start",
            type: "note",
            pitch: "C4",
            duration: "quarter",
            measure: 1,
            augmentationDots: 0,
            tieToNext: true,
            lyric: null,
          }, {
            id: "tie-end",
            type: "note",
            pitch: "C4",
            duration: "quarter",
            measure: 1,
            augmentationDots: 0,
            tieToNext: false,
            lyric: null,
          }, {
            id: "rest-1",
            type: "rest",
            pitch: null,
            duration: "quarter",
            measure: 1,
            augmentationDots: 0,
          }, {
            id: "rest-2",
            type: "rest",
            pitch: null,
            duration: "quarter",
            measure: 1,
            augmentationDots: 0,
          }],
        }],
      }],
    }],
  }],
});

type PlaybackDocument = LocalNotationProjectScoreDocumentV3;

const PlaybackHarness = ({
  document,
  bpm,
  createAudioChannel,
  voiceProvider,
}: {
  document: PlaybackDocument;
  bpm: number;
  createAudioChannel: LocalPianoAudioChannelFactory;
  voiceProvider: PianoVoiceProvider;
}) => {
  const playback = useLocalScoreProjectPlayback({
    document,
    bpm,
    createAudioChannel,
    voiceProvider,
  });
  return (
    <div>
      <span data-state={playback.playbackState}>{playback.playbackState}</span>
      <span data-active-events={playback.activeSourceEventIds.join(",")}>
        {playback.activeSourceEventIds.join(",")}
      </span>
      <LocalScoreProjectStaffPreview
        document={document}
        activeEventIds={playback.activeSourceEventIds}
      />
      <button type="button" onClick={playback.play}>播放</button>
      <button type="button" onClick={playback.stop}>停止</button>
    </div>
  );
};

const DualPreviewPlaybackHarness = ({
  document,
  bpm,
  createAudioChannel,
  voiceProvider,
}: {
  document: PlaybackDocument;
  bpm: number;
  createAudioChannel: LocalPianoAudioChannelFactory;
  voiceProvider: PianoVoiceProvider;
}) => {
  const [view, setView] = useState<"staff" | "numbered">("staff");
  const playback = useLocalScoreProjectPlayback({
    document,
    bpm,
    createAudioChannel,
    voiceProvider,
  });
  return (
    <div>
      <span data-state={playback.playbackState}>{playback.playbackState}</span>
      <span data-active-events={playback.activeSourceEventIds.join(",")}>
        {playback.activeSourceEventIds.join(",")}
      </span>
      <button type="button" onClick={() => setView("staff")}>五线谱</button>
      <button type="button" onClick={() => setView("numbered")}>
        固定 C 简谱
      </button>
      {view === "staff" ? (
        <LocalScoreProjectStaffPreview
          document={document}
          activeEventIds={playback.activeSourceEventIds}
        />
      ) : (
        <LocalScoreProjectNumberedPreview
          document={document}
          activeEventIds={playback.activeSourceEventIds}
        />
      )}
      <button type="button" onClick={playback.play}>播放</button>
      <button type="button" onClick={playback.stop}>停止</button>
    </div>
  );
};

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

const renderDualPreviewPlayback = async ({
  document,
  bpm = 120,
  createAudioChannel,
  voiceProvider,
}: {
  document: PlaybackDocument;
  bpm?: number;
  createAudioChannel: LocalPianoAudioChannelFactory;
  voiceProvider: PianoVoiceProvider;
}) => {
  if (!container) {
    container = documentRoot();
    root = createRoot(container);
  }
  await act(async () => {
    root?.render(
      <StrictMode>
        <DualPreviewPlaybackHarness
          document={document}
          bpm={bpm}
          createAudioChannel={createAudioChannel}
          voiceProvider={voiceProvider}
        />
      </StrictMode>,
    );
  });
  await flushMicrotasks();
};

const renderPlayback = async ({
  document,
  bpm = 120,
  createAudioChannel,
  voiceProvider,
}: {
  document: PlaybackDocument;
  bpm?: number;
  createAudioChannel: LocalPianoAudioChannelFactory;
  voiceProvider: PianoVoiceProvider;
}) => {
  if (!container) {
    container = documentRoot();
    root = createRoot(container);
  }
  await act(async () => {
    root?.render(
      <StrictMode>
        <PlaybackHarness
          document={document}
          bpm={bpm}
          createAudioChannel={createAudioChannel}
          voiceProvider={voiceProvider}
        />
      </StrictMode>,
    );
  });
  await flushMicrotasks();
};

const documentRoot = () => {
  const element = document.createElement("div");
  document.body.append(element);
  return element;
};

beforeEach(() => {
  vi.useFakeTimers();
  document.body.replaceChildren();
});

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
  }
  root = null;
  container = null;
  vi.useRealTimers();
});

describe("本地乐谱项目播放 hook", () => {
  it("播放中双向切换固定 C 简谱不会重建调度或中断后续事件", async () => {
    const audio = createAudioHarness();
    await renderDualPreviewPlayback({
      document: createDocument(),
      createAudioChannel: audio.createChannel,
      voiceProvider: audio.voiceProvider,
    });

    await click("播放");
    await advance(100);
    expect(audio.channels).toHaveLength(1);
    expect(audio.channels[0]?.stopped).toBe(false);
    expect(audio.voices.map((voice) => voice.midi)).toEqual([60]);

    await click("固定 C 简谱");
    expect(container?.querySelector(
      '[data-testid="local-score-project-numbered-preview"]',
    )).not.toBeNull();
    expect(container?.querySelector("[data-state]")?.textContent).toBe("播放中");
    expect(container?.querySelector(
      '[data-event-id="c4"]',
    )?.getAttribute("data-active")).toBe("true");
    expect(audio.channels).toHaveLength(1);
    expect(audio.channels[0]?.stopped).toBe(false);

    await advance(400);
    expect(container?.querySelector(
      '[data-event-id="rest"]',
    )?.getAttribute("data-active")).toBe("true");
    await advance(500);
    expect(audio.voices.map((voice) => voice.midi)).toEqual([60, 62]);
    expect(container?.querySelector(
      '[data-event-id="d4"]',
    )?.getAttribute("data-active")).toBe("true");

    await click("五线谱");
    expect(container?.querySelector(
      '[data-testid="local-score-project-staff-preview"]',
    )).not.toBeNull();
    expect(container?.querySelector("[data-state]")?.textContent).toBe("播放中");
    expect(container?.querySelector(
      '[data-event-id="d4"]',
    )?.getAttribute("data-active")).toBe("true");
    expect(audio.channels).toHaveLength(2);
    expect(audio.channels[1]?.stopped).toBe(false);

    await advance(1_000);
    expect(container?.querySelector("[data-state]")?.textContent).toBe("空闲");
    expect(audio.channels.every((channel) => channel.stopped)).toBe(true);
  });

  it("不自动播放，并按休止时值调度音符直到全局停止", async () => {
    const audio = createAudioHarness();
    await renderPlayback({
      document: createDocument(),
      createAudioChannel: audio.createChannel,
      voiceProvider: audio.voiceProvider,
    });
    expect(audio.channels).toHaveLength(0);
    expect(container?.querySelector("[data-state]")?.textContent).toBe("空闲");

    await click("播放");
    expect(audio.voices.map((voice) => voice.midi)).toEqual([60]);
    expect(container?.querySelector("[data-state]")?.textContent).toBe("播放中");
    expect(
      container?.querySelector("[data-active-events]")?.textContent,
    ).toBe("c4");
    expect(
      container?.querySelector('[data-event-id="c4"]')?.getAttribute(
        "data-active",
      ),
    ).toBe("true");

    await advance(440);
    expect(audio.voices[0]?.release).toHaveBeenCalledTimes(1);
    expect(
      container?.querySelector("[data-active-events]")?.textContent,
    ).toBe("c4");
    await advance(60);
    expect(
      container?.querySelector("[data-active-events]")?.textContent,
    ).toBe("rest");
    expect(
      container?.querySelector('[data-event-id="rest"]')?.getAttribute(
        "data-active",
      ),
    ).toBe("true");
    await advance(499);
    expect(audio.voices.map((voice) => voice.midi)).toEqual([60]);
    await advance(1);
    expect(audio.voices.map((voice) => voice.midi)).toEqual([60, 62]);
    expect(
      container?.querySelector("[data-active-events]")?.textContent,
    ).toBe("d4");
    expect(
      container?.querySelector('[data-event-id="d4"]')?.getAttribute(
        "data-active",
      ),
    ).toBe("true");

    await advance(1_000);
    expect(container?.querySelector("[data-state]")?.textContent).toBe("空闲");
    expect(
      container?.querySelector("[data-active-events]")?.textContent,
    ).toBe("");
    expect(audio.channels.every((channel) => channel.stopped)).toBe(true);
  });

  it("显式停止与全局音频停止都会取消未来定时事件", async () => {
    const audio = createAudioHarness();
    await renderPlayback({
      document: createDocument(),
      createAudioChannel: audio.createChannel,
      voiceProvider: audio.voiceProvider,
    });

    await click("播放");
    await advance(100);
    await click("停止");
    await advance(2_000);
    expect(audio.voices.map((voice) => voice.midi)).toEqual([60]);
    expect(container?.querySelector("[data-state]")?.textContent).toBe("空闲");
    expect(
      container?.querySelector("[data-active-events]")?.textContent,
    ).toBe("");

    await click("播放");
    await advance(100);
    act(() => stopAllBrowserAudio());
    await advance(2_000);
    expect(audio.voices.map((voice) => voice.midi)).toEqual([60, 60]);
    expect(container?.querySelector("[data-state]")?.textContent).toBe("空闲");
    expect(
      container?.querySelector("[data-active-events]")?.textContent,
    ).toBe("");
  });

  it("文档 revision 变化和卸载都会停止旧计划且不会复活", async () => {
    const audio = createAudioHarness();
    await renderPlayback({
      document: createDocument(1),
      createAudioChannel: audio.createChannel,
      voiceProvider: audio.voiceProvider,
    });
    await click("播放");
    await advance(100);

    await renderPlayback({
      document: createDocument(2),
      createAudioChannel: audio.createChannel,
      voiceProvider: audio.voiceProvider,
    });
    await advance(2_000);
    expect(audio.voices.map((voice) => voice.midi)).toEqual([60]);
    expect(container?.querySelector("[data-state]")?.textContent).toBe("空闲");
    expect(
      container?.querySelector("[data-active-events]")?.textContent,
    ).toBe("");

    await click("播放");
    await advance(100);
    await act(async () => root?.unmount());
    root = null;
    await advance(2_000);
    expect(audio.voices.map((voice) => voice.midi)).toEqual([60, 60]);
    expect(audio.channels.every((channel) => channel.stopped)).toBe(true);
  });

  it("延音线只触发一次发声，但光标仍按链内事件推进", async () => {
    const audio = createAudioHarness();
    await renderPlayback({
      document: createTiedDocument(),
      createAudioChannel: audio.createChannel,
      voiceProvider: audio.voiceProvider,
    });

    await click("播放");
    expect(audio.voices.map((voice) => voice.midi)).toEqual([60]);
    expect(
      container?.querySelector("[data-active-events]")?.textContent,
    ).toBe("tie-start");

    await advance(500);
    expect(audio.voices.map((voice) => voice.midi)).toEqual([60]);
    expect(audio.voices[0]?.release).not.toHaveBeenCalled();
    expect(
      container?.querySelector("[data-active-events]")?.textContent,
    ).toBe("tie-end");

    await advance(440);
    expect(audio.voices[0]?.release).toHaveBeenCalledTimes(1);
    expect(
      container?.querySelector("[data-active-events]")?.textContent,
    ).toBe("tie-end");

    await advance(60);
    expect(
      container?.querySelector("[data-active-events]")?.textContent,
    ).toBe("rest-1");
    expect(audio.voices).toHaveLength(1);
  });
});
