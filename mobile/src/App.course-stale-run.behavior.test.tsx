import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LocalPracticeAnswerResult } from "../../lib/practice/localPracticeReviewQueue";
import { MOBILE_COURSE_PROGRESS_STORAGE_KEY } from "./runtime/mobileCourseProgressStorage";

const singlePitchHarness = vi.hoisted(() => ({
  callbacks: [] as Array<(result: LocalPracticeAnswerResult) => void>,
}));

vi.mock("../../components/practice/LocalEarTrainingSinglePitchPanel", () => ({
  LocalEarTrainingSinglePitchPanel: ({
    onLocalAnswerResult,
  }: {
    onLocalAnswerResult?: (result: LocalPracticeAnswerResult) => void;
  }) => {
    if (onLocalAnswerResult) singlePitchHarness.callbacks.push(onLocalAnswerResult);
    return <p>测试用单音 Activity</p>;
  },
}));

import { App } from "./App";

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

beforeEach(() => {
  singlePitchHarness.callbacks.length = 0;
  window.history.replaceState(null, "", "#course");
  window.localStorage.clear();
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  window.localStorage.clear();
});

describe("P118a stale course run attribution", () => {
  it("rejects an old mounted Activity callback after background invalidates its run", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(<StrictMode><App /></StrictMode>));
    await flushReact();

    const start = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "开始本课",
    );
    if (!start) throw new Error("找不到课程开始按钮");
    await act(async () => start.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await waitFor(() => window.location.hash === "#pitch" && singlePitchHarness.callbacks.length > 0, "课程 Activity 回调");
    const staleCallback = singlePitchHarness.callbacks.at(-1)!;

    await act(async () => window.dispatchEvent(new Event("pagehide")));
    await flushReact();
    await act(async () => staleCallback({
      target: {
        kind: "single-pitch",
        difficulty: "基础",
        seed: 1,
        sequence: 0,
        variantId: "single-pitch.c4.quarter.v1",
      },
      isCorrect: true,
    }));

    expect(window.localStorage.getItem(MOBILE_COURSE_PROGRESS_STORAGE_KEY)).toBeNull();
    window.location.hash = "course";
    await waitFor(() => container.textContent?.includes("已完成 0 / 4 课") ?? false, "课程进度保持为空");
    expect(container.textContent).toContain("迟到或已作废的课节结果已拒绝");
  });
});
