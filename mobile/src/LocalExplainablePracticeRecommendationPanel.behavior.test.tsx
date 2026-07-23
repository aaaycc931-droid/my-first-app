import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildLocalExplainablePracticeRecommendation } from "../../lib/learning/localExplainablePracticeRecommendation";
import type { LocalPracticeReviewTarget } from "../../lib/practice/localPracticeReviewQueue";
import { LocalExplainablePracticeRecommendationPanel } from "./LocalExplainablePracticeRecommendationPanel";

let root: Root | null = null;

const pitch: LocalPracticeReviewTarget = {
  kind: "single-pitch", difficulty: "基础", seed: 1, sequence: 0, variantId: "pitch:c4",
};
const interval: LocalPracticeReviewTarget = {
  kind: "interval", difficulty: "进阶", direction: "下行", seed: 2, sequence: 0,
  variantId: "interval:g4:major-second",
};

const renderPanel = async (
  suggestionsEnabled: boolean,
  queue: LocalPracticeReviewTarget[],
) => {
  const container = document.createElement("div");
  document.body.append(container);
  const onStartTarget = vi.fn();
  const onToggle = vi.fn();
  root = createRoot(container);
  await act(async () => root?.render(
    <LocalExplainablePracticeRecommendationPanel
      recommendation={buildLocalExplainablePracticeRecommendation({ suggestionsEnabled, queue })}
      labelForTarget={(target) => `${target.kind} · ${target.difficulty}`}
      onStartTarget={onStartTarget}
      onToggle={onToggle}
    />,
  ));
  return { container, onStartTarget, onToggle };
};

const click = async (element: Element) => {
  await act(async () => element.dispatchEvent(new MouseEvent("click", { bubbles: true })));
};

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

describe("P118d 可解释非评分推荐面板", () => {
  it("解释现有 MRU 队列首项并从精确目标开始复练", async () => {
    const { container, onStartTarget } = await renderPanel(true, [interval, pitch]);
    expect(container.textContent).toContain("建议下一步：interval · 进阶");
    expect(container.textContent).toContain("当前复练队列第 1 项");
    expect(container.textContent).toContain("该题型有 1 题，全部有 2 题");
    expect(container.textContent).toContain("不读取答案 outcome");
    const button = Array.from(container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent === "开始这题复练",
    );
    await click(button!);
    expect(onStartTarget).toHaveBeenCalledWith(interval);
  });

  it("可关闭且关闭时不显示目标", async () => {
    const { container, onToggle } = await renderPanel(false, [pitch]);
    expect(container.textContent).toContain("复练建议已关闭");
    expect(container.textContent).not.toContain("建议下一步");
    await click(container.querySelector('button[aria-pressed="false"]')!);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("无待复练事实时诚实显示空态", async () => {
    const { container } = await renderPanel(true, []);
    expect(container.textContent).toContain("缺少生成复练建议所需的本机事实");
    expect(container.textContent).toContain("未生成建议");
  });

  it("数据畸形时失败关闭且不显示部分推荐", async () => {
    const { container } = await renderPanel(
      true,
      [null as unknown as LocalPracticeReviewTarget],
    );
    expect(container.textContent).toContain("无法解释来源");
    expect(container.textContent).toContain("未生成建议");
    expect(container.textContent).not.toContain("建议下一步");
  });
});
