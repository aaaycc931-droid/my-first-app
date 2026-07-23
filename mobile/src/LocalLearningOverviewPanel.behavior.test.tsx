import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  LOCAL_COURSE_LESSONS,
  createEmptyLocalCourseProgress,
  serializeLocalCourseProgress,
} from "../../lib/learning/localCoursePath";
import type { LocalPracticeStatisticsEvent } from "../../lib/learning/localPracticeStatistics";
import type { LocalPracticeReviewTarget } from "../../lib/practice/localPracticeReviewQueue";
import { LocalLearningOverviewPanel } from "./LocalLearningOverviewPanel";
import { MOBILE_COURSE_PROGRESS_STORAGE_KEY } from "./runtime/mobileCourseProgressStorage";

let root: Root | null = null;

const now = new Date("2026-07-23T12:00:00.000Z");
const pitch: LocalPracticeReviewTarget = {
  kind: "single-pitch",
  difficulty: "基础",
  seed: 1,
  sequence: 0,
  variantId: "pitch:c4",
};
const events: LocalPracticeStatisticsEvent[] = [
  {
    occurredAt: "2026-07-22T12:00:00.000Z",
    kind: "result-checked",
    skillKind: "single-pitch",
    practiceMode: "random",
  },
  {
    occurredAt: "2026-07-21T12:00:00.000Z",
    kind: "review-started",
    skillKind: "single-pitch",
    practiceMode: "review",
  },
];

const renderPanel = async ({
  eventValues = events,
  reviewQueue = [pitch],
  suggestionsEnabled = true,
  learningSourceStatus = "available",
  reviewSourceStatus = "available",
}: {
  eventValues?: readonly LocalPracticeStatisticsEvent[];
  reviewQueue?: LocalPracticeReviewTarget[];
  suggestionsEnabled?: boolean;
  learningSourceStatus?: "available" | "unavailable";
  reviewSourceStatus?: "available" | "unavailable";
} = {}) => {
  const container = document.createElement("div");
  document.body.append(container);
  const onStartTarget = vi.fn();
  const onClearReviewQueue = vi.fn();
  const onToggleSuggestions = vi.fn();
  root = createRoot(container);
  await act(async () => root?.render(
    <LocalLearningOverviewPanel
      events={eventValues}
      reviewQueue={reviewQueue}
      suggestionsEnabled={suggestionsEnabled}
      learningSourceStatus={learningSourceStatus}
      reviewSourceStatus={reviewSourceStatus}
      labelForTarget={(target) => `${target.kind} · ${target.difficulty}`}
      onStartTarget={onStartTarget}
      onClearReviewQueue={onClearReviewQueue}
      onToggleSuggestions={onToggleSuggestions}
      now={now}
    />,
  ));
  return {
    container,
    onStartTarget,
    onClearReviewQueue,
    onToggleSuggestions,
  };
};

const click = async (element: Element) => {
  await act(async () => element.dispatchEvent(new MouseEvent("click", { bubbles: true })));
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("P118e 本机学习总览面板", () => {
  it("从四个既有来源并列呈现事实并保留原有入口", async () => {
    const progress = createEmptyLocalCourseProgress();
    progress.revision = 1;
    progress.completions = [{
      lessonId: LOCAL_COURSE_LESSONS[0].id,
      completionFingerprint: LOCAL_COURSE_LESSONS[0].completionFingerprint,
    }];
    window.localStorage.setItem(
      MOBILE_COURSE_PROGRESS_STORAGE_KEY,
      serializeLocalCourseProgress(progress),
    );

    const { container, onStartTarget } = await renderPanel();

    expect(container.textContent).toContain("本机学习总览");
    expect(container.textContent).toContain("已练习并核对 1/3 课节");
    expect(container.textContent).toContain("当前保留练习动作 2 次");
    expect(container.textContent).toContain("已核对 1 次 · 开始复练 1 次");
    expect(container.textContent).toContain("本机复练（1）");
    expect(container.textContent).toContain("建议下一步：single-pitch · 基础");
    expect(container.querySelector('a[href="#course"]')?.textContent).toBe("打开课程");
    expect(container.querySelector('a[href="#statistics"]')?.textContent).toBe("查看详细统计");

    const recommendationButton = Array.from(container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent === "开始这题复练",
    );
    await click(recommendationButton!);
    expect(onStartTarget).toHaveBeenCalledWith(pitch);
  });

  it("课程存储异常仅关闭课程摘要，其他来源仍可使用", async () => {
    window.localStorage.setItem(MOBILE_COURSE_PROGRESS_STORAGE_KEY, "{bad");

    const { container } = await renderPanel();

    expect(container.textContent).toContain("未生成课程摘要");
    expect(container.textContent).not.toContain("已练习并核对 0/3 课节");
    expect(container.textContent).toContain("当前保留练习动作 2 次");
    expect(container.textContent).toContain("本机复练（1）");
    expect(container.textContent).toContain("建议下一步");
    expect(container.querySelector('a[href="#course"]')).toBeTruthy();
  });

  it("事件异常仅关闭统计摘要，队列与建议操作互不影响", async () => {
    const { container, onClearReviewQueue, onToggleSuggestions } = await renderPanel({
      eventValues: [null as unknown as LocalPracticeStatisticsEvent],
    });

    expect(container.textContent).toContain("未生成练习摘要");
    expect(container.textContent).toContain("已练习并核对 0/3 课节");
    expect(container.textContent).toContain("本机复练（1）");
    expect(container.textContent).toContain("建议下一步");

    const button = (label: string) => Array.from(container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.trim() === label,
    )!;
    await click(button("关闭建议"));
    expect(onToggleSuggestions).toHaveBeenCalledTimes(1);
    await click(button("清除记录"));
    await click(button("确认清除"));
    expect(onClearReviewQueue).toHaveBeenCalledTimes(1);
  });

  it("画像或复练来源不可用时不把安全空值冒充真实空态", async () => {
    const { container } = await renderPanel({
      eventValues: [],
      reviewQueue: [],
      suggestionsEnabled: false,
      learningSourceStatus: "unavailable",
      reviewSourceStatus: "unavailable",
    });

    expect(container.textContent).toContain("未生成练习摘要");
    expect(container.textContent).toContain("当前待复练题不可用");
    expect(container.textContent).toContain("无法解释来源");
    expect(container.textContent).not.toContain("当前保留练习动作 0 次");
    expect(container.textContent).not.toContain("复练建议已关闭");
    const unavailableSettingsButton = Array.from(
      container.querySelectorAll("button"),
    ).find((candidate) => candidate.textContent === "建议设置不可用");
    expect(unavailableSettingsButton).toBeTruthy();
    expect(unavailableSettingsButton?.disabled).toBe(true);
    expect(unavailableSettingsButton?.hasAttribute("aria-pressed")).toBe(false);
  });
});
