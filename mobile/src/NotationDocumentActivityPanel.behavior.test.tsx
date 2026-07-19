import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { NotationDocumentActivityPanel } from "../../components/practice/NotationDocumentActivityPanel";
import type { NotationTemporaryPracticeTarget } from "../../lib/practice/localNotationDraftPracticeTarget";

const target: NotationTemporaryPracticeTarget = {
  id: "temporary-notation-target-1000",
  mode: "sight-singing",
  status: "active",
  localOnly: true,
  sessionOnly: true,
  nonScoring: true,
  temporary: true,
  createdAtMs: 1000,
  draftFingerprint: "confirmed-ui-draft-1",
  sourceDescription: "独立手动草稿",
  timeSignature: "4/4",
  events: [
    { id: "note-1", type: "note", pitch: "C4", duration: "quarter", measure: 1 },
    { id: "rest-1", type: "rest", pitch: null, duration: "quarter", measure: 1 },
    { id: "note-2", type: "note", pitch: "C5", duration: "half", measure: 2 },
  ],
  warnings: [],
};

let root: Root | null = null;

const renderPanel = async (currentTarget = target) => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<NotationDocumentActivityPanel target={currentTarget} />);
  });
  return container;
};

const clickButton = async (container: ParentNode, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  if (!button) throw new Error(`找不到按钮：${label}`);
  await act(async () => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

beforeEach(() => document.body.replaceChildren());

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
    root = null;
  }
});

describe("谱面文档答案活动", () => {
  it("预览、主动提交、检查与重置形成完整非评分生命周期", async () => {
    const container = await renderPanel();
    expect(container.textContent).toContain("五线谱答案预览");
    expect(container.textContent).toContain("C4");
    expect(container.textContent).toContain("四分休止符");

    await clickButton(container, "提交当前已确认谱面");
    expect(container.textContent).toContain("检查文档与修订");
    await clickButton(container, "检查文档与修订");
    expect(container.textContent).toContain("提交内容引用当前已确认的谱面文档与修订");
    expect(container.textContent).toContain("非评分一致性证据");
    expect(container.textContent).not.toMatch(/得分：|正确率：|通过|不及格/);

    await clickButton(container, "重置本轮答案");
    expect(container.textContent).toContain("提交当前已确认谱面");
  });

  it("切换为简谱会重建本轮并显示受控简谱预览", async () => {
    const container = await renderPanel();
    await clickButton(container, "提交当前已确认谱面");
    const select = container.querySelector("select");
    if (!select) throw new Error("找不到答案表示方式选择器");
    await act(async () => {
      select.value = "numbered-notation";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(container.textContent).toContain("简谱答案预览");
    expect(container.textContent).toContain("1· —");
    expect(container.textContent).toContain("提交当前已确认谱面");
    expect(container.textContent).not.toContain("检查文档与修订");
  });

  it("失效目标没有可提交入口", async () => {
    const container = await renderPanel({ ...target, status: "stale" });
    expect(container.textContent).toContain("当前临时目标已失效");
    expect(container.querySelector("button")).toBeNull();
  });
});
