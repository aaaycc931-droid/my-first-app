import { StrictMode, act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  LocalScoreProjectConflictError,
  addLocalScoreProjectEvent,
  addLocalScoreProjectPart,
  addLocalScoreProjectStaff,
  addLocalScoreProjectVoice,
  applyLocalScoreProjectContent,
  changeLocalScoreProjectEventFermataMark,
  changeLocalScoreProjectEventSlur,
  changeLocalScoreProjectSettings,
  cloneLocalScoreProject,
  createLocalScoreProject,
  getLocalScoreProjectContent,
  renameLocalScoreProjectPart,
  type LocalScoreProjectV1,
} from "../../lib/music/localScoreProject";
import {
  cloneLocalScoreProjectRecoveryCandidate,
  createLocalScoreProjectRecoveryCandidate,
  type LocalScoreProjectRecoveryCandidateV1,
} from "../../lib/music/localScoreProjectRecovery";
import {
  createBrowserFileDownloadPort,
} from "../../lib/platform/browserFileDownload";
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
  putCalls = 0;

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
    this.putCalls += 1;
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
const originalCreateObjectUrl = Object.getOwnPropertyDescriptor(
  URL,
  "createObjectURL",
);
const originalRevokeObjectUrl = Object.getOwnPropertyDescriptor(
  URL,
  "revokeObjectURL",
);

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

const findSelectExact = (
  container: ParentNode,
  label: string,
): HTMLSelectElement => {
  const wrapper = Array.from(container.querySelectorAll("label")).find(
    (candidate) => candidate.childNodes[0]?.textContent?.trim() === label,
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

const supportedMusicXml = ({
  extraNoteMarkup = "",
  pitchStep = "C",
  pitchOctave = "4",
}: {
  extraNoteMarkup?: string;
  pitchStep?: string;
  pitchOctave?: string;
} = {}) => `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>导入声部</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>2</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        ${extraNoteMarkup}
        <pitch><step>${pitchStep}</step><octave>${pitchOctave}</octave></pitch>
        <duration>2</duration>
        <voice>1</voice>
        <type>quarter</type>
        <staff>1</staff>
        <notations><fermata/></notations>
      </note>
      <note>
        <rest/>
        <duration>2</duration>
        <voice>1</voice>
        <type>quarter</type>
        <staff>1</staff>
        <notations><fermata/></notations>
      </note>
    </measure>
  </part>
</score-partwise>`;

const supportedTiedMusicXml = () => supportedMusicXml()
  .replace(
    "<duration>2</duration>\n        <voice>1</voice>",
    '<duration>2</duration>\n        <tie type="start"/>\n        <voice>1</voice>',
  )
  .replace(
    "<notations><fermata/></notations>",
    '<notations><fermata/><tied type="start"/></notations>',
  )
  .replace(
    `<rest/>
        <duration>2</duration>
        <voice>1</voice>
        <type>quarter</type>
        <staff>1</staff>
        <notations><fermata/></notations>`,
    `<pitch><step>C</step><octave>4</octave></pitch>
        <duration>2</duration>
        <tie type="stop"/>
        <voice>1</voice>
        <type>quarter</type>
        <staff>1</staff>
        <notations><fermata/><tied type="stop"/></notations>`,
  );

const selectMusicXmlImportFile = async ({
  container,
  xml,
  fileName,
}: {
  container: ParentNode;
  xml: string;
  fileName: string;
}) => {
  const input = container.querySelector<HTMLInputElement>(
    'input[aria-label="选择要导入的 MusicXML 或 MXL"]',
  );
  if (!input) throw new Error("找不到本机谱项目 MusicXML 导入输入");
  const file = new File([xml], fileName, { type: "application/xml" });
  Object.defineProperty(file, "text", {
    configurable: true,
    value: async () => xml,
  });
  Object.defineProperty(input, "files", {
    configurable: true,
    value: [file],
  });
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
  });
  await waitFor(
    () => container.querySelector(
      "[data-testid='local-score-project-musicxml-import-draft']",
    ) !== null,
    `生成 ${fileName} 的内存导入候选`,
  );
};

const dispatchMusicXmlImportFile = ({
  container,
  file,
}: {
  container: ParentNode;
  file: File;
}) => {
  const input = container.querySelector<HTMLInputElement>(
    'input[aria-label="选择要导入的 MusicXML 或 MXL"]',
  );
  if (!input) throw new Error("找不到本机谱项目 MusicXML 导入输入");
  Object.defineProperty(input, "files", {
    configurable: true,
    value: [file],
  });
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

const createSupportedMusicXmlExportProject = ({
  projectId = "supported-musicxml-export-project",
  title = "受支持导出",
}: {
  projectId?: string;
  title?: string;
} = {}) => {
  const base = createLocalScoreProject({
    projectId,
    title,
    now: "2026-07-27T07:00:00.000Z",
  });
  const withNote = addLocalScoreProjectEvent({
    project: base,
    expectedRevision: base.document.revision,
    location: {
      partId: "part-1",
      staffId: "staff-1",
      voiceId: "voice-1",
      measureNumber: 1,
    },
    eventId: `${projectId}-event-1`,
    input: {
      type: "note",
      pitch: "C4",
      duration: "quarter",
      augmentationDots: 0,
      tieToNext: false,
      lyric: null,
    },
    now: "2026-07-27T07:00:01.000Z",
  });
  return changeLocalScoreProjectEventFermataMark({
    project: withNote,
    expectedRevision: withNote.document.revision,
    location: {
      partId: "part-1",
      staffId: "staff-1",
      voiceId: "voice-1",
      measureNumber: 1,
    },
    eventId: `${projectId}-event-1`,
    fermataMark: "fermata",
    now: "2026-07-27T07:00:02.000Z",
  });
};

const installDownloadSpies = ({
  createObjectUrlFailure = null,
  revokeObjectUrlFailure = null,
}: {
  createObjectUrlFailure?: Error | null;
  revokeObjectUrlFailure?: Error | null;
} = {}) => {
  const createObjectUrl = vi.fn((blob: Blob) => {
    if (createObjectUrlFailure) throw createObjectUrlFailure;
    expect(blob).toBeInstanceOf(Blob);
    return "blob:local-score-project-export";
  });
  const revokeObjectUrl = vi.fn((_url: string) => {
    if (revokeObjectUrlFailure) throw revokeObjectUrlFailure;
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: createObjectUrl,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: revokeObjectUrl,
  });
  const anchorDownloads: Array<{ download: string; href: string }> = [];
  const anchorClick = vi.spyOn(
    HTMLAnchorElement.prototype,
    "click",
  ).mockImplementation(function (this: HTMLAnchorElement) {
    anchorDownloads.push({ download: this.download, href: this.href });
  });
  return {
    anchorClick,
    anchorDownloads,
    createObjectUrl,
    revokeObjectUrl,
  };
};

const expectProjectSnapshotUnchanged = ({
  store,
  projectId,
  snapshot,
}: {
  store: MemoryProjectStore;
  projectId: string;
  snapshot: string;
}) => {
  expect(JSON.stringify(store.values.get(projectId))).toBe(snapshot);
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
    () => store.values.size === 0
      ? container.textContent?.includes("还没有已保存的谱项目。") ?? false
      : Array.from(container.querySelectorAll("button"))
        .some((button) => button.textContent?.trim() === "打开"),
    "读取项目列表",
  );
  return container;
};

beforeEach(() => document.body.replaceChildren());

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
    root = null;
  }
  vi.restoreAllMocks();
  if (originalCreateObjectUrl) {
    Object.defineProperty(URL, "createObjectURL", originalCreateObjectUrl);
  } else {
    Reflect.deleteProperty(URL, "createObjectURL");
  }
  if (originalRevokeObjectUrl) {
    Object.defineProperty(URL, "revokeObjectURL", originalRevokeObjectUrl);
  } else {
    Reflect.deleteProperty(URL, "revokeObjectURL");
  }
});

