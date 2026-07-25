import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  stopAllBrowserAudio,
} from "../../lib/audio/browserAudioEngine";
import type { MetronomeBeatMetadata } from "../../lib/metronome/metronomeGrid";
import type { MetronomeSchedulerOptions } from "../../lib/metronome/metronomeScheduler";
import {
  useLocalScoreProjectMetronome,
  type LocalScoreProjectMetronomeScheduler,
} from "../../components/piano/useLocalScoreProjectMetronome";

type FakeScheduler = LocalScoreProjectMetronomeScheduler & {
  options: MetronomeSchedulerOptions;
  stopCalls: number;
};

let root: Root | null = null;

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
};

const click = async (container: ParentNode, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === label,
  );
  if (!button) throw new Error(`找不到按钮：${label}`);
  await act(async () => button.click());
  await flush();
};

function Harness({
  bpm,
  meter = "3/4",
  revision,
  createScheduler,
}: {
  bpm: number;
  meter?: "2/4" | "3/4" | "4/4";
  revision: number;
  createScheduler: (options: MetronomeSchedulerOptions) => FakeScheduler;
}) {
  const metronome = useLocalScoreProjectMetronome({
    bpm,
    meter,
    revision,
    createScheduler,
  });
  return (
    <div>
      <p>
        {metronome.isRunning
          ? "运行中"
          : metronome.isStarting ? "启动中" : "空闲"}
      </p>
      <p>{metronome.notice}</p>
      <p>
        {metronome.beat
          ? `${metronome.beat.barNumber}-${metronome.beat.beatNumber}`
          : "无拍点"}
      </p>
      <button type="button" onClick={() => void metronome.start()}>启动</button>
      <button type="button" onClick={metronome.stop}>停止</button>
    </div>
  );
}

const renderHarness = async (
  props: Parameters<typeof Harness>[0],
) => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<StrictMode><Harness {...props} /></StrictMode>);
  });
  await flush();
  return container;
};

beforeEach(() => document.body.replaceChildren());

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
    root = null;
  }
});

