import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stopAllBrowserAudio } from "../../lib/audio/browserAudioEngine";
import { createLocalEarTrainingRhythmQuestion } from "../../lib/practice/localEarTrainingRhythm";
import { LocalRhythmSightReadingPanel } from "../../components/practice/LocalRhythmSightReadingPanel";

vi.mock("../../components/practice/useLocalAudioPlayback", () => ({
  useLocalAudioPlayback: () => ({
    isPlaying: false,
    playbackState: "空闲",
    stop: vi.fn(),
    play: async (schedule: (context: AudioContext, channel: { trackSource: (source: unknown) => unknown }) => number) => {
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
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      schedule({
        currentTime: 0,
        destination: {},
        createOscillator: () => oscillator,
        createGain: () => gain,
      } as unknown as AudioContext, { trackSource: (source) => source });
      return null;
    },
  }),
}));

let root: Root | null = null;

const question = createLocalEarTrainingRhythmQuestion({
  difficulty: "基础",
  sequence: 0,
  variantId: "rhythm:even-quarters",
  catalogMode: "expanded-local-v2",
});

const findButton = (container: ParentNode, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  if (!button) throw new Error(`找不到按钮：${label}`);
  return button as HTMLButtonElement;
};

const click = async (button: HTMLElement) => {
  await act(async () => button.dispatchEvent(new MouseEvent("click", { bubbles: true })));
};

beforeEach(() => {
  vi.useFakeTimers();
  document.body.replaceChildren();
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Android 挂载节奏视读行为", () => {
  it("预备拍期间拒绝点击，练习结束给出非评分逐拍证据，清除后新建 attempt", async () => {
    const results: boolean[] = [];
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(<StrictMode><LocalRhythmSightReadingPanel question={question} sessionSeed={0} onLocalAnswerResult={(result) => results.push(result.isCorrect)} /></StrictMode>));

    expect(container.textContent).toContain("P116a · 本地节奏视读");
    expect(container.querySelectorAll('[data-testid="rhythm-sight-reading-target"] span[title]')).toHaveLength(4);
    expect(findButton(container, "按目标点击").disabled).toBe(true);

    await click(findButton(container, "开始节奏视读"));
    expect(container.textContent).toContain("状态：预备拍");
    expect(findButton(container, "按目标点击").disabled).toBe(true);

    await act(async () => vi.advanceTimersByTime(2_950));
    expect(container.textContent).toContain("状态：练习中");
    for (let index = 0; index < 4; index += 1) {
      await click(findButton(container, "按目标点击"));
      if (index < 3) await act(async () => vi.advanceTimersByTime(714));
    }
    await click(findButton(container, "停止并查看反馈"));
    expect(container.textContent).toContain("逐拍非评分反馈");
    expect(container.textContent).toContain("答案已检查");
    expect(container.textContent).not.toMatch(/总分：|准确率：|等级：|结果：通过|结果：失败/);
    expect(results).toHaveLength(1);

    await click(findButton(container, "清除并重来"));
    expect(container.textContent).toContain("状态：尚未开始");
    expect(container.textContent).toContain("第 2 次尝试");
    expect(container.textContent).not.toContain("逐拍非评分反馈");
  });

  it("全局停止使当前 attempt fail closed，并阻止迟到计时器恢复旧练习", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(<LocalRhythmSightReadingPanel question={question} sessionSeed={0} />));
    await click(findButton(container, "开始节奏视读"));
    expect(container.textContent).toContain("状态：预备拍");

    await act(async () => stopAllBrowserAudio());
    expect(container.textContent).toContain("状态：尚未开始");
    expect(container.textContent).toContain("页面切换、后台或全局停止");
    await act(async () => vi.advanceTimersByTime(20_000));
    expect(container.textContent).toContain("状态：尚未开始");
    expect(container.textContent).not.toContain("状态：练习中");
  });
});
