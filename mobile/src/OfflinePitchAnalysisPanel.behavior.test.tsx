import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  OfflinePitchAnalysisPanel,
  type OfflinePitchAnalysisInvalidationDetail,
  type OfflinePitchAnalysisReadyDetail,
} from "../../components/practice/OfflinePitchAnalysisPanel";

let root: Root | null = null;
let decodeAudioData: ReturnType<typeof vi.fn>;
let contextClose: ReturnType<typeof vi.fn>;

const samples = Float32Array.from(
  { length: 48_000 },
  (_, index) => 0.35 * Math.sin(2 * Math.PI * 440 * index / 48_000),
);

const decodedAudio = {
  numberOfChannels: 1,
  sampleRate: 48_000,
  getChannelData: () => samples,
};

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 10));
  });
};

const waitFor = async (predicate: () => boolean, message: string) => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (predicate()) return;
    await flush();
  }
  throw new Error(`等待超时：${message}`);
};

const findButton = (container: ParentNode, label: string) => {
  const match = Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === label,
  );
  if (!match) throw new Error(`找不到按钮：${label}`);
  return match as HTMLButtonElement;
};

const click = async (element: HTMLElement) => {
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flush();
};

const renderPanel = async ({
  container,
  recording,
  onAnalysisReady,
  onAnalysisInvalidated,
}: {
  container: HTMLElement;
  recording: Blob | null;
  onAnalysisReady: (detail: OfflinePitchAnalysisReadyDetail) => void;
  onAnalysisInvalidated: (detail: OfflinePitchAnalysisInvalidationDetail) => void;
}) => {
  await act(async () => {
    root?.render(
      <StrictMode>
        <OfflinePitchAnalysisPanel
          recording={recording}
          onBeforeAnalyze={() => undefined}
          onAnalysisReady={onAnalysisReady}
          onAnalysisInvalidated={onAnalysisInvalidated}
        />
      </StrictMode>,
    );
  });
  await flush();
  return container;
};

const prepareAndAnalyze = async (container: HTMLElement) => {
  await click(findButton(container, "检查并准备分析本次录音"));
  await click(findButton(container, "确认开始本地分析"));
};

beforeEach(() => {
  decodeAudioData = vi.fn().mockResolvedValue(decodedAudio);
  contextClose = vi.fn().mockResolvedValue(undefined);
  class FakeAudioContext {
    state = "running";
    decodeAudioData = decodeAudioData;
    close = contextClose;
  }
  vi.stubGlobal("AudioContext", FakeAudioContext);
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("离线音高分析结果绑定边界", () => {
  it("分析完成后只回调一次，并同时提供对应录音、音高与对齐结果", async () => {
    const recording = new Blob(["voice"], { type: "audio/webm" });
    const onAnalysisReady = vi.fn<(detail: OfflinePitchAnalysisReadyDetail) => void>();
    const onAnalysisInvalidated = vi.fn<(detail: OfflinePitchAnalysisInvalidationDetail) => void>();
    const container = document.body.firstElementChild as HTMLElement;
    await renderPanel({ container, recording, onAnalysisReady, onAnalysisInvalidated });

    await prepareAndAnalyze(container);
    await waitFor(() => onAnalysisReady.mock.calls.length === 1, "分析 ready 回调");

    const detail = onAnalysisReady.mock.calls[0]![0];
    expect(detail.recording).toBe(recording);
    expect(detail.pitchAnalysis.version).toBe("offline-pitch-multicandidate-v1");
    expect(detail.noteAlignment.version).toBe("offline-note-alignment-v1");
    expect(detail.noteAlignment.targetEvidence).toEqual([]);
    expect(onAnalysisInvalidated).not.toHaveBeenCalled();
    expect(contextClose).toHaveBeenCalledTimes(1);
  });

  it("显式清除和换录音都会使父组件持有的旧结果失效", async () => {
    const firstRecording = new Blob(["first"], { type: "audio/webm" });
    const secondRecording = new Blob(["second"], { type: "audio/webm" });
    const onAnalysisReady = vi.fn<(detail: OfflinePitchAnalysisReadyDetail) => void>();
    const onAnalysisInvalidated = vi.fn<(detail: OfflinePitchAnalysisInvalidationDetail) => void>();
    const container = document.body.firstElementChild as HTMLElement;
    await renderPanel({ container, recording: firstRecording, onAnalysisReady, onAnalysisInvalidated });
    await prepareAndAnalyze(container);
    await waitFor(() => onAnalysisReady.mock.calls.length === 1, "首次分析完成");

    await click(findButton(container, "清除本次分析结果"));
    expect(onAnalysisInvalidated).toHaveBeenLastCalledWith({
      reason: "analysis-cleared",
      previousRecording: firstRecording,
      nextRecording: firstRecording,
    });

    await renderPanel({ container, recording: secondRecording, onAnalysisReady, onAnalysisInvalidated });
    expect(onAnalysisInvalidated).toHaveBeenLastCalledWith({
      reason: "recording-changed",
      previousRecording: firstRecording,
      nextRecording: secondRecording,
    });
    expect(container.textContent).toContain("录音可供检查后分析");
    expect(container.textContent).not.toContain("本地分析已完成");
  });

  it("旧录音的异步解码在换录音后才完成时不得产生 ready 回调", async () => {
    let resolveDecode: ((value: typeof decodedAudio) => void) | null = null;
    decodeAudioData.mockReturnValue(new Promise((resolve) => { resolveDecode = resolve; }));
    const firstRecording = new Blob(["first"], { type: "audio/webm" });
    const secondRecording = new Blob(["second"], { type: "audio/webm" });
    const onAnalysisReady = vi.fn<(detail: OfflinePitchAnalysisReadyDetail) => void>();
    const onAnalysisInvalidated = vi.fn<(detail: OfflinePitchAnalysisInvalidationDetail) => void>();
    const container = document.body.firstElementChild as HTMLElement;
    await renderPanel({ container, recording: firstRecording, onAnalysisReady, onAnalysisInvalidated });
    await prepareAndAnalyze(container);
    expect(container.textContent).toContain("正在本机解码与分析");

    await renderPanel({ container, recording: secondRecording, onAnalysisReady, onAnalysisInvalidated });
    await act(async () => resolveDecode?.(decodedAudio));
    await flush();

    expect(onAnalysisReady).not.toHaveBeenCalled();
    expect(onAnalysisInvalidated).toHaveBeenLastCalledWith({
      reason: "recording-changed",
      previousRecording: firstRecording,
      nextRecording: secondRecording,
    });
    expect(container.textContent).toContain("录音可供检查后分析");
    expect(container.textContent).not.toContain("本地分析已完成");
    expect(contextClose).toHaveBeenCalledTimes(1);
  });
});
