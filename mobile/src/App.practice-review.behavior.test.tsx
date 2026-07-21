import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createLocalEarTrainingSinglePitchQuestion,
  earTrainingSinglePitches,
} from "../../lib/practice/localEarTrainingSinglePitch";
import {
  createLocalQuestionSchedule,
  getScheduledQuestionIndex,
} from "../../lib/practice/localQuestionScheduler";
import {
  parseLocalPracticeReviewQueue,
  type LocalPracticeReviewTarget,
} from "../../lib/practice/localPracticeReviewQueue";
import type { LegacyLocalPracticeDifficulty } from "../../lib/practice/localPracticeCatalog";
import {
  createLocalEarTrainingChordQuestion,
  getLocalChordAnswerOptions,
  getLocalEarTrainingChordVariantCount,
} from "../../lib/practice/localEarTrainingChords";
import {
  createLocalSeventhChordQuestion,
  getLocalSeventhChordAnswerOptions,
  getLocalSeventhChordVariantCount,
} from "../../lib/practice/localEarTrainingSeventhChords";
import {
  createLocalSeventhChordSpacingQuestion,
  getLocalSeventhChordSpacingAnswerOptions,
  getLocalSeventhChordSpacingVariantCount,
} from "../../lib/practice/localEarTrainingSeventhChordSpacing";
import {
  createLocalHarmonyProgressionQuestion,
  getLocalHarmonyProgressionAnswerOptions,
  getLocalHarmonyProgressionVariantCount,
} from "../../lib/practice/localEarTrainingHarmonyProgressions";
import {
  createLocalScaleModeQuestion,
  getLocalScaleModeAnswerOptions,
  getLocalScaleModeVariantCount,
} from "../../lib/practice/localEarTrainingScaleModes";
import {
  createLocalModulationQuestion,
  getLocalModulationAnswerOptions,
  getLocalModulationVariantCount,
} from "../../lib/practice/localEarTrainingModulations";
import { App } from "./App";
import { deserializeLocalLearningHistory } from "../../lib/learning/learningEventProfile";
import { MOBILE_LEARNING_PROFILE_STORAGE_KEY } from "./runtime/mobileLearningProfileStorage";
import { MOBILE_PRACTICE_REVIEW_STORAGE_KEY } from "./runtime/mobilePracticeReviewStorage";

vi.mock("../../lib/practice/localQuestionScheduler", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../lib/practice/localQuestionScheduler")>();
  return { ...original, createLocalQuestionSeed: () => 0 };
});

let root: Root | null = null;

const flushReact = async () => {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 10));
  });
};

const waitFor = async (predicate: () => boolean, message: string) => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (predicate()) return;
    await flushReact();
  }
  throw new Error(`等待超时：${message}`);
};

const renderApp = async () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<StrictMode><App /></StrictMode>));
  await flushReact();
  return container;
};

const findButton = (container: ParentNode, label: string): HTMLButtonElement => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  if (!button) throw new Error(`找不到按钮：${label}`);
  return button;
};

const findButtonContaining = (container: ParentNode, label: string): HTMLButtonElement => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.includes(label),
  );
  if (!button) throw new Error(`找不到包含文字的按钮：${label}`);
  return button;
};

