import { StrictMode, act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  LocalScoreProjectConflictError,
  changeLocalScoreProjectSettings,
  cloneLocalScoreProject,
  createLocalScoreProject,
  type LocalScoreProjectV1,
} from "../../lib/music/localScoreProject";
import {
  cloneLocalScoreProjectRecoveryCandidate,
  createLocalScoreProjectRecoveryCandidate,
  type LocalScoreProjectRecoveryCandidateV1,
} from "../../lib/music/localScoreProjectRecovery";
import { LocalScoreProjectPanel } from "./LocalScoreProjectPanel";
import { useLocalScoreProjectAutosave } from "./useLocalScoreProjectAutosave";
import {
  LocalScoreProjectStorageError,
  type LocalScoreProjectStore,
} from "./runtime/localScoreProjectStorage";

class MemoryProjectStore implements LocalScoreProjectStore {
  readonly values = new Map<string, LocalScoreProjectV1>();
  readonly candidates =
    new Map<string, LocalScoreProjectRecoveryCandidateV1>();
  failNextPut: Error | null = null;
  failNextDelete: Error | null = null;
  failNextStage: Error | null = null;
  failNextPromote: Error | null = null;
  failNextDiscard: Error | null = null;
  beforePromote: (() => Promise<void>) | null = null;
  deleteCalls = 0;
  promoteCalls = 0;
  stageCalls = 0;

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

  async stageRecoveryCandidate(
    candidate: LocalScoreProjectRecoveryCandidateV1,
    expectedSequence: number | null = null,
  ) {
    this.stageCalls += 1;
    if (this.failNextStage) {
      const error = this.failNextStage;
      this.failNextStage = null;
      throw error;
    }
    const current = this.candidates.get(candidate.candidateId);
    if (
      (expectedSequence === null && current)
      || (
        expectedSequence !== null
        && current?.candidateSequence !== expectedSequence
      )
    ) {
      throw new LocalScoreProjectConflictError();
    }
    this.candidates.set(
      candidate.candidateId,
      cloneLocalScoreProjectRecoveryCandidate(candidate),
    );
  }

  async listRecoveryCandidates(projectId?: string) {
    return Array.from(this.candidates.values())
      .filter((candidate) => !projectId || candidate.projectId === projectId)
      .map(cloneLocalScoreProjectRecoveryCandidate)
      .sort((left, right) => right.candidateSequence - left.candidateSequence);
  }

  async promoteRecoveryCandidate(
    candidateId: string,
    expectedSequence: number,
  ) {
    this.promoteCalls += 1;
    if (this.beforePromote) await this.beforePromote();
    if (this.failNextPromote) {
      const error = this.failNextPromote;
      this.failNextPromote = null;
      throw error;
    }
    const candidate = this.candidates.get(candidateId);
    if (!candidate || candidate.candidateSequence !== expectedSequence) {
      throw new LocalScoreProjectConflictError();
    }
    await this.put(candidate.proposedProject, candidate.baseRevision);
    this.candidates.delete(candidateId);
    return cloneLocalScoreProject(candidate.proposedProject);
  }

  async discardRecoveryCandidate(
    candidateId: string,
    expectedSequence: number,
  ) {
    if (this.failNextDiscard) {
      const error = this.failNextDiscard;
      this.failNextDiscard = null;
      throw error;
    }
    const candidate = this.candidates.get(candidateId);
    if (!candidate || candidate.candidateSequence !== expectedSequence) {
      throw new LocalScoreProjectConflictError();
    }
    this.candidates.delete(candidateId);
  }
}

