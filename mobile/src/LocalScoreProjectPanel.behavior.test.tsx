import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  LocalScoreProjectConflictError,
  cloneLocalScoreProject,
  type LocalScoreProjectV1,
} from "../../lib/music/localScoreProject";
import { LocalScoreProjectPanel } from "./LocalScoreProjectPanel";
import {
  LocalScoreProjectStorageError,
  type LocalScoreProjectStore,
} from "./runtime/localScoreProjectStorage";

class MemoryProjectStore implements LocalScoreProjectStore {
  readonly values = new Map<string, LocalScoreProjectV1>();
  failNextPut: Error | null = null;
  failNextDelete: Error | null = null;
  deleteCalls = 0;

  async get(projectId: string) {
    const project = this.values.get(projectId);
    return project ? cloneLocalScoreProject(project) : null;
  }

  async list() {
    return Array.from(this.values.values())
      .map(cloneLocalScoreProject)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async put(project: LocalScoreProjectV1, expectedRevision: number | null) {
    if (this.failNextPut) {
      const error = this.failNextPut;
      this.failNextPut = null;
      throw error;
    }
    const current = this.values.get(project.projectId);
    if (
      (expectedRevision === null && current)
      || (
        expectedRevision !== null
        && current?.document.revision !== expectedRevision
      )
    ) {
      throw new LocalScoreProjectConflictError();
    }
    this.values.set(project.projectId, cloneLocalScoreProject(project));
  }

  async delete(projectId: string, expectedRevision: number) {
    this.deleteCalls += 1;
    if (this.failNextDelete) {
      const error = this.failNextDelete;
      this.failNextDelete = null;
      throw error;
    }
    const current = this.values.get(projectId);
    if (current?.document.revision !== expectedRevision) {
      throw new LocalScoreProjectConflictError();
    }
    this.values.delete(projectId);
  }
}

let root: Root | null = null;

const flushReact = async () => {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
};

const waitFor = async (predicate: () => boolean, message: string) => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (predicate()) return;
    await flushReact();
  }
  throw new Error(`等待超时：${message}`);
};

const findButton = (
  container: ParentNode,
  label: string,
): HTMLButtonElement => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  if (!button) throw new Error(`找不到按钮：${label}`);
  return button;
};

const findSelect = (
  container: ParentNode,
  label: string,
): HTMLSelectElement => {
  const wrapper = Array.from(container.querySelectorAll("label")).find(
    (candidate) => candidate.textContent?.includes(label),
  );
  const select = wrapper?.querySelector("select");
  if (!select) throw new Error(`找不到选择器：${label}`);
  return select;
};

const findInput = (
  container: ParentNode,
  label: string,
): HTMLInputElement => {
  const wrapper = Array.from(container.querySelectorAll("label")).find(
    (candidate) => candidate.textContent?.includes(label),
  );
  const input = wrapper?.querySelector("input");
  if (!input) throw new Error(`找不到输入框：${label}`);
  return input;
};

const click = async (element: HTMLElement) => {
  await act(async () => {
    element.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
  });
  await flushReact();
};

const change = async (
  element: HTMLInputElement | HTMLSelectElement,
  value: string,
) => {
  await act(async () => {
    const prototype = element instanceof HTMLInputElement
      ? HTMLInputElement.prototype
      : HTMLSelectElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    setter?.call(element, value);
    element.dispatchEvent(new Event(
      element instanceof HTMLInputElement ? "input" : "change",
      { bubbles: true },
    ));
  });
  await flushReact();
};

const renderPanel = async (store: MemoryProjectStore) => {
  const container = document.createElement("div");
  document.body.append(container);
  let timestamp = Date.parse("2026-07-24T05:00:00.000Z");
  let id = 0;
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <StrictMode>
        <LocalScoreProjectPanel
          store={store}
          now={() => new Date(timestamp++).toISOString()}
          createId={() => `test-${++id}`}
        />
      </StrictMode>,
    );
  });
  await waitFor(
    () => container.textContent?.includes("还没有已保存的谱项目。") ?? false,
    "读取空项目列表",
  );
  return container;
};

beforeEach(() => document.body.replaceChildren());

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
    root = null;
  }
});

