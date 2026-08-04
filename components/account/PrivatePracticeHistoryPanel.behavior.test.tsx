import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PrivatePracticeHistoryResult } from "../../lib/account/privatePracticeHistory";

const platform = vi.hoisted(() => ({
  getSupabaseBrowserClient: vi.fn(),
  loadSupabasePrivatePracticeHistory: vi.fn(),
}));

vi.mock("../../lib/platform/supabaseBrowser", () => ({
  getSupabaseBrowserClient: platform.getSupabaseBrowserClient,
}));
vi.mock("../../lib/platform/supabasePrivatePracticeHistory", () => ({
  loadSupabasePrivatePracticeHistory:
    platform.loadSupabasePrivatePracticeHistory,
}));

import { PrivatePracticeHistoryPanel } from "./PrivatePracticeHistoryPanel";

let root: Root | null = null;

Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
  configurable: true,
  value: true,
});

function historyResult(
  id: string,
  title: string,
): PrivatePracticeHistoryResult {
  return {
    ignoredCount: 0,
    items: [
      {
        id,
        exerciseId: `exercise-${id}`,
        exerciseTitle: title,
        lessonTitle: "认识音程",
        courseTitle: "基础课程",
        kind: "interval",
        kindLabel: "音程听辨",
        difficulty: "基础",
        matchesAnswer: false,
        completedAt: "2026-08-03T08:01:00.000Z",
        retryHref: `/practice?feature=ear-training&mode=interval&exercise=exercise-${id}`,
      },
    ],
  };
}

async function renderPanel(userId = "user-a") {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <PrivatePracticeHistoryPanel
        userId={userId}
        timeZone="Asia/Shanghai"
      />,
    );
  });
  return container;
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("PrivatePracticeHistoryPanel", () => {
  it("shows owner-bound non-scoring history and a direct retry link", async () => {
    platform.getSupabaseBrowserClient.mockReturnValue({ client: true });
    platform.loadSupabasePrivatePracticeHistory.mockResolvedValue(
      historyResult("a", "基础音程听辨"),
    );

    const container = await renderPanel();
    await act(async () => await Promise.resolve());

    expect(container.textContent).toContain("基础音程听辨");
    expect(container.textContent).toContain("与题目答案不一致");
    expect(container.textContent).toContain("不是分数、等级或正式能力评价");
    expect(container.querySelector("a")?.getAttribute("href")).toContain(
      "exercise=exercise-a",
    );
  });

  it("fails closed and lets the user retry a rejected read", async () => {
    platform.getSupabaseBrowserClient.mockReturnValue({ client: true });
    platform.loadSupabasePrivatePracticeHistory
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(historyResult("retry", "重试后的记录"));

    const container = await renderPanel();
    await act(async () => await Promise.resolve());
    expect(container.textContent).toContain("私人练习记录暂时无法读取");

    const retryButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "重新读取",
    );
    await act(async () => retryButton?.click());
    await act(async () => await Promise.resolve());
    expect(container.textContent).toContain("重试后的记录");
  });

  it("ignores a late result after the account changes", async () => {
    platform.getSupabaseBrowserClient.mockReturnValue({ client: true });
    let resolveA: (result: PrivatePracticeHistoryResult) => void = () => undefined;
    let resolveB: (result: PrivatePracticeHistoryResult) => void = () => undefined;
    const resultA = new Promise<PrivatePracticeHistoryResult>((resolve) => {
      resolveA = resolve;
    });
    const resultB = new Promise<PrivatePracticeHistoryResult>((resolve) => {
      resolveB = resolve;
    });
    platform.loadSupabasePrivatePracticeHistory.mockImplementation(
      (_client: unknown, userId: string) =>
        userId === "user-a" ? resultA : resultB,
    );

    const container = await renderPanel("user-a");
    await act(async () => {
      root?.render(
        <PrivatePracticeHistoryPanel
          userId="user-b"
          timeZone="Asia/Shanghai"
        />,
      );
    });
    await act(async () => resolveB(historyResult("b", "账户 B 的记录")));
    expect(container.textContent).toContain("账户 B 的记录");

    await act(async () => resolveA(historyResult("a", "账户 A 的迟到记录")));
    expect(container.textContent).not.toContain("账户 A 的迟到记录");
    expect(container.textContent).toContain("账户 B 的记录");
  });
});
