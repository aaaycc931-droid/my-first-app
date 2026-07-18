import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocalPianoPanel } from "../../components/piano/LocalPianoPanel";
import {
  stopAllBrowserAudio,
  subscribeBrowserAudioStopAll,
} from "../../lib/audio/browserAudioEngine";
import type {
  LocalPianoAudioChannel,
  LocalPianoAudioChannelFactory,
} from "../../components/piano/useLocalPianoAudio";
import { COMPATIBILITY_PIANO_VOICE_PROVIDER } from "../../lib/piano/pianoAudioProvider";
import {
  LOCAL_PIANO_PREPARE_TIMEOUT_MS,
  LOCAL_PIANO_VOICE_WATCHDOG_MS,
} from "../../components/piano/useLocalPianoAudio";

class FakeAudioParam {
  value = 0;
  targets: number[] = [];

  setValueAtTime(value: number) {
    this.value = value;
  }

  exponentialRampToValueAtTime(value: number) {
    this.value = value;
  }

  setTargetAtTime(value: number) {
    this.value = value;
    this.targets.push(value);
  }

  cancelScheduledValues() {}
}

class FakeOscillator {
  type: OscillatorType = "sine";
  frequency = new FakeAudioParam();
  context: AudioContext;
  started = false;
  stopped = false;

  constructor(context: AudioContext) {
    this.context = context;
  }

  connect() {}
  disconnect() {}
  addEventListener() {}
  start() { this.started = true; }
  stop() { this.stopped = true; }
}

class FakeGain {
  gain = new FakeAudioParam();
  connect() {}
  disconnect() {}
}

type FakeChannel = LocalPianoAudioChannel & {
  sources: FakeOscillator[];
  stopped: boolean;
};

const createAudioHarness = () => {
  const oscillators: FakeOscillator[] = [];
  const gains: FakeGain[] = [];
  const channels: FakeChannel[] = [];
  const prepareQueue: Array<() => Promise<AudioContext>> = [];
  const context = {
    currentTime: 1,
    destination: {},
    createOscillator: () => {
      const oscillator = new FakeOscillator(context as unknown as AudioContext);
      oscillators.push(oscillator);
      return oscillator;
    },
    createGain: () => {
      const gain = new FakeGain();
      gains.push(gain);
      return gain;
    },
  } as unknown as AudioContext;

  const factory: LocalPianoAudioChannelFactory = () => {
    const channel: FakeChannel = {
      sources: [],
      stopped: false,
      prepareForUserGesture: prepareQueue.shift() ?? (() => Promise.resolve(context)),
      trackSource: ((source: AudioScheduledSourceNode) => {
        channel.sources.push(source as unknown as FakeOscillator);
        return source;
      }) as LocalPianoAudioChannel["trackSource"],
      stop: () => {
        channel.stopped = true;
        channel.sources.forEach((source) => source.stop());
      },
    };
    channels.push(channel);
    return channel;
  };

  return { channels, context, factory, gains, oscillators, prepareQueue };
};

let root: Root | null = null;

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
};

const renderPanel = async (factory: LocalPianoAudioChannelFactory) => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(
    <StrictMode><LocalPianoPanel createAudioChannel={factory} voiceProvider={COMPATIBILITY_PIANO_VOICE_PROVIDER} /></StrictMode>,
  ));
  await flush();
  return container;
};

const renderPanelWithDefaultTimbres = async (factory: LocalPianoAudioChannelFactory) => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(
    <StrictMode><LocalPianoPanel createAudioChannel={factory} /></StrictMode>,
  ));
  await flush();
  return container;
};

const pianoKey = (container: ParentNode, keyId: string): HTMLButtonElement => {
  const button = container.querySelector<HTMLButtonElement>(`[data-piano-key="${keyId}"]`);
  if (!button) throw new Error(`找不到琴键：${keyId}`);
  return button;
};

const buttonWithText = (container: ParentNode, text: string): HTMLButtonElement => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === text,
  );
  if (!button) throw new Error(`找不到按钮：${text}`);
  return button;
};

const pointer = async (
  element: HTMLElement,
  type: "pointerdown" | "pointerup" | "pointercancel" | "lostpointercapture",
  pointerId: number,
) => {
  await act(async () => {
    element.dispatchEvent(new PointerEvent(type, {
      bubbles: true,
      button: 0,
      pointerId,
      pointerType: "touch",
    }));
  });
  await flush();
};