const findLink = (container: ParentNode, label: string): HTMLAnchorElement => {
  const link = Array.from(container.querySelectorAll("a")).find(
    (candidate) => candidate.textContent?.includes(label),
  );
  if (!link) throw new Error(`找不到链接：${label}`);
  return link;
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

const completeMountedMelodyPlayback = async (container: ParentNode) => {
  class FakeAudioContext {
    state: AudioContextState = "running";
    destination = {};
    get currentTime() { return Date.now() / 1_000; }
    resume = vi.fn(async () => undefined);
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    createOscillator = () => ({
      type: "sine",
      frequency: { value: 0 },
      connect: vi.fn(), start: vi.fn(), stop: vi.fn(), addEventListener: vi.fn(), disconnect: vi.fn(),
    });
    createGain = () => ({
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(), disconnect: vi.fn(),
    });
  }
  vi.stubGlobal("AudioContext", FakeAudioContext);
  vi.useFakeTimers();
  await act(async () => {
    findButton(container, "播放旋律题目").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();
  });
  await act(async () => vi.advanceTimersByTime(5_000));
  vi.useRealTimers();
  vi.unstubAllGlobals();
  expect(container.textContent).toContain("状态：可以填写");
};

const traverseHistory = async (direction: "back" | "forward") => {
  await act(async () => {
    window.history[direction]();
    await new Promise((resolve) => window.setTimeout(resolve, 5));
  });
  await flushReact();
};

const getStoredQueue = () => {
  const serialized = window.localStorage.getItem(MOBILE_PRACTICE_REVIEW_STORAGE_KEY);
  expect(serialized).not.toBeNull();
  const queue = parseLocalPracticeReviewQueue(serialized ?? "");
  expect(queue).not.toBeNull();
  return queue ?? [];
};

type LegacySinglePitchReviewTarget = Omit<
  Extract<LocalPracticeReviewTarget, { kind: "single-pitch" }>,
  "variantId" | "difficulty"
> & { difficulty: LegacyLocalPracticeDifficulty };

const seedQueue = (target: LegacySinglePitchReviewTarget) => {
  window.localStorage.setItem(
    MOBILE_PRACTICE_REVIEW_STORAGE_KEY,
    JSON.stringify({ schemaVersion: 1, catalogVersion: 1, targets: [target] }),
  );
};

const singlePitchAnswerLabel = (
  target: LegacySinglePitchReviewTarget,
) => {
  const questionIndex = getScheduledQuestionIndex(
    createLocalQuestionSchedule(
      earTrainingSinglePitches[target.difficulty].length,
      target.seed,
    ),
    target.sequence,
  );
  return createLocalEarTrainingSinglePitchQuestion({
    difficulty: target.difficulty,
    sequence: target.sequence,
    questionIndex: questionIndex ?? 0,
  }).pitch.label;
};

beforeEach(() => {
  window.history.replaceState(null, "", "#home");
  window.localStorage.clear();
});

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
    root = null;
  }
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Android 本机复练行为", () => {
  it("定制入口校验答案类别并把核对事实记为 custom 会话", async () => {
    const container = await renderApp();
    await click(findLink(container, "定制练习"));
    expect(window.location.hash).toBe("#custom");
    expect(container.textContent).toContain("组合一组自己的听辨练习");
    expect(container.textContent).toContain("配置和题序只用于当前页面会话");

    const categoryInputs = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
    );
    expect(categoryInputs.length).toBeGreaterThanOrEqual(3);
    for (const input of categoryInputs.slice(1)) await click(input);
    expect(findButton(container, "开始当前会话练习").disabled).toBe(true);
    expect(container.textContent).toContain("还需至少选择 2 个答案类别");

    await click(categoryInputs[1]);
    const selectedLabels = Array.from(
      container.querySelectorAll<HTMLLabelElement>("label"),
    ).filter((label) => label.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked)
      .map((label) => label.textContent?.trim() ?? "");
    expect(selectedLabels).toHaveLength(2);
    await click(findButton(container, "开始当前会话练习"));
    await waitFor(
      () => Boolean(container.querySelector("#ear-training-difficulty")),
      "定制音程面板载入",
    );
    expect(container.textContent).toContain("当前定制：音程听辨 · 基础");
    expect(container.querySelector<HTMLSelectElement>("#ear-training-difficulty")?.disabled).toBe(true);
    await waitFor(
      () => !findButton(container, selectedLabels[0]).disabled,
      "定制音程题目可回答",
    );
    await click(findButton(container, selectedLabels[0]));
    await click(findButton(container, "查看本题答案"));

    const history = deserializeLocalLearningHistory(
      window.localStorage.getItem(MOBILE_LEARNING_PROFILE_STORAGE_KEY) ?? "",
    );
    expect(history?.recentEvents.at(-1)?.practiceMode).toBe("custom");
    expect(history?.recentEvents.at(-1)?.skillKind).toBe("interval");
    expect(window.localStorage.getItem(MOBILE_LEARNING_PROFILE_STORAGE_KEY)).not.toMatch(
      /answerOptionIds|intervalDirection|audio|score|grade/i,
    );
  });

  it("答错后写入最小复练信息，不保存选择、答案、声音或评分", async () => {
    const container = await renderApp();
    await click(findLink(container, "单音听辨"));
    await waitFor(() => !findButton(container, "C4").disabled, "单音题目可回答");

    // Expanded catalog seed 0 schedules the short E4 variant first, so C4 is deterministically wrong.
    await click(findButton(container, "C4"));
    expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent).toContain("已作答，等待检查");
    await click(findButton(container, "查看本题答案"));
    expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent).toContain("答案已检查");
    expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent).toContain("非评分证据");
    expect(container.textContent?.match(/本题答案：[A-G][0-9]/)?.[0]).toBe("本题答案：E4");

    const queue = getStoredQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ kind: "single-pitch", difficulty: "基础" });
    expect(queue[0]?.variantId).toBe("pitch:e4:short");
    const serialized = window.localStorage.getItem(MOBILE_PRACTICE_REVIEW_STORAGE_KEY) ?? "";
    expect(serialized).not.toMatch(/selected|answer|audio|score|accuracy|pass|fail/i);
    expect(container.textContent).toContain("已加入本机复练");
  });

  for (const [practiceLabel, answerLabel] of [
    ["音程听辨", "大三度"],
    ["节奏听辨", "四拍均匀"],
  ] as const) {
    it(`${practiceLabel}通过统一活动协议完成作答、检查和非评分反馈`, async () => {
      const container = await renderApp();
      await click(findLink(container, practiceLabel));
      await waitFor(() => !findButton(container, answerLabel).disabled, `${practiceLabel}题目可回答`);

      if (practiceLabel === "节奏听辨") {
        expect(container.querySelector<HTMLSelectElement>("#rhythm-activity-mode")?.value)
          .toBe("choice");
        expect(container.textContent).not.toContain("P116a · 本地节奏视读");
        expect(container.textContent).not.toContain("P116d · 本地节奏听写");
      }

      await click(findButton(container, answerLabel));
      expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent)
        .toContain("已作答，等待检查");
      await click(findButton(container, "查看本题答案"));
      expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent)
        .toContain("答案已检查");
      expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent)
        .toContain("非评分证据");
    });
  }

  it("节奏听写以单活动模式挂载，确认前不泄露同题可见目标", async () => {
    const container = await renderApp();
    await click(findLink(container, "节奏听辨"));
    const activityMode = container.querySelector<HTMLSelectElement>("#rhythm-activity-mode");
    expect(activityMode).not.toBeNull();

    await act(async () => {
      if (!activityMode) return;
      activityMode.value = "dictation";
      activityMode.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flushReact();

    expect(container.textContent).toContain("P116d · 本地节奏听写");
    expect(container.textContent).toContain("听一小节，写成可检查的节奏草稿");
    expect(container.textContent).toContain("当前题目：基础 · 4/4 ·");
    expect(container.textContent).not.toContain("P116a · 本地节奏视读");
    expect(container.textContent).not.toContain("P116c · 本地节奏找错");
    expect(container.querySelector('[data-testid="rhythm-sight-reading-target"]')).toBeNull();
    expect(container.querySelector('[data-testid="rhythm-error-finding-target"]')).toBeNull();
    expect(container.querySelector('[data-testid="rhythm-dictation-result"]')).toBeNull();
    expect(container.textContent).not.toContain("题目事件对照：");

    const difficulty = container.querySelector<HTMLSelectElement>("#ear-training-rhythm-difficulty");
    expect(difficulty?.value).toBe("基础");
    await act(async () => {
      if (!difficulty) return;
      difficulty.value = "挑战";
      difficulty.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flushReact();
    expect(container.textContent).toContain("当前题目：挑战 · 4/4 ·");
    expect(container.textContent).toContain("P116d · 本地节奏听写");
    expect(container.querySelector('[data-testid="rhythm-dictation-result"]')).toBeNull();
  });

  it("节奏复练固定题不提供专业活动切换，避免把已知目标复用于隐藏活动", async () => {
    window.localStorage.setItem(
      MOBILE_PRACTICE_REVIEW_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 9,
        catalogVersion: 9,
        targets: [{
          kind: "rhythm",
          difficulty: "基础",
          seed: 0,
          sequence: 0,
          variantId: "rhythm:front-dense",
        }],
      }),
    );
    const container = await renderApp();
    await click(findButton(container, "节奏听辨 · 基础复练 1"));

    expect(container.querySelector("#rhythm-activity-mode")).toBeNull();
    expect(container.textContent).not.toContain("P116a · 本地节奏视读");
    expect(container.textContent).not.toContain("P116d · 本地节奏听写");
    expect(container.textContent).toContain("返回随机练习");
  });

  it("旋律听写按音符顺序通过统一活动协议完成作答和检查", async () => {
    const container = await renderApp();
    await click(findLink(container, "旋律听写"));
    await waitFor(() => !findButton(container, "播放旋律题目").disabled, "旋律听写题目可播放");
    expect(findButton(container, "屏幕钢琴")).toBeTruthy();
    expect(findButton(container, "C4").disabled).toBe(true);

    await completeMountedMelodyPlayback(container);

    const positionFields = Array.from(container.querySelectorAll("fieldset")).filter(
      (fieldset) => fieldset.querySelector("legend")?.textContent?.startsWith("第 "),
    );
    expect(positionFields).toHaveLength(3);
    for (const fieldset of positionFields) {
      await click(findButton(fieldset, "C4"));
    }

    expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent)
      .toContain("已作答，等待检查");
    await click(findButton(container, "查看本题答案"));
    expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent)
      .toContain("答案已检查");
    expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent)
      .toContain("非评分证据");
  });

  it("旋律听写屏幕钢琴检查只把稳定题目标识与最小学习事实写入本机", async () => {
    const container = await renderApp();
    await click(findLink(container, "旋律听写"));
    await waitFor(() => !findButton(container, "播放旋律题目").disabled, "旋律听写题目可播放");
    await click(findButton(container, "屏幕钢琴"));
    await completeMountedMelodyPlayback(container);
    await click(findButton(container, "开始屏幕钢琴作答"));
    const piano = container.querySelector<HTMLElement>('[data-testid="melody-piano-answer"]');
    if (!piano) throw new Error("找不到旋律听写屏幕钢琴答案面板");
    await click(findButton(piano, "C4"));
    await click(findButton(piano, "C4"));
    await click(findButton(piano, "C4"));
    await click(findButton(container, "检查本轮钢琴答案"));

    const queue = getStoredQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ kind: "melody-dictation", difficulty: "基础" });
    const queueSerialized = window.localStorage.getItem(MOBILE_PRACTICE_REVIEW_STORAGE_KEY) ?? "";
    expect(queueSerialized).not.toMatch(/noteIds|piano|answer|audio|score|grade/i);

    const historySerialized = window.localStorage.getItem(MOBILE_LEARNING_PROFILE_STORAGE_KEY) ?? "";
    const history = deserializeLocalLearningHistory(historySerialized);
    expect(history?.recentEvents.at(-1)?.skillKind).toBe("melody-dictation");
    expect(historySerialized).not.toMatch(/noteIds|piano|ActivitySession|checkEvidence|audio/i);
  });

  it("旋律听写五线谱确认检查只写稳定题目标识，不保存草稿或谱面文档", async () => {
    const container = await renderApp();
    await click(findLink(container, "旋律听写"));
    await waitFor(() => !findButton(container, "播放旋律题目").disabled, "旋律听写题目可播放");
    await click(findButton(container, "五线谱"));
    await completeMountedMelodyPlayback(container);
    const staff = container.querySelector<HTMLElement>('[data-testid="melody-staff-notation-answer"]');
    if (!staff) throw new Error("找不到旋律听写五线谱答案面板");
    const selects = Array.from(staff.querySelectorAll<HTMLSelectElement>("select"));
    for (const select of selects) await changeSelect(select, "c4");
    await click(findButton(staff, "检查五线谱草稿"));
    await click(findButton(staff, "确认当前谱面修订"));
    expect(container.textContent).not.toContain("本题答案：");
    await click(findButton(staff, "检查本轮五线谱答案"));

    const queue = getStoredQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ kind: "melody-dictation", difficulty: "基础" });
    const queueSerialized = window.localStorage.getItem(MOBILE_PRACTICE_REVIEW_STORAGE_KEY) ?? "";
    expect(queueSerialized).not.toMatch(/noteIds|staff|notation|document|draft|answer|audio|score|grade/i);

    const historySerialized = window.localStorage.getItem(MOBILE_LEARNING_PROFILE_STORAGE_KEY) ?? "";
    const history = deserializeLocalLearningHistory(historySerialized);
    expect(history?.recentEvents.at(-1)?.skillKind).toBe("melody-dictation");
    expect(historySerialized).not.toMatch(/noteIds|staff|notation|document|draft|ActivitySession|checkEvidence|audio/i);
  });

  it("音程比较在真实挂载入口完成双维判断，并只把比较事实写入本机画像", async () => {
    const container = await renderApp();
    await click(findLink(container, "音程比较与模唱"));
    await waitFor(() => !findButton(container, "第一组更大").disabled, "音程比较题目可回答");

    await click(findButton(container, "第一组更大"));
    await click(findButton(container, "两组都上行"));
    expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent)
      .toContain("已作答，等待检查");
    await click(findButton(container, "查看比较答案"));

    expect(container.textContent).toContain("可选：非评分模唱反馈");
    expect(container.textContent).toContain("不是分数、等级、通过／失败或专业声乐评估");
    const serialized = window.localStorage.getItem(MOBILE_LEARNING_PROFILE_STORAGE_KEY) ?? "";
    const storedHistory = deserializeLocalLearningHistory(serialized);
    expect(storedHistory?.recentEvents.at(-1)?.skillKind).toBe("interval-comparison");
    expect(serialized).not.toContain("recording");
    expect(serialized).not.toContain("evidence");
  });

  it("从首页打开复练题并答对后移除该题", async () => {
    const target = { kind: "single-pitch", difficulty: "基础", seed: 0, sequence: 0 } as const;
    seedQueue(target);
    const container = await renderApp();

    const migratedEnvelope = JSON.parse(
      window.localStorage.getItem(MOBILE_PRACTICE_REVIEW_STORAGE_KEY) ?? "{}",
    ) as { schemaVersion?: number; catalogVersion?: number; targets?: Array<Record<string, unknown>> };
    expect(migratedEnvelope.schemaVersion).toBe(9);
    expect(migratedEnvelope.catalogVersion).toBe(9);
    expect(migratedEnvelope.targets?.[0]?.variantId).toBe("pitch:g4");

    expect(container.textContent).toContain("本机复练（1）");
    await click(findButton(container, "单音听辨 · 基础复练 1"));
    await click(findButton(container, singlePitchAnswerLabel(target)));
    await click(findButton(container, "查看本题答案"));

    expect(container.textContent).toContain("本题答案：G4");
    expect(getStoredQueue()).toHaveLength(0);
    expect(container.textContent).toContain("本题已从本机复练中移除");
  });

  it("v2 复练以稳定题目标识为准，不受旧 seed 对应题序影响", async () => {
    window.localStorage.setItem(
      MOBILE_PRACTICE_REVIEW_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 2,
        catalogVersion: 2,
        targets: [{
          kind: "single-pitch",
          difficulty: "基础",
          seed: 0,
          sequence: 0,
          variantId: "pitch:c4",
        }],
      }),
    );
    const container = await renderApp();

    await click(findButton(container, "单音听辨 · 基础复练 1"));
    await click(findButton(container, "C4"));
    await click(findButton(container, "查看本题答案"));

    expect(container.textContent).toContain("本题答案：C4");
    expect(getStoredQueue()).toHaveLength(0);
    expect(container.textContent).toContain("本题已从本机复练中移除");
  });

  it("v1 迁移写回失败时保留可用队列和原始记录", async () => {
    const target = { kind: "single-pitch", difficulty: "基础", seed: 0, sequence: 0 } as const;
    seedQueue(target);
    const original = window.localStorage.getItem(MOBILE_PRACTICE_REVIEW_STORAGE_KEY);
    const setItem = vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });

    const container = await renderApp();

    expect(setItem).toHaveBeenCalled();
    expect(container.textContent).toContain("本机复练旧记录已恢复，但升级保存失败；本次仍可继续复练");
    expect(container.textContent).toContain("本机复练（1）");
    expect(window.localStorage.getItem(MOBILE_PRACTICE_REVIEW_STORAGE_KEY)).toBe(original);

    await click(findButton(container, "单音听辨 · 基础复练 1"));
    await click(findButton(container, "G4"));
    await click(findButton(container, "查看本题答案"));
    expect(container.textContent).toContain("本题答案：G4");
    expect(window.localStorage.getItem(MOBILE_PRACTICE_REVIEW_STORAGE_KEY)).toBe(original);
    setItem.mockRestore();
  });

  it("答对移除保存失败时不伪称已持久移除", async () => {
    const original = JSON.stringify({
      schemaVersion: 9,
      catalogVersion: 9,
      targets: [{
        kind: "single-pitch",
        difficulty: "基础",
        seed: 0,
        sequence: 0,
        variantId: "pitch:c4",
      }],
    });
    window.localStorage.setItem(MOBILE_PRACTICE_REVIEW_STORAGE_KEY, original);
    const container = await renderApp();
    const setItem = vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });

    await click(findButton(container, "单音听辨 · 基础复练 1"));
    await click(findButton(container, "C4"));
    await click(findButton(container, "查看本题答案"));

    expect(setItem).toHaveBeenCalled();
    expect(container.textContent).toContain("本机复练记录保存失败，本次练习仍可继续");
    expect(container.textContent).not.toContain("本题已从本机复练中移除");
    expect(window.localStorage.getItem(MOBILE_PRACTICE_REVIEW_STORAGE_KEY)).toBe(original);
    setItem.mockRestore();
  });

  it("清除记录必须经过二次确认，取消保留，确认才清除", async () => {
    seedQueue({ kind: "single-pitch", difficulty: "基础", seed: 0, sequence: 0 });
    const container = await renderApp();

    await click(findButton(container, "清除记录"));
    expect(container.textContent).toContain("确认清除全部本机复练记录？");
    await click(findButton(container, "取消"));
    expect(container.textContent).toContain("本机复练（1）");
    expect(getStoredQueue()).toHaveLength(1);

    await click(findButton(container, "清除记录"));
    await click(findButton(container, "确认清除"));
    expect(window.localStorage.getItem(MOBILE_PRACTICE_REVIEW_STORAGE_KEY)).toBeNull();
    expect(container.textContent).toContain("本机复练记录已清除");
    expect(container.textContent).toContain("本机复练（0）");
  });

  it("核对结果生成非评分本机画像，建议可关闭且画像可独立重置", async () => {
    const container = await renderApp();
    await click(findLink(container, "单音听辨"));
    await waitFor(() => !findButton(container, "C4").disabled, "单音题目可回答");
    await click(findButton(container, "C4"));
    await click(findButton(container, "查看本题答案"));
    await click(findLink(container, "返回练习首页"));

    expect(container.textContent).toContain("已核对 1 次；其中正确 0 次、错误 1 次");
    expect(container.textContent).toContain("本机事实，不是能力评分");
    expect(container.textContent).toContain("建议下一步：单音听辨 · 基础");
    const serialized = window.localStorage.getItem(MOBILE_LEARNING_PROFILE_STORAGE_KEY);
    expect(serialized).not.toBeNull();
    const history = deserializeLocalLearningHistory(serialized ?? "");
    expect(history?.profile.incorrectCount).toBe(1);
    expect(serialized).not.toMatch(/selected|recording|audio|email|score|grade|accuracyPercentage/i);

    await click(findButton(container, "关闭建议"));
    expect(container.textContent).toContain("复练建议已关闭；练习和复练队列不受影响");
    await click(findButton(container, "重置画像"));
    expect(container.textContent).toContain("确认清空本机学习画像与事件？");
    await click(findButton(container, "确认重置"));

    const resetSerialized = window.localStorage.getItem(MOBILE_LEARNING_PROFILE_STORAGE_KEY);
    expect(deserializeLocalLearningHistory(resetSerialized ?? "")?.profile.checkedCount).toBe(0);
    expect(container.textContent).toContain("已核对 0 次；其中正确 0 次、错误 0 次");
    expect(container.textContent).toContain("本机复练（1）");
    expect(getStoredQueue()).toHaveLength(1);
    expect(findButton(container, "开启建议").getAttribute("aria-pressed")).toBe("false");
  });

  it("和弦与转位完成三难度作答、解释、复练和画像闭环", async () => {
    const count = getLocalEarTrainingChordVariantCount("基础");
    const questionIndex = getScheduledQuestionIndex(createLocalQuestionSchedule(count, 0), 0) ?? 0;
    const question = createLocalEarTrainingChordQuestion({
      difficulty: "基础",
      sequence: 0,
      questionIndex,
    });
    const options = getLocalChordAnswerOptions("基础");
    const wrongOption = options.find((option) => option.id !== question.answerOptionId);
    expect(wrongOption).toBeDefined();

    const container = await renderApp();
    await click(findLink(container, "和弦与转位"));
    await waitFor(() => Boolean(container.querySelector("#chord-training-difficulty")), "和弦面板载入");
    const difficulty = container.querySelector<HTMLSelectElement>("#chord-training-difficulty");
    expect(Array.from(difficulty?.options ?? []).map((option) => option.value)).toEqual([
      "基础", "进阶", "挑战",
    ]);
    expect(container.textContent).toContain("本难度共 8 个版本化组合");
    await waitFor(
      () => !findButton(container, wrongOption?.label ?? "").disabled,
      "和弦题目可回答",
    );
    await click(findButton(container, wrongOption?.label ?? ""));
    await click(findButton(container, "查看本题答案"));
    expect(container.textContent).toContain(`本题答案：${options.find((option) => option.id === question.answerOptionId)?.label}`);
    expect(container.textContent).toContain("非评分答案说明");
    await click(findLink(container, "返回练习首页"));

    const queue = getStoredQueue();
    expect(queue[0]).toMatchObject({
      kind: "chord-inversion",
      difficulty: "基础",
      playbackMode: "和声",
      variantId: question.variantId,
    });
    const storedHistory = deserializeLocalLearningHistory(
      window.localStorage.getItem(MOBILE_LEARNING_PROFILE_STORAGE_KEY) ?? "",
    );
    expect(storedHistory?.profile.skillFacts.find(
      (fact) => fact.skillKind === "chord-inversion",
    )?.incorrectCount).toBe(1);

    await click(findButton(container, "和弦与转位 · 基础复练 1"));
    expect(container.querySelector<HTMLSelectElement>("#chord-training-difficulty")?.disabled).toBe(true);
    await click(findButton(container, options.find((option) => option.id === question.answerOptionId)?.label ?? ""));
    await click(findButton(container, "查看本题答案"));
    expect(getStoredQueue()).toHaveLength(0);
    expect(container.textContent).toContain("本题已从本机复练中移除");
  });

  it("七和弦从 Android 中文入口完成答错入队、复练路由和答对移除", async () => {
    const count = getLocalSeventhChordVariantCount("基础");
    const questionIndex = getScheduledQuestionIndex(createLocalQuestionSchedule(count, 0), 0) ?? 0;
    const question = createLocalSeventhChordQuestion({
      difficulty: "基础",
      sequence: 0,
      questionIndex,
    });
    const options = getLocalSeventhChordAnswerOptions("基础");
    const correctOption = options.find((option) => option.id === question.answerOptionId);
    const wrongOption = options.find((option) => option.id !== question.answerOptionId);
    expect(correctOption).toBeDefined();
    expect(wrongOption).toBeDefined();

    const container = await renderApp();
    expect(container.textContent).toContain("七和弦听辨");
    expect(container.textContent).toContain("听四个音，辨认七和弦性质与最低音位置");
    await click(findLink(container, "七和弦听辨"));
    await waitFor(
      () => Boolean(container.querySelector("#seventh-difficulty")),
      "七和弦面板载入",
    );
    expect(window.location.hash).toBe("#seventh");
    expect(container.textContent).toContain("七和弦性质与转位听辨");
    expect(Array.from(
      container.querySelector<HTMLSelectElement>("#seventh-difficulty")?.options ?? [],
    ).map((option) => option.value)).toEqual(["基础", "进阶", "挑战"]);
    expect(container.textContent).toContain("本难度共 48 个稳定组合");
    await waitFor(
      () => !findButton(container, wrongOption?.label ?? "").disabled,
      "七和弦题目可回答",
    );
    await click(findButton(container, wrongOption?.label ?? ""));
    await click(findButton(container, "查看本题答案"));
    expect(container.textContent).toContain(`本题答案：${correctOption?.label}`);
    expect(container.textContent).toContain("非评分答案说明");
    await click(findLink(container, "返回练习首页"));

    expect(window.location.hash).toBe("#home");
    expect(container.textContent).toContain("七和弦听辨 · 基础");
    expect(getStoredQueue()).toEqual([
      expect.objectContaining({
        kind: "seventh-chord",
        difficulty: "基础",
        variantId: question.variantId,
      }),
    ]);

    await click(findButton(container, "七和弦听辨 · 基础复练 1"));
    await waitFor(
      () => Boolean(container.querySelector("#seventh-difficulty")),
      "七和弦复练路由载入",
    );
    expect(window.location.hash).toBe("#seventh");
    expect(container.querySelector<HTMLSelectElement>("#seventh-difficulty")?.disabled).toBe(true);
    await click(findButton(container, correctOption?.label ?? ""));
    await click(findButton(container, "查看本题答案"));
    expect(getStoredQueue()).toHaveLength(0);
    expect(container.textContent).toContain("本题已从本机复练中移除");
  });

  it("七和弦排列完成中文入口、答错入队、复练锁定、答对移除与画像闭环", async () => {
    const count = getLocalSeventhChordSpacingVariantCount("基础");
    const questionIndex = getScheduledQuestionIndex(createLocalQuestionSchedule(count, 0), 0) ?? 0;
    const question = createLocalSeventhChordSpacingQuestion({ difficulty: "基础", sequence: 0, questionIndex });
    const options = getLocalSeventhChordSpacingAnswerOptions();
    const correctOption = options.find((option) => option.id === question.answerOptionId);
    const wrongOption = options.find((option) => option.id !== question.answerOptionId);
    expect(correctOption).toBeDefined();
    expect(wrongOption).toBeDefined();

    const container = await renderApp();
    expect(container.textContent).toContain("七和弦排列");
    expect(container.textContent).toContain("听四个音，辨认低音上方声部的开放或密集排列");
    await click(findLink(container, "七和弦排列"));
    await waitFor(() => Boolean(container.querySelector("#seventh-spacing-difficulty")), "七和弦排列面板载入");
    expect(window.location.hash).toBe("#seventh-spacing");
    expect(container.textContent).toContain("七和弦开放与密集排列听辨");
    expect(Array.from(container.querySelector<HTMLSelectElement>("#seventh-spacing-difficulty")?.options ?? []).map((option) => option.value)).toEqual(["基础", "进阶", "挑战"]);
    expect(container.textContent).toContain("本难度共 48 个稳定组合");
    await waitFor(() => !findButton(container, wrongOption?.label ?? "").disabled, "七和弦排列题目可回答");
    await click(findButton(container, wrongOption?.label ?? ""));
    await click(findButton(container, "查看本题答案"));
    expect(container.textContent).toContain(`本题答案：${correctOption?.label}`);
    expect(container.textContent).toContain("非评分答案说明");
    await click(findLink(container, "返回练习首页"));

    expect(window.location.hash).toBe("#home");
    expect(getStoredQueue()).toEqual([expect.objectContaining({
      kind: "seventh-chord-spacing",
      difficulty: "基础",
      variantId: question.variantId,
    })]);
    const storedHistory = deserializeLocalLearningHistory(window.localStorage.getItem(MOBILE_LEARNING_PROFILE_STORAGE_KEY) ?? "");
    expect(storedHistory?.profile.skillFacts.find((fact) => fact.skillKind === "seventh-chord-spacing")?.incorrectCount).toBe(1);

    await click(findButton(container, "七和弦排列 · 基础复练 1"));
    await waitFor(() => Boolean(container.querySelector("#seventh-spacing-difficulty")), "七和弦排列复练路由载入");
    expect(window.location.hash).toBe("#seventh-spacing");
    expect(container.querySelector<HTMLSelectElement>("#seventh-spacing-difficulty")?.disabled).toBe(true);
    await click(findButton(container, correctOption?.label ?? ""));
    await click(findButton(container, "查看本题答案"));
    expect(getStoredQueue()).toHaveLength(0);
    expect(container.textContent).toContain("本题已从本机复练中移除");
  });

  it("和声进行完成三难度作答、解释、复练和画像闭环", async () => {
    const count = getLocalHarmonyProgressionVariantCount("基础");
    const questionIndex = getScheduledQuestionIndex(createLocalQuestionSchedule(count, 0), 0) ?? 0;
    const question = createLocalHarmonyProgressionQuestion({ difficulty: "基础", sequence: 0, questionIndex });
    const options = getLocalHarmonyProgressionAnswerOptions("基础");
    const wrongOption = options.find((option) => option.id !== question.answerOptionId);
    expect(wrongOption).toBeDefined();

    const container = await renderApp();
    await click(findLink(container, "和声进行"));
    await waitFor(() => Boolean(container.querySelector("#progression-training-difficulty")), "和声进行面板载入");
    expect(Array.from(container.querySelector<HTMLSelectElement>("#progression-training-difficulty")?.options ?? []).map((option) => option.value)).toEqual(["基础", "进阶", "挑战"]);
    expect(container.textContent).toContain("本难度共 8 个版本化组合");
    expect(container.textContent).toContain("不改变答案，也不单独判分");
    await waitFor(() => !findButton(container, wrongOption?.label ?? "").disabled, "和声进行题目可回答");
    expect(findButton(container, "只听低音线索").disabled).toBe(false);
    expect(findButton(container, "只听高声部线索").disabled).toBe(false);
    await click(findButton(container, wrongOption?.label ?? ""));
    await click(findButton(container, "查看本题答案"));
    expect(container.textContent).toContain(`本题答案：${options.find((option) => option.id === question.answerOptionId)?.label}`);
    expect(container.textContent).toContain(question.voiceLeadingCue.explanation);
    await click(findLink(container, "返回练习首页"));

    expect(getStoredQueue()[0]).toMatchObject({ kind: "harmony-progression", difficulty: "基础", variantId: question.variantId });
    const storedHistory = deserializeLocalLearningHistory(window.localStorage.getItem(MOBILE_LEARNING_PROFILE_STORAGE_KEY) ?? "");
    expect(storedHistory?.profile.skillFacts.find((fact) => fact.skillKind === "harmony-progression")?.incorrectCount).toBe(1);

    await click(findButton(container, "和声进行 · 基础复练 1"));
    expect(container.querySelector<HTMLSelectElement>("#progression-training-difficulty")?.disabled).toBe(true);
    await click(findButton(container, options.find((option) => option.id === question.answerOptionId)?.label ?? ""));
    await click(findButton(container, "查看本题答案"));
    expect(getStoredQueue()).toHaveLength(0);
  });

  it("调制听辨完成中文入口、三难度、复练和画像闭环", async () => {
    const count = getLocalModulationVariantCount("基础");
    const questionIndex = getScheduledQuestionIndex(createLocalQuestionSchedule(count, 0), 0) ?? 0;
    const question = createLocalModulationQuestion({ difficulty: "基础", sequence: 0, questionIndex });
    const options = getLocalModulationAnswerOptions("基础");
    const correctOption = options.find((option) => option.id === question.answerOptionId);
    const wrongOption = options.find((option) => option.id !== question.answerOptionId);
    expect(correctOption).toBeDefined();
    expect(wrongOption).toBeDefined();

    const container = await renderApp();
    expect(container.textContent).toContain("调制听辨");
    expect(container.textContent).toContain("听依次播放的和弦，判断音乐从当前调性转向哪里");
    await click(findLink(container, "调制听辨"));
    await waitFor(
      () => Boolean(container.querySelector("#modulation-training-difficulty")),
      "调制听辨面板载入",
    );
    expect(window.location.hash).toBe("#modulation");
    expect(container.textContent).toContain("调制方向听辨");
    expect(Array.from(
      container.querySelector<HTMLSelectElement>("#modulation-training-difficulty")?.options ?? [],
    ).map((option) => option.value)).toEqual(["基础", "进阶", "挑战"]);
    expect(container.textContent).toContain("本难度共 48 个版本化组合");
    await waitFor(
      () => !findButton(container, wrongOption?.label ?? "").disabled,
      "调制听辨题目可回答",
    );
    await click(findButton(container, wrongOption?.label ?? ""));
    await click(findButton(container, "查看本题答案"));
    expect(container.textContent).toContain(`本题答案：${correctOption?.label}`);
    expect(container.textContent).toContain("非评分答案说明");
    await click(findLink(container, "返回练习首页"));

    expect(window.location.hash).toBe("#home");
    expect(getStoredQueue()[0]).toMatchObject({
      kind: "modulation",
      difficulty: "基础",
      variantId: question.variantId,
    });
    const storedHistory = deserializeLocalLearningHistory(
      window.localStorage.getItem(MOBILE_LEARNING_PROFILE_STORAGE_KEY) ?? "",
    );
    expect(storedHistory?.profile.skillFacts.find(
      (fact) => fact.skillKind === "modulation",
    )?.incorrectCount).toBe(1);

    await click(findButton(container, "调制听辨 · 基础复练 1"));
    await waitFor(
      () => Boolean(container.querySelector("#modulation-training-difficulty")),
      "调制听辨复练路由载入",
    );
    expect(window.location.hash).toBe("#modulation");
    expect(container.querySelector<HTMLSelectElement>("#modulation-training-difficulty")?.disabled).toBe(true);
    await click(findButton(container, correctOption?.label ?? ""));
    await click(findButton(container, "查看本题答案"));
    expect(getStoredQueue()).toHaveLength(0);
    expect(container.textContent).toContain("本题已从本机复练中移除");
  });

  it("音阶与调式完成三难度作答、解释、复练和画像闭环", async () => {
    const count = getLocalScaleModeVariantCount("基础");
    const questionIndex = getScheduledQuestionIndex(createLocalQuestionSchedule(count, 0), 0) ?? 0;
    const question = createLocalScaleModeQuestion({ difficulty: "基础", sequence: 0, questionIndex });
    const options = getLocalScaleModeAnswerOptions("基础");
    const wrongOption = options.find((option) => option.id !== question.answerOptionId);
    expect(wrongOption).toBeDefined();

    const container = await renderApp();
    await click(findLink(container, "音阶与调式"));
    await waitFor(() => Boolean(container.querySelector("#scale-mode-difficulty")), "音阶与调式面板载入");
    expect(Array.from(container.querySelector<HTMLSelectElement>("#scale-mode-difficulty")?.options ?? []).map((option) => option.value)).toEqual(["基础", "进阶", "挑战"]);
    expect(container.textContent).toContain("本难度共 48 个版本化组合");
    await waitFor(() => !findButton(container, wrongOption?.label ?? "").disabled, "音阶与调式题目可回答");
    await click(findButton(container, wrongOption?.label ?? ""));
    await click(findButton(container, "查看本题答案"));
    expect(container.textContent).toContain(`本题答案：${options.find((option) => option.id === question.answerOptionId)?.label}`);
    expect(container.textContent).toContain("特征");
    await click(findLink(container, "返回练习首页"));

    expect(getStoredQueue()[0]).toMatchObject({ kind: "scale-mode", difficulty: "基础", variantId: question.variantId });
    const storedHistory = deserializeLocalLearningHistory(window.localStorage.getItem(MOBILE_LEARNING_PROFILE_STORAGE_KEY) ?? "");
    expect(storedHistory?.profile.skillFacts.find((fact) => fact.skillKind === "scale-mode")?.incorrectCount).toBe(1);

    await click(findButton(container, "音阶与调式 · 基础复练 1"));
    expect(container.querySelector<HTMLSelectElement>("#scale-mode-difficulty")?.disabled).toBe(true);
    await click(findButton(container, options.find((option) => option.id === question.answerOptionId)?.label ?? ""));
    await click(findButton(container, "查看本题答案"));
    expect(getStoredQueue()).toHaveLength(0);
  });

  it("hash 前进后退不会复活已经离开的复练目标", async () => {
    const target = { kind: "single-pitch", difficulty: "基础", seed: 0, sequence: 0 } as const;
    seedQueue(target);
    const container = await renderApp();

    await click(findButton(container, "单音听辨 · 基础复练 1"));
    expect(container.textContent).toContain("返回随机练习");
    await traverseHistory("back");
    expect(container.textContent).toContain("本机复练（1）");
    await traverseHistory("forward");

    expect(container.textContent).not.toContain("返回随机练习");
    expect(container.textContent).toContain("下一题");
  });

  it("setItem 失败不阻断练习，并显示中文提示", async () => {
    const setItem = vi
      .spyOn(window.localStorage, "setItem")
      .mockImplementation(() => {
        throw new Error("quota");
      });
    const container = await renderApp();
    await click(findLink(container, "单音听辨"));
    await waitFor(() => !findButton(container, "C4").disabled, "单音题目可回答");

    await click(findButton(container, "C4"));
    await click(findButton(container, "查看本题答案"));

    expect(setItem).toHaveBeenCalled();
    expect(container.textContent).toContain("本机复练记录保存失败，本次练习仍可继续");
    expect(container.textContent).toContain("本题答案：");
    setItem.mockRestore();
  });

  it("removeItem 失败保留界面队列，并显示中文提示", async () => {
    seedQueue({ kind: "single-pitch", difficulty: "基础", seed: 0, sequence: 0 });
    const removeItem = vi
      .spyOn(window.localStorage, "removeItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    const container = await renderApp();

    await click(findButton(container, "清除记录"));
    await click(findButton(container, "确认清除"));

    expect(removeItem).toHaveBeenCalledWith(MOBILE_PRACTICE_REVIEW_STORAGE_KEY);
    expect(container.textContent).toContain("本机复练记录清除失败，本次练习仍可继续");
    expect(container.textContent).toContain("本机复练（1）");
  });

  it("可进入独立本地参考钢琴页，浏览历史前进后退仍保持正确页面", async () => {
    const container = await renderApp();
    await click(findLink(container, "本地参考钢琴"));

    expect(container.textContent).toContain("Splendid Grand Piano 三层采样");
    expect(container.querySelectorAll("[data-piano-key]")).toHaveLength(13);
    await traverseHistory("back");
    expect(container.textContent).toContain("选择练习");
    await traverseHistory("forward");
    expect(container.querySelectorAll("[data-piano-key]")).toHaveLength(13);
  });

  for (const [practiceLabel, selectId] of [
    ["单音听辨", "ear-training-single-pitch-difficulty"],
    ["音程听辨", "ear-training-difficulty"],
    ["节奏听辨", "ear-training-rhythm-difficulty"],
    ["旋律听写", "ear-training-melody-difficulty"],
  ] as const) {
    it(`${practiceLabel}在 Android 入口提供基础、进阶、挑战三档`, async () => {
      const container = await renderApp();
      await click(findLink(container, practiceLabel));

      const difficultySelect = container.querySelector<HTMLSelectElement>(`#${selectId}`);
      expect(difficultySelect).not.toBeNull();
      expect(Array.from(difficultySelect?.options ?? []).map((option) => option.value)).toEqual([
        "基础",
        "进阶",
        "挑战",
      ]);
      expect(container.textContent).toContain("本难度共");
    });
  }

  for (const practiceLabel of ["单音听辨", "音程听辨", "节奏听辨", "旋律听写"]) {
    it(`${practiceLabel}的参考钢琴默认收起，展开后可再次收起卸载`, async () => {
      const container = await renderApp();
      await click(findLink(container, practiceLabel));

      expect(container.querySelectorAll("[data-piano-key]")).toHaveLength(0);
      const disclosure = findButtonContaining(container, "参考钢琴");
      expect(disclosure.getAttribute("aria-expanded")).toBe("false");
      await click(disclosure);
      expect(container.querySelectorAll("[data-piano-key]")).toHaveLength(13);
      expect(disclosure.getAttribute("aria-expanded")).toBe("true");
      await click(disclosure);
      expect(container.querySelectorAll("[data-piano-key]")).toHaveLength(0);
      expect(disclosure.getAttribute("aria-expanded")).toBe("false");
    });
  }
});
