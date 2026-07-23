import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { LocalPracticeReviewTarget } from "../../lib/practice/localPracticeReviewQueue";
import { LocalWeakPointReviewQueuePanel } from "./LocalWeakPointReviewQueuePanel";

let root: Root | null = null;

const pitch: LocalPracticeReviewTarget = {
  kind: "single-pitch", difficulty: "基础", seed: 1, sequence: 0, variantId: "pitch:c4",
};
const interval: LocalPracticeReviewTarget = {
  kind: "interval", difficulty: "进阶", direction: "下行", seed: 2, sequence: 0,
  variantId: "interval:g4:major-second",
};

const renderPanel = async (queue: LocalPracticeReviewTarget[], onStartTarget = vi.fn(), onClear = vi.fn()) => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(
    <LocalWeakPointReviewQueuePanel
      queue={queue}
      labelForTarget={(target) => `${target.kind} · ${target.difficulty}`}
      onStartTarget={onStartTarget}
      onClear={onClear}
    />,
  ));
  return { container, onStartTarget, onClear };
};

const click = async (element: Element) => {
  await act(async () => element.dispatchEvent(new MouseEvent("click", { bubbles: true })));
};

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

describe("P118c 当前待复练题面板", () => {
  it("显示诚实空态和本机事实边界", async () => {
    const { container } = await renderPanel([]);
    expect(container.textContent).toContain("当前待复练题");
    expect(container.textContent).toContain("本机复练（0）");
    expect(container.textContent).toContain("暂无待复练题");
    expect(container.textContent).toContain("不是能力评级、正确率或推荐排序");
  });

  it("按题目族分组并从精确目标开始复练", async () => {
    const { container, onStartTarget } = await renderPanel([pitch, interval]);
    expect(container.textContent).toContain("单音听辨待复练 1 题");
    expect(container.textContent).toContain("音程听辨待复练 1 题");
    const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("interval · 进阶"));
    expect(button).toBeTruthy();
    await click(button!);
    expect(onStartTarget).toHaveBeenCalledWith(interval);
  });

  it("畸形目标失败关闭而不渲染部分队列", async () => {
    const { container } = await renderPanel([null as unknown as LocalPracticeReviewTarget]);
    expect(container.textContent).toContain("当前待复练题不可用");
    expect(container.textContent).toContain("未生成部分结果");
    expect(container.textContent).not.toContain("本机复练（1）");
  });

  it("清除必须二次确认，取消不清除，确认才请求清除", async () => {
    const { container, onClear } = await renderPanel([pitch]);
    const button = (label: string) => Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.trim() === label)!;
    await click(button("清除记录"));
    expect(container.textContent).toContain("确认清除全部本机复练记录？");
    await click(button("取消"));
    expect(onClear).not.toHaveBeenCalled();
    await click(button("清除记录"));
    await click(button("确认清除"));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
