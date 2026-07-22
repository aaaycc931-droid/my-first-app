import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  LOCAL_CHINESE_FOUNDATION_COURSE,
  LOCAL_COURSE_CATALOG,
  completeLocalCourseLesson,
  createEmptyLocalCourseProgress,
  loadLocalCourseProgress,
} from "../../lib/learning/localCoursePath";
import { App } from "./App";
import { MOBILE_COURSE_PROGRESS_STORAGE_KEY } from "./runtime/mobileCourseProgressStorage";

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

const findButton = (container: ParentNode, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  if (!button) throw new Error(`找不到按钮：${label}`);
  return button as HTMLButtonElement;
};

const click = async (element: HTMLElement) => {
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await flushReact();
};

const progressWithCompletedLessons = (count: number) => {
  const lessons = LOCAL_CHINESE_FOUNDATION_COURSE.chapters.flatMap((chapter) => chapter.lessons);
  let progress = createEmptyLocalCourseProgress();
  for (const lesson of lessons.slice(0, count)) {
    const mapping = lesson.activityMappings[0]!;
    progress = completeLocalCourseLesson(progress, {
      kind: "checked-local-course-activity-result-v1",
      catalogId: LOCAL_COURSE_CATALOG.catalogId,
      catalogVersion: LOCAL_COURSE_CATALOG.catalogVersion,
      courseId: LOCAL_CHINESE_FOUNDATION_COURSE.courseId,
      courseVersion: LOCAL_CHINESE_FOUNDATION_COURSE.courseVersion,
      lessonId: lesson.lessonId,
      activityMappingId: mapping.activityMappingId,
      activityFamily: mapping.activityFamily,
    });
  }
  return progress;
};

beforeEach(() => {
  window.history.replaceState(null, "", "#course");
  window.localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  window.localStorage.clear();
});

