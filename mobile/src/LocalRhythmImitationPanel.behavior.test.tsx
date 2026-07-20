import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stopAllBrowserAudio } from "../../lib/audio/browserAudioEngine";
import { createLocalEarTrainingRhythmQuestion } from "../../lib/practice/localEarTrainingRhythm";
import { LocalRhythmImitationPanel } from "../../components/practice/LocalRhythmImitationPanel";

vi.mock("../../components/practice/useLocalAudioPlayback", () => ({
  useLocalAudioPlayback: () => ({
    isPlaying: false,
    playbackState: "空闲",
    stop: vi.fn(),
    play: async (schedule: (context: AudioContext, channel: { trackSource: (source: unknown) => unknown }) => number) => {
      const oscillator = {
        type: "sine", frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn(),
        addEventListener: vi.fn(), disconnect: vi.fn(),
      };
      const gain = {
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(), disconnect: vi.fn(),
      };
      schedule({
        currentTime: 0, destination: {}, createOscillator: () => oscillator, createGain: () => gain,
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

describe("Android 挂载节奏回模行为", () => {
  it("完整听题前拒绝回模，结束后才揭示非评分逐拍反馈", async () => {
    const results: boolean[] = [];
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(<StrictMode><LocalRhythmImitationPanel question={question} sessionSeed={0} onLocalAnswerResult={(result) => results.push(result.isCorrect)} /></StrictMode>));

    expect(container.textContent).toContain("P116b · 本地节奏回模");
    expect(findButton(container, "开始节奏回模").disabled).toBe(true);
    expect(container.querySelector('[data-testid="rhythm-imitation-revealed-target"]')).toBeNull();

    await click(findButton(container, "听一遍隐藏节奏"));
    expect(container.textContent).toContain("状态：正在听题");
    expect(findButton(container, "开始节奏回模").disabled).toBe(true);
    await act(async () => vi.advanceTimersByTime(3_000));
    expect(container.textContent).toContain("状态：听题完成，可以开始回模");

    await click(findButton(container, "开始节奏回模"));
    expect(container.textContent).toContain("状态：预备拍");
    expect(findButton(container, "按记忆点击").disabled).toBe(true);
    await act(async () => vi.advanceTimersByTime(2_950));
    expect(container.textContent).toContain("状态：回模中");
    for (let index = 0; index < 4; index += 1) {
      await click(findButton(container, "按记忆点击"));
      if (index < 3) await act(async () => vi.advanceTimersByTime(714));
    }
    await act(async () => vi.advanceTimersByTime(1_000));
    expect(container.textContent).toContain("逐拍非评分反馈");
    expect(container.textContent).toContain("答案已检查");
    expect(container.querySelector('[data-testid="rhythm-imitation-revealed-target"]')).not.toBeNull();
    expect(container.textContent).not.toMatch(/总分：|准确率：|等级：|结果：通过|结果：失败/);
    expect(results).toHaveLength(1);
  });

  it("全局停止作废当前 attempt，迟到播放与计时器不能恢复旧状态", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(<LocalRhythmImitationPanel question={question} sessionSeed={0} />));
    await click(findButton(container, "听一遍隐藏节奏"));
    expect(container.textContent).toContain("状态：正在听题");

    await act(async () => stopAllBrowserAudio());
    expect(container.textContent).toContain("状态：尚未听题");
    expect(container.textContent).toContain("本轮已因页面切换、后台或全局停止而作废");
    expect(container.textContent).toContain("第 2 次尝试");
    await act(async () => vi.advanceTimersByTime(20_000));
    expect(container.textContent).toContain("状态：尚未听题");
    expect(container.textContent).not.toContain("状态：听题完成，可以开始回模");
  });

  it("预备拍中手动停止后作废输入，迟到练习计时器不能重新开启", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(<LocalRhythmImitationPanel question={question} sessionSeed={0} />));
    await click(findButton(container, "听一遍隐藏节奏"));
    await act(async () => vi.advanceTimersByTime(3_000));
    await click(findButton(container, "开始节奏回模"));
    expect(container.textContent).toContain("状态：预备拍");
    await click(findButton(container, "停止并作废本轮"));
    expect(container.textContent).toContain("本轮已手动停止并作废");
    expect(container.textContent).toContain("第 2 次尝试");
    await act(async () => vi.advanceTimersByTime(20_000));
    expect(container.textContent).toContain("状态：尚未听题");
    expect(container.textContent).not.toContain("逐拍非评分反馈");
  });
});
