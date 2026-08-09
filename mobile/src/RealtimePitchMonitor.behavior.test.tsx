import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RealtimePitchMonitorPanel } from "../../components/practice/RealtimePitchMonitorPanel";
import { stopAllBrowserAudio } from "../../lib/audio/browserAudioEngine";
import type { BrowserFileDownloadPort } from "../../lib/platform/browserFileDownload";
import { generateLocalVocalExercise, type GeneratedLocalVocalExercise } from "../../lib/practice/localVocalExercise";
import {
  serializeLocalVocalPracticeRecord,
  type LocalVocalPracticeRecord,
  type LocalVocalPracticeRecordRepository,
} from "../../lib/practice/localVocalPracticeRecord";
type DownloadRecord = Parameters<BrowserFileDownloadPort["download"]>[0];

let root: Root | null = null;
let trackStop: ReturnType<typeof vi.fn>;
let contextClose: ReturnType<typeof vi.fn>;
let getUserMedia: ReturnType<typeof vi.fn>;
let recorderStop: ReturnType<typeof vi.fn>;
let audioPlay: ReturnType<typeof vi.fn>;
let audioPause: ReturnType<typeof vi.fn>;
let createObjectUrl: ReturnType<typeof vi.fn>;
let revokeObjectUrl: ReturnType<typeof vi.fn>;
let decodeAudioDataMock: ReturnType<typeof vi.fn>;

const flush = async () => {
  await act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 10)); });
};

const waitFor = async (predicate: () => boolean, message: string) => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (predicate()) return;
    await flush();
  }
  throw new Error(`等待超时：${message}`);
};

const createPracticeRecordRepository = (
  records: LocalVocalPracticeRecord[] = [],
) => ({
  list: vi.fn().mockResolvedValue(records),
  save: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
}) satisfies LocalVocalPracticeRecordRepository;

const createFileDownloadPort = () => ({
  download: vi.fn<(request: DownloadRecord) => void>(),
}) satisfies BrowserFileDownloadPort;

const storedRecord: LocalVocalPracticeRecord = {
  schemaVersion: 1,
  id: "stored-record",
  createdAt: "2026-07-31T08:00:00.000Z",
  note: "保留的记录",
  targetLabel: "自由练唱",
  targetMidi: 69,
  curvePoints: [{ timestampMs: 1_000, midi: 69, state: "reliable", confidence: 0.9 }],
  recording: null,
  algorithmVersion: "autocorrelation-realtime-v1",
};

const renderPanel = async (
  targetExercise?: GeneratedLocalVocalExercise,
  practiceRecordRepository = createPracticeRecordRepository(),
  fileDownloadPort = createFileDownloadPort(),
) => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(
    <StrictMode>
      <RealtimePitchMonitorPanel
        fileDownloadPort={fileDownloadPort}
        practiceRecordRepository={practiceRecordRepository}
        targetExercise={targetExercise}
      />
    </StrictMode>,
  ));
  await flush();
  return container;
};

const button = (container: ParentNode, label: string) => {
  const match = Array.from(container.querySelectorAll("button")).find((item) => item.textContent === label || item.getAttribute("aria-label") === label);
  if (!match) throw new Error(`找不到按钮：${label}`);
  return match;
};

