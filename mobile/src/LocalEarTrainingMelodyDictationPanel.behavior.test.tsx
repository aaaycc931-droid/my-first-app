import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocalEarTrainingMelodyDictationPanel } from "../../components/practice/LocalEarTrainingMelodyDictationPanel";
import { stopAllBrowserAudio } from "../../lib/audio/browserAudioEngine";
import type { LocalPracticeReviewTarget } from "../../lib/practice/localPracticeReviewQueue";
import type { ResolvedLocalPracticeCustomization } from "../../lib/practice/localPracticeCustomizer";

const audioMock = vi.hoisted(() => ({
  state: "running" as AudioContextState,
  stateChangeListener: null as EventListener | null,
}));

const browserAudioMock = vi.hoisted(() => ({
  listeners: new Set<() => void>(),
  deferPreparation: false,
  prepareResolvers: [] as Array<(context: AudioContext) => void>,
  toneStarts: 0,
  channelStops: 0,
}));

vi.mock("../../lib/audio/browserAudioEngine", () => {
  const context = {
    state: "running",
    currentTime: 1,
    destination: {},
    createOscillator: () => ({
      type: "sine",
      frequency: { value: 0 },
      connect: vi.fn(),
      start: () => { browserAudioMock.toneStarts += 1; },
      stop: vi.fn(),
      addEventListener: vi.fn(),
      disconnect: vi.fn(),
    }),
    createGain: () => ({
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
  } as unknown as AudioContext;
  const channel = {
    prepareForUserGesture: () => browserAudioMock.deferPreparation
      ? new Promise<AudioContext>((resolve) => browserAudioMock.prepareResolvers.push(resolve))
      : Promise.resolve(context),
    trackSource: (source: unknown) => source,
    stop: () => { browserAudioMock.channelStops += 1; },
  };
  return {
    createBrowserAudioChannel: () => channel,
    subscribeBrowserAudioStopAll: (listener: () => void) => {
      browserAudioMock.listeners.add(listener);
      return () => browserAudioMock.listeners.delete(listener);
    },
    stopAllBrowserAudio: () => {
      Array.from(browserAudioMock.listeners).forEach((listener) => listener());
    },
  };
});

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

vi.mock("../../lib/practice/localQuestionScheduler", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../lib/practice/localQuestionScheduler")>();
  return { ...original, createLocalQuestionSeed: () => 0 };
});

let root: Root | null = null;

const flushReact = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

const waitFor = async (predicate: () => boolean, message: string) => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (predicate()) return;
    await flushReact();
  }
  throw new Error(`等待超时：${message}`);
};

const click = async (element: HTMLElement) => {
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await flushReact();
};

const changeSelect = async (element: HTMLSelectElement, value: string) => {
  await act(async () => {
    element.value = value;
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await flushReact();
};

const completePlayback = async (container: ParentNode) => {
  await act(async () => vi.advanceTimersByTime(100));
  expect(findButton(container, "播放旋律题目").disabled).toBe(false);
  await click(findButton(container, "播放旋律题目"));
  await act(async () => vi.advanceTimersByTime(5_000));
  expect(container.textContent).toContain("状态：可以填写");
};

const resolveDeferredPianoPreparations = async () => {
  const staleResolvers = [...browserAudioMock.prepareResolvers];
  browserAudioMock.prepareResolvers = [];
  browserAudioMock.deferPreparation = false;
  await act(async () => staleResolvers.forEach((resolve) => resolve({
    state: "running",
    currentTime: 1,
    destination: {},
    createOscillator: () => ({
      type: "sine", frequency: { value: 0 }, connect: vi.fn(),
      start: () => { browserAudioMock.toneStarts += 1; }, stop: vi.fn(),
      addEventListener: vi.fn(), disconnect: vi.fn(),
    }),
    createGain: () => ({
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(), disconnect: vi.fn(),
    }),
  } as unknown as AudioContext)));
};

const findButton = (container: ParentNode, label: string): HTMLButtonElement => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  if (!button) throw new Error(`找不到按钮：${label}`);
  return button;
};

const protocolState = (container: ParentNode) => {
  const state = container.querySelector<HTMLElement>('[data-testid="activity-protocol-state"]');
  if (!state) throw new Error("找不到统一活动协议状态");
  return state.textContent ?? "";
};

const positionFields = (container: ParentNode) => Array.from(container.querySelectorAll("fieldset")).filter(
  (fieldset) => fieldset.querySelector("legend")?.textContent?.startsWith("第 "),
);

const chooseOrderedAnswer = async (container: ParentNode, labels: readonly string[]) => {
  const fields = positionFields(container);
  expect(fields).toHaveLength(3);
  for (let index = 0; index < labels.length; index += 1) {
    await click(findButton(fields[index]!, labels[index]!));
  }
};

const basicReviewTarget: Extract<LocalPracticeReviewTarget, { kind: "melody-dictation" }> = {
  kind: "melody-dictation",
  difficulty: "基础",
  seed: 0,
  sequence: 0,
  variantId: "melody:up-step",
};

const renderPanel = async ({
  initialReviewTarget = basicReviewTarget,
  expandedLocalCatalog = true,
  randomQuestion = false,
  customPractice,
}: {
  initialReviewTarget?: Extract<LocalPracticeReviewTarget, { kind: "melody-dictation" }> | undefined;
  expandedLocalCatalog?: boolean;
  randomQuestion?: boolean;
  customPractice?: ResolvedLocalPracticeCustomization;
} = {}) => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(
    <StrictMode>
      <LocalEarTrainingMelodyDictationPanel
        initialReviewTarget={randomQuestion || customPractice ? undefined : initialReviewTarget}
        expandedLocalCatalog={expandedLocalCatalog}
        customPractice={customPractice}
      />
    </StrictMode>,
  ));
  await flushReact();
  return container;
};