describe("S1 本机谱项目面板", () => {
  it("创建、编辑、撤销重做、返回列表和重新打开形成保存闭环", async () => {
    const store = new MemoryProjectStore();
    const container = await renderPanel(store);

    await click(findButton(container, "创建并保存"));
    await waitFor(
      () => container.textContent?.includes("第一声部预览") ?? false,
      "进入已保存项目",
    );
    expect(store.values.size).toBe(1);
    expect(container.textContent).toContain("修订 1");

    await click(findButton(container, "添加到第 1 小节并保存"));
    await waitFor(
      () => container.textContent?.includes("C4 · 四分音符") ?? false,
      "保存音符",
    );

    const typeSelect = findSelect(container, "类型");
    await change(typeSelect, "rest");
    await click(findButton(container, "添加到第 1 小节并保存"));
    await waitFor(
      () => container.textContent?.includes("休止 · 四分音符") ?? false,
      "保存休止符",
    );

    const deleteButtons = Array.from(container.querySelectorAll("button")).filter(
      (button) => button.textContent?.trim() === "删除",
    );
    if (!deleteButtons[0]) throw new Error("找不到事件删除按钮");
    await click(deleteButtons[0]);
    await waitFor(
      () => !container.textContent?.includes("C4 · 四分音符"),
      "删除音符",
    );

    await click(findButton(container, "撤销"));
    await waitFor(
      () => container.textContent?.includes("C4 · 四分音符") ?? false,
      "撤销删除",
    );
    await click(findButton(container, "重做"));
    await waitFor(
      () => !container.textContent?.includes("C4 · 四分音符"),
      "重做删除",
    );

    await click(findButton(container, "返回项目列表"));
    await waitFor(
      () => container.textContent?.includes("本机已保存项目") ?? false,
      "返回项目列表",
    );
    await click(findButton(container, "打开"));
    await waitFor(
      () => container.textContent?.includes("休止 · 四分音符") ?? false,
      "重新打开项目",
    );
    expect(container.textContent).not.toContain("C4 · 四分音符");
    expect(
      Array.from(store.values.values())[0]?.undoStack.length,
    ).toBeGreaterThan(0);
  });

  it("写失败或 stale writer 冲突时不发布未保存事件", async () => {
    const store = new MemoryProjectStore();
    const container = await renderPanel(store);
    await click(findButton(container, "创建并保存"));
    await waitFor(
      () => container.textContent?.includes("第一声部预览") ?? false,
      "进入已保存项目",
    );

    store.failNextPut = new Error("quota");
    await click(findButton(container, "添加到第 1 小节并保存"));
    await waitFor(
      () => container.textContent?.includes("保持不变") ?? false,
      "显示存储失败",
    );
    expect(container.textContent).not.toContain("C4 · 四分音符");

    store.failNextPut = new LocalScoreProjectConflictError();
    await click(findButton(container, "添加到第 1 小节并保存"));
    await waitFor(
      () => container.textContent?.includes("其他页面更新") ?? false,
      "显示并发冲突",
    );
    expect(container.textContent).not.toContain("C4 · 四分音符");
  });

  it("容量或 IndexedDB quota 失败时显示明确原因并允许恢复后重试", async () => {
    const store = new MemoryProjectStore();
    const container = await renderPanel(store);

    expect(container.textContent).toContain("最多 50 个项目、合计 5 MiB");
    await click(findButton(container, "创建并保存"));
    await waitFor(
      () => container.textContent?.includes("第一声部预览") ?? false,
      "进入已保存项目",
    );

    store.failNextPut = new LocalScoreProjectStorageError(
      "capacity",
      "本次保存会超过应用设定的本机谱项目容量上限，未写入修改；原有项目保持不变。",
    );
    await click(findButton(container, "添加到第 1 小节并保存"));
    await waitFor(
      () => container.textContent?.includes("应用设定的本机谱项目容量上限")
        ?? false,
      "显示应用容量限制",
    );
    expect(container.textContent).not.toContain("C4 · 四分音符");

    store.failNextPut = new LocalScoreProjectStorageError(
      "quota",
      "浏览器或 Android WebView 分配给 IndexedDB 的空间不足，乐谱项目未保存。",
    );
    await click(findButton(container, "添加到第 1 小节并保存"));
    await waitFor(
      () => container.textContent?.includes("浏览器或 Android WebView")
        ?? false,
      "显示 IndexedDB quota",
    );
    expect(container.textContent).not.toContain("C4 · 四分音符");

    await click(findButton(container, "添加到第 1 小节并保存"));
    await waitFor(
      () => container.textContent?.includes("C4 · 四分音符") ?? false,
      "恢复条件后重试成功",
    );
    expect(Array.from(store.values.values())[0]?.document.revision).toBe(2);
  });

  it("速度保存失败时播放区保持旧值，恢复后可按原草稿重试并重开", async () => {
    const store = new MemoryProjectStore();
    const container = await renderPanel(store);
    await click(findButton(container, "创建并保存"));
    await waitFor(
      () => container.textContent?.includes("已保存速度：90 BPM") ?? false,
      "显示默认已保存速度",
    );

    await change(findInput(container, "速度（BPM）"), "72");
    store.failNextPut = new LocalScoreProjectStorageError(
      "write-failed",
      "本机存储写入失败，乐谱项目未保存；原有项目保持不变。请恢复存储条件后重试。",
    );
    await click(findButton(container, "保存速度"));
    await waitFor(
      () => container.textContent?.includes("本机存储写入失败") ?? false,
      "显示速度保存失败",
    );
    expect(container.textContent).toContain("已保存速度：90 BPM");
    expect(findInput(container, "速度（BPM）").value).toBe("72");
    expect(Array.from(store.values.values())[0]?.tempoBpm).toBe(90);

    await click(findButton(container, "保存速度"));
    await waitFor(
      () => container.textContent?.includes("已保存速度：72 BPM") ?? false,
      "恢复后保存速度",
    );
    expect(Array.from(store.values.values())[0]?.tempoBpm).toBe(72);
    expect(Array.from(store.values.values())[0]?.document.revision).toBe(2);

    await click(findButton(container, "返回项目列表"));
    await click(findButton(container, "打开"));
    await waitFor(
      () => container.textContent?.includes("已保存速度：72 BPM") ?? false,
      "重开后恢复速度",
    );
  });

  it("删除项目需要明确确认，失败保留数据，恢复后可重试", async () => {
    const store = new MemoryProjectStore();
    const container = await renderPanel(store);
    await click(findButton(container, "创建并保存"));
    await waitFor(
      () => container.textContent?.includes("第一声部预览") ?? false,
      "进入已保存项目",
    );
    await click(findButton(container, "返回项目列表"));
    await waitFor(
      () => container.textContent?.includes("本机已保存项目") ?? false,
      "返回项目列表",
    );

    await click(findButton(container, "删除项目"));
    expect(container.textContent).toContain("确认永久删除");
    expect(store.deleteCalls).toBe(0);
    expect(store.values.size).toBe(1);

    await click(findButton(container, "取消"));
    expect(container.textContent).not.toContain("确认永久删除");
    expect(store.deleteCalls).toBe(0);

    store.failNextDelete = new LocalScoreProjectStorageError(
      "transaction-failed",
      "IndexedDB 事务被中止，未删除乐谱项目；原项目保持不变。请恢复存储条件后重试。",
    );
    await click(findButton(container, "删除项目"));
    await click(findButton(container, "确认删除"));
    await waitFor(
      () => container.textContent?.includes("事务被中止") ?? false,
      "显示删除事务失败",
    );
    expect(container.textContent).toContain("确认永久删除");
    expect(store.values.size).toBe(1);

    await click(findButton(container, "确认删除"));
    await waitFor(
      () => container.textContent?.includes("释放的应用容量") ?? false,
      "恢复后重试删除成功",
    );
    expect(store.values.size).toBe(0);
    expect(container.textContent).toContain("还没有已保存的谱项目");
  });

  it("追加第二小节、选择并更新事件，且仅允许删除末尾空小节", async () => {
    const store = new MemoryProjectStore();
    const container = await renderPanel(store);
    await click(findButton(container, "创建并保存"));
    await waitFor(
      () => container.textContent?.includes("第一声部预览") ?? false,
      "进入已保存项目",
    );

    await click(findButton(container, "追加空小节"));
    await waitFor(
      () => container.textContent?.includes("2 小节") ?? false,
      "追加第二小节",
    );
    await change(findSelect(container, "目标小节"), "2");
    await click(findButton(container, "添加到第 2 小节并保存"));
    await waitFor(
      () => container.textContent?.includes("第 2 小节 · C4 · 四分音符")
        ?? false,
      "在第二小节保存音符",
    );

    await click(findButton(container, "编辑"));
    expect(container.textContent).toContain("正在编辑第 2 小节");
    await change(findSelect(container, "音高"), "G4");
    await click(findButton(container, "更新所选事件并保存"));
    await waitFor(
      () => container.textContent?.includes("第 2 小节 · G4 · 四分音符")
        ?? false,
      "更新第二小节音符",
    );

    await click(findButton(container, "删除末尾空小节"));
    await waitFor(
      () => container.textContent?.includes("仍有音符或休止符") ?? false,
      "拒绝删除非空末尾小节",
    );
    await click(findButton(container, "删除"));
    await waitFor(
      () => !container.textContent?.includes("第 2 小节 · G4"),
      "删除第二小节事件",
    );
    await click(findButton(container, "删除末尾空小节"));
    await waitFor(
      () => container.textContent?.includes("1 小节") ?? false,
      "删除末尾空小节",
    );

    await click(findButton(container, "撤销"));
    await waitFor(
      () => container.textContent?.includes("2 小节") ?? false,
      "撤销小节删除",
    );
    const project = Array.from(store.values.values())[0];
    expect(
      project?.document.parts[0]?.staves[0]?.voices[0]?.measures.map(
        (measure) => measure.measureNumber,
      ),
    ).toEqual([1, 2]);
  });

  it("复制不改谱面，粘贴和跨小节移动仅在保存成功后发布并可重试", async () => {
    const store = new MemoryProjectStore();
    const container = await renderPanel(store);
    await click(findButton(container, "创建并保存"));
    await click(findButton(container, "追加空小节"));
    await click(findButton(container, "添加到第 1 小节并保存"));
    await waitFor(
      () => container.textContent?.includes("第 1 小节 · C4") ?? false,
      "保存来源事件",
    );
    await click(findButton(container, "编辑"));
    await change(findSelect(container, "音高"), "G4");
    const revisionBeforeCopy =
      Array.from(store.values.values())[0]?.document.revision;
    await click(findButton(container, "复制所选事件"));
    expect(container.textContent).toContain("谱面尚未修改");
    expect(Array.from(store.values.values())[0]?.document.revision)
      .toBe(revisionBeforeCopy);

    await change(findSelect(container, "目标小节"), "2");
    store.failNextPut = new LocalScoreProjectStorageError(
      "capacity",
      "本次保存会超过应用设定的本机谱项目容量上限，未写入修改；原有项目保持不变。",
    );
    await click(findButton(container, "粘贴到第 2 小节并保存"));
    await waitFor(
      () => container.textContent?.includes("应用设定的本机谱项目容量上限")
        ?? false,
      "粘贴容量失败",
    );
    let project = Array.from(store.values.values())[0];
    expect(project?.document.revision).toBe(revisionBeforeCopy);
    expect(
      project?.document.parts[0]?.staves[0]?.voices[0]?.measures[1]?.events,
    ).toHaveLength(0);

    for (const failure of [
      {
        error: new LocalScoreProjectStorageError(
          "quota",
          "浏览器或 Android WebView 分配给 IndexedDB 的空间不足，乐谱项目未保存。",
        ),
        message: "浏览器或 Android WebView",
      },
      {
        error: new LocalScoreProjectStorageError(
          "write-failed",
          "本机存储写入失败，乐谱项目未保存；原有项目保持不变。请恢复存储条件后重试。",
        ),
        message: "本机存储写入失败",
      },
      {
        error: new LocalScoreProjectConflictError(),
        message: "其他页面更新",
      },
    ]) {
      store.failNextPut = failure.error;
      await click(findButton(container, "粘贴到第 2 小节并保存"));
      await waitFor(
        () => container.textContent?.includes(failure.message) ?? false,
        `粘贴失败：${failure.message}`,
      );
      project = Array.from(store.values.values())[0];
      expect(project?.document.revision).toBe(revisionBeforeCopy);
      expect(
        project?.document.parts[0]?.staves[0]?.voices[0]?.measures[1]?.events,
      ).toHaveLength(0);
    }

    await click(findButton(container, "粘贴到第 2 小节并保存"));
    await waitFor(
      () => container.textContent?.includes("第 2 小节 · C4") ?? false,
      "恢复后粘贴成功",
    );
    project = Array.from(store.values.values())[0];
    expect(
      project?.document.parts[0]?.staves[0]?.voices[0]?.measures[1]?.events,
    ).toHaveLength(1);
    expect(
      project?.document.parts[0]?.staves[0]?.voices[0]?.measures[1]?.events[0]
        ?.pitch,
    ).toBe("C4");

    store.failNextPut = new LocalScoreProjectStorageError(
      "transaction-failed",
      "IndexedDB 事务被中止，乐谱项目未保存；原有项目保持不变。请恢复存储条件后重试。",
    );
    await click(findButton(container, "移动到第 2 小节并保存"));
    await waitFor(
      () => container.textContent?.includes("事务被中止") ?? false,
      "移动事务失败",
    );
    project = Array.from(store.values.values())[0];
    expect(
      project?.document.parts[0]?.staves[0]?.voices[0]?.measures[0]?.events,
    ).toHaveLength(1);

    await click(findButton(container, "移动到第 2 小节并保存"));
    await waitFor(
      () => (
        Array.from(store.values.values())[0]
          ?.document.parts[0]?.staves[0]?.voices[0]?.measures[0]?.events
          .length === 0
      ),
      "恢复后移动成功",
    );
    project = Array.from(store.values.values())[0];
    expect(
      project?.document.parts[0]?.staves[0]?.voices[0]?.measures[1]?.events,
    ).toHaveLength(2);

    await click(findButton(container, "返回项目列表"));
    await click(findButton(container, "打开"));
    await waitFor(
      () => container.textContent?.includes("第一声部预览") ?? false,
      "重开项目",
    );
    expect(findButton(container, "尚未复制事件").disabled).toBe(true);
  });
});
