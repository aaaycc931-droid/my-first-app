import axe from "axe-core";
import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { androidInitialScreens, App } from "./App";
import { browserMobileLearningProfileRepository } from "./runtime/mobileLearningProfileStorage";
import { browserMobilePracticeReviewRepository } from "./runtime/mobilePracticeReviewStorage";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

type AndroidInitialScreen = (typeof androidInitialScreens)[number];

const screenLabels = {
  home: "本地练习",
  course: "中文课程",
  statistics: "练习统计",
  custom: "定制练习",
  score: "本机谱项目",
  monitor: "实时音高反馈",
  pitch: "单音听辨",
  interval: "音程听辨",
  compare: "音程比较与模唱",
  chord: "和弦与转位",
  seventh: "七和弦听辨",
  "seventh-spacing": "七和弦排列",
  progression: "和声进行",
  modulation: "调制听辨",
  scale: "音阶与调式",
  rhythm: "节奏听辨",
  melody: "旋律听写",
  piano: "本地参考钢琴",
} satisfies Record<AndroidInitialScreen, string>;

const lazyScreenLoadingMessages = {
  chord: "正在载入和弦练习…",
  seventh: "正在载入七和弦练习…",
  "seventh-spacing": "正在载入七和弦排列练习…",
  progression: "正在载入和声进行练习…",
  modulation: "正在载入调制听辨练习…",
  scale: "正在载入音阶与调式练习…",
} as const satisfies Partial<Record<AndroidInitialScreen, string>>;

const screenCases = androidInitialScreens.map((screen) => [screenLabels[screen], screen] as const);

const waitForLazyScreen = async (screen: AndroidInitialScreen, renderedContainer: HTMLDivElement) => {
  const loadingMessage = lazyScreenLoadingMessages[screen as keyof typeof lazyScreenLoadingMessages];
  if (!loadingMessage) return;

  for (let attempt = 0; attempt < 100 && renderedContainer.textContent?.includes(loadingMessage); attempt += 1) {
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 10));
    });
  }

  expect(renderedContainer.textContent).not.toContain(loadingMessage);
  expect(
    Array.from(renderedContainer.querySelectorAll("section"))
      .find((section) => section.getAttribute("aria-label") === screenLabels[screen])
      ?.querySelector("button"),
  ).not.toBeNull();
};

const renderApp = async (screen: AndroidInitialScreen) => {
  window.location.hash = screen === "home" ? "" : `#${screen}`;
  const renderedContainer = document.createElement("div");
  container = renderedContainer;
  document.body.append(renderedContainer);
  root = createRoot(renderedContainer);
  await act(async () => root?.render(
    <StrictMode>
      <App
        learningProfileRepository={browserMobileLearningProfileRepository}
        practiceReviewRepository={browserMobilePracticeReviewRepository}
      />
    </StrictMode>,
  ));
  await waitForLazyScreen(screen, renderedContainer);
  return renderedContainer;
};

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container?.remove();
  container = null;
});

describe("Android 本地入口自动可访问性前置筛查", () => {
  it("覆盖 App 导出的全部 Android 初始界面", () => {
    expect(screenCases.map(([, screen]) => screen)).toEqual([...androidInitialScreens]);
    expect(Object.keys(screenLabels)).toEqual([...androidInitialScreens]);
  });

  it.each(screenCases)("%s 初始界面没有 axe-core 可确定识别的 WCAG A/AA 语义阻断", async (label, screen) => {
    const container = await renderApp(screen);
    expect(container.querySelector(".mobile-topbar")?.textContent).toContain(label);
    const result = await axe.run(container, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
      rules: { "color-contrast": { enabled: false } },
    });

    expect(
      result.violations,
      result.violations.map((violation) => `${violation.id}: ${violation.help}`).join("\n"),
    ).toEqual([]);
  });
});
