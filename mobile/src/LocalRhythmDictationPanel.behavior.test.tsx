import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stopAllBrowserAudio } from "../../lib/audio/browserAudioEngine";
import { createLocalEarTrainingRhythmQuestion } from "../../lib/practice/localEarTrainingRhythm";
import { getLocalRhythmSightReadingOnsetLabel } from "../../lib/practice/localRhythmSightReading";
import { LocalRhythmDictationPanel } from "../../components/practice/LocalRhythmDictationPanel";

const audioMock = vi.hoisted(() => ({
  state: "running" as AudioContextState,
  stateChangeListener: null as EventListener | null,
}));

vi.mock("../../components/practice/useLocalAudioPlayback", () => ({
  useLocalAudioPlayback: () => ({
    isPlaying: false,
    playbackState: "空闲",
    stop: vi.fn(),
    play: async (schedule: (
      context: AudioContext,
      channel: { trackSource: (source: unknown) => unknown },
    ) => number) => {
      const oscillator = {
        type: "sine",
        frequency: { value: 0 },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        addEventListener: vi.fn(),
        disconnect: vi.fn(),
      };
      const gain = {
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      schedule({
        get currentTime() { return Date.now() / 1_000; },
        get state() { return audioMock.state; },
        destination: {},
        createOscillator: () => oscillator,
        createGain: () => gain,
        addEventListener: (type: string, listener: EventListener) => {
          if (type === "statechange") audioMock.stateChangeListener = listener;
        },
        removeEventListener: (type: string, listener: EventListener) => {
          if (type === "statechange" && audioMock.stateChangeListener === listener) {
            audioMock.stateChangeListener = null;
          }
        },
      } as unknown as AudioContext, { trackSource: (source) => source });
      return null;
    },
  }),
}));

let root: Root | null = null;
const question = createLocalEarTrainingRhythmQuestion({
  difficulty: "基础",
  sequence: 0,
  variantId: "rhythm:front-dense",
  catalogMode: "expanded-local-v2",
});

const findButton = (container: ParentNode, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  if (!button) throw new Error(`找不到按钮：${label}`);
  return button as HTMLButtonElement;
};

const click = async (button: HTMLElement) => act(async () => {
  button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
});

const renderPanel = async (onResult?: (correct: boolean) => void) => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(
    <StrictMode>
      <LocalRhythmDictationPanel
        question={question}
        sessionSeed={0}
        onLocalAnswerResult={onResult
          ? (result) => onResult(result.isCorrect)
          : undefined}
      />
    </StrictMode>,
  ));
  return container;
};

beforeEach(() => {
  vi.useFakeTimers();
  audioMock.state = "running";
  audioMock.stateChangeListener = null;
  document.body.replaceChildren();
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Android 挂载节奏听写行为", () => {
  it("完整听题后才允许编辑，并要求检查和确认修订后再显示非评分事件对照", async () => {
    const results: boolean[] = [];
    const container = await renderPanel((correct) => results.push(correct));
    expect(container.textContent).toContain("P116d · 本地节奏听写");
    expect(findButton(container, "第 1 拍").disabled).toBe(true);
    expect(findButton(container, "确认并检查听写").disabled).toBe(true);

    await click(findButton(container, "播放节奏听写题"));
    await act(async () => vi.advanceTimersByTime(5_000));
    expect(container.textContent).toContain("状态：待检查草稿");
    expect(findButton(container, "第 1 拍").disabled).toBe(false);

    for (const onset of question.pattern.onsetBeats) {
      await click(findButton(container, getLocalRhythmSightReadingOnsetLabel(onset)));
    }
    expect(container.querySelectorAll('[data-testid="rhythm-dictation-draft-preview"] span[title]'))
      .toHaveLength(question.pattern.onsetBeats.length);
    await click(findButton(container, "检查草稿"));
    expect(container.textContent).toContain("状态：已检查，等待确认");
    expect(findButton(container, "确认并检查听写").disabled).toBe(false);
    await click(findButton(container, "确认并检查听写"));

    expect(container.textContent).toContain(`题目事件对照：${question.pattern.label}`);
    expect(container.textContent).toContain("已确认草稿的击拍事件与本题版本化目标一致");
    expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent)
      .toContain("答案已检查");
    expect(container.textContent).not.toMatch(/总分：|准确率：|等级：|结果：通过|结果：失败/);
    expect(results).toEqual([true]);
  });

  it("修改已检查草稿会使旧检查失效，后台或全局停止会清除听题资格", async () => {
    const container = await renderPanel();
    await click(findButton(container, "播放节奏听写题"));
    await act(async () => vi.advanceTimersByTime(5_000));
    await click(findButton(container, "第 1 拍"));
    await click(findButton(container, "检查草稿"));
    expect(findButton(container, "确认并检查听写").disabled).toBe(false);

    await click(findButton(container, "第 1 拍"));
    expect(container.textContent).toContain("草稿已修改，旧检查已失效");
    expect(findButton(container, "确认并检查听写").disabled).toBe(true);

    await act(async () => stopAllBrowserAudio());
    expect(container.textContent).toContain("旧草稿与确认已清除");
    expect(container.textContent).toContain("状态：等待完整播放");
    expect(findButton(container, "第 1 拍").disabled).toBe(true);
    await act(async () => vi.advanceTimersByTime(20_000));
    expect(findButton(container, "第 1 拍").disabled).toBe(true);

    await click(findButton(container, "播放节奏听写题"));
    audioMock.state = "suspended";
    await act(async () => audioMock.stateChangeListener?.(new Event("statechange")));
    expect(container.textContent).toContain("音频时间线被中断");
    expect(findButton(container, "第 1 拍").disabled).toBe(true);
  });
});
