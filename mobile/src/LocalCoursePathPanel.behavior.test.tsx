import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalCoursePathPanel } from "./LocalCoursePathPanel";
import {
  MOBILE_COURSE_PROGRESS_STORAGE_KEY,
  createMobileCourseProgressRepository,
  type MobileCourseProgressRepository,
} from "./runtime/mobileCourseProgressStorage";
import type { StorageLike } from "./runtime/mobilePracticeReviewStorage";

let root: Root | null = null;
let storedValues: Map<string, string>;
let storage: StorageLike;
const flush = async () => { await act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 10)); }); };
const button = (container: ParentNode, text: string) => { const found = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.trim() === text); if (!found) throw new Error(`找不到按钮：${text}`); return found as HTMLButtonElement; };

beforeEach(() => {
  vi.restoreAllMocks();
  storedValues = new Map();
  storage = {
    getItem: (key) => storedValues.get(key) ?? null,
    setItem: (key, value) => { storedValues.set(key, value); },
    removeItem: (key) => { storedValues.delete(key); },
  };
  window.location.hash = "";
});
afterEach(async () => { await act(async () => root?.unmount()); root = null; document.body.innerHTML = ""; vi.restoreAllMocks(); });

const renderPanel = async (
  courseProgressRepository: MobileCourseProgressRepository =
    createMobileCourseProgressRepository(() => storage),
) => { const container = document.createElement("div"); document.body.append(container); root = createRoot(container); await act(async () => root?.render(<StrictMode><LocalCoursePathPanel courseProgressRepository={courseProgressRepository} /></StrictMode>)); await flush(); return container; };
const completeFirstLesson = async (container: ParentNode) => { await act(async () => button(container, "开始课节").click()); await flush(); await act(async () => button(container, "C4").click()); await act(async () => button(container, "查看本题答案").click()); await flush(); };

describe("P118a 本地课程路径", () => {
  it("只在固定 Activity 完成核对后保存完成事实并解锁下一课节", async () => {
    const container = await renderPanel();
    expect(container.textContent).toContain("已练习并核对 0/3 课节");
    expect(button(container, "完成上一课节后解锁").disabled).toBe(true);
    await completeFirstLesson(container);
    const stored = storedValues.get(MOBILE_COURSE_PROGRESS_STORAGE_KEY) ?? "";
    expect(stored).toContain("00000000-0000-0000-0000-000000000101");
    expect(stored).not.toContain("answer"); expect(stored).not.toContain("correct");
    await act(async () => button(container, "返回课程路径").click()); await flush();
    expect(container.textContent).toContain("已练习并核对 1/3 课节");
    expect(Array.from(container.querySelectorAll("button")).filter((item) => item.textContent === "开始课节")).toHaveLength(1);
  });

  it("保存失败时不在当前会话冒充课节已完成", async () => {
    const failingStorage: StorageLike = {
      ...storage,
      setItem: () => { throw new Error("quota"); },
    };
    const container = await renderPanel(
      createMobileCourseProgressRepository(() => failingStorage),
    );
    await completeFirstLesson(container);
    expect(storedValues.get(MOBILE_COURSE_PROGRESS_STORAGE_KEY)).toBeUndefined();
    expect(container.textContent).toContain("本机课程进度保存失败");
    await act(async () => button(container, "返回课程路径").click()); await flush();
    expect(container.textContent).toContain("已练习并核对 0/3 课节");
  });

  it("清除失败时保留已完成进度和原存储", async () => {
    const container = await renderPanel();
    await completeFirstLesson(container);
    const stored = storedValues.get(MOBILE_COURSE_PROGRESS_STORAGE_KEY);
    expect(stored).toBeDefined();
    await act(async () => button(container, "返回课程路径").click()); await flush();
    storage.removeItem = () => { throw new Error("locked"); };
    await act(async () => button(container, "重置课程进度").click());
    await act(async () => button(container, "确认重置").click()); await flush();
    expect(storedValues.get(MOBILE_COURSE_PROGRESS_STORAGE_KEY)).toBe(stored);
    expect(container.textContent).toContain("已练习并核对 1/3 课节");
    expect(container.textContent).toContain("本机课程进度清除失败");
  });
});
