import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stopAllBrowserAudio } from "../../lib/audio/browserAudioEngine";
import { createLocalEarTrainingRhythmQuestion } from "../../lib/practice/localEarTrainingRhythm";
import { createLocalRhythmErrorFindingChallenge } from "../../lib/practice/localRhythmErrorFinding";
import { LocalRhythmErrorFindingPanel } from "../../components/practice/LocalRhythmErrorFindingPanel";

vi.mock("../../components/practice/useLocalAudioPlayback", () => ({
  useLocalAudioPlayback: () => ({
    isPlaying: false,
    playbackState: "空闲",
    stop: vi.fn(),
    play: async (schedule: (context: AudioContext, channel: { trackSource: (source: unknown) => unknown }) => number) => {
      const oscillator = { type: "sine", frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), addEventListener: vi.fn(), disconnect: vi.fn() };
      const gain = { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() };
      schedule({ currentTime: 0, destination: {}, createOscillator: () => oscillator, createGain: () => gain } as unknown as AudioContext, { trackSource: (source) => source });
      return null;
    },
  }),
}));

let root: Root | null = null;
const question = createLocalEarTrainingRhythmQuestion({ difficulty: "基础", sequence: 0, variantId: "rhythm:front-dense", catalogMode: "expanded-local-v2" });
const challenge = createLocalRhythmErrorFindingChallenge(question);

const findButton = (container: ParentNode, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) => candidate.textContent?.trim() === label);
  if (!button) throw new Error(`找不到按钮：${label}`);
  return button as HTMLButtonElement;
};
const click = async (button: HTMLElement) => act(async () => button.dispatchEvent(new MouseEvent("click", { bubbles: true })));

beforeEach(() => { vi.useFakeTimers(); document.body.replaceChildren(); });
afterEach(async () => { if (root) await act(async () => root?.unmount()); root = null; vi.useRealTimers(); vi.restoreAllMocks(); });

describe("Android 挂载节奏找错行为", () => {
  it("完整播放前锁定选项，播放后可标记并只显示题内非评分事件答案", async () => {
    const results: boolean[] = [];
    const container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => root?.render(<StrictMode><LocalRhythmErrorFindingPanel question={question} sessionSeed={0} onLocalAnswerResult={(result) => results.push(result.isCorrect)} /></StrictMode>));
    expect(container.textContent).toContain("P116c · 本地节奏找错");
    expect(findButton(container, challenge.correctCandidate.label).disabled).toBe(true);
    expect(container.querySelectorAll('[data-testid="rhythm-error-finding-target"] span[title]')).toHaveLength(question.pattern.onsetBeats.length);

    await click(findButton(container, "播放含一处变化的版本"));
    await act(async () => vi.advanceTimersByTime(3_000));
    expect(container.textContent).toContain("状态：播放完成，可以标记");
    expect(findButton(container, challenge.correctCandidate.label).disabled).toBe(false);
    await click(findButton(container, challenge.correctCandidate.label));
    await click(findButton(container, "查看事件答案"));
    expect(container.textContent).toContain(`本题答案：${challenge.correctCandidate.label}`);
    expect(container.textContent).toContain("答案已检查");
    expect(container.textContent).not.toMatch(/总分：|准确率：|等级：|结果：通过|结果：失败/);
    expect(results).toEqual([true]);
  });

  it("全局停止清除播放资格，迟到完成计时器不能解锁旧题", async () => {
    const container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => root?.render(<LocalRhythmErrorFindingPanel question={question} sessionSeed={0} />));
    await click(findButton(container, "播放含一处变化的版本"));
    await act(async () => stopAllBrowserAudio());
    expect(container.textContent).toContain("播放已因页面切换、后台或全局停止而作废");
    await act(async () => vi.advanceTimersByTime(20_000));
    expect(container.textContent).toContain("状态：等待完整播放");
    expect(findButton(container, challenge.correctCandidate.label).disabled).toBe(true);
  });
});
