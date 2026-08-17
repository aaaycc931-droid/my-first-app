import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const audioMock = vi.hoisted(() => ({
  prepareQueue: [] as Promise<AudioContext>[],
  stopCalls: 0,
  subscribers: new Set<() => void>(),
}));

vi.mock("../../lib/audio/browserAudioEngine", () => ({
  createBrowserAudioChannel: () => ({
    prepareForUserGesture: () => {
      const pending = audioMock.prepareQueue.shift();
      if (!pending) throw new Error("缺少测试音频准备结果");
      return pending;
    },
    stop: () => {
      audioMock.stopCalls += 1;
    },
  }),
  stopAllBrowserAudio: () => {
    Array.from(audioMock.subscribers).forEach((subscriber) => subscriber());
  },
  subscribeBrowserAudioStopAll: (subscriber: () => void) => {
    audioMock.subscribers.add(subscriber);
    return () => audioMock.subscribers.delete(subscriber);
  },
}));

import { useLocalAudioPlayback } from "./useLocalAudioPlayback";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const CURRENT_ERROR =
  "当前手机暂时无法播放本地声音。请确认媒体音量已开启后重试。";

type Deferred<T> = Readonly<{
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}>;

const createDeferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
};

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

function Harness({
  results,
  onSchedule,
}: {
  results: Array<string | null>;
  onSchedule: () => void;
}) {
  const playback = useLocalAudioPlayback();
  const play = () => {
    void playback.play(() => {
      onSchedule();
      return 10_000;
    }).then((result) => results.push(result));
  };
  return (
    <div>
      <p data-testid="state">{playback.playbackState}</p>
      <button type="button" onClick={play}>播放</button>
      <button type="button" onClick={playback.stop}>停止</button>
    </div>
  );
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

const renderHarness = async (
  results: Array<string | null>,
  onSchedule: () => void,
) => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <StrictMode>
        <Harness results={results} onSchedule={onSchedule} />
      </StrictMode>,
    );
  });
  return container;
};

const click = async (label: string) => {
  const button = Array.from(container?.querySelectorAll("button") ?? [])
    .find((candidate) => candidate.textContent === label);
  if (!button) throw new Error(`找不到按钮：${label}`);
  await act(async () => button.click());
};

beforeEach(() => {
  document.body.replaceChildren();
  audioMock.prepareQueue.length = 0;
  audioMock.stopCalls = 0;
  audioMock.subscribers.clear();
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  container?.remove();
  container = null;
});

describe("useLocalAudioPlayback stale failure guard", () => {
  it("replacement 后旧准备失败返回 null，且不覆盖新播放状态", async () => {
    const oldPrepare = createDeferred<AudioContext>();
    const currentPrepare = createDeferred<AudioContext>();
    audioMock.prepareQueue.push(oldPrepare.promise, currentPrepare.promise);
    const results: Array<string | null> = [];
    let scheduleCalls = 0;
    await renderHarness(results, () => { scheduleCalls += 1; });

    await click("播放");
    await click("播放");
    expect(container?.querySelector("[data-testid='state']")?.textContent)
      .toBe("准备中");

    oldPrepare.reject(new Error("旧请求失败"));
    await flush();
    expect(results).toEqual([null]);
    expect(scheduleCalls).toBe(0);
    expect(container?.querySelector("[data-testid='state']")?.textContent)
      .toBe("准备中");

    currentPrepare.resolve({} as AudioContext);
    await flush();
    expect(results).toEqual([null, null]);
    expect(scheduleCalls).toBe(1);
    expect(container?.querySelector("[data-testid='state']")?.textContent)
      .toBe("播放中");
  });

  it("显式停止后旧准备失败返回 null，且保持空闲", async () => {
    const pendingPrepare = createDeferred<AudioContext>();
    audioMock.prepareQueue.push(pendingPrepare.promise);
    const results: Array<string | null> = [];
    let scheduleCalls = 0;
    await renderHarness(results, () => { scheduleCalls += 1; });

    await click("播放");
    await click("停止");
    pendingPrepare.reject(new Error("停止后的旧失败"));
    await flush();

    expect(results).toEqual([null]);
    expect(scheduleCalls).toBe(0);
    expect(container?.querySelector("[data-testid='state']")?.textContent)
      .toBe("空闲");
  });

  it("卸载后旧准备失败返回 null，不发布错误", async () => {
    const pendingPrepare = createDeferred<AudioContext>();
    audioMock.prepareQueue.push(pendingPrepare.promise);
    const results: Array<string | null> = [];
    let scheduleCalls = 0;
    await renderHarness(results, () => { scheduleCalls += 1; });

    await click("播放");
    await act(async () => root?.unmount());
    root = null;
    pendingPrepare.reject(new Error("卸载后的旧失败"));
    await flush();

    expect(results).toEqual([null]);
    expect(scheduleCalls).toBe(0);
  });

  it("当前请求失败返回既有中文错误，并允许随后重试", async () => {
    const failedPrepare = createDeferred<AudioContext>();
    const retryPrepare = createDeferred<AudioContext>();
    audioMock.prepareQueue.push(failedPrepare.promise, retryPrepare.promise);
    const results: Array<string | null> = [];
    let scheduleCalls = 0;
    await renderHarness(results, () => { scheduleCalls += 1; });

    await click("播放");
    failedPrepare.reject(new Error("当前请求失败"));
    await flush();
    expect(results).toEqual([CURRENT_ERROR]);
    expect(scheduleCalls).toBe(0);
    expect(container?.querySelector("[data-testid='state']")?.textContent)
      .toBe("空闲");

    await click("播放");
    retryPrepare.resolve({} as AudioContext);
    await flush();
    expect(results).toEqual([CURRENT_ERROR, null]);
    expect(scheduleCalls).toBe(1);
    expect(container?.querySelector("[data-testid='state']")?.textContent)
      .toBe("播放中");
  });
});
