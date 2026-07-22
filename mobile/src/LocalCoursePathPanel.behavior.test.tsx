import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalCoursePathPanel } from "./LocalCoursePathPanel";
import { MOBILE_COURSE_PROGRESS_STORAGE_KEY } from "./runtime/mobileCourseProgressStorage";

let root: Root | null = null;
const flush = async () => { await act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 10)); }); };
const button = (container: ParentNode, text: string) => { const found = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.trim() === text); if (!found) throw new Error(`找不到按钮：${text}`); return found as HTMLButtonElement; };

beforeEach(() => { window.localStorage.clear(); window.location.hash = ""; });
afterEach(async () => { await act(async () => root?.unmount()); root = null; document.body.innerHTML = ""; });

describe("P118a 本地课程路径", () => {
  it("只在固定 Activity 完成核对后保存完成事实并解锁下一课节", async () => {
    const container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => root?.render(<StrictMode><LocalCoursePathPanel /></StrictMode>)); await flush();
    expect(container.textContent).toContain("已练习并核对 0/3 课节");
    expect(button(container, "完成上一课节后解锁").disabled).toBe(true);
    await act(async () => button(container, "开始课节").click()); await flush();
    await act(async () => button(container, "C4").click());
    await act(async () => button(container, "查看本题答案").click()); await flush();
    const stored = window.localStorage.getItem(MOBILE_COURSE_PROGRESS_STORAGE_KEY) ?? "";
    expect(stored).toContain("00000000-0000-0000-0000-000000000101");
    expect(stored).not.toContain("answer"); expect(stored).not.toContain("correct");
    await act(async () => button(container, "返回课程路径").click()); await flush();
    expect(container.textContent).toContain("已练习并核对 1/3 课节");
    expect(Array.from(container.querySelectorAll("button")).filter((item) => item.textContent === "开始课节")).toHaveLength(1);
  });
});
