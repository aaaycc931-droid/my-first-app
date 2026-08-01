import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const supabaseBrowser = vi.hoisted(() => ({
  getSupabaseBrowserClient: vi.fn(),
}));

vi.mock("../../lib/platform/supabaseBrowser", () => ({
  getSupabaseBrowserClient: supabaseBrowser.getSupabaseBrowserClient,
  isSupabaseConfigured: true,
}));

import { CourseLibrary } from "./CourseLibrary";

let root: Root | null = null;

Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
  configurable: true,
  value: true,
});

function createQuery(result: Promise<unknown>) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    then: result.then.bind(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  return query;
}

async function renderCourseLibrary(result: Promise<unknown>) {
  const query = createQuery(result);
  supabaseBrowser.getSupabaseBrowserClient.mockReturnValue({
    from: vi.fn(() => query),
  });
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<CourseLibrary />));
  return container;
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("CourseLibrary fail-closed loading", () => {
  it("still renders published courses when the backend responds", async () => {
    const container = await renderCourseLibrary(Promise.resolve({
      data: [{ id: "course-1", title: "基础课程", description: "课程说明" }],
      error: null,
    }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain("基础课程");
    expect(container.textContent).not.toContain("正在读取系统课程");
  });

  it("leaves loading and shows the existing error state when the backend rejects", async () => {
    const container = await renderCourseLibrary(Promise.reject(new Error("offline")));

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain("课程库暂时无法加载，请稍后重试。");
    expect(container.textContent).not.toContain("正在读取系统课程");
  });

  it("leaves loading after a bounded wait when the backend never settles", async () => {
    vi.useFakeTimers();
    const container = await renderCourseLibrary(new Promise(() => undefined));

    expect(container.textContent).toContain("正在读取系统课程");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(container.textContent).toContain("课程库暂时无法加载，请稍后重试。");
    expect(container.textContent).not.toContain("正在读取系统课程");
  });
});