describe("S1 本机谱项目面板", () => {
  it("浏览器下载端口同步点击并只写入 Uint8Array view 的有效字节", async () => {
    const scheduledCleanups: Array<() => void> = [];
    const source = new Uint8Array([90, 1, 2, 3, 91]);
    const data = source.subarray(1, 4);
    let downloadReturned = false;
    let createdBlob: Blob | null = null;
    const createObjectUrl = vi.fn((blob: Blob) => {
      createdBlob = blob;
      return "blob:browser-file-download-port";
    });
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrl,
    });
    const anchorClick = vi.spyOn(
      HTMLAnchorElement.prototype,
      "click",
    ).mockImplementation(function (this: HTMLAnchorElement) {
      expect(downloadReturned).toBe(false);
      expect(document.body.contains(this)).toBe(true);
      expect(this.download).toBe("有效字节.mxl");
    });
    const port = createBrowserFileDownloadPort({
      scheduleCleanup: (cleanup) => scheduledCleanups.push(cleanup),
    });

    port.download({
      data,
      fileName: "有效字节.mxl",
      mimeType: "application/vnd.recordare.musicxml",
    });
    downloadReturned = true;

    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(document.querySelector("a")).toBeNull();
    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(createdBlob).not.toBeNull();
    expect(Array.from(new Uint8Array(await createdBlob!.arrayBuffer())))
      .toEqual([1, 2, 3]);
    expect(scheduledCleanups).toHaveLength(1);
    scheduledCleanups[0]?.();
    scheduledCleanups[0]?.();
    expect(revokeObjectUrl).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith(
      "blob:browser-file-download-port",
    );
  });

  it("浏览器下载端口在 click 失败时仍移除锚点且 URL 清理和错误通知只执行一次", () => {
    const scheduledCleanups: Array<() => void> = [];
    const cleanupError = new Error("URL 清理失败");
    const onCleanupError = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:failed-browser-file-download"),
    });
    const revokeObjectUrl = vi.fn(() => {
      throw cleanupError;
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrl,
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      throw new Error("浏览器拒绝下载");
    });
    const port = createBrowserFileDownloadPort({
      scheduleCleanup: (cleanup) => scheduledCleanups.push(cleanup),
    });

    expect(() => port.download({
      data: "<score-partwise/>",
      fileName: "失败.musicxml",
      mimeType: "application/vnd.recordare.musicxml+xml",
      onCleanupError,
    })).toThrow("浏览器拒绝下载");
    expect(document.querySelector("a")).toBeNull();
    expect(scheduledCleanups).toHaveLength(1);

    scheduledCleanups[0]?.();
    scheduledCleanups[0]?.();
    expect(revokeObjectUrl).toHaveBeenCalledTimes(1);
    expect(onCleanupError).toHaveBeenCalledTimes(1);
    expect(onCleanupError).toHaveBeenCalledWith(cleanupError);
  });

  it("受支持 MusicXML 只生成内存候选，明确确认后才新增并打开已保存项目", async () => {
    const store = new MemoryProjectStore();
    const container = await renderPanel(store);

    await selectMusicXmlImportFile({
      container,
      xml: supportedMusicXml(),
      fileName: "受支持导入.musicxml",
    });

    expect(store.putCalls).toBe(0);
    expect(store.values.size).toBe(0);
    expect(container.textContent).toContain(
      "候选已就绪：1 小节、2 个事件。请检查问题清单和谱面后明确确认。",
    );
    expect(container.textContent).toContain("可确认候选");
    expect(container.textContent).toContain(
      "当前受支持子集没有发现需要披露的问题。",
    );
    const confirm = findButton(container, "我已检查，确认新增并保存");
    expect(confirm.disabled).toBe(false);

    await click(confirm);
    await waitFor(
      () => container.textContent?.includes(
        "MusicXML/MXL 候选已确认并原子保存在本机；现在打开的是保存后的 canonical 项目。",
      ) ?? false,
      "确认后原子保存并打开导入项目",
    );

    expect(store.putCalls).toBe(1);
    expect(store.values.size).toBe(1);
    expect(
      container.querySelector(
        "[data-testid='local-score-project-musicxml-import-draft']",
      ),
    ).toBeNull();
    const stored = Array.from(store.values.values())[0];
    expect(stored?.title).toBe("受支持导入");
    expect(stored?.document.parts[0]?.staves[0]?.voices[0]?.measures[0]?.events)
      .toMatchObject([
        {
          type: "note",
          pitch: "C4",
          duration: "quarter",
          fermataMark: "fermata",
        },
        {
          type: "rest",
          pitch: null,
          duration: "quarter",
          fermataMark: "fermata",
        },
      ]);
    expect(container.textContent).toContain("受支持导入");
    expect(container.textContent).toContain("第 1 小节 · C4 · 四分音符");
  });

  it("快速替换或清除导入文件时忽略过期的异步读取结果", async () => {
    const store = new MemoryProjectStore();
    const container = await renderPanel(store);
    const oldReadState: {
      release: ((xml: string) => void) | null;
    } = { release: null };
    const oldRead = new Promise<string>((resolve) => {
      oldReadState.release = resolve;
    });
    const oldFile = new File(["old"], "旧文件.musicxml", {
      type: "application/xml",
    });
    Object.defineProperty(oldFile, "text", {
      configurable: true,
      value: () => oldRead,
    });

    dispatchMusicXmlImportFile({ container, file: oldFile });
    await flushReact();
    expect(container.textContent).toContain("正在本机解析并检查受支持语义");

    const replacementFile = new File(
      [supportedMusicXml()],
      "新文件.musicxml",
      { type: "application/xml" },
    );
    Object.defineProperty(replacementFile, "text", {
      configurable: true,
      value: async () => supportedMusicXml(),
    });
    dispatchMusicXmlImportFile({ container, file: replacementFile });
    await waitFor(
      () => container.querySelector(
        "[data-testid='local-score-project-musicxml-import-draft']",
      ) !== null,
      "替换文件生成新候选",
    );
    expect(container.textContent).toContain("新文件.musicxml");

    oldReadState.release?.(supportedMusicXml({ pitchStep: "D" }));
    await flushReact();
    expect(container.textContent).toContain("新文件.musicxml");
    expect(container.textContent).not.toContain("旧文件.musicxml");

    await click(findButton(container, "清除导入候选"));
    expect(container.querySelector(
      "[data-testid='local-score-project-musicxml-import-draft']",
    )).toBeNull();
    expect(container.textContent).toContain(
      "MusicXML 导入候选已清除；没有写入或修改任何本机项目。",
    );
  });

  it("严格 tie 双标记导入后仅在明确确认时原子保存 canonical tie", async () => {
    const store = new MemoryProjectStore();
    const container = await renderPanel(store);

    await selectMusicXmlImportFile({
      container,
      xml: supportedTiedMusicXml(),
      fileName: "延音线导入.musicxml",
    });

    expect(store.putCalls).toBe(0);
    expect(findButton(container, "我已检查，确认新增并保存").disabled)
      .toBe(false);
    await click(findButton(container, "我已检查，确认新增并保存"));
    await waitFor(
      () => store.putCalls === 1,
      "确认后原子保存延音线项目",
    );

    const events = Array.from(store.values.values())[0]
      ?.document.parts[0]?.staves[0]?.voices[0]?.measures[0]?.events;
    expect(events).toMatchObject([
      {
        type: "note",
        pitch: "C4",
        tieToNext: true,
        fermataMark: "fermata",
      },
      {
        type: "note",
        pitch: "C4",
        tieToNext: false,
        fermataMark: "fermata",
      },
    ]);
  });

  it.each([
    [
      "IndexedDB quota",
      new LocalScoreProjectStorageError(
        "quota",
        "浏览器或 Android WebView 分配给 IndexedDB 的空间不足，乐谱项目未保存。",
      ),
    ],
    [
      "事务中止",
      new LocalScoreProjectStorageError(
        "transaction-failed",
        "IndexedDB 事务中止，导入项目未保存。",
      ),
    ],
  ])(
    "导入首次遭遇%s时不发布或删除旧数据并保留候选供重试",
    async (_failureName, failure) => {
      const store = new MemoryProjectStore();
      const existing = createLocalScoreProject({
        projectId: "existing-before-import",
        title: "导入前既有项目",
        now: "2026-07-27T06:00:00.000Z",
      });
      await store.put(existing, null);
      store.putCalls = 0;
      const existingBefore = JSON.stringify(
        store.values.get(existing.projectId),
      );
      const container = await renderPanel(store);

      await selectMusicXmlImportFile({
        container,
        xml: supportedMusicXml(),
        fileName: "可重试导入.xml",
      });
      store.failNextPut = failure;
      await click(findButton(container, "我已检查，确认新增并保存"));
      await waitFor(
        () => container.textContent?.includes(failure.message) ?? false,
        `${_failureName}失败关闭`,
      );

      expect(store.putCalls).toBe(1);
      expect(store.deleteCalls).toBe(0);
      expect(store.values.size).toBe(1);
      expect(JSON.stringify(store.values.get(existing.projectId)))
        .toBe(existingBefore);
      expect(
        container.querySelector(
          "[data-testid='local-score-project-musicxml-import-draft']",
        ),
      ).not.toBeNull();
      expect(findButton(container, "我已检查，确认新增并保存").disabled)
        .toBe(false);
      expect(container.textContent).toContain("可确认候选");

      await click(findButton(container, "我已检查，确认新增并保存"));
      await waitFor(
        () => container.textContent?.includes(
          "MusicXML/MXL 候选已确认并原子保存在本机",
        ) ?? false,
        `${_failureName}恢复后重试保存`,
      );
      expect(store.putCalls).toBe(2);
      expect(store.deleteCalls).toBe(0);
      expect(store.values.size).toBe(2);
      expect(JSON.stringify(store.values.get(existing.projectId)))
        .toBe(existingBefore);
      expect(container.textContent).toContain("可重试导入");
    },
  );

  it.each([
    [
      "和弦",
      supportedMusicXml({ extraNoteMarkup: "<chord/>" }),
      "当前导入只支持单音，不能导入和弦音。",
    ],
    [
      "超范围音高",
      supportedMusicXml({ pitchStep: "G", pitchOctave: "5" }),
      "音高 G5 超出当前自然音 C4–C5 范围。",
    ],
  ])(
    "含%s的 MusicXML 显示 blocking ledger 且不能确认保存",
    async (_caseName, xml, issueMessage) => {
      const store = new MemoryProjectStore();
      const container = await renderPanel(store);

      await selectMusicXmlImportFile({
        container,
        xml,
        fileName: `阻断-${_caseName}.musicxml`,
      });

      expect(store.putCalls).toBe(0);
      expect(store.values.size).toBe(0);
      expect(container.textContent).toContain(
        "该文件包含当前 canonical 无法无损表达的内容，已阻止确认和保存。",
      );
      expect(container.textContent).toContain("已阻止确认");
      expect(container.textContent).toContain("阻止导入");
      expect(container.textContent).toContain(issueMessage);
      expect(findButton(container, "我已检查，确认新增并保存").disabled)
        .toBe(true);
    },
  );

  it("检查 MusicXML 导出只生成内存候选，明确确认后才触发下载且不修改项目", async () => {
    const store = new MemoryProjectStore();
    const project = createSupportedMusicXmlExportProject();
    await store.put(project, null);
    store.putCalls = 0;
    const snapshot = JSON.stringify(store.values.get(project.projectId));
    const {
      anchorClick,
      anchorDownloads,
      createObjectUrl,
      revokeObjectUrl,
    } =
      installDownloadSpies();
    const container = await renderPanel(store);
    await click(findButton(container, "打开"));

    await click(findButton(container, "检查 MusicXML/MXL 导出"));
    await waitFor(
      () => container.querySelector(
        "[data-testid='local-score-project-musicxml-export-draft']",
      ) !== null,
      "生成内存 MusicXML 导出候选",
    );

    expect(container.textContent).toContain(
      "导出候选已就绪：1 小节、1 个事件",
    );
    expect(container.textContent).toContain("受支持导出.musicxml");
    expect(container.textContent).toMatch(
      /MusicXML ·[^·]+\.musicxml · \d+ bytes/,
    );
    expect(container.textContent).toContain("生成内存候选");
    expect(createObjectUrl).not.toHaveBeenCalled();
    expect(anchorClick).not.toHaveBeenCalled();
    expect(revokeObjectUrl).not.toHaveBeenCalled();
    expect(store.putCalls).toBe(0);
    expectProjectSnapshotUnchanged({
      store,
      projectId: project.projectId,
      snapshot,
    });

    const confirm = findButton(container, "确认下载 .musicxml");
    expect(confirm.disabled).toBe(false);
    await click(confirm);
    await waitFor(
      () => anchorClick.mock.calls.length === 1,
      "明确确认后触发 MusicXML 下载",
    );

    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(createObjectUrl.mock.calls[0]?.[0].type).toBe(
      "application/vnd.recordare.musicxml+xml",
    );
    expect(anchorDownloads[0]?.download).toBe(
      "受支持导出.musicxml",
    );
    expect(anchorDownloads[0]?.href).toContain(
      "blob:local-score-project-export",
    );
    expect(revokeObjectUrl).toHaveBeenCalledWith(
      "blob:local-score-project-export",
    );
    expect(store.putCalls).toBe(0);
    expectProjectSnapshotUnchanged({
      store,
      projectId: project.projectId,
      snapshot,
    });
  });

  it("选择 MXL 后仍先检查内存候选，确认才下载 .mxl 包且不修改项目", async () => {
    const store = new MemoryProjectStore();
    const project = createSupportedMusicXmlExportProject({
      projectId: "supported-mxl-export-project",
      title: "受支持 MXL 导出",
    });
    await store.put(project, null);
    store.putCalls = 0;
    const snapshot = JSON.stringify(store.values.get(project.projectId));
    const {
      anchorClick,
      anchorDownloads,
      createObjectUrl,
      revokeObjectUrl,
    } =
      installDownloadSpies();
    const container = await renderPanel(store);
    await click(findButton(container, "打开"));
    await change(findSelectExact(container, "导出格式"), "mxl");
    await click(findButton(container, "检查 MusicXML/MXL 导出"));
    await waitFor(
      () => container.querySelector(
        "[data-testid='local-score-project-musicxml-export-draft']",
      ) !== null,
      "生成内存 MXL 导出候选",
    );
    expect(container.textContent).toContain(
      "导出候选已就绪：1 小节、1 个事件",
    );
    expect(container.textContent).toContain("受支持 MXL 导出.mxl");
    expect(container.textContent).toMatch(/MXL ·[^·]+\.mxl · \d+ bytes/);
    expect(createObjectUrl).not.toHaveBeenCalled();
    expect(anchorClick).not.toHaveBeenCalled();
    expect(revokeObjectUrl).not.toHaveBeenCalled();

    const confirm = findButton(container, "确认下载 .mxl");
    expect(confirm.disabled).toBe(false);
    await click(confirm);
    await waitFor(
      () => anchorClick.mock.calls.length === 1,
      "明确确认后触发 MXL 下载",
    );

    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(createObjectUrl.mock.calls[0]?.[0].type).toBe(
      "application/vnd.recordare.musicxml",
    );
    expect(anchorDownloads[0]?.download).toBe(
      "受支持 MXL 导出.mxl",
    );
    expect(revokeObjectUrl).toHaveBeenCalledWith(
      "blob:local-score-project-export",
    );
    expect(store.putCalls).toBe(0);
    expectProjectSnapshotUnchanged({
      store,
      projectId: project.projectId,
      snapshot,
    });
  });

  it("名称自动保存 dirty 期间禁用导出检查，且不会创建下载资源", async () => {
    const store = new MemoryProjectStore();
    const project = createSupportedMusicXmlExportProject({
      projectId: "dirty-export-project",
      title: "导出前已保存",
    });
    await store.put(project, null);
    store.putCalls = 0;
    const snapshot = JSON.stringify(store.values.get(project.projectId));
    const { anchorClick, createObjectUrl, revokeObjectUrl } =
      installDownloadSpies();
    const container = await renderPanel(store);
    await click(findButton(container, "打开"));

    await change(findInput(container, "项目名称"), "尚未保存的导出标题");
    const inspect = findButton(container, "检查 MusicXML/MXL 导出");
    expect(inspect.disabled).toBe(true);
    await click(inspect);

    expect(
      container.querySelector(
        "[data-testid='local-score-project-musicxml-export-draft']",
      ),
    ).toBeNull();
    expect(createObjectUrl).not.toHaveBeenCalled();
    expect(anchorClick).not.toHaveBeenCalled();
    expect(revokeObjectUrl).not.toHaveBeenCalled();
    expect(store.putCalls).toBe(0);
    expectProjectSnapshotUnchanged({
      store,
      projectId: project.projectId,
      snapshot,
    });
  });

  it("存在恢复候选时禁用导出检查，不会把未确认恢复内容导出", async () => {
    const store = new MemoryProjectStore();
    const project = createSupportedMusicXmlExportProject({
      projectId: "recovery-blocked-export-project",
      title: "最后保存版本",
    });
    await store.put(project, null);
    const proposed = changeLocalScoreProjectSettings({
      project,
      expectedRevision: project.document.revision,
      title: "恢复候选标题",
      tempoBpm: project.tempoBpm,
      now: "2026-07-27T07:01:00.000Z",
    });
    await store.stageRecoveryCandidate(
      createLocalScoreProjectRecoveryCandidate({
        candidateId: project.projectId,
        candidateSequence: 1,
        capturedAt: "2026-07-27T07:01:01.000Z",
        baseProject: project,
        proposedProject: proposed,
      }),
      null,
    );
    store.putCalls = 0;
    const snapshot = JSON.stringify(store.values.get(project.projectId));
    const { anchorClick, createObjectUrl, revokeObjectUrl } =
      installDownloadSpies();
    const container = await renderPanel(store);
    await click(findButton(container, "打开"));
    await waitFor(
      () => container.textContent?.includes(
        "发现一份未完成的名称或速度修改",
      ) ?? false,
      "显示导出前恢复候选",
    );

    expect(findButton(container, "检查 MusicXML/MXL 导出").disabled)
      .toBe(true);
    expect(createObjectUrl).not.toHaveBeenCalled();
    expect(anchorClick).not.toHaveBeenCalled();
    expect(revokeObjectUrl).not.toHaveBeenCalled();
    expect(store.candidates.size).toBe(1);
    expect(store.putCalls).toBe(0);
    expectProjectSnapshotUnchanged({
      store,
      projectId: project.projectId,
      snapshot,
    });
  });

  it("canonical 圆滑线可生成导出候选并在明确确认后下载", async () => {
    const store = new MemoryProjectStore();
    let project = createSupportedMusicXmlExportProject({
      projectId: "slur-export-project",
      title: "圆滑线导出",
    });
    project = addLocalScoreProjectEvent({
      project,
      expectedRevision: project.document.revision,
      location: {
        partId: "part-1",
        staffId: "staff-1",
        voiceId: "voice-1",
        measureNumber: 1,
      },
      eventId: "slur-export-event-2",
      input: {
        type: "note",
        pitch: "D4",
        duration: "quarter",
        augmentationDots: 0,
        tieToNext: false,
        lyric: null,
      },
      now: "2026-07-27T07:02:00.000Z",
    });
    project = changeLocalScoreProjectEventSlur({
      project,
      expectedRevision: project.document.revision,
      location: {
        partId: "part-1",
        staffId: "staff-1",
        voiceId: "voice-1",
        measureNumber: 1,
      },
      eventId: `${project.projectId}-event-1`,
      slurToNext: true,
      now: "2026-07-27T07:02:01.000Z",
    });
    await store.put(project, null);
    store.putCalls = 0;
    const snapshot = JSON.stringify(store.values.get(project.projectId));
    const { anchorClick, createObjectUrl } = installDownloadSpies();
    const container = await renderPanel(store);
    await click(findButton(container, "打开"));
    await click(findButton(container, "检查 MusicXML/MXL 导出"));
    await waitFor(
      () => container.querySelector(
        "[data-testid='local-score-project-musicxml-export-draft']",
      ) !== null,
      "生成圆滑线导出候选",
    );

    expect(container.textContent).toContain("导出候选已就绪");
    const confirm = findButton(container, "确认下载 .musicxml");
    expect(confirm.disabled).toBe(false);
    await click(confirm);
    await waitFor(
      () => anchorClick.mock.calls.length === 1,
      "明确确认后下载圆滑线 MusicXML",
    );
    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    const downloadedXml = await createObjectUrl.mock.calls[0]?.[0].text();
    expect(downloadedXml).toContain('<slur type="start"/>');
    expect(downloadedXml).toContain('<slur type="stop"/>');
    expect(store.putCalls).toBe(0);
    expectProjectSnapshotUnchanged({
      store,
      projectId: project.projectId,
      snapshot,
    });
  });

  it("canonical 延音线可生成双标记导出候选并在明确确认后下载", async () => {
    const store = new MemoryProjectStore();
    let project = createSupportedMusicXmlExportProject({
      projectId: "tie-export-project",
      title: "延音线导出",
    });
    project = addLocalScoreProjectEvent({
      project,
      expectedRevision: project.document.revision,
      location: {
        partId: "part-1",
        staffId: "staff-1",
        voiceId: "voice-1",
        measureNumber: 1,
      },
      eventId: "tie-export-event-2",
      input: {
        type: "note",
        pitch: "C4",
        duration: "quarter",
        augmentationDots: 0,
        tieToNext: false,
        lyric: null,
      },
      now: "2026-07-27T07:03:00.000Z",
    });
    const content = getLocalScoreProjectContent(project);
    project = applyLocalScoreProjectContent({
      project,
      expectedRevision: project.document.revision,
      content: {
        ...content,
        parts: content.parts.map((part) => ({
          ...part,
          staves: part.staves.map((staff) => ({
            ...staff,
            voices: staff.voices.map((voice) => ({
              ...voice,
              measures: voice.measures.map((measure) => ({
                ...measure,
                events: measure.events.map((event) =>
                  event.id === `${project.projectId}-event-1`
                    ? { ...event, tieToNext: true }
                    : event
                ),
              })),
            })),
          })),
        })),
      },
      now: "2026-07-27T07:03:01.000Z",
    });
    await store.put(project, null);
    store.putCalls = 0;
    const snapshot = JSON.stringify(store.values.get(project.projectId));
    const { anchorClick, createObjectUrl } = installDownloadSpies();
    const container = await renderPanel(store);
    await click(findButton(container, "打开"));
    await click(findButton(container, "检查 MusicXML/MXL 导出"));
    await waitFor(
      () => container.querySelector(
        "[data-testid='local-score-project-musicxml-export-draft']",
      ) !== null,
      "生成延音线导出候选",
    );

    const confirm = findButton(container, "确认下载 .musicxml");
    expect(confirm.disabled).toBe(false);
    await click(confirm);
    await waitFor(
      () => anchorClick.mock.calls.length === 1,
      "明确确认后下载延音线 MusicXML",
    );
    const downloadedXml = await createObjectUrl.mock.calls[0]?.[0].text();
    expect(downloadedXml).toContain('<tie type="start"/>');
    expect(downloadedXml).toContain('<tie type="stop"/>');
    expect(downloadedXml).toContain('<tied type="start"/>');
    expect(downloadedXml).toContain('<tied type="stop"/>');
    expect(store.putCalls).toBe(0);
    expectProjectSnapshotUnchanged({
      store,
      projectId: project.projectId,
      snapshot,
    });
  });

  it.each([
    ["多个 part", "multiple-parts", "当前导出只支持一个 part"],
  ])(
    "含%s的项目显示导出 blocking ledger 且下载保持禁用",
    async (_caseName, fixtureKind, expectedIssue) => {
      const store = new MemoryProjectStore();
      let project = createSupportedMusicXmlExportProject({
        projectId: `blocking-${fixtureKind}-export-project`,
        title: `阻断 ${_caseName} 导出`,
      });
      project = addLocalScoreProjectPart({
        project,
        expectedRevision: project.document.revision,
        partId: "part-2",
        staffId: "staff-2",
        voiceId: "voice-2",
        clef: "treble",
        now: "2026-07-27T07:02:02.000Z",
      });
      await store.put(project, null);
      store.putCalls = 0;
      const snapshot = JSON.stringify(store.values.get(project.projectId));
      const { anchorClick, createObjectUrl, revokeObjectUrl } =
        installDownloadSpies();
      const container = await renderPanel(store);
      await click(findButton(container, "打开"));
      await click(findButton(container, "检查 MusicXML/MXL 导出"));
      await waitFor(
        () => container.querySelector(
          "[data-testid='local-score-project-musicxml-export-draft']",
        ) !== null,
        `生成${_caseName}导出阻断 ledger`,
      );

      expect(container.textContent).toContain("已阻止导出");
      expect(container.textContent).toContain("阻止导出");
      expect(container.textContent).toContain(expectedIssue);
      expect(findButton(container, "确认下载 .musicxml").disabled).toBe(true);
      expect(createObjectUrl).not.toHaveBeenCalled();
      expect(anchorClick).not.toHaveBeenCalled();
      expect(revokeObjectUrl).not.toHaveBeenCalled();
      expect(store.putCalls).toBe(0);
      expectProjectSnapshotUnchanged({
        store,
        projectId: project.projectId,
        snapshot,
      });
    },
  );

  it.each([
    [
      "URL 创建",
      new Error("无法创建导出下载 URL。"),
      null,
      0,
    ],
    [
      "URL 回收",
      null,
      new Error("无法回收导出下载 URL。"),
      1,
    ],
  ])(
    "%s失败不会修改 store、revision 或 undo/redo",
    async (
      _failureName,
      createObjectUrlFailure,
      revokeObjectUrlFailure,
      expectedAnchorClicks,
    ) => {
      const store = new MemoryProjectStore();
      const project = createSupportedMusicXmlExportProject({
        projectId: `url-failure-${_failureName}-project`,
        title: "URL 失败导出",
      });
      await store.put(project, null);
      store.putCalls = 0;
      const snapshot = JSON.stringify(store.values.get(project.projectId));
      const { anchorClick, createObjectUrl, revokeObjectUrl } =
        installDownloadSpies({
          createObjectUrlFailure,
          revokeObjectUrlFailure,
        });
      const container = await renderPanel(store);
      await click(findButton(container, "打开"));
      await click(findButton(container, "检查 MusicXML/MXL 导出"));
      await waitFor(
        () => container.querySelector(
          "[data-testid='local-score-project-musicxml-export-draft']",
        ) !== null,
        `${_failureName}测试生成导出候选`,
      );

      await click(findButton(container, "确认下载 .musicxml"));
      await waitFor(
        () => container.textContent?.includes(
          createObjectUrlFailure?.message
            ?? revokeObjectUrlFailure?.message
            ?? "",
        ) ?? false,
        `${_failureName}失败关闭`,
      );

      expect(createObjectUrl).toHaveBeenCalledTimes(1);
      expect(anchorClick).toHaveBeenCalledTimes(expectedAnchorClicks);
      expect(revokeObjectUrl).toHaveBeenCalledTimes(
        createObjectUrlFailure ? 0 : 1,
      );
      expect(store.putCalls).toBe(0);
      expectProjectSnapshotUnchanged({
        store,
        projectId: project.projectId,
        snapshot,
      });
      const stored = store.values.get(project.projectId);
      expect(stored?.document.revision).toBe(project.document.revision);
      expect(stored?.undoStack).toEqual(project.undoStack);
      expect(stored?.redoStack).toEqual(project.redoStack);
      expect(
        container.querySelector(
          "[data-testid='local-score-project-musicxml-export-draft']",
        ),
      ).not.toBeNull();
    },
  );

  it("从原创编制模板预览并原子创建可独立编辑和重开的项目", async () => {
    const store = new MemoryProjectStore();
    const container = await renderPanel(store);
    const templateSelect = findSelectExact(container, "编制模板");
    expect(templateSelect.options.length).toBeGreaterThanOrEqual(18);
    expect(new Set(
      Array.from(templateSelect.options).map((option) => option.value),
    ).size).toBe(templateSelect.options.length);
    expect(container.querySelectorAll("optgroup")).toHaveLength(4);
    expect(templateSelect.value).toBe("blank-treble-staff-v1");
    expect(container.textContent).toContain("空白高音五线谱");
    expect(container.textContent).toContain("1 个声部组 · 1 个谱表");
    expect(container.textContent).toContain(
      "模板只创建可编辑的空白编制，不包含曲谱内容、真实多乐器音色或完整总谱排版；所有声部仍使用钢琴采样预览。",
    );
    expect(store.values.size).toBe(0);
    expect(store.putCalls).toBe(0);

    await change(templateSelect, "string-quartet-v1");
    expect(container.textContent).toContain("弦乐四重奏");
    expect(container.textContent).toContain("4 个声部组 · 4 个谱表");
    expect(container.textContent).toContain(
      "两把小提琴、中提琴与大提琴的四声部组编制。",
    );
    expect(container.textContent).toContain(
      "第一小提琴 · 小提琴（GM1 40） · 高音谱号",
    );
    expect(container.textContent).toContain(
      "大提琴 · 大提琴（GM1 42） · 低音谱号",
    );
    expect(store.values.size).toBe(0);
    expect(store.putCalls).toBe(0);

    await change(findInput(container, "项目名称"), "我的弦乐四重奏");
    store.failNextPut = new LocalScoreProjectStorageError(
      "quota",
      "模板项目会超过本机容量上限，未创建项目。",
    );
    await click(findButton(container, "创建并保存"));
    await waitFor(
      () => container.textContent?.includes("模板项目会超过本机容量上限")
        ?? false,
      "模板项目容量失败",
    );
    expect(findSelectExact(container, "编制模板").value)
      .toBe("string-quartet-v1");
    expect(findInput(container, "项目名称").value).toBe("我的弦乐四重奏");
    expect(store.values.size).toBe(0);
    expect(store.putCalls).toBe(1);
    expect(findButton(container, "创建并保存")).toBeTruthy();

    await click(findButton(container, "创建并保存"));
    await waitFor(
      () => container.textContent?.includes(
        "已按“弦乐四重奏”创建并保存在本机",
      ) ?? false,
      "模板项目原子保存后进入编辑器",
    );
    expect(store.putCalls).toBe(2);
    expect(store.values.size).toBe(1);
    const stored = Array.from(store.values.values())[0];
    expect(stored?.title).toBe("我的弦乐四重奏");
    expect(stored?.document.revision).toBe(1);
    expect(stored?.undoStack).toHaveLength(0);
    expect(stored?.redoStack).toHaveLength(0);
    expect(stored?.document.parts).toHaveLength(4);
    expect(stored?.document.parts.map((part) => part.name)).toEqual([
      "第一小提琴",
      "第二小提琴",
      "中提琴",
      "大提琴",
    ]);
    expect(
      stored?.document.parts.flatMap((part) =>
        part.staves.flatMap((staff) =>
          staff.voices.flatMap((voice) => voice.measures))),
    ).toEqual([
      { measureNumber: 1, events: [] },
      { measureNumber: 1, events: [] },
      { measureNumber: 1, events: [] },
      { measureNumber: 1, events: [] },
    ]);
    expect(findSelectExact(container, "声部组").selectedOptions[0]?.textContent)
      .toBe("第一小提琴（第 1 组）");

    await change(findSelect(container, "音高"), "D4");
    await click(findButton(container, "添加到第 1 小节并保存"));
    await waitFor(
      () => container.textContent?.includes("第 1 小节 · D4 · 四分音符")
        ?? false,
      "模板项目创建后可立即编辑",
    );
    expect(
      Array.from(store.values.values())[0]
        ?.document.parts[0]?.staves[0]?.voices[0]?.measures[0]?.events,
    ).toHaveLength(1);
    expect(
      Array.from(store.values.values())[0]
        ?.document.parts[1]?.staves[0]?.voices[0]?.measures[0]?.events,
    ).toHaveLength(0);

    await click(findButton(container, "返回项目列表"));
    await click(findButton(container, "打开"));
    expect(findSelectExact(container, "声部组").options).toHaveLength(4);
    expect(findSelectExact(container, "声部组").selectedOptions[0]?.textContent)
      .toBe("第一小提琴（第 1 组）");
    expect(container.textContent).toContain("第 1 小节 · D4 · 四分音符");
  });

  it("切换到第二 part 后精确更新并移动事件且不改写第一 part", async () => {
    const store = new MemoryProjectStore();
    const base = createLocalScoreProject({
      projectId: "two-part-handler-project",
      title: "双 Part 定向编辑",
      now: "2026-07-24T03:50:00.000Z",
    });
    const withFirstPartEvent = addLocalScoreProjectEvent({
      project: base,
      expectedRevision: base.document.revision,
      location: {
        partId: "part-1",
        staffId: "staff-1",
        voiceId: "voice-1",
        measureNumber: 1,
      },
      eventId: "part-1-protected-event",
      input: {
        type: "note",
        pitch: "G4",
        duration: "quarter",
        augmentationDots: 0,
        tieToNext: false,
        lyric: "甲",
      },
      now: "2026-07-24T03:50:01.000Z",
    });
    const firstPart = withFirstPartEvent.document.parts[0];
    const firstEvent =
      firstPart?.staves[0]?.voices[0]?.measures[0]?.events[0];
    if (!firstPart || !firstEvent || firstEvent.type !== "note") {
      throw new Error("无法构造双 Part fixture");
    }
    const fixture = applyLocalScoreProjectContent({
      project: withFirstPartEvent,
      expectedRevision: withFirstPartEvent.document.revision,
      content: {
        scoreCredits: withFirstPartEvent.document.scoreCredits,
        meter: withFirstPartEvent.document.meter,
        keySignature: withFirstPartEvent.document.keySignature,
        parts: [
          firstPart,
          {
            partId: "part-2",
            name: "声部组 2",
            instrument: { kind: "unassigned" },
            staves: [{
              staffId: "staff-2",
              staffKind: "pitched",
              clef: "treble",
              voices: [{
                voiceId: "voice-2",
                measures: [
                  {
                    measureNumber: 1,
                    events: [{
                      ...firstEvent,
                      id: "part-2-edit-event",
                      pitch: "D4",
                      lyric: "乙",
                    }],
                  },
                  { measureNumber: 2, events: [] },
                ],
              }],
            }],
          },
        ],
      },
      now: "2026-07-24T03:50:02.000Z",
    });
    await store.put(fixture, null);
    const container = await renderPanel(store);
    await click(findButton(container, "打开"));
    await waitFor(
      () => container.textContent?.includes("歌词：甲") ?? false,
      "显示第一 Part 事件",
    );

    await click(findButton(container, "编辑"));
    expect(container.textContent).toContain("编辑所选事件");
    await click(findButton(container, "播放草稿"));
    await waitFor(
      () => Array.from(container.querySelectorAll("button"))
        .some((button) => button.textContent?.trim() === "停止播放"),
      "完整双 Part 文档开始播放",
    );
    const activePlaybackControl = findButton(container, "停止播放");
    expect(findButton(container, "新增声部组").disabled).toBe(true);
    expect(findButton(container, "删除空声部组").disabled).toBe(true);
    expect(findButton(container, "更新所选事件并保存").disabled).toBe(true);
    expect(container.textContent).toContain("当前播放不会被重建或中断");
    await change(findSelectExact(container, "声部组"), "part-2");
    expect(findSelectExact(container, "声部组").value).toBe("part-2");
    expect(container.textContent).toContain("输入音符或休止");
    expect(container.textContent).not.toContain("编辑所选事件");
    expect(findButton(container, "停止播放")).toBe(activePlaybackControl);
    await click(activePlaybackControl);
    await waitFor(
      () => !findButton(container, "新增声部组").disabled
        && !findButton(container, "删除空声部组").disabled,
      "停止播放后允许声部组结构修改",
    );

    await waitFor(
      () => container.textContent?.includes("歌词：乙") ?? false,
      "显示第二 Part 事件",
    );
    await click(findButton(container, "编辑"));
    await change(findSelect(container, "音高"), "F4");
    await change(findInput(container, "歌词"), "乙改");
    await click(findButton(container, "更新所选事件并保存"));
    await waitFor(
      () => container.textContent?.includes("第 1 小节 · F4 · 四分音符")
        ?? false,
      "精确更新第二 Part 事件",
    );

    await change(findSelect(container, "目标小节"), "2");
    await click(findButton(container, "移动到第 2 小节并保存"));
    await waitFor(
      () => container.textContent?.includes("第 2 小节 · F4 · 四分音符")
        ?? false,
      "精确移动第二 Part 事件",
    );
    const storedAfterPart2Edits = Array.from(store.values.values())[0];
    const part2Measures =
      storedAfterPart2Edits?.document.parts[1]?.staves[0]?.voices[0]?.measures;
    expect(part2Measures?.[0]?.events).toHaveLength(0);
    expect(part2Measures?.[1]?.events[0]?.id).toBe("part-2-edit-event");
    expect(
      part2Measures?.[1]?.events[0]?.type === "note"
        && part2Measures[1].events[0].pitch,
    ).toBe("F4");
    expect(
      part2Measures?.[1]?.events[0]?.type === "note"
        && part2Measures[1].events[0].lyric,
    ).toBe("乙改");

    await change(findSelectExact(container, "声部组"), "part-1");
    expect(container.textContent).toContain("第 1 小节 · G4 · 四分音符");
    expect(container.textContent).toContain("歌词：甲");
    const protectedMeasures =
      Array.from(store.values.values())[0]
        ?.document.parts[0]?.staves[0]?.voices[0]?.measures;
    expect(protectedMeasures).toHaveLength(1);
    expect(protectedMeasures?.[0]?.events).toHaveLength(1);
    expect(protectedMeasures?.[0]?.events[0]?.id)
      .toBe("part-1-protected-event");
    expect(
      protectedMeasures?.[0]?.events[0]?.type === "note"
        && protectedMeasures[0].events[0].pitch,
    ).toBe("G4");
    expect(
      protectedMeasures?.[0]?.events[0]?.type === "note"
        && protectedMeasures[0].events[0].lyric,
    ).toBe("甲");
  });

  it("切换声部后定向新增事件并完整保留另一个声部", async () => {
    const store = new MemoryProjectStore();
    const base = createLocalScoreProject({
      projectId: "multi-voice-project",
      title: "多声部测试",
      now: "2026-07-24T04:00:00.000Z",
    });
    const withSecondVoice = addLocalScoreProjectVoice({
      project: base,
      expectedRevision: base.document.revision,
      location: { partId: "part-1", staffId: "staff-1" },
      voiceId: "voice-2",
      now: "2026-07-24T04:00:01.000Z",
    });
    const fixture = addLocalScoreProjectEvent({
      project: withSecondVoice,
      expectedRevision: withSecondVoice.document.revision,
      location: {
        partId: "part-1",
        staffId: "staff-1",
        voiceId: "voice-1",
        measureNumber: 1,
      },
      eventId: "voice-1-existing-event",
      input: {
        type: "note",
        pitch: "G4",
        duration: "quarter",
        augmentationDots: 0,
        tieToNext: false,
        lyric: "原",
      },
      now: "2026-07-24T04:00:02.000Z",
    });
    await store.put(fixture, null);
    const container = await renderPanel(store);
    await click(findButton(container, "打开"));
    await waitFor(
      () => container.textContent?.includes("第 1 小节 · G4 · 四分音符")
        ?? false,
      "显示第一声部既有事件",
    );

    await click(findButton(container, "编辑"));
    expect(container.textContent).toContain("编辑所选事件");
    await click(findButton(container, "复制所选事件"));
    expect(container.textContent).not.toContain("尚未复制事件");
    await click(findButton(container, "播放草稿"));
    await waitFor(
      () => Array.from(container.querySelectorAll("button"))
        .some((button) => button.textContent?.trim() === "停止播放"),
      "完整文档开始播放",
    );
    const activePlaybackControl = findButton(container, "停止播放");
    expect(findButton(container, "新增声部组").disabled).toBe(true);
    expect(findButton(container, "删除空声部组").disabled).toBe(true);
    expect(findButton(container, "新增声部").disabled).toBe(true);
    expect(findButton(container, "新增谱表").disabled).toBe(true);
    expect(findButton(container, "更新所选事件并保存").disabled).toBe(true);
    const voiceSelect = findSelectExact(container, "声部");
    await change(voiceSelect, "voice-2");
    expect(findSelectExact(container, "声部").value).toBe("voice-2");
    expect(findButton(container, "停止播放")).toBe(activePlaybackControl);
    expect(container.textContent).toContain("输入音符或休止");
    expect(container.textContent).toContain("尚未复制事件");
    expect(container.textContent).toContain("当前小节为空");
    await click(activePlaybackControl);
    await waitFor(
      () => !findButton(container, "新增声部").disabled,
      "停止播放后允许结构修改",
    );
    await change(findSelect(container, "音高"), "C4");
    await click(findButton(container, "添加到第 1 小节并保存"));
    await waitFor(
      () => Array.from(store.values.values())[0]
        ?.document.parts[0]?.staves[0]?.voices[1]?.measures[0]
        ?.events.length === 1,
      "只向第二声部新增事件",
    );

    const stored = Array.from(store.values.values())[0];
    const firstVoiceEvents =
      stored?.document.parts[0]?.staves[0]?.voices[0]?.measures[0]?.events;
    const secondVoiceEvents =
      stored?.document.parts[0]?.staves[0]?.voices[1]?.measures[0]?.events;
    expect(firstVoiceEvents).toHaveLength(1);
    expect(firstVoiceEvents?.[0]?.id).toBe("voice-1-existing-event");
    expect(firstVoiceEvents?.[0]?.type === "note" && firstVoiceEvents[0].pitch)
      .toBe("G4");
    expect(secondVoiceEvents).toHaveLength(1);
    expect(secondVoiceEvents?.[0]?.type === "note" && secondVoiceEvents[0].pitch)
      .toBe("C4");

    await change(findSelectExact(container, "声部"), "voice-1");
    expect(findSelectExact(container, "声部").value).toBe("voice-1");
    expect(container.textContent).toContain("歌词：原");
    await change(findInput(container, "项目名称"), "多声部未保存名称");
    expect(findButton(container, "新增声部组").disabled).toBe(true);
    expect(findButton(container, "删除空声部组").disabled).toBe(true);
    expect(findButton(container, "新增声部").disabled).toBe(true);
    expect(findButton(container, "新增谱表").disabled).toBe(true);
  });

  it("旧自动保存完成后仍保留最新选择的第二声部", async () => {
    const store = new MemoryProjectStore();
    const base = createLocalScoreProject({
      projectId: "autosave-voice-selection-project",
      title: "异步选择测试",
      now: "2026-07-24T04:10:00.000Z",
    });
    const fixture = addLocalScoreProjectVoice({
      project: base,
      expectedRevision: base.document.revision,
      location: { partId: "part-1", staffId: "staff-1" },
      voiceId: "voice-2",
      now: "2026-07-24T04:10:01.000Z",
    });
    await store.put(fixture, null);
    let releasePromotion: () => void = () => {
      throw new Error("自动保存没有进入延迟提升阶段");
    };
    store.beforePromote = () => new Promise<void>((resolve) => {
      releasePromotion = resolve;
    });
    const container = await renderPanel(store);
    await click(findButton(container, "打开"));
    await change(findInput(container, "项目名称"), "异步保存新名称");
    await waitForAutosave();
    await waitFor(() => store.promoteCalls === 1, "自动保存进入延迟提升阶段");

    await change(findSelectExact(container, "声部"), "voice-2");
    expect(findSelectExact(container, "声部").value).toBe("voice-2");
    store.beforePromote = null;
    await act(async () => releasePromotion());
    await flushReact();

    expect(findSelectExact(container, "声部").value).toBe("voice-2");
    expect(container.textContent).toContain("当前小节为空");
  });

  it("删除当前空声部或谱表后优先留在同层 sibling", async () => {
    const store = new MemoryProjectStore();
    const base = createLocalScoreProject({
      projectId: "structure-fallback-project",
      title: "结构回退测试",
      now: "2026-07-24T04:20:00.000Z",
    });
    const withVoice = addLocalScoreProjectVoice({
      project: base,
      expectedRevision: base.document.revision,
      location: { partId: "part-1", staffId: "staff-1" },
      voiceId: "voice-2",
      now: "2026-07-24T04:20:01.000Z",
    });
    const fixture = addLocalScoreProjectStaff({
      project: withVoice,
      expectedRevision: withVoice.document.revision,
      partId: "part-1",
      staffId: "staff-2",
      voiceId: "voice-3",
      clef: "bass",
      now: "2026-07-24T04:20:02.000Z",
    });
    await store.put(fixture, null);
    const container = await renderPanel(store);
    await click(findButton(container, "打开"));

    await change(findSelectExact(container, "声部"), "voice-2");
    await click(findButton(container, "删除空声部"));
    await waitFor(
      () => findSelectExact(container, "声部").value === "voice-1",
      "删除声部后留在同谱表 sibling",
    );
    expect(findSelectExact(container, "谱表").value).toBe("staff-1");

    await change(findSelectExact(container, "谱表"), "staff-2");
    expect(findSelectExact(container, "声部").value).toBe("voice-3");
    await click(findButton(container, "删除空谱表"));
    await waitFor(
      () => findSelectExact(container, "谱表").value === "staff-1",
      "删除谱表后留在同 part sibling",
    );
    expect(findSelectExact(container, "声部").value).toBe("voice-1");
    const stored = Array.from(store.values.values())[0];
    expect(stored?.document.parts[0]?.staves.map((staff) => staff.staffId))
      .toEqual(["staff-1"]);
    expect(stored?.document.parts[0]?.staves[0]?.voices.map(
      (voice) => voice.voiceId,
    )).toEqual(["voice-1"]);
  });

  it("结构新增失败不产生 ghost，成功后可撤销重做、重开并删除回退", async () => {
    const store = new MemoryProjectStore();
    const project = createLocalScoreProject({
      projectId: "structure-roundtrip-project",
      title: "结构闭环测试",
      now: "2026-07-24T04:30:00.000Z",
    });
    await store.put(project, null);
    const container = await renderPanel(store);
    await click(findButton(container, "打开"));

    store.failNextPut = new LocalScoreProjectStorageError(
      "write-failed",
      "结构测试写入失败，未发布新增声部。",
    );
    await click(findButton(container, "新增声部"));
    await waitFor(
      () => container.textContent?.includes("结构测试写入失败") ?? false,
      "显示结构写入失败",
    );
    expect(findSelectExact(container, "声部").options).toHaveLength(1);
    expect(
      Array.from(store.values.values())[0]
        ?.document.parts[0]?.staves[0]?.voices,
    ).toHaveLength(1);

    await click(findButton(container, "新增声部"));
    await waitFor(
      () => findSelectExact(container, "声部").options.length === 2,
      "成功新增声部",
    );
    expect(
      Array.from(findSelectExact(container, "声部").options)
        .map((option) => option.value),
    ).toContain("voice-test-2");
    await change(findSelectExact(container, "声部"), "voice-test-2");
    expect(findSelectExact(container, "声部").value).toBe("voice-test-2");

    await click(findButton(container, "新增谱表"));
    await waitFor(
      () => findSelectExact(container, "谱表").options.length === 2,
      "成功新增谱表",
    );
    expect(
      Array.from(findSelectExact(container, "谱表").options)
        .map((option) => option.value),
    ).toContain("staff-test-3");
    await change(findSelectExact(container, "谱表"), "staff-test-3");
    expect(findSelectExact(container, "声部").value).toBe("voice-test-4");

    await click(findButton(container, "撤销"));
    await waitFor(
      () => findSelectExact(container, "谱表").options.length === 1,
      "撤销新增谱表",
    );
    expect(findSelectExact(container, "谱表").value).toBe("staff-1");
    expect(findSelectExact(container, "声部").value).toBe("voice-1");

    await click(findButton(container, "重做"));
    await waitFor(
      () => findSelectExact(container, "谱表").options.length === 2,
      "重做新增谱表",
    );
    expect(
      Array.from(findSelectExact(container, "谱表").options)
        .map((option) => option.value),
    ).toContain("staff-test-3");

    await click(findButton(container, "返回项目列表"));
    await click(findButton(container, "打开"));
    await waitFor(
      () => findSelectExact(container, "谱表").options.length === 2,
      "重开后保留新增谱表",
    );
    expect(
      Array.from(findSelectExact(container, "声部").options)
        .map((option) => option.value),
    ).toContain("voice-test-2");

    await change(findSelectExact(container, "谱表"), "staff-test-3");
    await click(findButton(container, "删除空谱表"));
    await waitFor(
      () => findSelectExact(container, "谱表").options.length === 1,
      "删除重开后的空谱表",
    );
    expect(findSelectExact(container, "谱表").value).toBe("staff-1");
    expect(findSelectExact(container, "声部").value).toBe("voice-1");

    await change(findSelectExact(container, "声部"), "voice-test-2");
    await click(findButton(container, "删除空声部"));
    await waitFor(
      () => findSelectExact(container, "声部").options.length === 1,
      "删除重开后的空声部",
    );
    expect(findSelectExact(container, "谱表").value).toBe("staff-1");
    expect(findSelectExact(container, "声部").value).toBe("voice-1");
    const stored = Array.from(store.values.values())[0];
    expect(stored?.document.parts[0]?.staves).toHaveLength(1);
    expect(stored?.document.parts[0]?.staves[0]?.voices).toHaveLength(1);
  });

  it("声部组新增删除保持 save-first、撤销重做与重开闭环", async () => {
    const store = new MemoryProjectStore();
    const project = createLocalScoreProject({
      projectId: "part-lifecycle-project",
      title: "声部组生命周期",
      now: "2026-07-24T04:40:00.000Z",
    });
    await store.put(project, null);
    const container = await renderPanel(store);
    await click(findButton(container, "打开"));
    expect(findButton(container, "删除空声部组").disabled).toBe(true);

    store.failNextPut = new LocalScoreProjectStorageError(
      "write-failed",
      "声部组写入失败，未发布幽灵结构。",
    );
    await click(findButton(container, "新增声部组"));
    await waitFor(
      () => container.textContent?.includes("声部组写入失败") ?? false,
      "显示声部组写入失败",
    );
    expect(findSelectExact(container, "声部组").options).toHaveLength(1);
    expect(Array.from(store.values.values())[0]?.document.parts).toHaveLength(1);

    await click(findButton(container, "新增声部组"));
    await waitFor(
      () => findSelectExact(container, "声部组").options.length === 2,
      "成功新增声部组",
    );
    expect(
      Array.from(findSelectExact(container, "声部组").options)
        .map((option) => option.value),
    ).toContain("part-test-4");
    expect(
      Array.from(store.values.values())[0]?.document.parts[1]
        ?.staves[0]?.staffId,
    ).toBe("staff-test-5");
    expect(
      Array.from(store.values.values())[0]?.document.parts[1]
        ?.staves[0]?.voices[0]?.voiceId,
    ).toBe("voice-test-6");
    await change(findInput(container, "项目名称"), "声部组生命周期草稿");
    expect(findButton(container, "新增声部组").disabled).toBe(true);
    expect(findButton(container, "删除空声部组").disabled).toBe(true);
    await waitForAutosave();
    await waitFor(
      () => !findButton(container, "新增声部组").disabled
        && !findButton(container, "删除空声部组").disabled,
      "自动保存后恢复声部组结构修改",
    );

    await click(findButton(container, "撤销"));
    await waitFor(
      () => findSelectExact(container, "声部组").options.length === 1,
      "撤销新增声部组",
    );
    await click(findButton(container, "重做"));
    await waitFor(
      () => findSelectExact(container, "声部组").options.length === 2,
      "重做新增声部组",
    );

    await click(findButton(container, "返回项目列表"));
    await click(findButton(container, "打开"));
    await waitFor(
      () => findSelectExact(container, "声部组").options.length === 2,
      "重开后保留新增声部组",
    );
    await change(findSelectExact(container, "声部组"), "part-test-4");
    expect(findSelectExact(container, "谱表").value).toBe("staff-test-5");
    expect(findSelectExact(container, "声部").value).toBe("voice-test-6");

    await change(findInput(container, "歌词"), "新组");
    await click(findButton(container, "添加到第 1 小节并保存"));
    await waitFor(
      () => container.textContent?.includes("歌词：新组") ?? false,
      "在新增声部组中定向编辑",
    );
    const protectedFirstPart =
      Array.from(store.values.values())[0]?.document.parts[0];
    expect(
      protectedFirstPart?.staves[0]?.voices[0]?.measures[0]?.events,
    ).toHaveLength(0);

    await click(findButton(container, "删除空声部组"));
    await waitFor(
      () => container.textContent?.includes("仍有音符或休止符") ?? false,
      "拒绝删除非空声部组",
    );
    expect(findSelectExact(container, "声部组").value).toBe("part-test-4");
    expect(findSelectExact(container, "声部组").options).toHaveLength(2);

    await click(findButton(container, "编辑"));
    await click(findButton(container, "复制所选事件"));
    expect(container.textContent).not.toContain("尚未复制事件");
    await click(findButton(container, "删除"));
    await waitFor(
      () => container.textContent?.includes("当前小节为空") ?? false,
      "清空目标声部组",
    );
    await click(findButton(container, "删除空声部组"));
    await waitFor(
      () => findSelectExact(container, "声部组").options.length === 1,
      "删除空声部组",
    );
    expect(findSelectExact(container, "声部组").value).toBe("part-1");
    expect(findSelectExact(container, "谱表").value).toBe("staff-1");
    expect(findSelectExact(container, "声部").value).toBe("voice-1");
    expect(container.textContent).toContain("尚未复制事件");
    expect(findButton(container, "删除空声部组").disabled).toBe(true);
    expect(Array.from(store.values.values())[0]?.document.parts).toHaveLength(1);
  });

  it("声部组名称显式保存、重名消歧与失败恢复保持 canonical", async () => {
    const store = new MemoryProjectStore();
    const base = createLocalScoreProject({
      projectId: "part-name-project",
      title: "声部组命名",
      now: "2026-07-24T04:50:00.000Z",
    });
    const namedFirstPart = renameLocalScoreProjectPart({
      project: base,
      expectedRevision: base.document.revision,
      partId: "part-1",
      name: "钢琴",
      now: "2026-07-24T04:50:01.000Z",
    });
    const withSecondPart = addLocalScoreProjectPart({
      project: namedFirstPart,
      expectedRevision: namedFirstPart.document.revision,
      partId: "part-2",
      staffId: "staff-2",
      voiceId: "voice-2",
      clef: "treble",
      now: "2026-07-24T04:50:02.000Z",
    });
    const fixture = addLocalScoreProjectEvent({
      project: withSecondPart,
      expectedRevision: withSecondPart.document.revision,
      location: {
        partId: "part-1",
        staffId: "staff-1",
        voiceId: "voice-1",
        measureNumber: 1,
      },
      eventId: "part-name-playback-event",
      input: {
        type: "note",
        pitch: "C4",
        duration: "quarter",
        augmentationDots: 0,
        tieToNext: false,
        lyric: null,
      },
      now: "2026-07-24T04:50:03.000Z",
    });
    await store.put(fixture, null);
    const container = await renderPanel(store);
    await click(findButton(container, "打开"));
    const partSelect = findSelectExact(container, "声部组");
    expect(
      Array.from(partSelect.options).map((option) => option.textContent),
    ).toEqual(["钢琴（第 1 组）", "声部组 1（第 2 组）"]);

    await click(findButton(container, "播放草稿"));
    await waitFor(
      () => Array.from(container.querySelectorAll("button"))
        .some((button) => button.textContent?.trim() === "停止播放"),
      "完整文档开始播放",
    );
    const activePlaybackControl = findButton(container, "停止播放");
    await change(partSelect, "part-2");
    expect(findButton(container, "停止播放")).toBe(activePlaybackControl);
    expect(findInput(container, "当前声部组名称").value).toBe("声部组 1");
    expect(findInput(container, "当前声部组名称").disabled).toBe(true);
    expect(findButton(container, "保存声部组名称").disabled).toBe(true);
    await click(activePlaybackControl);
    await waitFor(
      () => !findButton(container, "保存声部组名称").disabled,
      "停止播放后允许重命名",
    );

    await change(findInput(container, "当前声部组名称"), "  钢琴  ");
    await click(findButton(container, "保存声部组名称"));
    await waitFor(
      () => Array.from(findSelectExact(container, "声部组").options)
        .every((option) => option.textContent?.startsWith("钢琴")),
      "重名保存后使用稳定序号消歧",
    );
    expect(
      Array.from(findSelectExact(container, "声部组").options)
        .map((option) => option.textContent),
    ).toEqual(["钢琴（第 1 组）", "钢琴（第 2 组）"]);
    expect(findInput(container, "当前声部组名称").value).toBe("钢琴");
    expect(container.textContent).toContain("当前已保存：钢琴");

    const revisionBeforeUnchanged =
      Array.from(store.values.values())[0]?.document.revision;
    await change(findInput(container, "当前声部组名称"), "  钢琴 ");
    await click(findButton(container, "保存声部组名称"));
    await waitFor(
      () => container.textContent?.includes("当前内容没有变化。") ?? false,
      "trim 后未变化不创建修订",
    );
    expect(findInput(container, "当前声部组名称").value).toBe("钢琴");
    expect(Array.from(store.values.values())[0]?.document.revision)
      .toBe(revisionBeforeUnchanged);

    await change(findInput(container, "当前声部组名称"), "   ");
    await click(findButton(container, "保存声部组名称"));
    await waitFor(
      () => container.textContent?.includes("声部组名称不能为空") ?? false,
      "非法空名称失败关闭",
    );
    expect(findInput(container, "当前声部组名称").value).toBe("");
    expect(container.textContent).toContain("当前已保存：钢琴");
    expect(findSelectExact(container, "声部组").selectedOptions[0]?.textContent)
      .toBe("钢琴（第 2 组）");
    expect(Array.from(store.values.values())[0]?.document.revision)
      .toBe(revisionBeforeUnchanged);

    store.failNextPut = new LocalScoreProjectStorageError(
      "write-failed",
      "名称写入失败，已保留最后保存的名称。",
    );
    await change(findInput(container, "当前声部组名称"), "  弦乐  ");
    await click(findButton(container, "保存声部组名称"));
    await waitFor(
      () => container.textContent?.includes("名称写入失败") ?? false,
      "显示名称写入失败",
    );
    expect(findInput(container, "当前声部组名称").value).toBe("弦乐");
    expect(container.textContent).toContain("当前已保存：钢琴");
    expect(findSelectExact(container, "声部组").selectedOptions[0]?.textContent)
      .toBe("钢琴（第 2 组）");
    expect(
      Array.from(store.values.values())[0]?.document.parts[1]?.name,
    ).toBe("钢琴");

    await click(findButton(container, "保存声部组名称"));
    await waitFor(
      () => findSelectExact(container, "声部组")
        .selectedOptions[0]?.textContent === "弦乐（第 2 组）",
      "失败后可按原草稿重试",
    );
    expect(
      Array.from(store.values.values())[0]?.document.parts[1]?.name,
    ).toBe("弦乐");

    await click(findButton(container, "撤销"));
    await waitFor(
      () => findSelectExact(container, "声部组")
        .selectedOptions[0]?.textContent === "钢琴（第 2 组）",
      "撤销恢复旧名称",
    );
    expect(findInput(container, "当前声部组名称").value).toBe("钢琴");
    await click(findButton(container, "重做"));
    await waitFor(
      () => findSelectExact(container, "声部组")
        .selectedOptions[0]?.textContent === "弦乐（第 2 组）",
      "重做恢复新名称",
    );

    await change(findInput(container, "项目名称"), "声部组命名新项目名");
    expect(findInput(container, "当前声部组名称").disabled).toBe(true);
    expect(findButton(container, "保存声部组名称").disabled).toBe(true);
    await waitForAutosave();
    await waitFor(
      () => !findButton(container, "保存声部组名称").disabled,
      "项目设置自动保存后恢复重命名",
    );

    await click(findButton(container, "返回项目列表"));
    await click(findButton(container, "打开"));
    await change(findSelectExact(container, "声部组"), "part-2");
    expect(findInput(container, "当前声部组名称").value).toBe("弦乐");
    expect(findSelectExact(container, "声部组").selectedOptions[0]?.textContent)
      .toBe("弦乐（第 2 组）");
  });

  it("谱面乐器归属保持 save-first、播放互斥与重开闭环", async () => {
    const store = new MemoryProjectStore();
    const base = createLocalScoreProject({
      projectId: "part-instrument-project",
      title: "乐器归属",
      now: "2026-07-24T04:55:00.000Z",
    });
    const withSecondPart = addLocalScoreProjectPart({
      project: base,
      expectedRevision: base.document.revision,
      partId: "part-2",
      staffId: "staff-2",
      voiceId: "voice-2",
      clef: "treble",
      now: "2026-07-24T04:55:01.000Z",
    });
    const fixture = addLocalScoreProjectEvent({
      project: withSecondPart,
      expectedRevision: withSecondPart.document.revision,
      location: {
        partId: "part-1",
        staffId: "staff-1",
        voiceId: "voice-1",
        measureNumber: 1,
      },
      eventId: "part-instrument-playback-event",
      input: {
        type: "note",
        pitch: "C4",
        duration: "quarter",
        augmentationDots: 0,
        tieToNext: false,
        lyric: null,
      },
      now: "2026-07-24T04:55:02.000Z",
    });
    await store.put(fixture, null);
    const container = await renderPanel(store);
    await click(findButton(container, "打开"));

    const instrumentSelect = findSelectExact(container, "谱面乐器归属");
    expect(
      Array.from(instrumentSelect.options).map((option) => option.textContent),
    ).toEqual([
      "未指定",
      "大钢琴（GM1 0）",
      "小提琴（GM1 40）",
      "中提琴（GM1 41）",
      "大提琴（GM1 42）",
      "弦乐合奏（GM1 48）",
      "长笛（GM1 73）",
    ]);
    expect(instrumentSelect.value).toBe("unassigned");
    expect(container.textContent).toContain("当前已保存：未指定");
    expect(container.textContent).toContain(
      "当前只记录谱面乐器归属；所有声部仍使用钢琴采样预览。",
    );

    await click(findButton(container, "播放草稿"));
    await waitFor(
      () => Array.from(container.querySelectorAll("button"))
        .some((button) => button.textContent?.trim() === "停止播放"),
      "乐器归属 fixture 开始完整文档播放",
    );
    const activePlaybackControl = findButton(container, "停止播放");
    await change(findSelectExact(container, "声部组"), "part-2");
    expect(findButton(container, "停止播放")).toBe(activePlaybackControl);
    expect(findSelectExact(container, "谱面乐器归属").value)
      .toBe("unassigned");
    expect(findSelectExact(container, "谱面乐器归属").disabled).toBe(true);
    expect(findButton(container, "保存乐器归属").disabled).toBe(true);
    await click(activePlaybackControl);
    await waitFor(
      () => !findButton(container, "保存乐器归属").disabled,
      "停止播放后允许保存乐器归属",
    );

    await change(
      findSelectExact(container, "谱面乐器归属"),
      "gm1-40",
    );
    store.failNextPut = new LocalScoreProjectStorageError(
      "write-failed",
      "乐器归属写入失败，已保留最后保存的归属。",
    );
    await click(findButton(container, "保存乐器归属"));
    await waitFor(
      () => container.textContent?.includes("乐器归属写入失败") ?? false,
      "显示乐器归属保存失败",
    );
    expect(findSelectExact(container, "谱面乐器归属").value).toBe("gm1-40");
    expect(container.textContent).toContain("当前已保存：未指定");
    expect(
      Array.from(store.values.values())[0]?.document.parts[1]?.instrument,
    ).toEqual({ kind: "unassigned" });

    await click(findButton(container, "保存乐器归属"));
    await waitFor(
      () => container.textContent?.includes("当前已保存：小提琴（GM1 40）")
        ?? false,
      "按原 draft 重试保存乐器归属",
    );
    const storedAfterSave = Array.from(store.values.values())[0];
    expect(storedAfterSave?.document.parts[1]?.instrument)
      .toEqual({ kind: "gm1-program", program: 40 });
    expect(storedAfterSave?.document.parts[0]?.instrument)
      .toEqual({ kind: "unassigned" });
    expect(
      storedAfterSave?.document.parts[0]?.staves[0]?.voices[0]
        ?.measures[0]?.events[0]?.id,
    ).toBe("part-instrument-playback-event");

    const revisionBeforeUnchanged = storedAfterSave?.document.revision;
    await click(findButton(container, "保存乐器归属"));
    await waitFor(
      () => container.textContent?.includes("当前内容没有变化。") ?? false,
      "未变化归属不创建 revision",
    );
    expect(Array.from(store.values.values())[0]?.document.revision)
      .toBe(revisionBeforeUnchanged);

    await click(findButton(container, "撤销"));
    await waitFor(
      () => container.textContent?.includes("当前已保存：未指定") ?? false,
      "撤销恢复未指定归属",
    );
    expect(findSelectExact(container, "谱面乐器归属").value)
      .toBe("unassigned");
    await click(findButton(container, "重做"));
    await waitFor(
      () => container.textContent?.includes("当前已保存：小提琴（GM1 40）")
        ?? false,
      "重做恢复小提琴归属",
    );
    expect(findSelectExact(container, "谱面乐器归属").value).toBe("gm1-40");

    await change(findInput(container, "项目名称"), "乐器归属新项目名");
    expect(findSelectExact(container, "谱面乐器归属").disabled).toBe(true);
    expect(findButton(container, "保存乐器归属").disabled).toBe(true);
    await waitForAutosave();
    await waitFor(
      () => !findButton(container, "保存乐器归属").disabled,
      "项目设置自动保存后恢复乐器归属保存",
    );

    await click(findButton(container, "返回项目列表"));
    await click(findButton(container, "打开"));
    await change(findSelectExact(container, "声部组"), "part-2");
    expect(findSelectExact(container, "谱面乐器归属").value).toBe("gm1-40");
    expect(container.textContent).toContain("当前已保存：小提琴（GM1 40）");

    await change(findSelectExact(container, "声部组"), "part-1");
    await click(findButton(container, "新增声部组"));
    await waitFor(
      () => findSelectExact(container, "声部组").options.length === 3,
      "新增默认未指定乐器归属的声部组",
    );
    const addedPartOption = findSelectExact(container, "声部组").options[2];
    if (!addedPartOption) throw new Error("找不到新增声部组");
    await change(findSelectExact(container, "声部组"), addedPartOption.value);
    expect(findSelectExact(container, "谱面乐器归属").value)
      .toBe("unassigned");
    expect(container.textContent).toContain("当前已保存：未指定");
  });

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
      () => container.textContent?.includes("当前声部预览") ?? false,
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
      () => container.textContent?.includes("当前声部预览") ?? false,
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
      () => container.textContent?.includes("当前声部预览") ?? false,
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
    expect(container.textContent).not.toContain("当前声部预览");
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
    expect(findSelectExact(container, "谱面乐器归属").disabled).toBe(true);
    expect(findButton(container, "保存乐器归属").disabled).toBe(true);
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
    expect(container.textContent).not.toContain("当前声部预览");
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
      () => container.textContent?.includes("当前声部预览") ?? false,
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
      () => container.textContent?.includes("当前声部预览") ?? false,
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
      () => container.textContent?.includes("当前声部预览") ?? false,
      "重开项目",
    );
    expect(findButton(container, "尚未复制事件").disabled).toBe(true);
  });

  it("附点、延音线、圆滑线、歌词和指法只在保存成功后发布，非法关系会保留原谱", async () => {
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
    await click(findInput(container, "圆滑到下一音"));
    await change(findInput(container, "歌词"), "啦");
    await change(findSelect(container, "单音指法"), "3");

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
    expect(firstEvent?.type === "note" && firstEvent.slurToNext).toBe(false);
    expect(firstEvent?.type === "note" && firstEvent.lyric).toBe(null);
    expect(firstEvent?.type === "note" && firstEvent.fingering).toBe(null);
    expect(container.textContent).not.toContain("歌词：啦");
    expect(container.textContent).not.toContain("指法：3");

    await click(findButton(container, "更新所选事件并保存"));
    await waitFor(
      () => container.textContent?.includes("歌词：啦") ?? false,
      "恢复后保存附点延音、歌词和指法",
    );
    firstEvent = Array.from(store.values.values())[0]
      ?.document.parts[0]?.staves[0]?.voices[0]?.measures[0]?.events[0];
    expect(firstEvent?.augmentationDots).toBe(1);
    expect(firstEvent?.type === "note" && firstEvent.tieToNext).toBe(true);
    expect(firstEvent?.type === "note" && firstEvent.slurToNext).toBe(true);
    expect(firstEvent?.type === "note" && firstEvent.lyric).toBe("啦");
    expect(firstEvent?.type === "note" && firstEvent.fingering).toBe(3);
    expect(container.textContent).toContain("指法：3");
    expect(
      container.querySelector('[data-testid^="local-score-fingering-"]')
        ?.textContent,
    ).toBe("3");
    expect(
      container.querySelector('[data-testid^="local-score-slur-"]'),
    ).not.toBeNull();
    await click(findButton(container, "固定 C 简谱"));
    expect(
      container.querySelector(
        '[data-testid^="local-score-numbered-fingering-"]',
      )?.textContent,
    ).toContain("指法 3");
    expect(
      container.querySelector('[data-testid^="local-score-numbered-slur-"]'),
    ).not.toBeNull();

    await click(findButton(container, "复制所选事件"));
    expect(container.textContent).toContain("单事件复制不包含跨事件延音或圆滑关系");

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

  it("和弦名称原子保存失败时保留 canonical 与草稿，重试成功且播放中禁止保存", async () => {
    const store = new MemoryProjectStore();
    const container = await renderPanel(store);
    await click(findButton(container, "创建并保存"));
    await change(findSelect(container, "时值"), "half");
    await click(findButton(container, "添加到第 1 小节并保存"));
    await waitFor(
      () => container.textContent?.includes("第 1 小节 · C4 · 二分音符")
        ?? false,
      "保存和弦名称测试音符",
    );

    await click(findButton(container, "编辑"));
    const chordInput = findInput(container, "事件起点和弦名称");
    await change(chordInput, "Cmaj7");
    store.failNextPut = new LocalScoreProjectStorageError(
      "write-failed",
      "本机存储写入失败，和弦名称未保存；原有项目保持不变。",
    );
    await click(findButton(container, "更新所选事件并保存"));
    await waitFor(
      () => container.textContent?.includes("和弦名称未保存") ?? false,
      "和弦名称保存失败",
    );

    let storedEvent = Array.from(store.values.values())[0]
      ?.document.parts[0]?.staves[0]?.voices[0]?.measures[0]?.events[0];
    expect(storedEvent?.chordSymbol).toBe(null);
    expect(chordInput.value).toBe("Cmaj7");
    expect(container.textContent).not.toContain("和弦：Cmaj7");
    expect(container.querySelector(
      '[data-testid^="local-score-chord-symbol-"]',
    )).toBeNull();

    await click(findButton(container, "更新所选事件并保存"));
    await waitFor(
      () => container.textContent?.includes("和弦：Cmaj7") ?? false,
      "重试保存和弦名称",
    );
    storedEvent = Array.from(store.values.values())[0]
      ?.document.parts[0]?.staves[0]?.voices[0]?.measures[0]?.events[0];
    expect(storedEvent?.chordSymbol).toBe("Cmaj7");
    expect(container.querySelector(
      '[data-testid^="local-score-chord-symbol-"]',
    )?.textContent).toBe("Cmaj7");

    await click(findButton(container, "播放草稿"));
    await waitFor(
      () => Array.from(container.querySelectorAll("button"))
        .some((button) => button.textContent?.trim() === "停止播放"),
      "和弦名称测试谱面开始播放",
    );
    const activePlaybackControl = findButton(container, "停止播放");
    await change(chordInput, "G7");
    expect(findButton(container, "更新所选事件并保存").disabled).toBe(true);
    expect(findButton(container, "清除和弦名称并保存").disabled).toBe(true);
    expect(findButton(container, "停止播放")).toBe(activePlaybackControl);
    expect(
      Array.from(store.values.values())[0]
        ?.document.parts[0]?.staves[0]?.voices[0]?.measures[0]?.events[0]
        ?.chordSymbol,
    ).toBe("Cmaj7");

    await click(activePlaybackControl);
    await waitFor(
      () => !findButton(container, "更新所选事件并保存").disabled,
      "停止播放后恢复和弦名称保存",
    );
    expect(chordInput.value).toBe("G7");
  });

  it("组合演奏法原子保存失败时保留 canonical 与草稿，休止符清空且播放中禁止保存", async () => {
    const store = new MemoryProjectStore();
    const container = await renderPanel(store);
    await click(findButton(container, "创建并保存"));
    await change(findSelect(container, "时值"), "half");
    await click(findButton(container, "添加到第 1 小节并保存"));
    await waitFor(
      () => container.textContent?.includes("第 1 小节 · C4 · 二分音符")
        ?? false,
      "保存演奏法测试音符",
    );

    await click(findButton(container, "编辑"));
    const accent = findInput(container, "重音");
    const staccato = findInput(container, "断奏");
    const tenuto = findInput(container, "保持");
    await click(tenuto);
    await click(accent);
    await click(staccato);
    store.failNextPut = new LocalScoreProjectStorageError(
      "write-failed",
      "本机存储写入失败，演奏法未保存；原有项目保持不变。",
    );
    await click(findButton(container, "更新所选事件并保存"));
    await waitFor(
      () => container.textContent?.includes("演奏法未保存") ?? false,
      "组合演奏法保存失败",
    );

    let storedEvent = Array.from(store.values.values())[0]
      ?.document.parts[0]?.staves[0]?.voices[0]?.measures[0]?.events[0];
    expect(storedEvent?.type === "note" && storedEvent.articulations)
      .toEqual([]);
    expect(accent.checked).toBe(true);
    expect(staccato.checked).toBe(true);
    expect(tenuto.checked).toBe(true);
    expect(container.textContent)
      .not.toContain("演奏法：重音、断奏、保持");
    expect(container.querySelector(
      '[data-testid^="local-score-articulation-"]',
    )).toBeNull();

    await click(findButton(container, "更新所选事件并保存"));
    await waitFor(
      () => container.textContent?.includes("演奏法：重音、断奏、保持")
        ?? false,
      "重试保存组合演奏法",
    );
    storedEvent = Array.from(store.values.values())[0]
      ?.document.parts[0]?.staves[0]?.voices[0]?.measures[0]?.events[0];
    expect(storedEvent?.type === "note" && storedEvent.articulations)
      .toEqual(["accent", "staccato", "tenuto"]);
    expect(container.querySelector(
      '[data-testid^="local-score-articulation-accent-"]',
    )).not.toBeNull();
    expect(container.querySelector(
      '[data-testid^="local-score-articulation-staccato-"]',
    )).not.toBeNull();
    expect(container.querySelector(
      '[data-testid^="local-score-articulation-tenuto-"]',
    )).not.toBeNull();

    await change(findSelect(container, "类型"), "rest");
    expect(accent.checked).toBe(false);
    expect(staccato.checked).toBe(false);
    expect(tenuto.checked).toBe(false);
    expect(accent.disabled).toBe(true);
    expect(staccato.disabled).toBe(true);
    expect(tenuto.disabled).toBe(true);
    expect(findButton(container, "清除演奏法并保存").disabled).toBe(true);

    await click(findButton(container, "编辑"));
    expect(accent.checked).toBe(true);
    expect(staccato.checked).toBe(true);
    expect(tenuto.checked).toBe(true);
    await click(findButton(container, "播放草稿"));
    await waitFor(
      () => Array.from(container.querySelectorAll("button"))
        .some((button) => button.textContent?.trim() === "停止播放"),
      "组合演奏法测试谱面开始播放",
    );
    const activePlaybackControl = findButton(container, "停止播放");
    expect(findButton(container, "更新所选事件并保存").disabled).toBe(true);
    expect(findButton(container, "清除演奏法并保存").disabled).toBe(true);
    expect(findButton(container, "停止播放")).toBe(activePlaybackControl);
    expect(
      Array.from(store.values.values())[0]
        ?.document.parts[0]?.staves[0]?.voices[0]?.measures[0]?.events[0],
    ).toMatchObject({
      type: "note",
      articulations: ["accent", "staccato", "tenuto"],
    });

    await click(activePlaybackControl);
    await waitFor(
      () => !findButton(container, "更新所选事件并保存").disabled,
      "停止播放后恢复演奏法保存",
    );
    expect(findButton(container, "清除演奏法并保存").disabled).toBe(false);
  });

  it("显式保存谱面标题、多位署名与版权，并支持失败重试、双视图、撤销重做和重开", async () => {
    const store = new MemoryProjectStore();
    const container = await renderPanel(store);
    expect(container.textContent).toContain(
      "项目名称用于本机列表与管理；创建时也会作为初始谱面标题",
    );
    await click(findButton(container, "创建并保存"));
    expect(container.textContent).toContain(
      "项目名称用于本机列表与管理，并通过自动保存更新",
    );
    expect(container.textContent).toContain("当前已保存谱面标题：我的第一份谱");

    await change(findInput(container, "谱面标题"), "山海之间");
    await change(findInput(container, "副标题"), "为室内乐而作");
    const firstComposer = container.querySelector<HTMLInputElement>(
      '[aria-label="作曲姓名"]',
    );
    const lyricist = container.querySelector<HTMLInputElement>(
      '[aria-label="作词姓名"]',
    );
    const arranger = container.querySelector<HTMLInputElement>(
      '[aria-label="编曲姓名"]',
    );
    if (!firstComposer || !lyricist || !arranger) {
      throw new Error("找不到谱面署名输入框");
    }
    await change(firstComposer, "甲");
    await click(findButton(container, "添加作曲"));
    const composers = container.querySelectorAll<HTMLInputElement>(
      '[aria-label="作曲姓名"]',
    );
    if (!composers[1]) throw new Error("找不到第二位作曲输入框");
    await change(composers[1], "乙");
    await change(lyricist, "丙");
    await change(arranger, "丁");
    await change(findInput(container, "版权说明"), "© 2026 示例版权说明");

    store.failNextPut = new LocalScoreProjectStorageError(
      "write-failed",
      "本机存储写入失败，谱面信息未保存；原有项目保持不变。",
    );
    await click(findButton(container, "保存谱面信息"));
    await waitFor(
      () => container.textContent?.includes("谱面信息未保存") ?? false,
      "谱面信息保存失败",
    );
    let stored = Array.from(store.values.values())[0];
    expect(stored?.document.scoreCredits.title).toBe("我的第一份谱");
    expect(container.textContent).toContain("当前已保存谱面标题：我的第一份谱");
    expect(container.textContent).not.toContain("作曲：甲、乙");
    expect(findInput(container, "谱面标题").value).toBe("山海之间");
    expect(container.querySelectorAll<HTMLInputElement>(
      '[aria-label="作曲姓名"]',
    )[1]?.value).toBe("乙");

    await click(findButton(container, "保存谱面信息"));
    await waitFor(
      () => container.textContent?.includes("当前已保存谱面标题：山海之间")
        ?? false,
      "重试保存谱面信息",
    );
    stored = Array.from(store.values.values())[0];
    expect(stored?.document.scoreCredits).toEqual({
      title: "山海之间",
      subtitle: "为室内乐而作",
      creators: [
        { role: "composer", name: "甲" },
        { role: "lyricist", name: "丙" },
        { role: "arranger", name: "丁" },
        { role: "composer", name: "乙" },
      ],
      rightsNotice: "© 2026 示例版权说明",
    });
    expect(container.textContent).toContain("作曲：甲、乙");
    expect(container.textContent).toContain("作词：丙");
    expect(container.textContent).toContain("编曲：丁");

    await click(findButton(container, "固定 C 简谱"));
    expect(container.textContent).toContain("山海之间");
    expect(container.textContent).toContain("作曲：甲、乙");

    await click(findButton(container, "撤销"));
    await waitFor(
      () => container.textContent?.includes("当前已保存谱面标题：我的第一份谱")
        ?? false,
      "撤销谱面信息",
    );
    expect(Array.from(store.values.values())[0]?.document.scoreCredits.title)
      .toBe("我的第一份谱");
    await click(findButton(container, "重做"));
    await waitFor(
      () => container.textContent?.includes("当前已保存谱面标题：山海之间")
        ?? false,
      "重做谱面信息",
    );

    await click(findButton(container, "返回项目列表"));
    await click(findButton(container, "打开"));
    await waitFor(
      () => container.textContent?.includes("已重新打开本机保存的谱项目")
        ?? false,
      "重开谱面信息",
    );
    expect(findInput(container, "谱面标题").value).toBe("山海之间");
    expect(container.textContent).toContain("作曲：甲、乙");
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