const click = async (element: HTMLElement) => {
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await flush();
};

beforeEach(() => {
  document.body.replaceChildren();
  window.localStorage.clear();
});

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
    root = null;
  }
  vi.useRealTimers();
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
  Object.defineProperty(navigator, "requestMIDIAccess", { configurable: true, value: undefined });
  vi.restoreAllMocks();
});

describe("本地钢琴面板行为", () => {
  it("按住发声、同键多 pointer 共用一个 voice，最后松开才停止", async () => {
    const audio = createAudioHarness();
    const container = await renderPanel(audio.factory);
    const c4 = pianoKey(container, "c4");

    expect(container.querySelector("[data-piano-timbre]")?.getAttribute("data-piano-timbre"))
      .toBe("compatibility-triangle-v1");
    expect(container.querySelector("[data-piano-timbre]")?.textContent).toContain("兼容降级音色");

    await pointer(c4, "pointerdown", 1);
    expect(c4.getAttribute("aria-pressed")).toBe("true");
    expect(audio.channels).toHaveLength(1);
    expect(audio.oscillators).toHaveLength(1);
    expect(audio.oscillators[0]?.started).toBe(true);

    await pointer(c4, "pointerdown", 2);
    expect(audio.channels).toHaveLength(1);
    await pointer(c4, "pointerup", 1);
    expect(c4.getAttribute("aria-pressed")).toBe("true");
    expect(audio.oscillators[0]?.stopped).toBe(false);

    await pointer(c4, "pointerup", 2);
    expect(c4.getAttribute("aria-pressed")).toBe("false");
    expect(audio.oscillators[0]?.stopped).toBe(true);
  });

  it("琴键 DOM 与 Tab 顺序保持 C 到高八度 C 的半音顺序", async () => {
    const audio = createAudioHarness();
    const container = await renderPanel(audio.factory);
    const ids = Array.from(container.querySelectorAll<HTMLElement>("[data-piano-key]"))
      .map((key) => key.dataset.pianoKey);
    expect(ids).toEqual([
      "c4", "c-sharp-4", "d4", "d-sharp-4", "e4", "f4", "f-sharp-4",
      "g4", "g-sharp-4", "a4", "a-sharp-4", "b4", "c5",
    ]);
  });

  it("延音开启后松键继续发声，关闭延音立即释放锁存音", async () => {
    const audio = createAudioHarness();
    const container = await renderPanel(audio.factory);
    const c4 = pianoKey(container, "c4");

    await click(buttonWithText(container, "延音：关"));
    await pointer(c4, "pointerdown", 3);
    await pointer(c4, "pointerup", 3);
    expect(c4.getAttribute("aria-pressed")).toBe("true");
    expect(audio.oscillators[0]?.stopped).toBe(false);

    await click(buttonWithText(container, "延音：开"));
    expect(c4.getAttribute("aria-pressed")).toBe("false");
    expect(audio.oscillators[0]?.stopped).toBe(true);
  });

  it("重新按下延音锁存键会立即重启 voice 和 watchdog", async () => {
    const audio = createAudioHarness();
    const container = await renderPanel(audio.factory);
    const c4 = pianoKey(container, "c4");
    await click(buttonWithText(container, "延音：关"));
    vi.useFakeTimers();

    await act(async () => {
      c4.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 30 }));
      await Promise.resolve();
    });
    await act(async () => {
      c4.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0, pointerId: 30 }));
      c4.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 31 }));
      await Promise.resolve();
    });
    expect(audio.channels).toHaveLength(2);
    expect(audio.channels[0]?.stopped).toBe(true);
    expect(audio.oscillators[1]?.started).toBe(true);

    await act(async () => vi.advanceTimersByTime(LOCAL_PIANO_VOICE_WATCHDOG_MS - 1));
    expect(c4.getAttribute("aria-pressed")).toBe("true");
    await act(async () => vi.advanceTimersByTime(1));
    expect(c4.getAttribute("aria-pressed")).toBe("false");
  });

  it("键盘 Enter 或空格可按住和释放琴键，重复 keydown 不会叠加 voice", async () => {
    const audio = createAudioHarness();
    const container = await renderPanel(audio.factory);
    const c4 = pianoKey(container, "c4");

    await act(async () => {
      c4.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    });
    await flush();
    expect(c4.getAttribute("aria-pressed")).toBe("true");
    expect(audio.channels).toHaveLength(1);
    await act(async () => {
      c4.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter", repeat: true }));
      c4.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "Enter" }));
    });
    await flush();
    expect(audio.channels).toHaveLength(1);
    expect(c4.getAttribute("aria-pressed")).toBe("false");
    expect(audio.oscillators[0]?.stopped).toBe(true);

    await act(async () => {
      c4.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: " " }));
      c4.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: " " }));
    });
    await flush();
    expect(audio.channels).toHaveLength(2);
  });

  it("音频准备完成前已经松键时不得延迟发声", async () => {
    const audio = createAudioHarness();
    let resolvePreparation: (context: AudioContext) => void = () => undefined;
    audio.prepareQueue.push(() => new Promise((resolve) => {
      resolvePreparation = resolve;
    }));
    const container = await renderPanel(audio.factory);
    const c4 = pianoKey(container, "c4");

    await act(async () => {
      c4.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 4 }));
      c4.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0, pointerId: 4 }));
    });
    resolvePreparation(audio.context);
    await flush();

    expect(audio.oscillators).toHaveLength(0);
    expect(audio.channels[0]?.stopped).toBe(true);
    expect(c4.getAttribute("aria-pressed")).toBe("false");
  });

  it("当前单排 13 键均可同时按下，音频状态不再被旧 8 音上限截断", async () => {
    const audio = createAudioHarness();
    const container = await renderPanel(audio.factory);
    const keys = Array.from(container.querySelectorAll<HTMLButtonElement>("[data-piano-key]"));

    for (let index = 0; index < 13; index += 1) {
      await pointer(keys[index] as HTMLButtonElement, "pointerdown", 100 + index);
    }

    expect(container.querySelectorAll('[data-piano-key][aria-pressed="true"]')).toHaveLength(13);
    expect(audio.oscillators).toHaveLength(13);
    expect(container.textContent).toContain("最多 32 个并发音符");
  });

  it("0% 音量创建真正静音 voice，运行中切到 0% 也写入零增益", async () => {
    const audio = createAudioHarness();
    const container = await renderPanel(audio.factory);
    const volume = container.querySelector<HTMLInputElement>('input[aria-label="钢琴音量"]');
    if (!volume) throw new Error("找不到钢琴音量");
    const setVolume = (value: string) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(volume, value);
      volume.dispatchEvent(new Event("input", { bubbles: true }));
    };
    await act(async () => setVolume("0"));
    await pointer(pianoKey(container, "c4"), "pointerdown", 40);
    expect(audio.gains[0]?.gain.value).toBe(0);

    await act(async () => setVolume("0.5"));
    await act(async () => setVolume("0"));
    expect(audio.gains[0]?.gain.targets.at(-1)).toBe(0);
  });

  it("切换音域停止全部声音，音量变化应用到正在发声的 voice", async () => {
    const audio = createAudioHarness();
    const container = await renderPanel(audio.factory);
    await pointer(pianoKey(container, "c4"), "pointerdown", 5);

    const volume = container.querySelector<HTMLInputElement>('input[aria-label="钢琴音量"]');
    if (!volume) throw new Error("找不到钢琴音量");
    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      valueSetter?.call(volume, "0.4");
      volume.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(audio.gains[0]?.gain.targets.at(-1)).toBeCloseTo(0.0195, 5);

    const range = container.querySelector<HTMLSelectElement>('select[aria-label="钢琴音域"]');
    if (!range) throw new Error("找不到钢琴音域");
    await act(async () => {
      range.value = "C5-C6";
      range.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flush();
    expect(audio.oscillators[0]?.stopped).toBe(true);
    expect(container.querySelector('[data-piano-key="c5"]')).not.toBeNull();
    expect(container.textContent).toContain("当前发声：无");
  });

  it("cancel、lost capture、停止全部、窗口失焦与卸载都会清理声音", async () => {
    const audio = createAudioHarness();
    const container = await renderPanel(audio.factory);
    const c4 = pianoKey(container, "c4");

    await pointer(c4, "pointerdown", 6);
    await pointer(c4, "pointercancel", 6);
    expect(audio.oscillators[0]?.stopped).toBe(true);
    expect(audio.channels[0]?.stopped).toBe(false);
    await click(buttonWithText(container, "停止全部"));
    expect(audio.channels[0]?.stopped).toBe(true);

    await pointer(c4, "pointerdown", 7);
    await pointer(c4, "lostpointercapture", 7);
    expect(audio.oscillators[1]?.stopped).toBe(true);

    await pointer(c4, "pointerdown", 8);
    await click(buttonWithText(container, "停止全部"));
    expect(audio.channels[2]?.stopped).toBe(true);

    await pointer(c4, "pointerdown", 9);
    window.dispatchEvent(new Event("blur"));
    await flush();
    expect(audio.channels[3]?.stopped).toBe(true);

    await pointer(c4, "pointerdown", 10);
    await act(async () => root?.unmount());
    root = null;
    expect(audio.channels[4]?.stopped).toBe(true);
  });

  it("全局音频停止和页面隐藏都会停止声音并同步重置琴键 UI", async () => {
    const audio = createAudioHarness();
    const container = await renderPanel(audio.factory);
    const c4 = pianoKey(container, "c4");

    expect(c4.getAttribute("aria-label")).toContain("中央 C");
    await pointer(c4, "pointerdown", 20);
    await act(async () => stopAllBrowserAudio());
    expect(audio.channels[0]?.stopped).toBe(true);
    expect(c4.getAttribute("aria-pressed")).toBe("false");
    expect(container.textContent).toContain("当前发声：无");

    await pointer(c4, "pointerdown", 21);
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
    await flush();
    expect(audio.channels[1]?.stopped).toBe(true);
    expect(c4.getAttribute("aria-pressed")).toBe("false");
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
  });

  it("首个钢琴 pointerdown 会广播全局停止以抢占旧题目音频", async () => {
    const audio = createAudioHarness();
    const container = await renderPanel(audio.factory);
    let notices = 0;
    const unsubscribe = subscribeBrowserAudioStopAll(() => { notices += 1; });
    await pointer(pianoKey(container, "c4"), "pointerdown", 41);
    expect(notices).toBe(1);
    unsubscribe();
  });

  it("Web Audio 失败显示中文警告，并可通过按钮显式重试", async () => {
    const audio = createAudioHarness();
    audio.prepareQueue.push(() => Promise.reject(new Error("blocked")));
    const container = await renderPanel(audio.factory);
    const c4 = pianoKey(container, "c4");

    await pointer(c4, "pointerdown", 11);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("当前手机暂时无法播放钢琴参考音");
    await pointer(c4, "pointerup", 11);
    await click(buttonWithText(container, "重新启用声音"));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("声音已重新启用，请再按琴键");
    expect(container.textContent).not.toContain("重新启用声音");
    expect(audio.channels).toHaveLength(2);
    await pointer(c4, "pointerdown", 12);

    expect(audio.oscillators).toHaveLength(1);
    expect(audio.oscillators[0]?.started).toBe(true);
    expect(container.querySelector('[role="alert"]')).toBeNull();
    await pointer(c4, "pointerup", 12);
  });

  it("prepare 超过 5 秒会停止 pending channel，并允许后续重试", async () => {
    const audio = createAudioHarness();
    audio.prepareQueue.push(() => new Promise(() => undefined));
    const container = await renderPanel(audio.factory);
    const c4 = pianoKey(container, "c4");
    vi.useFakeTimers();
    await act(async () => {
      c4.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 50 }));
      await Promise.resolve();
    });
    await act(async () => vi.advanceTimersByTime(LOCAL_PIANO_PREPARE_TIMEOUT_MS));
    expect(audio.channels[0]?.stopped).toBe(true);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("暂时无法播放钢琴参考音");
  });

  it("pending prepare 在 StrictMode 卸载时立即停止并清除 timeout", async () => {
    const audio = createAudioHarness();
    audio.prepareQueue.push(() => new Promise(() => undefined));
    const container = await renderPanel(audio.factory);
    const c4 = pianoKey(container, "c4");
    vi.useFakeTimers();
    await act(async () => {
      c4.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 51 }));
      await Promise.resolve();
    });
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    await act(async () => root?.unmount());
    root = null;
    expect(audio.channels[0]?.stopped).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("单个 voice 超过 10 秒会自动停止并同步清除激活状态", async () => {
    const audio = createAudioHarness();
    const container = await renderPanel(audio.factory);
    const c4 = pianoKey(container, "c4");
    vi.useFakeTimers();

    await act(async () => {
      c4.dispatchEvent(new PointerEvent("pointerdown", {
        bubbles: true,
        button: 0,
        pointerId: 13,
      }));
      await Promise.resolve();
    });
    expect(c4.getAttribute("aria-pressed")).toBe("true");

    await act(async () => {
      vi.advanceTimersByTime(LOCAL_PIANO_VOICE_WATCHDOG_MS);
    });
    expect(audio.channels[0]?.stopped).toBe(true);
    expect(c4.getAttribute("aria-pressed")).toBe("false");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("已自动停止");
    vi.useRealTimers();
  });

  it("完整视图提供 88 键、双排、标签、移调和真实 32 voice 压力入口", async () => {
    const audio = createAudioHarness();
    const container = await renderPanel(audio.factory);
    const changeSelect = async (label: string, value: string) => {
      const select = container.querySelector<HTMLSelectElement>(`select[aria-label="${label}"]`);
      if (!select) throw new Error(`找不到选择器：${label}`);
      await act(async () => {
        select.value = value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await flush();
    };

    await changeSelect("钢琴视图", "full");
    expect(container.querySelectorAll("[data-piano-key]")).toHaveLength(88);
    expect(container.querySelectorAll("[data-piano-row]")).toHaveLength(1);
    await changeSelect("钢琴排布", "double");
    expect(container.querySelectorAll("[data-piano-row]")).toHaveLength(2);
    expect(container.querySelectorAll("[data-piano-key]")).toHaveLength(88);
    await changeSelect("钢琴标签", "fixed-solfege");
    expect(pianoKey(container, "c4").textContent).toBe("do");

    const transpose = container.querySelector<HTMLInputElement>('input[aria-label="钢琴移调"]');
    if (!transpose) throw new Error("找不到钢琴移调");
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(transpose, "12");
      transpose.dispatchEvent(new Event("input", { bubbles: true }));
      transpose.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flush();
    expect(pianoKey(container, "c4").getAttribute("aria-label")).toContain("移调后发出 C5");

    vi.useFakeTimers();
    await act(async () => {
      buttonWithText(container, "运行 32 音压力测试（2 秒）")
        .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.querySelectorAll('[data-piano-key][aria-pressed="true"]')).toHaveLength(32);
    expect(audio.oscillators).toHaveLength(32);
    await act(async () => vi.advanceTimersByTimeAsync(2_000));
    expect(container.querySelectorAll('[data-piano-key][aria-pressed="true"]')).toHaveLength(0);
    expect(audio.channels.every((channel) => channel.stopped)).toBe(true);
    vi.useRealTimers();
  });

  it("录制按键事件后可本机保存、回放、导出和删除", async () => {
    const audio = createAudioHarness();
    const createObjectUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:piano-take");
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const container = await renderPanel(audio.factory);

    await click(buttonWithText(container, "开始录制演奏事件"));
    await pointer(pianoKey(container, "c4"), "pointerdown", 200);
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 25)));
    await pointer(pianoKey(container, "c4"), "pointerup", 200);
    await click(buttonWithText(container, "停止并保存事件"));

    const stored = JSON.parse(window.localStorage.getItem("solfeggio.piano.performances.v1") ?? "[]") as Array<{ events: Array<{ type: string }> }>;
    expect(stored).toHaveLength(1);
    expect(stored[0]?.events.map((event) => event.type)).toEqual(["note-on", "note-off", "all-notes-off"]);
    expect(container.querySelectorAll('select[aria-label="钢琴演奏记录"] option')).toHaveLength(2);

    vi.useFakeTimers();
    await act(async () => {
      buttonWithText(container, "回放所选记录").dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    await act(async () => vi.advanceTimersByTimeAsync(2_000));
    expect(audio.oscillators.length).toBeGreaterThanOrEqual(2);
    expect(container.textContent).toContain("回放所选记录");
    vi.useRealTimers();

    await click(buttonWithText(container, "导出事件 JSON"));
    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(anchorClick).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:piano-take");
    await click(buttonWithText(container, "删除所选记录"));
    expect(window.localStorage.getItem("solfeggio.piano.performances.v1")).not.toBe("[]");
    await click(buttonWithText(container, "确认删除所选记录"));
    expect(JSON.parse(window.localStorage.getItem("solfeggio.piano.performances.v1") ?? "[]")).toEqual([]);
  });

  it("本机演奏记录写入失败时保留内存记录并显示中文恢复边界", async () => {
    const setItem = vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const audio = createAudioHarness();
    const container = await renderPanel(audio.factory);
    await click(buttonWithText(container, "开始录制演奏事件"));
    await pointer(pianoKey(container, "c4"), "pointerdown", 201);
    await pointer(pianoKey(container, "c4"), "pointerup", 201);
    await click(buttonWithText(container, "停止并保存事件"));
    setItem.mockRestore();
    expect(container.querySelector('[role="status"]')?.textContent).toContain("当前发声");
    expect(container.textContent).toContain("记录仅保留到本页关闭前");
    expect(container.querySelectorAll('select[aria-label="钢琴演奏记录"] option')).toHaveLength(2);
  });

  it("全局停止会取消未保存录制，并清除尚未触发的回放定时器", async () => {
    window.localStorage.setItem("solfeggio.piano.performances.v1", JSON.stringify([{
      schemaVersion: 1,
      id: "lifecycle-take",
      name: "生命周期测试",
      createdAt: "2026-07-17T00:00:00.000Z",
      durationMs: 5_000,
      transpose: 0,
      events: [
        { type: "note-on", atMs: 1_000, keyId: "c4", note: 60, velocity: 0.7 },
        { type: "note-off", atMs: 2_000, keyId: "c4", note: 60 },
        { type: "all-notes-off", atMs: 5_000 },
      ],
    }]));
    const audio = createAudioHarness();
    const container = await renderPanel(audio.factory);
    vi.useFakeTimers();

    await act(async () => {
      buttonWithText(container, "回放所选记录").click();
      await Promise.resolve();
    });
    expect(container.textContent).toContain("停止回放");
    await act(async () => stopAllBrowserAudio());
    await act(async () => vi.advanceTimersByTimeAsync(6_000));
    expect(audio.oscillators).toHaveLength(0);
    expect(buttonWithText(container, "停止回放").disabled).toBe(true);

    vi.useRealTimers();
    await click(buttonWithText(container, "开始录制演奏事件"));
    await act(async () => stopAllBrowserAudio());
    expect(container.textContent).toContain("本次未保存的演奏录制已取消");
    expect(container.textContent).toContain("开始录制演奏事件");
  });

  it("拒绝小于 0.1 秒或反向的 A–B 循环区间", async () => {
    window.localStorage.setItem("solfeggio.piano.performances.v1", JSON.stringify([{
      schemaVersion: 1,
      id: "loop-take",
      name: "循环测试",
      createdAt: "2026-07-17T00:00:00.000Z",
      durationMs: 2_000,
      transpose: 0,
      events: [
        { type: "note-on", atMs: 0, keyId: "c4", note: 60, velocity: 0.7 },
        { type: "note-off", atMs: 1_000, keyId: "c4", note: 60 },
        { type: "all-notes-off", atMs: 2_000 },
      ],
    }]));
    const audio = createAudioHarness();
    const container = await renderPanel(audio.factory);
    const loop = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (!loop) throw new Error("找不到 A–B 循环开关");
    await click(loop);
    const a = container.querySelector<HTMLInputElement>('input[aria-label="钢琴循环 A 点"]');
    const b = container.querySelector<HTMLInputElement>('input[aria-label="钢琴循环 B 点"]');
    if (!a || !b) throw new Error("找不到 A–B 输入");
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(a, "1.5");
      a.dispatchEvent(new Event("input", { bubbles: true }));
      a.dispatchEvent(new Event("change", { bubbles: true }));
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(b, "1.4");
      b.dispatchEvent(new Event("input", { bubbles: true }));
      b.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await click(buttonWithText(container, "回放所选记录"));
    expect(container.textContent).toContain("区间至少为 0.1 秒");
    expect(audio.oscillators).toHaveLength(0);
  });

  it("默认运行时展示六种合法离线音色预设，测试注入 provider 时保持固定", async () => {
    const audio = createAudioHarness();
    const container = await renderPanelWithDefaultTimbres(audio.factory);
    const timbres = container.querySelector<HTMLSelectElement>('select[aria-label="钢琴离线音色"]');
    if (!timbres) throw new Error("找不到离线音色预设");
    expect(timbres.options).toHaveLength(6);
    expect(new Set(Array.from(timbres.options).map((option) => option.value)).size).toBe(6);
    expect(container.textContent).toContain("并非六套独立乐器采样库");
  });

  it("Web MIDI 不支持时显示中文降级且屏幕钢琴保持可用", async () => {
    const audio = createAudioHarness();
    const container = await renderPanel(audio.factory);
    await click(buttonWithText(container, "连接 MIDI"));
    expect(container.textContent).toContain("不支持 Web MIDI");
    await pointer(pianoKey(container, "c4"), "pointerdown", 300);
    expect(audio.oscillators).toHaveLength(1);
  });

  it("MIDI 音符、力度、延音与设备断连映射到钢琴并清理状态", async () => {
    const audio = createAudioHarness();
    const input = {
      id: "usb-midi-1",
      name: "测试键盘",
      manufacturer: "本机夹具",
      state: "connected" as "connected" | "disconnected",
      type: "input",
      onmidimessage: null as ((event: { data: Uint8Array }) => void) | null,
    };
    const access = {
      inputs: new Map([[input.id, input]]),
      onstatechange: null as (() => void) | null,
    };
    Object.defineProperty(navigator, "requestMIDIAccess", {
      configurable: true,
      value: vi.fn(async () => access),
    });
    const container = await renderPanel(audio.factory);
    await click(buttonWithText(container, "连接 MIDI"));
    expect(container.textContent).toContain("本机夹具 · 测试键盘");
    await act(async () => input.onmidimessage?.({ data: new Uint8Array([0x90, 60, 127]) }));
    await flush();
    expect(pianoKey(container, "c4").getAttribute("aria-pressed")).toBe("true");
    await act(async () => input.onmidimessage?.({ data: new Uint8Array([0xb0, 64, 127]) }));
    await act(async () => input.onmidimessage?.({ data: new Uint8Array([0x80, 60, 0]) }));
    await flush();
    expect(container.textContent).toContain("延音：开");
    expect(pianoKey(container, "c4").getAttribute("aria-pressed")).toBe("true");
    input.state = "disconnected";
    await act(async () => access.onstatechange?.());
    await flush();
    expect(pianoKey(container, "c4").getAttribute("aria-pressed")).toBe("false");
    expect(container.textContent).toContain("当前没有可用输入设备");
  });

  it("MusicXML 先生成待检查草稿，修改会使确认失效，重新确认后才可播放", async () => {
    const audio = createAudioHarness();
    const container = await renderPanel(audio.factory);
    const input = container.querySelector<HTMLInputElement>('input[aria-label="选择本机 MusicXML"]');
    if (!input) throw new Error("找不到 MusicXML 输入");
    const xml = `<?xml version="1.0"?><score-partwise version="3.1"><part id="P1"><measure number="1"><attributes><divisions>1</divisions></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note><note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note></measure></part></score-partwise>`;
    const file = new File([xml], "本机练习.musicxml", { type: "application/xml" });
    Object.defineProperty(file, "text", { configurable: true, value: async () => xml });
    Object.defineProperty(input, "files", { configurable: true, value: [file] });
    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });
    await flush();
    expect(container.textContent).toContain("2 个音符的待检查草稿");
    expect(buttonWithText(container, "播放确认谱面").disabled).toBe(true);
    await click(buttonWithText(container, "我已检查，确认此草稿用于练习"));
    expect(buttonWithText(container, "播放确认谱面").disabled).toBe(false);
    await click(buttonWithText(container, "移除"));
    expect(container.textContent).toContain("确认状态已失效");
    expect(buttonWithText(container, "播放确认谱面").disabled).toBe(true);
    await click(buttonWithText(container, "我已检查，确认此草稿用于练习"));
    expect(buttonWithText(container, "播放确认谱面").disabled).toBe(false);
    await click(buttonWithText(container, "清除本机草稿"));
    expect(container.textContent).toContain("没有保存或上传文件内容");
    expect(container.textContent).toContain("原创练习：级进与小跳");
  });

  it("原创谱面可切换瀑布视图并通过统一定时器播放后全停", async () => {
    const audio = createAudioHarness();
    const container = await renderPanel(audio.factory);
    await click(buttonWithText(container, "瀑布视图"));
    expect(container.querySelectorAll(".piano-waterfall-note")).toHaveLength(8);
    vi.useFakeTimers();
    await act(async () => {
      buttonWithText(container, "播放确认谱面").click();
      await Promise.resolve();
    });
    await act(async () => vi.advanceTimersByTimeAsync(8_000));
    expect(audio.oscillators).toHaveLength(8);
    expect(audio.channels.every((channel) => channel.stopped)).toBe(true);
    expect(buttonWithText(container, "停止谱面播放").disabled).toBe(true);
  });
});
