import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NotationTemporaryPracticePanel } from "../../components/practice/NotationTemporaryPracticePanel";
import { stopAllBrowserAudio } from "../../lib/audio/browserAudioEngine";
import type { NotationTemporaryPracticeTarget } from "../../lib/practice/localNotationDraftPracticeTarget";

class FakeAudioParam {
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
}

class FakeOscillator {
  type: OscillatorType = "sine";
  frequency = new FakeAudioParam();
  stopped = false;
  scheduledStopTime: number | null = null;
  connect() {}
  disconnect() {}
  addEventListener() {}
  start() {}
  stop(time?: number) {
    if (typeof time === "number") this.scheduledStopTime = time;
    else this.stopped = true;
  }
}

class FakeGain {
  gain = new FakeAudioParam();
  connect() {}
  disconnect() {}
}

class FakeAudioContext {
  static oscillators: FakeOscillator[] = [];
  static nextState: AudioContextState = "running";
  static resumeResolvers: Array<() => void> = [];
  state: AudioContextState;
  currentTime = 2;
  destination = {};
  constructor() {
    this.state = FakeAudioContext.nextState;
  }
  createOscillator() {
    const oscillator = new FakeOscillator();
    FakeAudioContext.oscillators.push(oscillator);
    return oscillator;
  }
  createGain() {
    return new FakeGain();
  }
  resume() {
    return new Promise<void>((resolve) => {
      FakeAudioContext.resumeResolvers.push(() => {
        this.state = "running";
        resolve();
      });
    });
  }
}

const target: NotationTemporaryPracticeTarget = {
  id: "target-1",
  mode: "sight-singing",
  status: "active",
  localOnly: true,
  sessionOnly: true,
  nonScoring: true,
  temporary: true,
  createdAtMs: 1,
  draftFingerprint: "draft-1",
  sourceDescription: "独立手动草稿",
  timeSignature: "4/4",
  events: [
    { id: "event-1", type: "note", pitch: "C4", duration: "quarter", measure: 1 },
    { id: "event-2", type: "rest", pitch: null, duration: "quarter", measure: 1 },
    { id: "event-3", type: "note", pitch: "D4", duration: "half", measure: 1 },
  ],
  warnings: [],
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;

const renderPanel = async (currentTarget: NotationTemporaryPracticeTarget) => {
  if (!container) {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  }
  await act(async () => {
    root?.render(
      <NotationTemporaryPracticePanel
        target={currentTarget}
        onGoToSheetMusic={() => undefined}
        onClear={() => undefined}
        onPracticeCurrentNote={() => undefined}
        onPracticeRhythmTarget={() => undefined}
        progress={null}
        onToggleEventCompletion={() => undefined}
        onRestartPracticeRound={() => undefined}
      />,
    );
    await Promise.resolve();
  });
};

const button = (label: string) => {
  const match = Array.from(container?.querySelectorAll("button") ?? []).find(
    (candidate) => candidate.textContent?.includes(label),
  );
  if (!(match instanceof HTMLButtonElement)) {
    throw new Error(`找不到按钮：${label}`);
  }
  return match;
};

describe("临时乐谱参考播放行为", () => {
  beforeEach(() => {
    FakeAudioContext.oscillators = [];
    FakeAudioContext.nextState = "running";
    FakeAudioContext.resumeResolvers = [];
    vi.stubGlobal("AudioContext", FakeAudioContext);
  });

  afterEach(async () => {
    await act(async () => root?.unmount());
    root = null;
    container?.remove();
    container = null;
    vi.unstubAllGlobals();
  });

  it("共享 context 恢复等待中可手停且迟到恢复不会发声", async () => {
    FakeAudioContext.nextState = "suspended";
    await renderPanel(target);
    await act(async () => {
      button("播放当前参考音").click();
      await Promise.resolve();
    });
    expect(button("正在播放参考音").disabled).toBe(true);
    expect(button("停止参考播放")).toBeTruthy();

    await act(async () => button("停止参考播放").click());
    expect(button("播放当前参考音").disabled).toBe(false);
    await act(async () => {
      FakeAudioContext.resumeResolvers.forEach((resolve) => resolve());
      await Promise.resolve();
    });
    expect(FakeAudioContext.oscillators).toHaveLength(0);
    expect(button("播放当前参考音").disabled).toBe(false);
  });

  it("全局停止会同步停止参考旋律并恢复按钮", async () => {
    await renderPanel(target);
    await act(async () => {
      button("播放完整参考旋律").click();
      await Promise.resolve();
    });
    expect(button("正在播放参考旋律").disabled).toBe(true);
    expect(FakeAudioContext.oscillators.length).toBe(2);

    await act(async () => stopAllBrowserAudio());
    expect(FakeAudioContext.oscillators.every(({ stopped }) => stopped)).toBe(true);
    expect(button("播放完整参考旋律").disabled).toBe(false);
  });

  it("同一 target id 失效时停止当前参考播放", async () => {
    await renderPanel(target);
    await act(async () => {
      button("播放当前参考音").click();
      await Promise.resolve();
    });
    const oscillator = FakeAudioContext.oscillators.at(-1);
    expect(oscillator?.stopped).toBe(false);

    await renderPanel({ ...target, status: "stale" });
    expect(oscillator?.stopped).toBe(true);
    expect(container?.textContent).toContain("临时目标已失效");
  });
});
