import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocalEarTrainingMelodyDictationPanel } from "../../components/practice/LocalEarTrainingMelodyDictationPanel";
import type { LocalPracticeReviewTarget } from "../../lib/practice/localPracticeReviewQueue";

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

const click = async (element: HTMLElement) => {
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await flushReact();
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
}: {
  initialReviewTarget?: Extract<LocalPracticeReviewTarget, { kind: "melody-dictation" }> | undefined;
  expandedLocalCatalog?: boolean;
  randomQuestion?: boolean;
} = {}) => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(
    <StrictMode>
      <LocalEarTrainingMelodyDictationPanel
        initialReviewTarget={randomQuestion ? undefined : initialReviewTarget}
        expandedLocalCatalog={expandedLocalCatalog}
      />
    </StrictMode>,
  ));
  await flushReact();
  return container;
};

beforeEach(() => {
  document.body.replaceChildren();
  window.localStorage.clear();
});

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
    root = null;
  }
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

    await chooseOrderedAnswer(container, ["do（C4）", "re（D4）", "mi（E4）"]);
    expect(protocolState(container)).toContain("已作答，等待检查");
    expect(protocolState(container)).toContain("第 1 次尝试");

    await click(findButton(container, "查看本题答案"));
    expect(protocolState(container)).toContain("答案已检查");
    expect(container.textContent).toContain("本题答案：do（C4） → re（D4） → mi（E4）");
    expect(container.textContent).toContain("你的填写：do（C4） → re（D4） → mi（E4）");
  });

  it("已开始填写后切换答案方式会清空选择并开始新尝试", async () => {
    const container = await renderPanel();
    await chooseOrderedAnswer(container, ["C4", "D4", "E4"]);
    expect(protocolState(container)).toContain("已作答，等待检查");

    await click(findButton(container, "固定唱名"));
    expect(protocolState(container)).toContain("题目已确认");
    expect(protocolState(container)).toContain("第 2 次尝试");
    expect(container.textContent).toContain("请为三个位置都选择固定唱名");
    expect(positionFields(container).flatMap((field) =>
      Array.from(field.querySelectorAll('[role="radio"][aria-checked="true"]')),
    )).toHaveLength(0);
  });

  it("checked 后仍可切换模式，并清除旧答案与检查证据", async () => {
    const container = await renderPanel();
    await chooseOrderedAnswer(container, ["C4", "D4", "E4"]);
    await click(findButton(container, "查看本题答案"));
    expect(protocolState(container)).toContain("答案已检查");
    expect(container.textContent).toContain("本题答案：C4 → D4 → E4");

    await click(findButton(container, "固定唱名"));
    expect(protocolState(container)).toContain("题目已确认");
    expect(protocolState(container)).toContain("第 2 次尝试");
    expect(container.textContent).not.toContain("本题答案：");
    expect(container.textContent).toContain("请为三个位置都选择固定唱名");
  });

  it("重置清除答案和证据，下一题不会沿用上一题填写", async () => {
    const container = await renderPanel({ randomQuestion: true });
    await waitFor(() => !findButton(container, "C4").disabled, "随机旋律题目可回答");
    await chooseOrderedAnswer(container, ["C4", "C4", "C4"]);
    await click(findButton(container, "查看本题答案"));
    expect(protocolState(container)).toContain("答案已检查");

    await click(findButton(container, "重置本题"));
    expect(protocolState(container)).toContain("题目已确认");
    expect(protocolState(container)).toContain("第 2 次尝试");
    expect(container.textContent).not.toContain("本题答案：");
    expect(container.textContent).toContain("请为三个位置都选择音名");

    await chooseOrderedAnswer(container, ["C4", "D4", "E4"]);
    await click(findButton(container, "下一题"));
    expect(protocolState(container)).toContain("题目已确认");
    expect(protocolState(container)).toContain("第 1 次尝试");
    expect(container.textContent).toContain("请为三个位置都选择音名");
    expect(positionFields(container).flatMap((field) =>
      Array.from(field.querySelectorAll('[role="radio"][aria-checked="true"]')),
    )).toHaveLength(0);
  });
});