describe("S1 本机谱项目节拍器 hook", () => {
  it("只使用已保存配置，显示调度拍点并可显式停止", async () => {
    const schedulers: FakeScheduler[] = [];
    const createScheduler = (options: MetronomeSchedulerOptions) => {
      const scheduler: FakeScheduler = {
        options,
        stopCalls: 0,
        start: async () => undefined,
        stop() {
          scheduler.stopCalls += 1;
        },
      };
      schedulers.push(scheduler);
      return scheduler;
    };
    const container = await renderHarness({
      bpm: 72,
      revision: 2,
      createScheduler,
    });
    await click(container, "启动");
    expect(container.textContent).toContain("运行中");
    expect(schedulers[0]?.options.config).toEqual({
      bpm: 72,
      meter: "3/4",
      countIn: { enabled: false, bars: 0 },
      subdivision: "quarter",
    });
    const beat: MetronomeBeatMetadata = {
      phase: "practice",
      beatIndex: 0,
      barNumber: 1,
      beatNumber: 1,
      scheduledTimeSeconds: 0.1,
      isStrongBeat: true,
      meter: "3/4",
      bpm: 72,
      subdivisionIndex: 0,
    };
    await act(async () => schedulers[0]?.options.onBeat?.(beat));
    expect(container.textContent).toContain("1-1");
    await click(container, "停止");
    expect(container.textContent).toContain("空闲");
    expect(container.textContent).toContain("无拍点");
  });

  it("启动失败显示中文原因并允许重试", async () => {
    let attempts = 0;
    const createScheduler = (options: MetronomeSchedulerOptions) => {
      attempts += 1;
      const scheduler: FakeScheduler = {
        options,
        stopCalls: 0,
        start: attempts === 1
          ? async () => { throw new Error("blocked"); }
          : async () => undefined,
        stop() {
          scheduler.stopCalls += 1;
        },
      };
      return scheduler;
    };
    const container = await renderHarness({
      bpm: 90,
      revision: 1,
      createScheduler,
    });
    await click(container, "启动");
    expect(container.textContent).toContain("无法启动本机节拍器");
    expect(container.textContent).toContain("空闲");
    await click(container, "启动");
    expect(container.textContent).toContain("运行中");
  });

  it("配置变化、全局停止和卸载都会清理，pending start 不会复活", async () => {
    let resolveStart: (() => void) | null = null;
    const schedulers: FakeScheduler[] = [];
    const createScheduler = (options: MetronomeSchedulerOptions) => {
      const scheduler: FakeScheduler = {
        options,
        stopCalls: 0,
        start: () => new Promise<void>((resolve) => {
          resolveStart = resolve;
        }),
        stop() {
          scheduler.stopCalls += 1;
        },
      };
      schedulers.push(scheduler);
      return scheduler;
    };
    const container = await renderHarness({
      bpm: 90,
      revision: 1,
      createScheduler,
    });
    await click(container, "启动");
    expect(container.textContent).toContain("启动中");
    await act(async () => {
      root?.render(
        <StrictMode>
          <Harness
            bpm={90}
            meter="2/4"
            revision={1}
            createScheduler={createScheduler}
          />
        </StrictMode>,
      );
    });
    await act(async () => resolveStart?.());
    await flush();
    expect(container.textContent).toContain("空闲");
    expect(schedulers[0]?.stopCalls).toBeGreaterThan(0);

    await click(container, "启动");
    await act(async () => window.dispatchEvent(new Event("blur")));
    await act(async () => resolveStart?.());
    await flush();
    expect(container.textContent).toContain("空闲");

    await click(container, "启动");
    await act(async () => {
      resolveStart?.();
      await Promise.resolve();
    });
    expect(container.textContent).toContain("运行中");
    act(() => stopAllBrowserAudio());
    expect(container.textContent).toContain("空闲");

    await click(container, "启动");
    await act(async () => {
      resolveStart?.();
      await Promise.resolve();
    });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(container.textContent).toContain("空闲");
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });

    await click(container, "启动");
    await act(async () => {
      resolveStart?.();
      await Promise.resolve();
    });
    expect(container.textContent).toContain("运行中");
    await act(async () => {
      root?.render(
        <StrictMode>
          <Harness
            bpm={90}
            meter="2/4"
            revision={2}
            createScheduler={createScheduler}
          />
        </StrictMode>,
      );
    });
    expect(container.textContent).toContain("空闲");
    await act(async () => root?.unmount());
    root = null;
    expect(schedulers.at(-1)?.stopCalls).toBeGreaterThan(0);
  });

  it("阻止重复启动，并在 BPM 变化及运行中卸载时分别清理", async () => {
    const schedulers: FakeScheduler[] = [];
    const createScheduler = (options: MetronomeSchedulerOptions) => {
      const scheduler: FakeScheduler = {
        options,
        stopCalls: 0,
        start: async () => undefined,
        stop() {
          scheduler.stopCalls += 1;
        },
      };
      schedulers.push(scheduler);
      return scheduler;
    };
    const container = await renderHarness({
      bpm: 90,
      revision: 1,
      createScheduler,
    });
    await act(async () => {
      const button = Array.from(container.querySelectorAll("button")).find(
        (candidate) => candidate.textContent === "启动",
      );
      button?.click();
      button?.click();
    });
    await flush();
    expect(schedulers).toHaveLength(1);
    expect(container.textContent).toContain("运行中");

    await act(async () => {
      root?.render(
        <StrictMode>
          <Harness bpm={91} revision={1} createScheduler={createScheduler} />
        </StrictMode>,
      );
    });
    expect(container.textContent).toContain("空闲");
    expect(schedulers[0]?.stopCalls).toBeGreaterThan(0);

    await click(container, "启动");
    expect(container.textContent).toContain("运行中");
    const activeScheduler = schedulers.at(-1);
    const stopCallsBeforeUnmount = activeScheduler?.stopCalls ?? 0;
    await act(async () => root?.unmount());
    root = null;
    expect(activeScheduler?.stopCalls).toBeGreaterThan(stopCallsBeforeUnmount);
  });
});
