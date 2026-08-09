import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createLocalIntervalComparisonQuestion } from "../../lib/practice/localIntervalComparisons";
import { LocalIntervalImitationPanel } from "../../components/practice/LocalIntervalImitationPanel";

const monitor = vi.hoisted(() => ({
  status: "listening" as "idle" | "requesting" | "listening" | "error",
  frame: null,
  curvePoints: [],
  listeningStartedAtMs: 1_000,
  error: "",
  recordingStatus: "empty" as "empty" | "recording" | "ready" | "playing" | "error",
  hasRecording: false,
  recordingBlob: null as Blob | null,
  hasCompletedRecordingPlayback: false,
  recordingStartedAtMs: null as number | null,
  recordingError: "",
  start: vi.fn(), stop: vi.fn(), clear: vi.fn(), startRecording: vi.fn(), stopRecording: vi.fn(),
  playRecording: vi.fn(), stopPlayback: vi.fn(), discardRecording: vi.fn(), suppressNextGlobalStop: vi.fn(),
}));

vi.mock("../../components/practice/useRealtimePitchMonitor", () => ({
  useRealtimePitchMonitor: () => monitor,
}));

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const question = createLocalIntervalComparisonQuestion({ difficulty: "基础", sequence: 0 });
const render = async () => {
  if (!container) {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  }
  await act(async () => root?.render(<LocalIntervalImitationPanel question={question} />));
  return container;
};
const button = (label: string) => Array.from(container?.querySelectorAll("button") ?? [])
  .find((item) => item.textContent === label) as HTMLButtonElement | undefined;

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null; container = null; document.body.replaceChildren(); vi.clearAllMocks();
  monitor.status = "listening"; monitor.recordingStatus = "empty"; monitor.recordingBlob = null;
});

describe("音程模唱实时录音调用边界", () => {
  it("沿用 monitor API 开始、停止并清除当前录音", async () => {
    await render();
    expect(button("麦克风已就绪")?.disabled).toBe(true);
    await act(async () => button("开始模唱录音")?.click());
    expect(monitor.startRecording).toHaveBeenCalledTimes(1);

    monitor.recordingStatus = "recording";
    await render();
    await act(async () => button("停止录音")?.click());
    expect(monitor.stopRecording).toHaveBeenCalledTimes(1);

    monitor.recordingStatus = "ready";
    monitor.recordingBlob = new Blob(["voice"]);
    await render();
    await act(async () => button("清除并重录")?.click());
    expect(monitor.discardRecording).toHaveBeenCalledTimes(1);
  });
});
