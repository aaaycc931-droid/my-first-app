import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RealtimePitchMonitorPanel } from "../../components/practice/RealtimePitchMonitorPanel";

let root: Root | null = null;
let trackStop: ReturnType<typeof vi.fn>;
let contextClose: ReturnType<typeof vi.fn>;
let getUserMedia: ReturnType<typeof vi.fn>;

const flush = async () => {
  await act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 10)); });
};

const renderPanel = async () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<StrictMode><RealtimePitchMonitorPanel /></StrictMode>));
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
  getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: trackStop }] });
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  class FakeAudioContext {
    sampleRate = 48_000;
    state = "running";
    resume = vi.fn().mockResolvedValue(undefined);
    close = contextClose;
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
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Android 实时音高反馈行为", () => {
  it("必须由用户主动开始，可靠帧可显示并在停止时释放麦克风", async () => {
    const container = await renderPanel();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(container.textContent).toContain("不录音、不保存、不上传");

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

  it("停止并清空会删除已采集曲线且释放麦克风", async () => {
    const container = await renderPanel();
    await click(button(container, "开始实时反馈"));
    expect(container.querySelectorAll("polyline")).toHaveLength(1);

    await click(button(container, "停止并清空曲线"));
    expect(container.querySelectorAll("polyline")).toHaveLength(0);
    expect(trackStop).toHaveBeenCalledTimes(1);
  });

  it("权限拒绝显示中文恢复提示且不伪造音名", async () => {
    getUserMedia.mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    const container = await renderPanel();

    await click(button(container, "开始实时反馈"));
    expect(container.textContent).toContain("麦克风权限未开启");
    expect(container.textContent).toContain("—");
    expect(container.textContent).not.toContain("正在本地监听");
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
