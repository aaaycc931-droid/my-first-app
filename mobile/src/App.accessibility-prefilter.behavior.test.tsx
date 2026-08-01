import axe from "axe-core";
import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { App } from "./App";
import { browserMobileLearningProfileRepository } from "./runtime/mobileLearningProfileStorage";
import { browserMobilePracticeReviewRepository } from "./runtime/mobilePracticeReviewStorage";

let root: Root | null = null;

const renderApp = async (screen: string) => {
  window.location.hash = screen === "home" ? "" : `#${screen}`;
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(
    <StrictMode>
      <App
        learningProfileRepository={browserMobileLearningProfileRepository}
        practiceReviewRepository={browserMobilePracticeReviewRepository}
      />
    </StrictMode>,
  ));
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 20));
  });
  return container;
};

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
});

describe("Android 本地入口自动可访问性前置筛查", () => {
  it.each([
    ["本地练习", "home"],
    ["中文课程", "course"],
    ["练习统计", "statistics"],
    ["本机谱项目", "score"],
    ["实时音高反馈", "monitor"],
    ["单音听辨", "pitch"],
    ["旋律听写", "melody"],
    ["本地参考钢琴", "piano"],
  ])("%s 初始界面没有 axe-core 可确定识别的 WCAG A/AA 语义阻断", async (label, screen) => {
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