beforeEach(() => {
  vi.useFakeTimers();
  browserAudioMock.deferPreparation = false;
  browserAudioMock.prepareResolvers = [];
  browserAudioMock.toneStarts = 0;
  browserAudioMock.channelStops = 0;
  browserAudioMock.listeners.clear();
  audioMock.state = "running";
  audioMock.stateChangeListener = null;
  document.body.replaceChildren();
  window.localStorage.clear();
});

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
    root = null;
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("三音旋律听写音名与固定唱名行为", () => {
  it("默认使用音名，并可切换为不会丢失升号或八度的固定唱名", async () => {
    const container = await renderPanel();

    expect(findButton(container, "音名").getAttribute("aria-checked")).toBe("true");
    expect(findButton(container, "固定唱名").getAttribute("aria-checked")).toBe("false");
    expect(findButton(positionFields(container)[0]!, "C4")).toBeTruthy();

    await click(findButton(container, "固定唱名"));
    expect(findButton(container, "固定唱名").getAttribute("aria-checked")).toBe("true");
    expect(findButton(positionFields(container)[0]!, "do（C4）")).toBeTruthy();

    await act(async () => root?.unmount());
    root = null;
    const challengeTarget: Extract<LocalPracticeReviewTarget, { kind: "melody-dictation" }> = {
      kind: "melody-dictation",
      difficulty: "挑战",
      seed: 0,
      sequence: 0,
      variantId: "melody:challenge-19-b4-f-sharp-4-c5",
    };
    const challenge = await renderPanel({ initialReviewTarget: challengeTarget });
    await click(findButton(challenge, "固定唱名"));
    expect(findButton(positionFields(challenge)[0]!, "升 fa（F♯4）")).toBeTruthy();
    expect(findButton(positionFields(challenge)[0]!, "高音 do（C5）")).toBeTruthy();
  });

  it("固定唱名完整填写真实驱动 answering，并在查看答案后进入 checked", async () => {
    const container = await renderPanel();
    await click(findButton(container, "固定唱名"));
    await completePlayback(container);

    await chooseOrderedAnswer(container, ["do（C4）", "re（D4）", "mi（E4）"]);
    expect(protocolState(container)).toContain("已作答，等待检查");

    await click(findButton(container, "查看本题答案"));
    expect(protocolState(container)).toContain("答案已检查");
    expect(container.textContent).toContain("本题答案：do（C4） → re（D4） → mi（E4）");
    expect(container.textContent).toContain("你的填写：do（C4） → re（D4） → mi（E4）");
  });

  it("已开始填写后切换答案方式会清空选择并开始新尝试", async () => {
    const container = await renderPanel();
    await completePlayback(container);
    await chooseOrderedAnswer(container, ["C4", "D4", "E4"]);
    expect(protocolState(container)).toContain("已作答，等待检查");

    await click(findButton(container, "固定唱名"));
    expect(protocolState(container)).toContain("题目已确认");
    expect(protocolState(container)).toContain("第 2 次尝试");
    expect(container.textContent).toContain("必须完整播放当前题目后才能填写");
    expect(positionFields(container).flatMap((field) =>
      Array.from(field.querySelectorAll('[role="radio"][aria-checked="true"]')),
    )).toHaveLength(0);
  });

  it("checked 后仍可切换模式，并清除旧答案与检查证据", async () => {
    const container = await renderPanel();
    await completePlayback(container);
    await chooseOrderedAnswer(container, ["C4", "D4", "E4"]);
    await click(findButton(container, "查看本题答案"));
    expect(protocolState(container)).toContain("答案已检查");
    expect(container.textContent).toContain("本题答案：C4 → D4 → E4");

    await click(findButton(container, "固定唱名"));
    expect(protocolState(container)).toContain("题目已确认");
    expect(protocolState(container)).toContain("第 2 次尝试");
    expect(container.textContent).not.toContain("本题答案：");
    expect(container.textContent).toContain("必须完整播放当前题目后才能填写");
  });

  it("重置清除答案和证据，下一题不会沿用上一题填写", async () => {
    const container = await renderPanel({ randomQuestion: true });
    expect(findButton(container, "C4").disabled).toBe(true);
    await completePlayback(container);
    await chooseOrderedAnswer(container, ["C4", "C4", "C4"]);
    await click(findButton(container, "查看本题答案"));
    expect(protocolState(container)).toContain("答案已检查");

    await click(findButton(container, "重置本题"));
    expect(protocolState(container)).toContain("题目已确认");
    expect(protocolState(container)).toContain("第 2 次尝试");
    expect(container.textContent).not.toContain("本题答案：");
    expect(container.textContent).toContain("必须完整播放当前题目后才能填写");

    await completePlayback(container);
    await chooseOrderedAnswer(container, ["C4", "D4", "E4"]);
    await click(findButton(container, "下一题"));
    expect(protocolState(container)).toContain("题目已确认");
    expect(protocolState(container)).toContain("第 1 次尝试");
    expect(container.textContent).toContain("必须完整播放当前题目后才能填写");
    expect(positionFields(container).flatMap((field) =>
      Array.from(field.querySelectorAll('[role="radio"][aria-checked="true"]')),
    )).toHaveLength(0);
  });

  it("扩展随机入口把屏幕钢琴作为真实 piano 答案，并在三音后完成非评分检查", async () => {
    const container = await renderPanel({ randomQuestion: true });
    expect(container.textContent).toContain("P117c · 本地旋律听写");
    expect(findButton(container, "旋律听写").getAttribute("aria-checked")).toBe("true");
    expect(findButton(container, "旋律回唱（麦克风）").getAttribute("aria-checked")).toBe("false");
    expect(findButton(container, "旋律视唱（可见目标）").getAttribute("aria-checked")).toBe("false");
    expect(container.textContent).not.toContain("P117d · 会话内非评分练习");
    expect(container.textContent).not.toContain("P117e · 会话内非评分练习");
    expect(container.querySelector('[aria-labelledby="melody-sight-singing-title"]')).toBeNull();
    expect(findButton(container, "屏幕钢琴").getAttribute("aria-checked")).toBe("false");

    await click(findButton(container, "屏幕钢琴"));
    const piano = container.querySelector<HTMLElement>('[data-testid="melody-piano-answer"]');
    expect(piano).not.toBeNull();
    expect(findButton(piano!, "C4").disabled).toBe(true);
    expect(container.textContent).not.toContain("本题答案：");

    await completePlayback(container);
    await click(findButton(piano!, "开始屏幕钢琴作答"));
    await click(findButton(piano!, "C4"));
    await click(findButton(piano!, "C4"));
    await click(findButton(piano!, "D4"));
    expect(container.textContent).toContain("当前输入：C4 → C4 → D4");
    expect(protocolState(container)).toContain("已作答，等待检查");
    expect(browserAudioMock.toneStarts).toBe(3);

    await click(findButton(container, "检查本轮钢琴答案"));
    expect(protocolState(container)).toContain("答案已检查");
    expect(protocolState(container)).toContain("非评分证据");
    expect(container.textContent).toContain("你的填写：C4 → C4 → D4");
    expect(container.querySelectorAll('[data-testid="melody-piano-position-comparison"] li'))
      .toHaveLength(3);
  });

  it("父答案已揭示后进入回唱会清除并从 DOM 隔离目标、作答与参考钢琴", async () => {
    const container = await renderPanel({ randomQuestion: true });
    await completePlayback(container);
    await chooseOrderedAnswer(container, ["C4", "D4", "E4"]);
    await click(findButton(container, "查看本题答案"));
    expect(container.textContent).toContain("本题答案：");
    expect(container.textContent).toContain("三个音依次为：");

    await click(findButton(container, "旋律回唱（麦克风）"));
    expect(container.textContent).toContain("P117d · 会话内非评分练习");
    expect(container.textContent).not.toContain("本题答案：");
    expect(container.textContent).not.toContain("这三个音依次");
    expect(Array.from(container.querySelectorAll("button")).some((button) =>
      button.textContent?.trim() === "查看本题答案"
      || button.textContent?.trim() === "播放旋律题目"
      || button.textContent?.trim() === "参考钢琴"
    )).toBe(false);
  });

  it("回唱挂载期间父听写播放、途中揭示与参考钢琴均不可进入同一 DOM", async () => {
    const container = await renderPanel({ randomQuestion: true });
    await act(async () => vi.advanceTimersByTime(100));
    await click(findButton(container, "播放旋律题目"));
    await click(findButton(container, "旋律回唱（麦克风）"));

    expect(container.textContent).toContain("P117d · 会话内非评分练习");
    expect(container.querySelector('[data-testid="melody-answer-mode"]')).toBeNull();
    expect(container.querySelector('[aria-label="旋律听写参考钢琴"]')).toBeNull();
    expect(Array.from(container.querySelectorAll("button")).some((button) =>
      button.textContent?.trim() === "播放旋律题目"
      || button.textContent?.trim() === "查看本题答案"
    )).toBe(false);
    expect(browserAudioMock.listeners.size).toBeGreaterThan(0);
  });

  it("回唱 reset、next 与同 variant 跨难度都会 remount 并作废旧实例", async () => {
    const container = await renderPanel({ randomQuestion: true });
    await click(findButton(container, "旋律回唱（麦克风）"));
    const currentPanel = () => container.querySelector<HTMLElement>('[aria-labelledby="melody-imitation-title"]');
    const first = currentPanel();
    expect(first).not.toBeNull();

    await click(findButton(container, "重置回唱题目"));
    const reset = currentPanel();
    expect(reset).not.toBeNull();
    expect(reset).not.toBe(first);

    await act(async () => vi.advanceTimersByTime(100));
    await click(findButton(container, "下一组回唱"));
    await act(async () => vi.advanceTimersByTime(100));
    const next = currentPanel();
    expect(next).not.toBeNull();
    expect(next).not.toBe(reset);
    expect(container.textContent).toContain("当前为回唱题目 2");

    const difficulty = container.querySelector<HTMLSelectElement>("#melody-imitation-difficulty");
    if (!difficulty) throw new Error("找不到回唱难度选择");
    await changeSelect(difficulty, "进阶");
    await act(async () => vi.advanceTimersByTime(100));
    const changedDifficulty = currentPanel();
    expect(changedDifficulty).not.toBeNull();
    expect(changedDifficulty).not.toBe(next);
    expect(container.textContent).not.toContain("本题答案：");
    expect(container.textContent).toContain("当前为回唱题目 1");
  });

  it("随机入口切换到视唱后只挂载可见目标练习，并隔离回唱与听写控件", async () => {
    const container = await renderPanel({ randomQuestion: true });
    expect(container.querySelector('[aria-labelledby="melody-sight-singing-title"]')).toBeNull();

    await click(findButton(container, "旋律视唱（可见目标）"));
    expect(findButton(container, "旋律视唱（可见目标）").getAttribute("aria-checked")).toBe("true");
    expect(container.textContent).toContain("P117e · 会话内非评分练习");
    expect(container.querySelector('[aria-labelledby="melody-sight-singing-title"]')).not.toBeNull();
    expect(container.textContent).not.toContain("P117d · 会话内非评分练习");
    expect(container.querySelector('[aria-labelledby="melody-imitation-title"]')).toBeNull();
    expect(container.querySelector('[data-testid="melody-imitation-question-controls"]')).toBeNull();
    expect(container.querySelector('[data-testid="melody-answer-mode"]')).toBeNull();
    expect(container.querySelector('[data-testid="melody-piano-answer"]')).toBeNull();
    expect(container.querySelector('[aria-label="旋律听写参考钢琴"]')).toBeNull();
    expect(Array.from(container.querySelectorAll("button")).some((button) =>
      button.textContent?.trim() === "播放旋律题目"
      || button.textContent?.trim() === "查看本题答案"
      || button.textContent?.trim() === "参考钢琴"
    )).toBe(false);
  });

  it("视唱 reset、next 与同 variant 跨难度都会 remount 并作废旧实例", async () => {
    const container = await renderPanel({ randomQuestion: true });
    await click(findButton(container, "旋律视唱（可见目标）"));
    const currentPanel = () => container.querySelector<HTMLElement>('[aria-labelledby="melody-sight-singing-title"]');
    const first = currentPanel();
    expect(first).not.toBeNull();

    await click(findButton(container, "重置视唱题目"));
    const reset = currentPanel();
    expect(reset).not.toBeNull();
    expect(reset).not.toBe(first);

    await act(async () => vi.advanceTimersByTime(100));
    await click(findButton(container, "下一组视唱"));
    await act(async () => vi.advanceTimersByTime(100));
    const next = currentPanel();
    expect(next).not.toBeNull();
    expect(next).not.toBe(reset);
    expect(container.textContent).toContain("当前为视唱题目 2");

    const difficulty = container.querySelector<HTMLSelectElement>("#melody-sight-singing-difficulty");
    if (!difficulty) throw new Error("找不到视唱难度选择");
    await changeSelect(difficulty, "进阶");
    await act(async () => vi.advanceTimersByTime(100));
    const changedDifficulty = currentPanel();
    expect(changedDifficulty).not.toBeNull();
    expect(changedDifficulty).not.toBe(next);
    expect(container.textContent).not.toContain("本题答案：");
    expect(container.textContent).toContain("当前为视唱题目 1");
  });

  it("全局停止和音频中断都会清除听题资格、填写与迟到完成回调", async () => {
    const container = await renderPanel({ randomQuestion: true });
    await completePlayback(container);
    await click(findButton(positionFields(container)[0]!, "C4"));

    await act(async () => stopAllBrowserAudio());
    expect(container.textContent).toContain("旧填写与检查已清除");
    expect(container.textContent).toContain("状态：等待完整播放");
    expect(findButton(positionFields(container)[0]!, "C4").disabled).toBe(true);
    await act(async () => vi.advanceTimersByTime(20_000));
    expect(findButton(positionFields(container)[0]!, "C4").disabled).toBe(true);

    await click(findButton(container, "播放旋律题目"));
    audioMock.state = "suspended";
    await act(async () => audioMock.stateChangeListener?.(new Event("statechange")));
    expect(container.textContent).toContain("音频时间线被中断");
    expect(findButton(positionFields(container)[0]!, "C4").disabled).toBe(true);

    audioMock.state = "running";
    await completePlayback(container);
    audioMock.state = "suspended";
    await act(async () => audioMock.stateChangeListener?.(new Event("statechange")));
    expect(container.textContent).toContain("音频时间线被中断");
    expect(container.textContent).toContain("状态：等待完整播放");
  });

  it("清空会创建新尝试，迟到的旧琴键音频不会进入下一次接收", async () => {
    const container = await renderPanel({ randomQuestion: true });
    await click(findButton(container, "屏幕钢琴"));
    await completePlayback(container);
    const piano = container.querySelector<HTMLElement>('[data-testid="melody-piano-answer"]');
    if (!piano) throw new Error("找不到屏幕钢琴答案面板");
    await click(findButton(piano, "开始屏幕钢琴作答"));

    browserAudioMock.deferPreparation = true;
    await click(findButton(piano, "C4"));
    await click(findButton(piano, "D4"));
    await click(findButton(piano, "E4"));
    expect(browserAudioMock.prepareResolvers).toHaveLength(3);
    expect(protocolState(container)).toContain("已作答，等待检查");
    expect(protocolState(container)).toContain("第 1 次尝试");
    expect(findButton(piano, "清空并重新听题").disabled).toBe(false);
    await click(findButton(piano, "清空并重新听题"));
    expect(container.textContent).toContain("旧听题资格与 Activity 尝试已作废");
    expect(protocolState(container)).toContain("第 2 次尝试");
    expect(container.textContent).toContain("状态：等待完整播放");

    await resolveDeferredPianoPreparations();
    expect(browserAudioMock.toneStarts).toBe(0);

    await completePlayback(container);
    await click(findButton(piano, "开始屏幕钢琴作答"));
    await click(findButton(piano, "C4"));
    expect(browserAudioMock.toneStarts).toBe(1);
  });

  it("同一输入 run 的三次延迟音频准备都会发声，不会互相误判为过期", async () => {
    const container = await renderPanel({ randomQuestion: true });
    await click(findButton(container, "屏幕钢琴"));
    await completePlayback(container);
    const piano = container.querySelector<HTMLElement>('[data-testid="melody-piano-answer"]');
    if (!piano) throw new Error("找不到屏幕钢琴答案面板");
    await click(findButton(piano, "开始屏幕钢琴作答"));
    browserAudioMock.deferPreparation = true;
    await click(findButton(piano, "C4"));
    await click(findButton(piano, "D4"));
    await click(findButton(piano, "E4"));
    expect(browserAudioMock.toneStarts).toBe(0);
    expect(browserAudioMock.prepareResolvers).toHaveLength(3);

    await resolveDeferredPianoPreparations();
    expect(browserAudioMock.toneStarts).toBe(3);
  });

  it("五线谱答案遵守预览、检查、修改失效、确认文档和主动非评分对照", async () => {
    const container = await renderPanel({ randomQuestion: true });
    expect(findButton(container, "五线谱").getAttribute("aria-checked")).toBe("false");
    await click(findButton(container, "五线谱"));
    const staff = container.querySelector<HTMLElement>('[data-testid="melody-staff-notation-answer"]');
    if (!staff) throw new Error("找不到旋律听写五线谱答案面板");
    const selects = Array.from(staff.querySelectorAll<HTMLSelectElement>("select"));
    expect(selects).toHaveLength(3);
    expect(selects.every((select) => select.disabled)).toBe(true);
    expect(container.textContent).not.toContain("本题答案：");

    await completePlayback(container);
    expect(selects.every((select) => !select.disabled)).toBe(true);
    await changeSelect(selects[0]!, "c4");
    await changeSelect(selects[1]!, "d4");
    await changeSelect(selects[2]!, "e4");
    expect(staff.querySelector('[data-testid="melody-staff-notation-input"] svg')?.getAttribute("aria-label"))
      .toContain("第 1 个音为 C4");
    expect(staff.querySelector('[data-testid="melody-staff-c4-ledger-0"]')).not.toBeNull();
    expect(container.textContent).not.toContain("本题答案：");

    await click(findButton(staff, "检查五线谱草稿"));
    expect(staff.textContent).toContain("已检查，等待确认");
    await changeSelect(selects[2]!, "d4");
    expect(staff.textContent).toContain("待检查草稿");
    expect(container.textContent).toContain("旧检查已失效");
    expect(findButton(staff, "确认当前谱面修订").disabled).toBe(true);

    await changeSelect(selects[2]!, "e4");
    await click(findButton(staff, "检查五线谱草稿"));
    await click(findButton(staff, "确认当前谱面修订"));
    expect(protocolState(container)).toContain("已作答，等待检查");
    expect(staff.textContent).toContain("已确认当前修订");
    expect(container.textContent).not.toContain("本题答案：");

    await click(findButton(staff, "检查本轮五线谱答案"));
    expect(protocolState(container)).toContain("答案已检查");
    expect(protocolState(container)).toContain("非评分证据");
    expect(container.textContent).toContain("本题答案：");
    expect(container.textContent).toContain("你的填写：C4 → D4 → E4");
    expect(container.querySelectorAll('[data-testid="melody-staff-position-comparison"] li'))
      .toHaveLength(3);
  });

  it("挑战五线谱预览保留 C4 加线、F♯4 升号、C5 与清空后完整重听门槛", async () => {
    const container = await renderPanel({ randomQuestion: true });
    const difficulty = container.querySelector<HTMLSelectElement>("#ear-training-melody-difficulty");
    if (!difficulty) throw new Error("找不到旋律听写难度选择");
    await changeSelect(difficulty, "挑战");
    await click(findButton(container, "五线谱"));
    await completePlayback(container);
    const staff = container.querySelector<HTMLElement>('[data-testid="melody-staff-notation-answer"]');
    if (!staff) throw new Error("找不到旋律听写五线谱答案面板");
    const selects = Array.from(staff.querySelectorAll<HTMLSelectElement>("select"));
    await changeSelect(selects[0]!, "c4");
    await changeSelect(selects[1]!, "f-sharp-4");
    await changeSelect(selects[2]!, "c5");
    const previewLabel = staff.querySelector("svg")?.getAttribute("aria-label") ?? "";
    expect(previewLabel).toContain("C4");
    expect(previewLabel).toContain("F♯4");
    expect(previewLabel).toContain("C5");
    expect(staff.querySelector('[data-testid="melody-staff-c4-ledger-0"]')).not.toBeNull();
    expect(staff.querySelector('[data-testid="melody-staff-sharp-1"]')).not.toBeNull();
    expect(staff.querySelector('[data-testid="melody-staff-notehead-2"]')?.getAttribute("cy")).toBe("54");

    await click(findButton(staff, "清空五线谱草稿"));
    expect(container.textContent).toContain("旧听题资格、谱面修订与 Activity 尝试已作废");
    expect(container.textContent).toContain("状态：等待完整播放");
    expect(selects.every((select) => select.disabled)).toBe(true);
    await act(async () => vi.advanceTimersByTime(20_000));
    expect(selects.every((select) => select.disabled)).toBe(true);

    await completePlayback(container);
    const nextSelects = Array.from(staff.querySelectorAll<HTMLSelectElement>("select"));
    await changeSelect(nextSelects[0]!, "c4");
    expect(staff.querySelector("svg")?.getAttribute("aria-label")).toContain("C4");
    await act(async () => stopAllBrowserAudio());
    expect(container.textContent).toContain("旧填写与检查已清除");
    expect(container.textContent).toContain("状态：等待完整播放");
    expect(nextSelects.every((select) => select.disabled)).toBe(true);
    expect(staff.querySelector("svg")?.getAttribute("aria-label")).not.toContain("C4");
  });

  it("五线谱已检查草稿和已确认文档遇到生命周期中断都会失败关闭", async () => {
    const container = await renderPanel({ randomQuestion: true });
    await click(findButton(container, "五线谱"));
    await completePlayback(container);
    const staff = container.querySelector<HTMLElement>('[data-testid="melody-staff-notation-answer"]');
    if (!staff) throw new Error("找不到旋律听写五线谱答案面板");
    let selects = Array.from(staff.querySelectorAll<HTMLSelectElement>("select"));
    await changeSelect(selects[0]!, "c4");
    await changeSelect(selects[1]!, "d4");
    await changeSelect(selects[2]!, "e4");
    await click(findButton(staff, "检查五线谱草稿"));
    expect(staff.textContent).toContain("已检查，等待确认");

    await act(async () => stopAllBrowserAudio());
    expect(container.textContent).toContain("状态：等待完整播放");
    expect(staff.textContent).toContain("等待完整播放");
    expect(findButton(staff, "确认当前谱面修订").disabled).toBe(true);
    expect(findButton(staff, "检查本轮五线谱答案").disabled).toBe(true);
    expect(container.textContent).not.toContain("本题答案：");

    await completePlayback(container);
    selects = Array.from(staff.querySelectorAll<HTMLSelectElement>("select"));
    await changeSelect(selects[0]!, "c4");
    await changeSelect(selects[1]!, "d4");
    await changeSelect(selects[2]!, "e4");
    await click(findButton(staff, "检查五线谱草稿"));
    await click(findButton(staff, "确认当前谱面修订"));
    expect(protocolState(container)).toContain("已作答，等待检查");
    expect(selects.every((select) => select.disabled)).toBe(true);
    expect(findButton(staff, "检查五线谱草稿").disabled).toBe(true);
    expect(findButton(staff, "确认当前谱面修订").disabled).toBe(true);
    expect(findButton(staff, "清空五线谱草稿").disabled).toBe(true);

    audioMock.state = "suspended";
    await act(async () => audioMock.stateChangeListener?.(new Event("statechange")));
    expect(container.textContent).toContain("音频时间线被中断");
    expect(container.textContent).toContain("状态：等待完整播放");
    expect(staff.textContent).toContain("等待完整播放");
    expect(findButton(staff, "检查本轮五线谱答案").disabled).toBe(true);
    expect(protocolState(container)).toContain("题目已确认");
    expect(container.textContent).not.toContain("本题答案：");
  });

  it("简谱答案完整播放后支持真实升号和上方八度点，并经检查确认后主动揭示", async () => {
    const container = await renderPanel({ randomQuestion: true });
    const difficulty = container.querySelector<HTMLSelectElement>("#ear-training-melody-difficulty");
    if (!difficulty) throw new Error("找不到旋律听写难度选择");
    await changeSelect(difficulty, "挑战");
    expect(findButton(container, "简谱").getAttribute("aria-checked")).toBe("false");
    await click(findButton(container, "简谱"));

    const numbered = container.querySelector<HTMLElement>('[data-testid="melody-numbered-notation-answer"]');
    if (!numbered) throw new Error("找不到旋律听写简谱答案面板");
    let selects = Array.from(numbered.querySelectorAll<HTMLSelectElement>("select"));
    expect(selects).toHaveLength(3);
    expect(selects.every((select) => select.disabled)).toBe(true);
    expect(numbered.textContent).toContain("等待完整播放");
    expect(container.textContent).not.toContain("本题答案：");

    await completePlayback(container);
    expect(selects.every((select) => !select.disabled)).toBe(true);
    await changeSelect(selects[0]!, "c4");
    await changeSelect(selects[1]!, "f-sharp-4");
    await changeSelect(selects[2]!, "c5");

    const preview = numbered.querySelector<HTMLElement>('[data-testid="melody-numbered-notation-preview"]');
    if (!preview) throw new Error("找不到简谱草稿预览");
    const previewLabel = preview.getAttribute("aria-label") ?? "";
    expect(previewLabel).toContain("第 1 个音为1（C4）");
    expect(previewLabel).toContain("第 2 个音为升 4（F♯4）");
    expect(previewLabel).toContain("第 3 个音为高音 1（C5）");
    const sharp = numbered.querySelector<HTMLElement>('[data-testid="melody-numbered-sharp-1"]');
    const sharpDegree = numbered.querySelector<HTMLElement>('[data-testid="melody-numbered-degree-1"]');
    const octaveDot = numbered.querySelector<HTMLElement>('[data-testid="melody-numbered-octave-dot-2"]');
    const upperDegree = numbered.querySelector<HTMLElement>('[data-testid="melody-numbered-degree-2"]');
    if (!sharp || !sharpDegree) throw new Error("找不到简谱升号或对应数字");
    expect(sharpDegree?.textContent).toBe("4");
    expect(Boolean(sharp.compareDocumentPosition(sharpDegree) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    if (!octaveDot || !upperDegree) throw new Error("找不到高音简谱八度点或对应数字");
    expect(octaveDot?.className).toContain("absolute");
    expect(octaveDot?.className).toContain("top-0");
    expect(upperDegree?.textContent).toBe("1");
    expect(Boolean(octaveDot.compareDocumentPosition(upperDegree) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(numbered.querySelector('[data-testid="melody-numbered-token-2"]')?.textContent).not.toContain("1·");
    expect(container.textContent).not.toContain("本题答案：");

    await click(findButton(numbered, "清空简谱草稿"));
    expect(container.textContent).toContain("旧听题资格、简谱修订与 Activity 尝试已作废");
    expect(container.textContent).toContain("状态：等待完整播放");
    expect(selects.every((select) => select.disabled)).toBe(true);
    expect(preview.getAttribute("aria-label")).not.toContain("F♯4");

    await completePlayback(container);
    selects = Array.from(numbered.querySelectorAll<HTMLSelectElement>("select"));
    await changeSelect(selects[0]!, "c4");
    await changeSelect(selects[1]!, "f-sharp-4");
    await changeSelect(selects[2]!, "c5");
    await click(findButton(numbered, "检查简谱草稿"));
    expect(numbered.textContent).toContain("已检查，等待确认");

    await changeSelect(selects[2]!, "f-sharp-4");
    expect(numbered.textContent).toContain("待检查草稿");
    expect(container.textContent).toContain("简谱草稿已修改，旧检查已失效");
    expect(findButton(numbered, "确认当前简谱修订").disabled).toBe(true);

    await changeSelect(selects[2]!, "c5");
    await click(findButton(numbered, "检查简谱草稿"));
    await click(findButton(numbered, "确认当前简谱修订"));
    expect(protocolState(container)).toContain("已作答，等待检查");
    expect(numbered.textContent).toContain("已确认当前修订");
    expect(selects.every((select) => select.disabled)).toBe(true);
    expect(findButton(numbered, "检查简谱草稿").disabled).toBe(true);
    expect(findButton(numbered, "确认当前简谱修订").disabled).toBe(true);
    expect(findButton(numbered, "清空简谱草稿").disabled).toBe(true);
    expect(container.textContent).not.toContain("本题答案：");

    await click(findButton(numbered, "检查本轮简谱答案"));
    expect(protocolState(container)).toContain("答案已检查");
    expect(protocolState(container)).toContain("非评分证据");
    expect(container.textContent).toContain("本题答案：");
    expect(container.querySelectorAll('[data-testid="melody-numbered-position-comparison"] li'))
      .toHaveLength(3);
    expect(selects.every((select) => select.disabled)).toBe(true);
    expect(findButton(numbered, "清空简谱草稿").disabled).toBe(true);
    expect(container.textContent).not.toMatch(/总分：|准确率：|等级：|结果：通过|结果：失败/);
  });

  it("简谱已检查草稿和已确认文档遇到生命周期中断都会失败关闭", async () => {
    const container = await renderPanel({ randomQuestion: true });
    await click(findButton(container, "简谱"));
    await completePlayback(container);
    const numbered = container.querySelector<HTMLElement>('[data-testid="melody-numbered-notation-answer"]');
    if (!numbered) throw new Error("找不到旋律听写简谱答案面板");
    let selects = Array.from(numbered.querySelectorAll<HTMLSelectElement>("select"));
    await changeSelect(selects[0]!, "c4");
    await changeSelect(selects[1]!, "d4");
    await changeSelect(selects[2]!, "e4");
    await click(findButton(numbered, "检查简谱草稿"));
    expect(numbered.textContent).toContain("已检查，等待确认");

    await act(async () => stopAllBrowserAudio());
    expect(container.textContent).toContain("状态：等待完整播放");
    expect(numbered.textContent).toContain("等待完整播放");
    expect(findButton(numbered, "确认当前简谱修订").disabled).toBe(true);
    expect(findButton(numbered, "检查本轮简谱答案").disabled).toBe(true);
    expect(numbered.querySelector('[data-testid="melody-numbered-notation-preview"]')?.getAttribute("aria-label"))
      .not.toContain("C4");
    expect(container.textContent).not.toContain("本题答案：");

    await completePlayback(container);
    selects = Array.from(numbered.querySelectorAll<HTMLSelectElement>("select"));
    await changeSelect(selects[0]!, "c4");
    await changeSelect(selects[1]!, "d4");
    await changeSelect(selects[2]!, "e4");
    await click(findButton(numbered, "检查简谱草稿"));
    await click(findButton(numbered, "确认当前简谱修订"));
    expect(protocolState(container)).toContain("已作答，等待检查");
    expect(selects.every((select) => select.disabled)).toBe(true);
    expect(findButton(numbered, "检查简谱草稿").disabled).toBe(true);
    expect(findButton(numbered, "确认当前简谱修订").disabled).toBe(true);
    expect(findButton(numbered, "清空简谱草稿").disabled).toBe(true);

    audioMock.state = "suspended";
    await act(async () => audioMock.stateChangeListener?.(new Event("statechange")));
    expect(container.textContent).toContain("音频时间线被中断");
    expect(container.textContent).toContain("状态：等待完整播放");
    expect(numbered.textContent).toContain("等待完整播放");
    expect(findButton(numbered, "检查本轮简谱答案").disabled).toBe(true);
    expect(protocolState(container)).toContain("题目已确认");
    expect(container.textContent).not.toContain("本题答案：");
  });

  it("五线谱与简谱双向切换会隔离旧资格、草稿、文档和 Activity 尝试", async () => {
    const container = await renderPanel({ randomQuestion: true });
    await click(findButton(container, "五线谱"));
    await completePlayback(container);
    let staff = container.querySelector<HTMLElement>('[data-testid="melody-staff-notation-answer"]');
    if (!staff) throw new Error("找不到旋律听写五线谱答案面板");
    let selects = Array.from(staff.querySelectorAll<HTMLSelectElement>("select"));
    await changeSelect(selects[0]!, "c4");
    await changeSelect(selects[1]!, "d4");
    await changeSelect(selects[2]!, "e4");
    await click(findButton(staff, "检查五线谱草稿"));
    await click(findButton(staff, "确认当前谱面修订"));
    expect(protocolState(container)).toContain("已作答，等待检查");
    const staffAttempt = Number(protocolState(container).match(/第 (\d+) 次尝试/)?.[1]);
    expect(Number.isSafeInteger(staffAttempt)).toBe(true);

    await click(findButton(container, "简谱"));
    expect(container.querySelector('[data-testid="melody-staff-notation-answer"]')).toBeNull();
    let numbered = container.querySelector<HTMLElement>('[data-testid="melody-numbered-notation-answer"]');
    if (!numbered) throw new Error("找不到旋律听写简谱答案面板");
    selects = Array.from(numbered.querySelectorAll<HTMLSelectElement>("select"));
    expect(numbered.textContent).toContain("等待完整播放");
    expect(selects.every((select) => select.disabled)).toBe(true);
    expect(findButton(numbered, "检查本轮简谱答案").disabled).toBe(true);
    expect(numbered.querySelector('[data-testid="melody-numbered-notation-preview"]')?.getAttribute("aria-label"))
      .not.toContain("C4");
    expect(protocolState(container)).toContain("题目已确认");
    const numberedAttempt = Number(protocolState(container).match(/第 (\d+) 次尝试/)?.[1]);
    expect(numberedAttempt).toBeGreaterThan(staffAttempt);

    await completePlayback(container);
    selects = Array.from(numbered.querySelectorAll<HTMLSelectElement>("select"));
    await changeSelect(selects[0]!, "c4");
    await changeSelect(selects[1]!, "d4");
    await changeSelect(selects[2]!, "e4");
    await click(findButton(numbered, "检查简谱草稿"));
    await click(findButton(numbered, "确认当前简谱修订"));
    expect(protocolState(container)).toContain("已作答，等待检查");
    const confirmedNumberedAttempt = Number(protocolState(container).match(/第 (\d+) 次尝试/)?.[1]);
    expect(confirmedNumberedAttempt).toBeGreaterThan(numberedAttempt);

    await click(findButton(container, "五线谱"));
    expect(container.querySelector('[data-testid="melody-numbered-notation-answer"]')).toBeNull();
    staff = container.querySelector<HTMLElement>('[data-testid="melody-staff-notation-answer"]');
    if (!staff) throw new Error("找不到切换后的五线谱答案面板");
    selects = Array.from(staff.querySelectorAll<HTMLSelectElement>("select"));
    expect(staff.textContent).toContain("等待完整播放");
    expect(selects.every((select) => select.disabled)).toBe(true);
    expect(findButton(staff, "检查本轮五线谱答案").disabled).toBe(true);
    expect(staff.querySelector("svg")?.getAttribute("aria-label")).not.toContain("C4");
    expect(protocolState(container)).toContain("题目已确认");
    const nextStaffAttempt = Number(protocolState(container).match(/第 (\d+) 次尝试/)?.[1]);
    expect(nextStaffAttempt).toBeGreaterThan(confirmedNumberedAttempt);
    expect(container.textContent).not.toContain("本题答案：");
  });

  it("复练入口不暴露回唱、视唱、屏幕钢琴、五线谱或简谱模式", async () => {
    const container = await renderPanel();
    expect(container.textContent).not.toContain("P117d · 会话内非评分练习");
    expect(container.textContent).not.toContain("P117e · 会话内非评分练习");
    expect(Array.from(container.querySelectorAll("button")).some(
      (button) => button.textContent?.trim() === "旋律回唱（麦克风）"
        || button.textContent?.trim() === "旋律视唱（可见目标）",
    )).toBe(false);
    expect(Array.from(container.querySelectorAll("button")).some(
      (button) => button.textContent?.trim() === "屏幕钢琴",
    )).toBe(false);
    expect(Array.from(container.querySelectorAll("button")).some(
      (button) => button.textContent?.trim() === "五线谱",
    )).toBe(false);
    expect(Array.from(container.querySelectorAll("button")).some(
      (button) => button.textContent?.trim() === "简谱",
    )).toBe(false);
    expect(container.querySelector('[data-testid="melody-piano-answer"]')).toBeNull();
    expect(container.querySelector('[data-testid="melody-staff-notation-answer"]')).toBeNull();
    expect(container.querySelector('[data-testid="melody-numbered-notation-answer"]')).toBeNull();
    expect(container.querySelector('[aria-labelledby="melody-sight-singing-title"]')).toBeNull();
  });

  it("自定义旋律入口不暴露回唱、视唱、屏幕钢琴、五线谱或简谱文档模式", async () => {
    const customPractice: ResolvedLocalPracticeCustomization = {
      customization: {
        schemaVersion: 1,
        kind: "melody-dictation",
        difficulty: "基础",
        answerOptionIds: ["c4", "d4", "e4"],
      },
      variantIds: ["melody:up-step"],
      answerOptionIds: ["c4", "d4", "e4"],
      subsetOptions: [],
      variantCount: 1,
    };
    const container = await renderPanel({
      initialReviewTarget: undefined,
      randomQuestion: false,
      customPractice,
    });
    expect(container.textContent).not.toContain("P117d · 会话内非评分练习");
    expect(container.textContent).not.toContain("P117e · 会话内非评分练习");
    expect(Array.from(container.querySelectorAll("button")).some(
      (button) => button.textContent?.trim() === "旋律回唱（麦克风）"
        || button.textContent?.trim() === "旋律视唱（可见目标）"
        || button.textContent?.trim() === "屏幕钢琴"
        || button.textContent?.trim() === "五线谱"
        || button.textContent?.trim() === "简谱",
    )).toBe(false);
    expect(container.querySelector('[data-testid="melody-piano-answer"]')).toBeNull();
    expect(container.querySelector('[data-testid="melody-staff-notation-answer"]')).toBeNull();
    expect(container.querySelector('[data-testid="melody-numbered-notation-answer"]')).toBeNull();
    expect(container.querySelector('[aria-labelledby="melody-sight-singing-title"]')).toBeNull();
  });
});
