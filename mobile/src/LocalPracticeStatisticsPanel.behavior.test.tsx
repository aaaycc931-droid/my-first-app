import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import type { LocalPracticeStatisticsEvent } from "../../lib/learning/localPracticeStatistics";
import { LocalPracticeStatisticsPanel } from "./LocalPracticeStatisticsPanel";

let root: Root | null = null;
const now = new Date("2026-07-22T12:00:00.000Z");
const makeEvent = (
  occurredAt: string,
  kind: LocalPracticeStatisticsEvent["kind"],
  practiceMode: LocalPracticeStatisticsEvent["practiceMode"],
  skillKind: LocalPracticeStatisticsEvent["skillKind"],
  outcome: "correct" | "incorrect" = "correct",
) => ({ occurredAt, kind, practiceMode, skillKind, outcome });

const renderPanel = async (events: readonly LocalPracticeStatisticsEvent[]) => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<StrictMode><LocalPracticeStatisticsPanel events={events} now={now} /></StrictMode>));
  return container;
};
const click = async (container: ParentNode, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.trim() === label);
  if (!button) throw new Error(`找不到按钮：${label}`);
  await act(async () => button.click());
};

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

describe("P118b 本机详细练习统计", () => {
  it("按时间、练习方式和题目族汇总中性事实", async () => {
    const container = await renderPanel([
      makeEvent("2026-07-21T12:00:00.000Z", "result-checked", "random", "single-pitch"),
      makeEvent("2026-07-16T12:00:00.000Z", "review-started", "review", "single-pitch"),
      makeEvent("2026-07-10T12:00:00.000Z", "result-checked", "custom", "rhythm"),
      makeEvent("2026-06-01T12:00:00.000Z", "result-checked", "random", "melody-dictation"),
    ]);
    expect(container.textContent).toContain("记录动作 2 次");
    expect(container.textContent).toContain("随机练习");
    expect(container.textContent).toContain("单音听辨");
    await click(container, "最近 30 天");
    expect(container.textContent).toContain("记录动作 3 次");
    expect(container.textContent).toContain("节奏听辨");
    await click(container, "全部记录");
    expect(container.textContent).toContain("记录动作 4 次");
    expect(container.textContent).toContain("旋律听写");
  });

  it("空记录仍解释最多 48 条的来源边界", async () => {
    const container = await renderPanel([]);
    expect(container.textContent).toContain("记录动作 0 次");
    expect(container.textContent).toContain("此时间范围内暂无可显示的本机事实");
    expect(container.textContent).toContain("最多 48 条");
    expect(container.textContent).toContain("不代表终身历史");
  });

  it("异常数据失败关闭且相反核对结果不改变统计", async () => {
    const base = makeEvent("2026-07-21T12:00:00.000Z", "result-checked", "random", "single-pitch", "correct");
    const first = await renderPanel([base]);
    const firstText = first.textContent;
    await act(async () => root?.unmount());
    root = null;
    document.body.innerHTML = "";
    const opposite = { ...base, outcome: "incorrect" as const };
    const second = await renderPanel([opposite]);
    expect(second.textContent).toBe(firstText);
    await act(async () => root?.unmount());
    root = null;
    document.body.innerHTML = "";
    const invalid = await renderPanel([{ ...base, occurredAt: "invalid" }]);
    expect(invalid.textContent).toContain("统计暂不可用");
    expect(invalid.textContent).toContain("不会猜测或补造统计");
  });
});