const click = async (element: HTMLElement) => {
  await act(async () => element.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await flush();
};

beforeEach(() => {
  trackStop = vi.fn();
  contextClose = vi.fn().mockResolvedValue(undefined);
  recorderStop = vi.fn();
  audioPlay = vi.fn().mockResolvedValue(undefined);
  audioPause = vi.fn();
  createObjectUrl = vi.fn().mockReturnValue("blob:session-recording");
  revokeObjectUrl = vi.fn();
  getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: trackStop }] });
  const decodedSamples = new Float32Array(48_000);
  for (let index = 0; index < decodedSamples.length; index += 1) decodedSamples[index] = 0.35 * Math.sin(2 * Math.PI * 440 * index / 48_000);
  decodeAudioDataMock = vi.fn().mockResolvedValue({
    numberOfChannels: 1,
    sampleRate: 48_000,
    getChannelData: () => decodedSamples,
  });
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  class FakeAudioContext {
    sampleRate = 48_000;
    state = "running";
    resume = vi.fn().mockResolvedValue(undefined);
    close = contextClose;
    decodeAudioData = decodeAudioDataMock;
    createMediaStreamSource = () => ({ connect: vi.fn(), disconnect: vi.fn() });
    createAnalyser = () => ({
      fftSize: 4096,
      smoothingTimeConstant: 0,
      getFloatTimeDomainData: (samples: Float32Array) => {
        for (let index = 0; index < samples.length; index += 1) {
          samples[index] = 0.4 * Math.sin(2 * Math.PI * 440 * index / 48_000);
        }
      },
    });
  }
  vi.stubGlobal("AudioContext", FakeAudioContext);
  class FakeMediaRecorder {
    static isTypeSupported = () => true;
    state = "inactive";
    mimeType: string;
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(_stream: unknown, options?: { mimeType?: string }) { this.mimeType = options?.mimeType ?? "audio/webm"; }
    start = () => { this.state = "recording"; };
    stop = () => {
      (recorderStop as () => void)();
      this.state = "inactive";
      this.ondataavailable?.({ data: new Blob(["voice"], { type: this.mimeType }) });
      this.onstop?.();
    };
  }
  class FakeAudio {
    currentTime = 0;
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(public src: string) {}
    play = audioPlay;
    pause = audioPause;
  }
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
  vi.stubGlobal("Audio", FakeAudio);
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectUrl });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectUrl });
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Android 实时音高反馈行为", () => {
  it("练声记录 JSON 只通过注入的下载端口导出，并在启动或清理失败时保持记录", async () => {
    const repository = createPracticeRecordRepository([storedRecord]);
    const fileDownloadPort = createFileDownloadPort();
    const container = await renderPanel(
      undefined,
      repository,
      fileDownloadPort,
    );
    const exportButton = container.querySelector(
      '[aria-label^="导出 JSON："]',
    ) as HTMLButtonElement | null;
    if (!exportButton) throw new Error("找不到练声记录 JSON 导出按钮");

    await click(exportButton);

    expect(fileDownloadPort.download).toHaveBeenCalledTimes(1);
    const request = fileDownloadPort.download.mock.calls[0]?.[0];
    expect(request).toMatchObject({
      data: serializeLocalVocalPracticeRecord(storedRecord),
      fileName: "视唱练耳-2026-07-31-stored-r.json",
      mimeType: "application/json",
    });
    expect(request?.onCleanupError).toBeTypeOf("function");
    expect(container.textContent).toContain("保留的记录");

    await act(async () => {
      request?.onCleanupError?.(new Error("URL 清理失败"));
    });
    expect(container.textContent).toContain(
      "无法回收练声记录下载 URL：URL 清理失败；本机记录和录音保持不变。",
    );
    expect(container.textContent).toContain("保留的记录");

    fileDownloadPort.download.mockImplementationOnce(() => {
      throw new Error("浏览器拒绝下载");
    });
    await click(exportButton);
    expect(container.textContent).toContain(
      "练声记录 JSON 下载启动失败：浏览器拒绝下载；本机记录和录音保持不变。",
    );

    await click(exportButton);
    expect(fileDownloadPort.download).toHaveBeenCalledTimes(3);
    expect(container.textContent).not.toContain("下载启动失败");
    expect(container.textContent).not.toContain("无法回收练声记录下载 URL");

    await act(async () => {
      request?.onCleanupError?.(new Error("过期清理失败"));
    });
    expect(container.textContent).not.toContain("过期清理失败");

    const latestRequest = fileDownloadPort.download.mock.calls[2]?.[0];
    await act(async () => root?.unmount());
    root = null;
    await act(async () => {
      latestRequest?.onCleanupError?.(new Error("卸载后清理失败"));
    });
    expect(container.textContent).toBe("");
    expect(repository.remove).not.toHaveBeenCalled();
    expect(repository.clear).not.toHaveBeenCalled();
  });

  it("本机记录只在 repository 成功后更新保存、删除和清空界面", async () => {
    const repository = createPracticeRecordRepository([storedRecord]);
    const container = await renderPanel(undefined, repository);
    expect(container.textContent).toContain("保留的记录");

    await click(button(container, "开始实时反馈"));
    await click(button(container, "仅保存当前曲线"));
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(repository.save.mock.calls[0]?.[0].recording).toBeNull();
    expect(container.textContent).toContain("已仅保存曲线到本机应用私有记录");

    const deleteStoredRecord = Array.from(container.querySelectorAll("button")).find(
      (item) => item.getAttribute("aria-label")?.startsWith("删除：")
        && item.parentElement?.parentElement?.textContent?.includes("保留的记录"),
    );
    if (!deleteStoredRecord) throw new Error("找不到已保存记录的删除按钮");
    await click(deleteStoredRecord);
    expect(repository.remove).toHaveBeenCalledWith("stored-record");
    expect(container.textContent).not.toContain("保留的记录");

    await click(button(container, "清除全部记录"));
    expect(repository.clear).not.toHaveBeenCalled();
    await click(button(container, "确认全部清除"));
    expect(repository.clear).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll('[aria-label^="删除："]')).toHaveLength(0);
  });

  it("repository 读取、保存、删除或清空失败时保持实时练习与既有记录", async () => {
    const unavailableRepository = createPracticeRecordRepository();
    unavailableRepository.list.mockRejectedValue(new Error("unavailable"));
    const unavailableContainer = await renderPanel(undefined, unavailableRepository);
    expect(unavailableContainer.textContent).toContain("本机记录暂时不可用；实时练习不受影响。");
    await click(button(unavailableContainer, "开始实时反馈"));
    expect(unavailableContainer.textContent).toContain("440.0 Hz");
    await act(async () => root?.unmount());
    root = null;
    document.body.replaceChildren();

    const repository = createPracticeRecordRepository([storedRecord]);
    repository.save.mockRejectedValue(new Error("保存失败"));
    repository.remove.mockRejectedValue(new Error("删除失败"));
    repository.clear.mockRejectedValue(new Error("清除失败"));
    const container = await renderPanel(undefined, repository);
    const note = container.querySelector("textarea") as HTMLTextAreaElement;
    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      setValue?.call(note, "失败后保留这条备注");
      note.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await click(button(container, "开始实时反馈"));
    await click(button(container, "仅保存当前曲线"));
    expect(container.textContent).toContain("保存失败");
    expect(container.querySelectorAll('[aria-label^="删除："]')).toHaveLength(1);
    expect(note.value).toBe("失败后保留这条备注");

    await click(container.querySelector('[aria-label^="删除："]') as HTMLElement);
    expect(container.textContent).toContain("删除失败，请重试。");
    expect(container.textContent).toContain("保留的记录");

    await click(button(container, "清除全部记录"));
    await click(button(container, "取消"));
    expect(repository.clear).not.toHaveBeenCalled();
    await click(button(container, "清除全部记录"));
    await click(button(container, "确认全部清除"));
    expect(repository.clear).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("清除失败，请重试。");
    expect(container.textContent).toContain("保留的记录");
  });

  it("必须由用户主动开始，可靠帧可显示并在停止时释放麦克风", async () => {
    const container = await renderPanel();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(container.textContent).toContain("不自动保存、不上传");

    await click(button(container, "开始实时反馈"));
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("A4");
    expect(container.textContent).toContain("440.0 Hz");
    expect(container.querySelectorAll("polyline")).toHaveLength(1);

    await click(button(container, "5 秒"));
    expect(container.textContent).toContain("最近 5 秒音高曲线");
    await click(button(container, "目标音升高半音"));
    expect(container.textContent).toContain("A♯4");

    await click(button(container, "停止监听"));
    expect(trackStop).toHaveBeenCalledTimes(1);
    expect(contextClose).toHaveBeenCalledTimes(1);
  });

  it("会话录音可停止、回放和丢弃，回放前释放麦克风", async () => {
    const container = await renderPanel();
    await click(button(container, "开始实时反馈"));
    await click(button(container, "开始会话录音"));
    expect(container.textContent).toContain("状态：正在录音");

    await click(button(container, "停止录音"));
    expect(recorderStop).toHaveBeenCalledTimes(1);
    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("状态：可以回放");

    await click(button(container, "播放本次录音"));
    expect(trackStop).toHaveBeenCalledTimes(1);
    expect(audioPlay).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("状态：正在回放");

    await click(button(container, "停止回放"));
    expect(audioPause).toHaveBeenCalledTimes(1);
    await click(button(container, "丢弃本次录音"));
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:session-recording");
    expect(container.textContent).toContain("状态：尚未录音");
  });

  it("明确区分仅保存曲线与保存曲线和录音，缺少介质时失败关闭", async () => {
    const repository = createPracticeRecordRepository();
    const container = await renderPanel(undefined, repository);
    const curveOnlyButton = button(container, "仅保存当前曲线") as HTMLButtonElement;
    const curveAndRecordingButton = button(container, "保存当前曲线和录音") as HTMLButtonElement;

    expect(curveOnlyButton.disabled).toBe(true);
    expect(curveOnlyButton.title).toBe("先开始实时反馈并获得音高曲线");
    expect(curveAndRecordingButton.disabled).toBe(true);
    expect(curveAndRecordingButton.title).toBe("先开始实时反馈并获得音高曲线");
    expect(container.textContent).toContain("“仅保存曲线”不会保留录音");

    await click(button(container, "开始实时反馈"));
    expect(curveOnlyButton.disabled).toBe(false);
    expect(curveAndRecordingButton.disabled).toBe(true);
    expect(curveAndRecordingButton.title).toBe("先完成一次会话录音");

    await click(button(container, "开始会话录音"));
    await click(button(container, "停止录音"));
    expect(curveAndRecordingButton.disabled).toBe(false);

    await click(curveOnlyButton);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(repository.save.mock.calls[0]?.[0].recording).toBeNull();
    expect(container.textContent).toContain("已仅保存曲线到本机应用私有记录");
    expect(container.textContent).toContain("状态：可以回放");
    expect(container.textContent).toContain("仅曲线");

    await click(curveAndRecordingButton);
    expect(repository.save).toHaveBeenCalledTimes(2);
    expect(repository.save.mock.calls[1]?.[0].recording).toBeInstanceOf(Blob);
    expect(repository.save.mock.calls[1]?.[0].recording?.size).toBeGreaterThan(0);
    expect(container.textContent).toContain("已保存曲线和录音到本机应用私有记录");
    expect(container.textContent).toContain("含录音");
  });

  it("保存未完成或失败时锁定重复提交并保留备注、录音和既有列表", async () => {
    const repository = createPracticeRecordRepository([storedRecord]);
    let rejectSave: ((reason?: unknown) => void) | null = null;
    repository.save.mockImplementationOnce(() => new Promise<void>((_resolve, reject) => {
      rejectSave = reject;
    }));
    const container = await renderPanel(undefined, repository);
    const note = container.querySelector("textarea") as HTMLTextAreaElement;
    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      setValue?.call(note, "这条备注必须等待保存成功");
      note.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await click(button(container, "开始实时反馈"));
    await click(button(container, "开始会话录音"));
    await click(button(container, "停止录音"));

    const saveWithRecording = button(container, "保存当前曲线和录音") as HTMLButtonElement;
    await click(saveWithRecording);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect((button(container, "正在保存曲线和录音…") as HTMLButtonElement).disabled).toBe(true);
    expect((button(container, "仅保存当前曲线") as HTMLButtonElement).disabled).toBe(true);
    expect(container.querySelectorAll('[aria-label^="删除："]')).toHaveLength(1);
    expect(note.value).toBe("这条备注必须等待保存成功");
    expect(container.textContent).toContain("状态：可以回放");
    expect(container.textContent).not.toContain("已保存曲线和录音到本机");

    await act(async () => {
      rejectSave?.(new Error("本机空间不足"));
      await Promise.resolve();
    });
    await flush();
    expect(container.textContent).toContain("本机空间不足");
    expect(container.querySelectorAll('[aria-label^="删除："]')).toHaveLength(1);
    expect(note.value).toBe("这条备注必须等待保存成功");
    expect(container.textContent).toContain("状态：可以回放");

    await click(button(container, "保存当前曲线和录音"));
    expect(repository.save).toHaveBeenCalledTimes(2);
    expect(container.querySelectorAll('[aria-label^="删除："]')).toHaveLength(2);
    expect(note.value).toBe("");
    expect(container.textContent).toContain("已保存曲线和录音到本机应用私有记录");
  });

  it("录音停止后必须二次确认才执行本地多候选分析，丢弃会使结果失效", async () => {
    const targetExercise = generateLocalVocalExercise({
      patternId: "single",
      rootMidi: 69,
      direction: "ascending",
      bpm: 60,
      octaveShift: 0,
      loops: 1,
      referenceMode: "full",
      intervalSemitones: 7,
    });
    const container = await renderPanel(targetExercise);
    await click(button(container, "开始实时反馈"));
    await click(button(container, "开始会话录音"));
    await click(button(container, "停止录音"));

    await click(button(container, "检查并准备分析本次录音"));
    expect(container.textContent).toContain("确认停止麦克风");
    expect(decodeAudioDataMock).not.toHaveBeenCalled();

    await click(button(container, "确认开始本地分析"));
    expect(decodeAudioDataMock).toHaveBeenCalledTimes(1);
    expect(trackStop).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("状态：本地分析已完成");
    expect(container.textContent).toContain("A4");
    expect(container.textContent).toContain("候选一致");
    expect(container.querySelector('[aria-label="录音后连续音高轨迹，不含目标评分"]')).not.toBeNull();
    expect(container.textContent).toContain("逐音与逐句证据（非评分）");
    expect(container.textContent).toContain("第 1 音 · 目标 A4");
    expect(container.textContent).toContain("接近目标");
    expect(container.textContent).toContain("音头");
    expect(container.textContent).toContain("稳定段");
    expect(container.textContent).toContain("尾音");

    await click(button(container, "回放本次片段并定位复练"));
    expect(audioPlay).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("已定位片段");

    await click(button(container, "丢弃本次录音"));
    expect(container.textContent).toContain("状态：等待本次录音");
    expect(container.textContent).not.toContain("状态：本地分析已完成");
  });

  it("录音中卸载会停止录制、释放媒体轨且不生成会话 URL", async () => {
    const container = await renderPanel();
    await click(button(container, "开始实时反馈"));
    await click(button(container, "开始会话录音"));
    await act(async () => root?.unmount());
    root = null;

    expect(recorderStop).toHaveBeenCalledTimes(1);
    expect(trackStop).toHaveBeenCalledTimes(1);
    expect(createObjectUrl).not.toHaveBeenCalled();
  });

  it("录音时停止监听会完成录音并释放麦克风", async () => {
    const container = await renderPanel();
    await click(button(container, "开始实时反馈"));
    await click(button(container, "开始会话录音"));
    await click(button(container, "停止监听"));

    expect(recorderStop).toHaveBeenCalledTimes(1);
    expect(trackStop).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("状态：可以回放");
  });

  it("本地参考音开始时会停止麦克风，避免扬声器串入曲线", async () => {
    const container = await renderPanel();
    await click(button(container, "开始实时反馈"));
    await act(async () => stopAllBrowserAudio());
    await flush();

    expect(trackStop).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("尚未开始");
  });

  it("缺少 MediaRecorder 时保持实时曲线可用并给出中文说明", async () => {
    vi.stubGlobal("MediaRecorder", undefined);
    const container = await renderPanel();
    await click(button(container, "开始实时反馈"));
    await click(button(container, "开始会话录音"));

    expect(container.textContent).toContain("当前设备不支持会话内录音");
    expect(container.textContent).toContain("A4");
    expect(trackStop).not.toHaveBeenCalled();
  });

  it("停止并清空会删除已采集曲线且释放麦克风", async () => {
    const container = await renderPanel();
    await click(button(container, "开始实时反馈"));
    expect(container.querySelectorAll("polyline")).toHaveLength(1);

    await click(button(container, "停止并清空曲线"));
    expect(container.querySelectorAll("polyline")).toHaveLength(0);
    expect(trackStop).toHaveBeenCalledTimes(1);
  });

  it("固定 A4 活动必须显式录音、分析和检查，并以录音开始作为目标零点", async () => {
    let now = 1_000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const container = await renderPanel();
    const activityRecordButton = button(container, "开始 A4 活动录音") as HTMLButtonElement;

    expect(getUserMedia).not.toHaveBeenCalled();
    expect(activityRecordButton.disabled).toBe(true);
    expect(container.textContent).toContain("固定目标 A4 · 440 Hz");
    expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent).toContain("题目已确认");
    expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent).toContain("第 1 次尝试");

    await click(button(container, "开始实时反馈"));
    now = 10_000;
    expect((button(container, "开始 A4 活动录音") as HTMLButtonElement).disabled).toBe(false);
    await click(button(container, "开始 A4 活动录音"));
    expect(container.textContent).toContain("状态：正在录音");

    await click(button(container, "停止录音"));
    await click(button(container, "检查并准备分析本次录音"));
    await click(button(container, "确认开始本地分析"));
    await waitFor(
      () => container.querySelector('[data-testid="activity-protocol-state"]')?.textContent?.includes("已作答，等待检查") === true,
      "A4 分析证据提交到当前活动尝试",
    );
    expect(container.textContent).toContain("第 1 音 · 目标 A4");
    expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent).not.toContain("答案已检查");

    await click(button(container, "检查本次 A4 证据"));
    expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent).toContain("答案已检查");
    expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent).toContain("非评分证据");

    await click(button(container, "重新尝试 A4"));
    expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent).toContain("题目已确认");
    expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent).toContain("第 2 次尝试");
    expect(container.textContent).toContain("状态：尚未录音");
    expect(container.textContent).not.toContain("状态：本地分析已完成");
  });

  it("清除分析或在 checked 后重录会清除旧证据并隔离新尝试", async () => {
    const container = await renderPanel();
    await click(button(container, "开始实时反馈"));
    await click(button(container, "开始 A4 活动录音"));
    await click(button(container, "停止录音"));
    await click(button(container, "检查并准备分析本次录音"));
    await click(button(container, "确认开始本地分析"));
    await waitFor(
      () => container.querySelector('[data-testid="activity-protocol-state"]')?.textContent?.includes("已作答，等待检查") === true,
      "首次 A4 证据提交",
    );

    await click(button(container, "清除本次分析结果"));
    expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent).toContain("题目已确认");
    expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent).toContain("第 2 次尝试");
    expect((button(container, "检查本次 A4 证据") as HTMLButtonElement).disabled).toBe(true);

    await click(button(container, "开始实时反馈"));
    await click(button(container, "开始 A4 活动录音"));
    await click(button(container, "停止录音"));
    await click(button(container, "检查并准备分析本次录音"));
    await click(button(container, "确认开始本地分析"));
    await waitFor(
      () => container.querySelector('[data-testid="activity-protocol-state"]')?.textContent?.includes("已作答，等待检查") === true,
      "第二次 A4 证据提交",
    );
    await click(button(container, "检查本次 A4 证据"));
    expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent).toContain("答案已检查");
    expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent).toContain("第 2 次尝试");

    await click(button(container, "开始实时反馈"));
    await click(button(container, "开始 A4 活动录音"));
    expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent).toContain("题目已确认");
    expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent).toContain("第 3 次尝试");
    expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent).not.toContain("答案已检查");
    expect((button(container, "检查本次 A4 证据") as HTMLButtonElement).disabled).toBe(true);
  });

  it("权限拒绝显示中文恢复提示且不伪造音名", async () => {
    getUserMedia.mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    const container = await renderPanel();

    await click(button(container, "开始实时反馈"));
    expect(container.textContent).toContain("麦克风权限未开启");
    expect(container.textContent).toContain("—");
    expect(container.textContent).not.toContain("正在本地监听");
    expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent).toContain("题目已确认");
    expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent).toContain("第 1 次尝试");
    expect((button(container, "开始 A4 活动录音") as HTMLButtonElement).disabled).toBe(true);
  });

  it("组件卸载会释放仍在使用的轨道和音频上下文", async () => {
    const container = await renderPanel();
    await click(button(container, "开始实时反馈"));
    await act(async () => root?.unmount());
    root = null;

    expect(trackStop).toHaveBeenCalledTimes(1);
    expect(contextClose).toHaveBeenCalledTimes(1);
  });

  it("等待权限期间停止后，迟到的媒体轨也会立即释放", async () => {
    let resolveStream: ((stream: { getTracks: () => Array<{ stop: typeof trackStop }> }) => void) | null = null;
    getUserMedia.mockReturnValue(new Promise((resolve) => { resolveStream = resolve; }));
    const container = await renderPanel();

    await click(button(container, "开始实时反馈"));
    await click(button(container, "停止监听"));
    await act(async () => resolveStream?.({ getTracks: () => [{ stop: trackStop }] }));
    await flush();

    expect(trackStop).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("尚未开始");
  });
});
