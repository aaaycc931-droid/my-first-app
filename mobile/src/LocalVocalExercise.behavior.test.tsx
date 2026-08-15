import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { LocalVocalExercisePanel } from "../../components/practice/LocalVocalExercisePanel";
import { stopAllBrowserAudio } from "../../lib/audio/browserAudioEngine";
import type {
  LocalVocalReferencePlaybackPort,
  LocalVocalReferencePlaybackTone,
  PreparedLocalVocalReferencePlayback,
} from "../../lib/audio/localVocalReferencePlayback";
import { createLocalVocalReferencePlaybackController } from "../../lib/practice/localVocalReferencePlaybackController";

let root: Root | null = null;
let portStop: Mock<() => void>;
let scheduleTone: Mock<(tone: LocalVocalReferencePlaybackTone) => void>;
let prepare: Mock<() => Promise<PreparedLocalVocalReferencePlayback>>;
let timers: Map<number, () => void>;
let nextTimer: number;

const flush = async () => act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 10)); });

const renderPanel = async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const port: LocalVocalReferencePlaybackPort = {
    prepare: () => prepare(),
    stop: portStop,
    dispose: portStop,
    setTimer: (callback) => {
      const timer = nextTimer++;
      timers.set(timer, callback);
      return timer;
    },
    clearTimer: (timer) => {
      timers.delete(timer as number);
    },
  };
  root = createRoot(container);
  await act(async () => root?.render(
    <StrictMode>
      <LocalVocalExercisePanel
        createPlaybackController={() =>
          createLocalVocalReferencePlaybackController(port)}
      />
    </StrictMode>,
  ));
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
  portStop = vi.fn();
  scheduleTone = vi.fn();
  prepare = vi.fn().mockResolvedValue({ scheduleTone });
  timers = new Map();
  nextTimer = 1;
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
    expect(scheduleTone).toHaveBeenCalledTimes(18);
    expect(container.textContent).toContain("正在播放参考音型");
    await click(button(container, "停止参考播放"));
    expect(portStop).toHaveBeenCalled();
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
    await flush();
    expect(portStop).toHaveBeenCalled();
  });

  it("可手动选择片段并循环三次参考音", async () => {
    const container = await renderPanel();
    await click(button(container, "重复所选片段 3 次"));
    expect(scheduleTone).toHaveBeenCalledTimes(3);
    expect(container.textContent).toContain("正在播放参考音型");
  });

  it("全局停止会取消尚未完成的参考音准备且迟到结果不会进入录音", async () => {
    let resolvePrepare: ((value: { scheduleTone: typeof scheduleTone }) => void) | null = null;
    prepare.mockImplementation(() => new Promise((resolve) => {
      resolvePrepare = resolve;
    }));
    const container = await renderPanel();

    await click(button(container, "播放参考音型"));
    expect(container.textContent).toContain("正在准备参考音型");
    expect(button(container, "停止参考播放").disabled).toBe(false);

    await act(async () => stopAllBrowserAudio());
    expect(container.textContent).toContain("播放参考音型");

    await act(async () => resolvePrepare?.({ scheduleTone }));
    await flush();
    expect(scheduleTone).not.toHaveBeenCalled();
    expect(container.textContent).toContain("播放参考音型");

    await click(button(container, "播放参考音型"));
    expect(prepare).toHaveBeenCalledTimes(2);
  });
});