function AutosaveTransportHarness({
  store,
  initialProject,
  initialMode = "metronome-running",
}: {
  store: MemoryProjectStore;
  initialProject: LocalScoreProjectV1;
  initialMode?: "idle" | "metronome-running";
}) {
  const [project, setProject] = useState(initialProject);
  const [title, setTitle] = useState(initialProject.title);
  const [mode, setMode] =
    useState<"idle" | "metronome-running">(initialMode);
  const autosave = useLocalScoreProjectAutosave({
    store,
    project,
    title,
    tempoBpm: String(project.tempoBpm),
    transportMode: mode,
    now: () => "2026-07-24T07:00:00.000Z",
    onProjectSaved: (saved) => setProject(saved),
  });
  return (
    <div>
      <label>
        项目名称
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <button type="button" onClick={() => setMode("idle")}>停止播放</button>
      <p>{autosave.status}</p>
    </div>
  );
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

const waitForAutosave = async () => {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 650));
  });
  await flushReact();
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
  it("固定 C 简谱与五线谱切换保留同一事件选择和播放控制实例", async () => {
    const store = new MemoryProjectStore();
    const container = await renderPanel(store);
    await click(findButton(container, "创建并保存"));
    await click(findButton(container, "添加到第 1 小节并保存"));
    await waitFor(
      () => container.querySelector('[data-event-id="event-test-2"]') !== null,
      "显示新保存事件的五线谱 token",
    );

    const staffToken = container.querySelector<HTMLElement>(
      '[data-testid="local-score-project-staff-preview"] '
        + '[data-event-id="event-test-2"]',
    );
    if (!staffToken) throw new Error("找不到可选择的五线谱事件");
    await click(staffToken);
    expect(staffToken.getAttribute("data-selected")).toBe("true");
    expect(container.textContent).toContain("编辑所选事件");

    const playButton = findButton(container, "播放草稿");
    await click(findButton(container, "固定 C 简谱"));
    expect(findButton(container, "固定 C 简谱").getAttribute("aria-checked"))
      .toBe("true");
    expect(
      container.querySelector('[data-testid="local-score-project-staff-preview"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-testid="local-score-project-numbered-preview"]'),
    ).not.toBeNull();
    expect(container.textContent).toContain("编辑所选事件");
    expect(findButton(container, "播放草稿")).toBe(playButton);

    await click(findButton(container, "五线谱"));
    expect(findButton(container, "五线谱").getAttribute("aria-checked"))
      .toBe("true");
    expect(
      container.querySelector(
        '[data-testid="local-score-project-staff-preview"] '
          + '[data-event-id="event-test-2"]',
      )?.getAttribute("data-selected"),
    ).toBe("true");
    expect(findButton(container, "播放草稿")).toBe(playButton);
  });

  it("谱号与调号仅在保存成功后发布，并可随撤销恢复", async () => {
    const store = new MemoryProjectStore();
    const container = await renderPanel(store);
    await click(findButton(container, "创建并保存"));

    await change(findSelect(container, "谱号"), "bass");
    await waitFor(
      () => store.values.get("test-1")?.document.parts[0]?.staves[0]?.clef
        === "bass",
      "保存低音谱号",
    );
    expect(container.textContent).toContain("低音谱号");

    await change(findSelect(container, "调号"), "1");
    await waitFor(
      () => store.values.get("test-1")?.document.keySignature.fifths === 1,
      "保存一个升号",
    );
    expect(findSelect(container, "调号").value).toBe("1");

    store.failNextPut = new LocalScoreProjectStorageError(
      "write-failed",
      "测试写入失败，原调号保持不变。",
    );
    await change(findSelect(container, "调号"), "-1");
    await waitFor(
      () => container.textContent?.includes("测试写入失败") ?? false,
      "显示调号保存失败",
    );
    expect(findSelect(container, "调号").value).toBe("1");
    expect(store.values.get("test-1")?.document.keySignature.fifths).toBe(1);

    await click(findButton(container, "撤销"));
    await waitFor(
      () => store.values.get("test-1")?.document.keySignature.fifths === 0,
      "撤销调号修改",
    );
    expect(findSelect(container, "谱号").value).toBe("bass");
    expect(findSelect(container, "调号").value).toBe("0");
  });

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

  it("速度自动保存失败时播放区保持旧值，恢复后可按原草稿重试并重开", async () => {
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
    await waitForAutosave();
    await waitFor(
      () => container.textContent?.includes("本机存储写入失败") ?? false,
      "显示速度保存失败",
    );
    expect(container.textContent).toContain("已保存速度：90 BPM");
    expect(findInput(container, "速度（BPM）").value).toBe("72");
    expect(Array.from(store.values.values())[0]?.tempoBpm).toBe(90);

    await click(findButton(container, "重试自动保存"));
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

  it("恢复候选暂存失败时 canonical 保持不变并可重试", async () => {
    const store = new MemoryProjectStore();
    const container = await renderPanel(store);
    await click(findButton(container, "创建并保存"));
    store.failNextStage = new LocalScoreProjectStorageError(
      "quota",
      "恢复候选暂存空间不足。",
    );
    await change(findInput(container, "项目名称"), "暂存失败草稿");
    await waitForAutosave();
    await waitFor(
      () => container.textContent?.includes("恢复候选暂存空间不足") ?? false,
      "显示候选暂存失败",
    );
    expect(Array.from(store.values.values())[0]?.document.revision).toBe(1);
    expect(store.candidates.size).toBe(0);

    await click(findButton(container, "重试自动保存"));
    await waitFor(
      () => Array.from(store.values.values())[0]?.title === "暂存失败草稿",
      "暂存恢复后重试成功",
    );
    expect(Array.from(store.values.values())[0]?.document.revision).toBe(2);
  });

  it("名称与速度在停止输入后合并为一个自动保存修订", async () => {
    const store = new MemoryProjectStore();
    const container = await renderPanel(store);
    await click(findButton(container, "创建并保存"));

    await change(findInput(container, "项目名称"), "自动保存练习");
    await change(findInput(container, "速度（BPM）"), "108");
    expect(findButton(container, "启动节拍器").disabled).toBe(true);
    expect(
      Array.from(container.querySelectorAll("button"))
        .some((button) => button.textContent?.trim() === "保存名称"),
    ).toBe(false);
    expect(
      Array.from(container.querySelectorAll("button"))
        .some((button) => button.textContent?.trim() === "保存速度"),
    ).toBe(false);

    await waitForAutosave();
    await waitFor(
      () => container.textContent?.includes("名称与速度已自动保存到修订 2")
        ?? false,
      "名称与速度自动保存完成",
    );
    const stored = Array.from(store.values.values())[0];
    expect(stored?.title).toBe("自动保存练习");
    expect(stored?.tempoBpm).toBe(108);
    expect(stored?.document.revision).toBe(2);
    expect(store.candidates.size).toBe(0);
    expect(findButton(container, "启动节拍器").disabled).toBe(false);
  });

  it("停止输入 599 毫秒不保存，到 600 毫秒才启动保存", async () => {
    vi.useFakeTimers();
    try {
      const store = new MemoryProjectStore();
      const project = createLocalScoreProject({
        projectId: "debounce-project",
        title: "防抖项目",
        now: "2026-07-24T06:10:00.000Z",
      });
      await store.put(project, null);
      const container = document.createElement("div");
      document.body.append(container);
      root = createRoot(container);
      await act(async () => {
        root?.render(
          <StrictMode>
            <AutosaveTransportHarness
              store={store}
              initialProject={project}
              initialMode="idle"
            />
          </StrictMode>,
        );
        await Promise.resolve();
      });
      await act(async () => {
        await Promise.resolve();
      });

      const input = findInput(container, "项目名称");
      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )?.set;
        setter?.call(input, "600 毫秒草稿");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(599);
      });
      expect(store.stageCalls).toBe(0);
      expect(store.promoteCalls).toBe(0);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
        await Promise.resolve();
      });
      expect(store.stageCalls).toBe(1);
      expect(store.promoteCalls).toBe(1);
      expect(Array.from(store.values.values())[0]?.title).toBe("600 毫秒草稿");
    } finally {
      vi.useRealTimers();
    }
  });

  it("设置草稿保存完成前阻止谱面结构写入，避免跨修订竞态", async () => {
    const store = new MemoryProjectStore();
    const container = await renderPanel(store);
    await click(findButton(container, "创建并保存"));

    await change(findInput(container, "项目名称"), "待保存设置");
    await click(findButton(container, "添加到第 1 小节并保存"));
    expect(container.textContent).toContain(
      "请先等待名称与速度自动保存，或处理恢复候选后再修改谱面",
    );
    expect(Array.from(store.values.values())[0]?.document.revision).toBe(1);
    expect(container.textContent).not.toContain("C4 · 四分音符");

    await waitForAutosave();
    await waitFor(
      () => Array.from(store.values.values())[0]?.title === "待保存设置",
      "先完成设置自动保存",
    );
    await click(findButton(container, "添加到第 1 小节并保存"));
    await waitFor(
      () => container.textContent?.includes("C4 · 四分音符") ?? false,
      "设置保存后允许谱面写入",
    );
    expect(Array.from(store.values.values())[0]?.document.revision).toBe(3);
  });

  it("较旧的异步保存完成时不覆盖更新的名称草稿", async () => {
    const store = new MemoryProjectStore();
    let releasePromotion: () => void = () => {
      throw new Error("第一轮自动保存没有等待提交");
    };
    store.beforePromote = () => new Promise<void>((resolve) => {
      releasePromotion = resolve;
    });
    const container = await renderPanel(store);
    await click(findButton(container, "创建并保存"));

    await change(findInput(container, "项目名称"), "较旧草稿");
    await waitForAutosave();
    await waitFor(() => store.promoteCalls === 1, "第一轮自动保存进入提交阶段");
    await change(findInput(container, "项目名称"), "较新草稿");
    store.beforePromote = null;
    await act(async () => {
      releasePromotion();
    });
    await flushReact();

    expect(findInput(container, "项目名称").value).toBe("较新草稿");
    expect(Array.from(store.values.values())[0]?.title).toBe("较旧草稿");
    await waitForAutosave();
    await waitFor(
      () => Array.from(store.values.values())[0]?.title === "较新草稿",
      "第二轮自动保存提交较新草稿",
    );
    expect(findInput(container, "项目名称").value).toBe("较新草稿");
    expect(Array.from(store.values.values())[0]?.document.revision).toBe(3);
  });

  it("返回列表后迟到的自动保存结果不会重新打开旧项目", async () => {
    const store = new MemoryProjectStore();
    let releasePromotion: () => void = () => {
      throw new Error("自动保存没有进入提交阶段");
    };
    store.beforePromote = () => new Promise<void>((resolve) => {
      releasePromotion = resolve;
    });
    const container = await renderPanel(store);
    await click(findButton(container, "创建并保存"));
    await change(findInput(container, "项目名称"), "离开前草稿");
    await waitForAutosave();
    await waitFor(() => store.promoteCalls === 1, "自动保存进入提交阶段");

    await click(findButton(container, "返回项目列表"));
    expect(container.textContent).toContain("本机已保存项目");
    store.beforePromote = null;
    await act(async () => {
      releasePromotion();
    });
    await flushReact();

    expect(container.textContent).toContain("本机已保存项目");
    expect(container.textContent).not.toContain("第一声部预览");
  });

  it("播放期间只暂存一次同一候选，停止后再提升为正式修订", async () => {
    const store = new MemoryProjectStore();
    const project = createLocalScoreProject({
      projectId: "transport-autosave-project",
      title: "播放中项目",
      now: "2026-07-24T07:00:00.000Z",
    });
    await store.put(project, null);
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <StrictMode>
          <AutosaveTransportHarness store={store} initialProject={project} />
        </StrictMode>,
      );
    });
    await flushReact();

    await change(findInput(container, "项目名称"), "播放中草稿");
    await waitForAutosave();
    await waitFor(
      () => store.stageCalls === 1 && store.candidates.size === 1,
      "播放时只暂存恢复候选",
    );
    expect(Array.from(store.values.values())[0]?.document.revision).toBe(1);
    expect(container.textContent).toContain("deferred");

    await waitForAutosave();
    expect(store.stageCalls).toBe(1);
    expect(store.promoteCalls).toBe(0);

    await click(findButton(container, "停止播放"));
    await waitForAutosave();
    await waitFor(
      () => Array.from(store.values.values())[0]?.title === "播放中草稿",
      "停止播放后提升恢复候选",
    );
    expect(store.stageCalls).toBe(1);
    expect(store.promoteCalls).toBe(1);
    expect(store.candidates.size).toBe(0);
    expect(Array.from(store.values.values())[0]?.document.revision).toBe(2);
  });

  it("初次加载后出现的外部候选会阻塞自动保存而不会被递增覆盖", async () => {
    const store = new MemoryProjectStore();
    const project = createLocalScoreProject({
      projectId: "concurrent-recovery-project",
      title: "并发恢复项目",
      now: "2026-07-24T07:10:00.000Z",
    });
    await store.put(project, null);
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <StrictMode>
          <AutosaveTransportHarness store={store} initialProject={project} />
        </StrictMode>,
      );
    });
    await flushReact();

    const externalProposal = changeLocalScoreProjectSettings({
      project,
      expectedRevision: project.document.revision,
      title: "另一页面草稿",
      tempoBpm: project.tempoBpm,
      now: "2026-07-24T07:10:01.000Z",
    });
    await store.stageRecoveryCandidate(
      createLocalScoreProjectRecoveryCandidate({
        candidateId: project.projectId,
        candidateSequence: 1,
        capturedAt: "2026-07-24T07:10:02.000Z",
        baseProject: project,
        proposedProject: externalProposal,
      }),
      null,
    );

    await change(findInput(container, "项目名称"), "当前页面草稿");
    await click(findButton(container, "停止播放"));
    await waitForAutosave();
    await waitFor(
      () => container.textContent?.includes("recovery-available") ?? false,
      "外部候选阻塞当前自动保存",
    );
    expect(store.stageCalls).toBe(1);
    expect(store.promoteCalls).toBe(0);
    expect(Array.from(store.values.values())[0]?.document.revision).toBe(1);
    expect(Array.from(store.candidates.values())[0]?.proposedProject.title)
      .toBe("另一页面草稿");
  });

  it("重新打开时明确选择恢复或丢弃候选，不会自动套用", async () => {
    const store = new MemoryProjectStore();
    const container = await renderPanel(store);
    await click(findButton(container, "创建并保存"));
    const baseProject = Array.from(store.values.values())[0];
    if (!baseProject) throw new Error("找不到恢复测试的基准项目");
    const proposedProject = changeLocalScoreProjectSettings({
      project: baseProject,
      expectedRevision: baseProject.document.revision,
      title: "中断前草稿",
      tempoBpm: 76,
      now: "2026-07-24T06:00:00.000Z",
    });
    await store.stageRecoveryCandidate(
      createLocalScoreProjectRecoveryCandidate({
        candidateId: baseProject.projectId,
        candidateSequence: 1,
        capturedAt: "2026-07-24T06:00:01.000Z",
        baseProject,
        proposedProject,
      }),
      null,
    );

    await click(findButton(container, "返回项目列表"));
    await click(findButton(container, "打开"));
    await waitFor(
      () => container.textContent?.includes("发现一份未完成的名称或速度修改")
        ?? false,
      "显示恢复候选",
    );
    expect(findInput(container, "项目名称").value).toBe(baseProject.title);
    expect(findInput(container, "速度（BPM）").value).toBe("90");
    expect(Array.from(store.values.values())[0]?.document.revision).toBe(1);

    store.failNextPromote = new LocalScoreProjectStorageError(
      "transaction-failed",
      "恢复事务暂时失败。",
    );
    await click(findButton(container, "恢复并保存"));
    await waitFor(
      () => container.textContent?.includes("恢复事务暂时失败") ?? false,
      "显示恢复失败",
    );
    expect(findButton(container, "恢复并保存")).toBeTruthy();
    expect(findButton(container, "丢弃")).toBeTruthy();
    expect(store.candidates.size).toBe(1);

    await click(findButton(container, "恢复并保存"));
    await waitFor(
      () => findInput(container, "项目名称").value === "中断前草稿",
      "明确恢复候选",
    );
    expect(findInput(container, "速度（BPM）").value).toBe("76");
    expect(Array.from(store.values.values())[0]?.document.revision).toBe(2);
    expect(store.candidates.size).toBe(0);

    const recovered = Array.from(store.values.values())[0];
    if (!recovered) throw new Error("找不到恢复后的项目");
    const discardedProposal = changeLocalScoreProjectSettings({
      project: recovered,
      expectedRevision: recovered.document.revision,
      title: "应被丢弃",
      tempoBpm: 64,
      now: "2026-07-24T06:00:02.000Z",
    });
    await store.stageRecoveryCandidate(
      createLocalScoreProjectRecoveryCandidate({
        candidateId: recovered.projectId,
        candidateSequence: 1,
        capturedAt: "2026-07-24T06:00:03.000Z",
        baseProject: recovered,
        proposedProject: discardedProposal,
      }),
      null,
    );
    await click(findButton(container, "返回项目列表"));
    await click(findButton(container, "打开"));
    await waitFor(
      () => container.textContent?.includes("发现一份未完成的名称或速度修改")
        ?? false,
      "再次显示恢复候选",
    );
    store.failNextDiscard = new LocalScoreProjectStorageError(
      "transaction-failed",
      "丢弃事务暂时失败。",
    );
    await click(findButton(container, "丢弃"));
    await waitFor(
      () => container.textContent?.includes("丢弃事务暂时失败") ?? false,
      "显示丢弃失败",
    );
    expect(findButton(container, "恢复并保存")).toBeTruthy();
    expect(findButton(container, "丢弃")).toBeTruthy();
    expect(store.candidates.size).toBe(1);

    await click(findButton(container, "丢弃"));
    await waitFor(
      () => container.textContent?.includes("未完成恢复候选已丢弃") ?? false,
      "明确丢弃恢复候选",
    );
    expect(Array.from(store.values.values())[0]?.document.revision).toBe(2);
    expect(Array.from(store.values.values())[0]?.title).toBe("中断前草稿");
    expect(store.candidates.size).toBe(0);
  });

  it("显式恢复单飞，返回列表后迟到结果不会重新打开项目", async () => {
    const store = new MemoryProjectStore();
    const container = await renderPanel(store);
    await click(findButton(container, "创建并保存"));
    const baseProject = Array.from(store.values.values())[0];
    if (!baseProject) throw new Error("找不到显式恢复基准项目");
    const proposedProject = changeLocalScoreProjectSettings({
      project: baseProject,
      expectedRevision: baseProject.document.revision,
      title: "显式恢复草稿",
      tempoBpm: 84,
      now: "2026-07-24T06:20:00.000Z",
    });
    await store.stageRecoveryCandidate(
      createLocalScoreProjectRecoveryCandidate({
        candidateId: baseProject.projectId,
        candidateSequence: 1,
        capturedAt: "2026-07-24T06:20:01.000Z",
        baseProject,
        proposedProject,
      }),
      null,
    );
    await click(findButton(container, "返回项目列表"));
    await click(findButton(container, "打开"));
    await waitFor(
      () => container.textContent?.includes("发现一份未完成的名称或速度修改")
        ?? false,
      "显示待恢复候选",
    );

    let releasePromotion: () => void = () => {
      throw new Error("显式恢复没有进入提交阶段");
    };
    store.beforePromote = () => new Promise<void>((resolve) => {
      releasePromotion = resolve;
    });
    await click(findButton(container, "恢复并保存"));
    expect(findButton(container, "恢复并保存").disabled).toBe(true);
    expect(findButton(container, "丢弃").disabled).toBe(true);
    await click(findButton(container, "返回项目列表"));
    store.beforePromote = null;
    await act(async () => {
      releasePromotion();
    });
    await flushReact();

    expect(container.textContent).toContain("本机已保存项目");
    expect(container.textContent).not.toContain("第一声部预览");
  });

  it("显式恢复 pending 时重开同项目不会启动第二个事务", async () => {
    const store = new MemoryProjectStore();
    const container = await renderPanel(store);
    await click(findButton(container, "创建并保存"));
    const baseProject = Array.from(store.values.values())[0];
    if (!baseProject) throw new Error("找不到重入恢复基准项目");
    const proposedProject = changeLocalScoreProjectSettings({
      project: baseProject,
      expectedRevision: baseProject.document.revision,
      title: "单飞恢复草稿",
      tempoBpm: 82,
      now: "2026-07-24T06:25:00.000Z",
    });
    await store.stageRecoveryCandidate(
      createLocalScoreProjectRecoveryCandidate({
        candidateId: baseProject.projectId,
        candidateSequence: 1,
        capturedAt: "2026-07-24T06:25:01.000Z",
        baseProject,
        proposedProject,
      }),
      null,
    );
    await click(findButton(container, "返回项目列表"));
    await click(findButton(container, "打开"));
    await waitFor(
      () => container.textContent?.includes("发现一份未完成的名称或速度修改")
        ?? false,
      "显示单飞恢复候选",
    );

    let releasePromotion: () => void = () => {
      throw new Error("单飞恢复没有进入提交阶段");
    };
    store.beforePromote = () => new Promise<void>((resolve) => {
      releasePromotion = resolve;
    });
    await click(findButton(container, "恢复并保存"));
    await click(findButton(container, "返回项目列表"));
    await click(findButton(container, "打开"));
    await waitFor(
      () => container.textContent?.includes("发现一份未完成的名称或速度修改")
        ?? false,
      "pending 时重开同项目",
    );
    expect(findButton(container, "恢复并保存").disabled).toBe(true);
    expect(findButton(container, "丢弃").disabled).toBe(true);
    expect(store.promoteCalls).toBe(1);

    store.beforePromote = null;
    await act(async () => {
      releasePromotion();
    });
    await waitFor(
      () => findInput(container, "项目名称").value === "单飞恢复草稿",
      "原恢复事务完成后同步当前项目",
    );
    expect(store.promoteCalls).toBe(1);
    expect(store.candidates.size).toBe(0);
    expect(container.textContent).not.toContain("发现一份未完成的名称或速度修改");
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

  it("附点、延音线和歌词只在保存成功后发布，非法破坏延音关系会保留原谱", async () => {
    const store = new MemoryProjectStore();
    const container = await renderPanel(store);
    await click(findButton(container, "创建并保存"));
    await click(findButton(container, "添加到第 1 小节并保存"));
    await click(findButton(container, "添加到第 1 小节并保存"));
    await waitFor(
      () => container.querySelectorAll("button").length > 0
        && (container.textContent?.match(/C4 · 四分音符/g)?.length ?? 0) === 2,
      "保存两个相邻同音",
    );

    const editButtons = Array.from(container.querySelectorAll("button"))
      .filter((button) => button.textContent?.trim() === "编辑");
    if (!editButtons[0]) throw new Error("找不到第一个事件编辑按钮");
    await click(editButtons[0]);
    await click(findInput(container, "一个附点"));
    await click(findInput(container, "延音到下一个同音"));
    await change(findInput(container, "歌词"), "啦");

    store.failNextPut = new LocalScoreProjectStorageError(
      "write-failed",
      "本机存储写入失败，乐谱项目未保存；原有项目保持不变。请恢复存储条件后重试。",
    );
    await click(findButton(container, "更新所选事件并保存"));
    await waitFor(
      () => container.textContent?.includes("本机存储写入失败") ?? false,
      "扩展记谱保存失败",
    );
    let firstEvent = Array.from(store.values.values())[0]
      ?.document.parts[0]?.staves[0]?.voices[0]?.measures[0]?.events[0];
    expect(firstEvent?.augmentationDots).toBe(0);
    expect(firstEvent?.type === "note" && firstEvent.tieToNext).toBe(false);
    expect(firstEvent?.type === "note" && firstEvent.lyric).toBe(null);
    expect(container.textContent).not.toContain("歌词：啦");

    await click(findButton(container, "更新所选事件并保存"));
    await waitFor(
      () => container.textContent?.includes("歌词：啦") ?? false,
      "恢复后保存附点延音和歌词",
    );
    firstEvent = Array.from(store.values.values())[0]
      ?.document.parts[0]?.staves[0]?.voices[0]?.measures[0]?.events[0];
    expect(firstEvent?.augmentationDots).toBe(1);
    expect(firstEvent?.type === "note" && firstEvent.tieToNext).toBe(true);
    expect(firstEvent?.type === "note" && firstEvent.lyric).toBe("啦");

    await click(findButton(container, "复制所选事件"));
    expect(container.textContent).toContain("单事件复制不包含跨事件延音关系");

    const refreshedEditButtons = Array.from(container.querySelectorAll("button"))
      .filter((button) => button.textContent?.trim() === "编辑");
    if (!refreshedEditButtons[1]) throw new Error("找不到第二个事件编辑按钮");
    await click(refreshedEditButtons[1]);
    await change(findSelect(container, "音高"), "G4");
    await click(findButton(container, "更新所选事件并保存"));
    const tieIntegrityNotice =
      "延音线必须连接同一声部中相邻、同音高且时值连续的音符；跨小节时必须结束于小节线并从下一小节第一拍开始。未执行修改，已保存谱面保持不变。";
    await waitFor(
      () => container.textContent?.includes(tieIntegrityNotice) ?? false,
      "传播完整的延音关系中文拒绝原因",
    );
    expect(container.textContent).toContain(tieIntegrityNotice);
    const storedEvents = Array.from(store.values.values())[0]
      ?.document.parts[0]?.staves[0]?.voices[0]?.measures[0]?.events;
    expect(storedEvents?.[0]?.type === "note" && storedEvents[0].tieToNext)
      .toBe(true);
    expect(storedEvents?.[1]?.type === "note" && storedEvents[1].pitch)
      .toBe("C4");
  });

  it("跨小节延音存在时值间隙时传播中文原因并保持已保存谱面", async () => {
    const store = new MemoryProjectStore();
    const container = await renderPanel(store);
    await click(findButton(container, "创建并保存"));
    await click(findButton(container, "添加到第 1 小节并保存"));
    await click(findButton(container, "追加空小节"));
    await change(findSelect(container, "目标小节"), "2");
    await click(findButton(container, "添加到第 2 小节并保存"));
    await waitFor(
      () => container.textContent?.includes("第 2 小节 · C4 · 四分音符")
        ?? false,
      "保存跨小节目标音符",
    );

    const editButtons = Array.from(container.querySelectorAll("button"))
      .filter((button) => button.textContent?.trim() === "编辑");
    if (!editButtons[0]) throw new Error("找不到跨小节延音来源编辑按钮");
    await click(editButtons[0]);
    await click(findInput(container, "延音到下一个同音"));
    const revisionBeforeRejectedTie = Array.from(store.values.values())[0]
      ?.document.revision;
    await click(findButton(container, "更新所选事件并保存"));

    const tieContinuityNotice =
      "延音线必须连接同一声部中相邻、同音高且时值连续的音符；跨小节时必须结束于小节线并从下一小节第一拍开始。未执行修改，已保存谱面保持不变。";
    await waitFor(
      () => container.textContent?.includes(tieContinuityNotice) ?? false,
      "传播跨小节延音时值间隙的完整中文原因",
    );
    expect(container.textContent).toContain(tieContinuityNotice);

    const storedProject = Array.from(store.values.values())[0];
    const storedEvents = storedProject
      ?.document.parts[0]?.staves[0]?.voices[0]?.measures
      .flatMap((measure) => measure.events);
    expect(storedProject?.document.revision).toBe(revisionBeforeRejectedTie);
    expect(storedEvents).toHaveLength(2);
    expect(
      storedEvents?.[0]?.type === "note" && storedEvents[0].tieToNext,
    ).toBe(false);
    expect(
      storedEvents?.[1]?.type === "note" && storedEvents[1].pitch,
    ).toBe("C4");
  });
});