describe("P118a mounted local course path", () => {
  it("shows sequential lessons and records completion only after a checked mapped result", async () => {
    const container = await renderApp();
    expect(container.textContent).toContain("中文视唱练耳入门");
    expect(container.textContent).toContain("已完成 0 / 4 课");
    expect(container.querySelectorAll("button:disabled")).toHaveLength(3);

    await click(findButton(container, "开始本课"));
    await waitFor(() => window.location.hash === "#pitch", "进入单音课节");
    expect(container.textContent).toContain("内置单音听辨练习");
    expect(window.localStorage.getItem(MOBILE_COURSE_PROGRESS_STORAGE_KEY)).toBeNull();

    await waitFor(
      () => Array.from(container.querySelectorAll('button[role="radio"]')).some((button) => !(button as HTMLButtonElement).disabled),
      "单音答案准备完成",
    );
    const answer = Array.from(container.querySelectorAll('button[role="radio"]')).find(
      (button) => !(button as HTMLButtonElement).disabled,
    ) as HTMLButtonElement;
    await click(answer);
    await click(findButton(container, "查看本题答案"));

    await waitFor(() => window.location.hash === "#course", "核对后返回课程页");
    expect(container.textContent).toContain("已完成 1 / 4 课");
    expect(container.textContent).toContain("这不是分数或通过判断");
    const serialized = window.localStorage.getItem(MOBILE_COURSE_PROGRESS_STORAGE_KEY);
    expect(serialized).not.toBeNull();
    expect(loadLocalCourseProgress(JSON.parse(serialized ?? "null")).completedLessonIds).toHaveLength(1);
  });

  it("requires two-step reset and keeps review/profile stores outside its scope", async () => {
    const container = await renderApp();
    await click(findButton(container, "开始本课"));
    await waitFor(() => window.location.hash === "#pitch", "进入单音课节");
    await waitFor(
      () => Array.from(container.querySelectorAll('button[role="radio"]')).some((button) => !(button as HTMLButtonElement).disabled),
      "单音答案准备完成",
    );
    const answer = Array.from(container.querySelectorAll('button[role="radio"]')).find(
      (button) => !(button as HTMLButtonElement).disabled,
    ) as HTMLButtonElement;
    await click(answer);
    await click(findButton(container, "查看本题答案"));
    await waitFor(() => window.location.hash === "#course", "返回课程页");

    window.localStorage.setItem("unrelated-local-data", "preserve");
    await click(findButton(container, "重置课程进度"));
    expect(container.textContent).toContain("确认重置全部本机课程进度");
    expect(window.localStorage.getItem(MOBILE_COURSE_PROGRESS_STORAGE_KEY)).not.toBeNull();
    await click(findButton(container, "确认重置"));

    expect(window.localStorage.getItem(MOBILE_COURSE_PROGRESS_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem("unrelated-local-data")).toBe("preserve");
    expect(container.textContent).toContain("已完成 0 / 4 课");
  });

  it("clears the active course attribution when the app enters background", async () => {
    const container = await renderApp();
    await click(findButton(container, "开始本课"));
    await waitFor(() => window.location.hash === "#pitch", "进入单音课节");
    await waitFor(
      () => Array.from(container.querySelectorAll('button[role="radio"]')).some((button) => !(button as HTMLButtonElement).disabled),
      "单音答案准备完成",
    );

    await act(async () => window.dispatchEvent(new Event("pagehide")));
    await flushReact();
    expect(container.textContent).toContain("应用从后台恢复后已停止声音并重置当前练习状态");
    expect(window.localStorage.getItem(MOBILE_COURSE_PROGRESS_STORAGE_KEY)).toBeNull();
    window.location.hash = "course";
    await waitFor(() => container.textContent?.includes("已完成 0 / 4 课") ?? false, "课程进度保持为空");
  });

  it("opens the exact locked rhythm and melody activities declared by the course", async () => {
    window.localStorage.setItem(
      MOBILE_COURSE_PROGRESS_STORAGE_KEY,
      JSON.stringify(progressWithCompletedLessons(2)),
    );
    let container = await renderApp();
    await click(findButton(container, "开始本课"));
    await waitFor(() => window.location.hash === "#rhythm", "进入课程节奏活动");
    expect(container.textContent).toContain("P116d · 本地节奏听写");
    expect(container.textContent).toContain("当前课程已锁定本课声明的节奏活动");
    expect(container.querySelector("#rhythm-activity-mode")).toBeNull();

    await act(async () => root?.unmount());
    root = null;
    document.body.innerHTML = "";
    window.history.replaceState(null, "", "#course");
    window.localStorage.setItem(
      MOBILE_COURSE_PROGRESS_STORAGE_KEY,
      JSON.stringify(progressWithCompletedLessons(3)),
    );
    container = await renderApp();
    await click(findButton(container, "开始本课"));
    await waitFor(() => window.location.hash === "#melody", "进入课程旋律活动");
    expect(container.textContent).toContain("内置旋律听写练习");
    expect(container.textContent).toContain("当前课程已锁定旋律听写");
    expect(container.querySelector('[data-testid="melody-practice-mode"]')).toBeNull();
  });

  it("does not show or retain completion when course progress storage fails", async () => {
    const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
    vi.spyOn(window.localStorage, "setItem").mockImplementation((key, value) => {
      if (key === MOBILE_COURSE_PROGRESS_STORAGE_KEY) throw new Error("quota");
      return originalSetItem(key, value);
    });
    const container = await renderApp();
    await click(findButton(container, "开始本课"));
    await waitFor(() => window.location.hash === "#pitch", "进入单音课节");
    await waitFor(
      () => Array.from(container.querySelectorAll('button[role="radio"]')).some((button) => !(button as HTMLButtonElement).disabled),
      "单音答案准备完成",
    );
    const answer = Array.from(container.querySelectorAll('button[role="radio"]')).find(
      (button) => !(button as HTMLButtonElement).disabled,
    ) as HTMLButtonElement;
    await click(answer);
    await click(findButton(container, "查看本题答案"));

    expect(window.localStorage.getItem(MOBILE_COURSE_PROGRESS_STORAGE_KEY)).toBeNull();
    window.location.hash = "course";
    await waitFor(() => container.textContent?.includes("已完成 0 / 4 课") ?? false, "保存失败后仍为空进度");
    expect(container.textContent).toContain("本机课程进度保存失败");
  });
});
