import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocalVocalExercisePanel } from "../../components/practice/LocalVocalExercisePanel";

let root: Root | null = null;
let channelStop: ReturnType<typeof vi.fn>;
let oscillatorStart: ReturnType<typeof vi.fn>;
let oscillatorStop: ReturnType<typeof vi.fn>;
let prepare: ReturnType<typeof vi.fn>;

const flush = async () => act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 10)); });

const renderPanel = async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const createChannel = () => ({
    prepareForUserGesture: () => (prepare as unknown as () => Promise<AudioContext>)(),
    stop: () => (channelStop as unknown as () => void)(),
    trackSource: <T,>(source: T) => source,
  });
  root = createRoot(container);
  await act(async () => root?.render(<StrictMode><LocalVocalExercisePanel createChannel={createChannel} /></StrictMode>));
  await flush();
  return container;
};

const button = (container: ParentNode, label: string) => {
  const match = Array.from(container.querySelectorAll("button")).find((item) => item.textContent === label);
  if (!match) throw new Error(`找不到按钮：${label}`);
  return match;
};

const click = async (element: HTMLElement) => {
  await act(async () => element.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await flush();
};

beforeEach(() => {
  channelStop = vi.fn();
  oscillatorStart = vi.fn();
  oscillatorStop = vi.fn();
  const context = {
    currentTime: 10,
    destination: {},
    createOscillator: () => ({ type: "sine", frequency: { value: 0 }, connect: vi.fn(), start: oscillatorStart, stop: oscillatorStop }),
    createGain: () => ({ gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() }),
  };
  prepare = vi.fn().mockResolvedValue(context);
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("Android 本地练声目标生成器", () => {
  it("默认音型可本地调度完整两组参考音并停止", async () => {
    const container = await renderPanel();
    expect(container.textContent).toContain("目标预览（18 音 / 2 组）");
    await click(button(container, "播放参考音型"));
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(oscillatorStart).toHaveBeenCalledTimes(18);
    expect(container.textContent).toContain("正在播放参考音型");
    await click(button(container, "停止参考播放"));
    expect(channelStop).toHaveBeenCalled();
  });

  it("参考音频准备失败显示中文恢复提示", async () => {
    prepare.mockRejectedValue(new Error("blocked"));
    const container = await renderPanel();
    await click(button(container, "播放参考音型"));
    expect(container.textContent).toContain("当前手机无法播放练声参考音");
    expect(container.textContent).toContain("实时曲线仍可单独使用");
  });

  it("播放中卸载会停止调度通道", async () => {
    const container = await renderPanel();
    await click(button(container, "播放参考音型"));
    await act(async () => root?.unmount());
    root = null;
    expect(channelStop).toHaveBeenCalled();
  });

  it("可手动选择片段并循环三次参考音", async () => {
    const container = await renderPanel();
    await click(button(container, "重复所选片段 3 次"));
    expect(oscillatorStart).toHaveBeenCalledTimes(3);
    expect(container.textContent).toContain("正在播放参考音型");
  });
});
