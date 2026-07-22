import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocalMelodySightSingingPanel } from "../../components/practice/LocalMelodySightSingingPanel";
import { stopAllBrowserAudio } from "../../lib/audio/browserAudioEngine";
import { createLocalEarTrainingMelodyQuestion } from "../../lib/practice/localEarTrainingMelodyDictation";

let root: Root | null = null;
let playbackContext: FakePlaybackContext;
let getUserMedia: ReturnType<typeof vi.fn>;
let trackStop: ReturnType<typeof vi.fn>;
let recorderStart: ReturnType<typeof vi.fn>;
let recorderStop: ReturnType<typeof vi.fn>;
let decodeAudioData: ReturnType<typeof vi.fn>;
let audioPlay: ReturnType<typeof vi.fn>;
let audioPause: ReturnType<typeof vi.fn>;
let audioInstances: Array<{ onended: (() => void) | null; onerror: (() => void) | null }>;
let trackEnded: (() => void) | null;
let emitRecordingChunk: boolean;
let recorderInstance: { onerror: (() => void) | null } | null;
let oscillatorStarts: number[];
let microphoneContext: { state: AudioContextState; interrupt: () => void } | null;

class FakePlaybackContext {
  currentTime = 10;
  state: AudioContextState = "running";
  destination = {};
  listeners = new Set<() => void>();
  createOscillator = () => ({
    type: "sine",
    frequency: { value: 0 },
    connect: vi.fn(),
    disconnect: vi.fn(),
    addEventListener: vi.fn(),
    start: (at: number) => oscillatorStarts.push(at),
    stop: vi.fn(),
  });
  createGain = () => ({
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
  addEventListener = (_name: string, listener: () => void) => this.listeners.add(listener);
  removeEventListener = (_name: string, listener: () => void) => this.listeners.delete(listener);
  interrupt = () => {
    this.state = "suspended";
    Array.from(this.listeners).forEach((listener) => listener());
  };
}

const question = createLocalEarTrainingMelodyQuestion({
  difficulty: "基础",
  sequence: 0,
  questionIndex: 0,
  catalogMode: "expanded-local-v2",
});

const advance = async (milliseconds = 1) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
    await Promise.resolve();
  });
};

const waitFor = async (predicate: () => boolean, message: string) => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (predicate()) return;
    await advance(10);
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
    await Promise.resolve();
  });
  await advance();
};

const renderPanel = async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const channel = {
    prepareForUserGesture: vi.fn().mockResolvedValue(playbackContext),
    stop: vi.fn(),
    trackSource: <T,>(source: T) => source,
  };
  root = createRoot(container);
  await act(async () => root?.render(
    <StrictMode>
      <LocalMelodySightSingingPanel question={question} createChannel={() => channel} />
    </StrictMode>,
  ));
  await advance();
  return { container, channel };
};

const enableMicrophone = async (container: HTMLElement) => {
  const calls = getUserMedia.mock.calls.length;
  await click(findButton(container, "启用麦克风"));
  expect(getUserMedia).toHaveBeenCalledTimes(calls + 1);
  expect(findButton(container, "开始四拍预备与录音").disabled).toBe(false);
};

const startRecording = async (container: HTMLElement, clockAdvanceSeconds = 2.7) => {
  const starts = recorderStart.mock.calls.length;
  await click(findButton(container, "开始四拍预备与录音"));
  expect(container.textContent).toContain("预备拍 1 / 4");
  playbackContext.currentTime += clockAdvanceSeconds;
  await advance(2_800);
  expect(recorderStart).toHaveBeenCalledTimes(starts + 1);
  expect(container.textContent).toContain("正在按可见目标录制三个音");
};

const finishRecording = async (container: HTMLElement) => {
  const stops = recorderStop.mock.calls.length;
  await click(findButton(container, "停止本轮录音"));
  expect(recorderStop).toHaveBeenCalledTimes(stops + 1);
  expect(container.textContent).toContain("本轮录音已准备好");
};

const recordAttempt = async (container: HTMLElement) => {
  await enableMicrophone(container);
  await startRecording(container);
  await finishRecording(container);
};

beforeEach(() => {
  vi.useFakeTimers();
  playbackContext = new FakePlaybackContext();
  trackStop = vi.fn();
  recorderStart = vi.fn();
  recorderStop = vi.fn();
  audioPlay = vi.fn().mockResolvedValue(undefined);
  audioPause = vi.fn();
  audioInstances = [];
  trackEnded = null;
  emitRecordingChunk = true;
  recorderInstance = null;
  oscillatorStarts = [];
  microphoneContext = null;
  getUserMedia = vi.fn().mockResolvedValue({
    getTracks: () => [{
      stop: trackStop,
      addEventListener: (_name: string, listener: () => void) => { trackEnded = listener; },
    }],
  });
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });

  const sampleRate = 48_000;
  const samples = new Float32Array(sampleRate * 2);
  const frequencies = [261.63, 293.66, 329.63];
  for (let index = 0; index < samples.length; index += 1) {
    const section = Math.min(2, Math.floor(index / (samples.length / 3)));
    samples[index] = 0.35 * Math.sin(2 * Math.PI * frequencies[section]! * index / sampleRate);
  }
  decodeAudioData = vi.fn().mockResolvedValue({
    numberOfChannels: 1,
    sampleRate,
    getChannelData: () => samples,
  });

  class FakeAudioContext {
    state: AudioContextState = "running";
    listeners = new Set<() => void>();
    sampleRate = 48_000;
    resume = vi.fn().mockResolvedValue(undefined);
    close = vi.fn().mockResolvedValue(undefined);
    decodeAudioData = decodeAudioData;
    createMediaStreamSource = () => ({ connect: vi.fn(), disconnect: vi.fn() });
    createAnalyser = () => ({
      fftSize: 4096,
      smoothingTimeConstant: 0,
      getFloatTimeDomainData: (values: Float32Array) => {
        for (let index = 0; index < values.length; index += 1) {
          values[index] = 0.35 * Math.sin(2 * Math.PI * 261.63 * index / 48_000);
        }
      },
    });
    addEventListener = (_name: string, listener: () => void) => this.listeners.add(listener);
    interrupt = () => {
      this.state = "suspended";
      Array.from(this.listeners).forEach((listener) => listener());
    };
    constructor() { microphoneContext = this; }
  }
  class FakeMediaRecorder {
    static isTypeSupported = () => true;
    state = "inactive";
    mimeType: string;
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(_stream: unknown, options?: { mimeType?: string }) {
      this.mimeType = options?.mimeType ?? "audio/webm";
      recorderInstance = this;
    }
    start = () => {
      this.state = "recording";
      (recorderStart as () => void)();
    };
    stop = () => {
      this.state = "inactive";
      (recorderStop as () => void)();
      if (emitRecordingChunk) this.ondataavailable?.({ data: new Blob(["voice"], { type: this.mimeType }) });
      this.onstop?.();
    };
  }
  class FakeAudio {
    currentTime = 0;
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(_url: string) { audioInstances.push(this); }
    play = audioPlay;
    pause = audioPause;
  }
  vi.stubGlobal("AudioContext", FakeAudioContext);
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
  vi.stubGlobal("Audio", FakeAudio);
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn().mockReturnValue("blob:melody-sight-singing") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("P117e 三音旋律视唱挂载行为", () => {
  it("目标首屏可见且无需答案播放即可主动启麦、四拍、录音和完整 Blob 回放", async () => {
    const storageWrite = vi.spyOn(Storage.prototype, "setItem");
    const networkRequest = vi.spyOn(globalThis, "fetch");
    const { container } = await renderPanel();
    expect(container.querySelector('[data-testid="melody-sight-singing-target"]')).not.toBeNull();
    expect(container.textContent).toContain("do");
    expect(container.textContent).not.toContain("完整播放隐藏旋律");
    expect(container.textContent).not.toContain("播放旋律题目");
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(findButton(container, "启用麦克风").disabled).toBe(false);

    await recordAttempt(container);
    expect(oscillatorStarts).toHaveLength(4);
    expect(decodeAudioData).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="melody-sight-singing-target"]')).not.toBeNull();
    expect(container.textContent).toContain("请先完整回放本次录音");
    expect(container.textContent).not.toContain("检查并准备分析本次录音");

    await click(findButton(container, "完整回放本次录音"));
    const staleEnded = audioInstances.at(-1)?.onended;
    await click(findButton(container, "停止录音回放"));
    expect(audioPause).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toContain("检查并准备分析本次录音");
    await act(async () => staleEnded?.());
    await advance();
    expect(container.textContent).not.toContain("检查并准备分析本次录音");
    await click(findButton(container, "完整回放本次录音"));
    await act(async () => audioInstances.at(-1)?.onended?.());
    await advance();
    expect(container.textContent).toContain("检查并准备分析本次录音");
    expect(storageWrite).not.toHaveBeenCalled();
    expect(networkRequest).not.toHaveBeenCalled();
  });

  it("二次确认前不解码，真实 analysis run ready 后仍需显式查看 non-scoring feedback", async () => {
    const { container } = await renderPanel();
    await recordAttempt(container);
    await click(findButton(container, "完整回放本次录音"));
    await act(async () => audioInstances.at(-1)?.onended?.());
    await advance();
    await click(findButton(container, "检查并准备分析本次录音"));
    expect(decodeAudioData).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain("逐音与逐句证据（非评分）");

    await click(findButton(container, "确认开始本地分析"));
    await waitFor(() => decodeAudioData.mock.calls.length === 1, "本地分析开始");
    await waitFor(() => !findButton(container, "查看本轮非评分反馈").disabled, "等待主动检查");
    expect(container.textContent).not.toContain("逐音与逐句证据（非评分）");
    await click(findButton(container, "查看本轮非评分反馈"));
    expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent).toContain("答案已检查");
    expect(container.textContent).toContain("逐音与逐句证据（非评分）");
    expect(container.querySelector('[data-testid="melody-sight-singing-target"]')).not.toBeNull();
    expect(findButton(container, "重新完整回放本次录音").disabled).toBe(true);
    expect(findButton(container, "启用麦克风").disabled).toBe(true);
    expect(findButton(container, "清除本次分析结果").disabled).toBe(true);
  });

  it("analysis processing 期间锁定录音回放并保持当前 run 挂载", async () => {
    let resolveDecode: ((value: unknown) => void) | null = null;
    const pendingDecode = new Promise((resolve) => { resolveDecode = resolve; });
    const readyResult = await (decodeAudioData.getMockImplementation() as () => Promise<unknown>)();
    decodeAudioData.mockReturnValueOnce(pendingDecode);
    const { container } = await renderPanel();
    await recordAttempt(container);
    await click(findButton(container, "完整回放本次录音"));
    await act(async () => audioInstances.at(-1)?.onended?.());
    await advance();
    await click(findButton(container, "检查并准备分析本次录音"));
    await click(findButton(container, "确认开始本地分析"));
    await waitFor(() => container.textContent?.includes("正在本机解码与分析") === true, "analysis processing");
    expect(findButton(container, "重新完整回放本次录音").disabled).toBe(true);
    expect(container.textContent).toContain("正在本机解码与分析");
    await act(async () => resolveDecode?.(readyResult));
    await waitFor(() => !findButton(container, "查看本轮非评分反馈").disabled, "analysis ready");
  });

  it("被替换回放的迟到 play reject 不能中断当前 Blob 回放资格", async () => {
    let rejectStalePlay: ((reason?: unknown) => void) | null = null;
    audioPlay.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectStalePlay = reject; }));
    const { container } = await renderPanel();
    await recordAttempt(container);
    await click(findButton(container, "完整回放本次录音"));
    await click(findButton(container, "完整回放本次录音"));
    const currentPlayback = audioInstances.at(-1);
    await act(async () => rejectStalePlay?.(new Error("stale blocked")));
    await advance();
    expect(container.textContent).not.toContain("系统阻止了录音回放");
    await act(async () => currentPlayback?.onended?.());
    await advance();
    expect(container.textContent).toContain("检查并准备分析本次录音");
  });

  it("丢弃 processing run 后迟到的 analysis ready 不能复活旧证据", async () => {
    let resolveDecode: ((value: unknown) => void) | null = null;
    const pendingDecode = new Promise((resolve) => { resolveDecode = resolve; });
    const readyResult = await (decodeAudioData.getMockImplementation() as () => Promise<unknown>)();
    decodeAudioData.mockReturnValueOnce(pendingDecode);
    const { container } = await renderPanel();
    await recordAttempt(container);
    await click(findButton(container, "完整回放本次录音"));
    await act(async () => audioInstances.at(-1)?.onended?.());
    await advance();
    await click(findButton(container, "检查并准备分析本次录音"));
    await click(findButton(container, "确认开始本地分析"));
    await waitFor(() => container.textContent?.includes("正在本机解码与分析") === true, "stale analysis processing");
    await click(findButton(container, "丢弃并重新录制"));
    await act(async () => resolveDecode?.(readyResult));
    await advance(100);
    expect(container.textContent).not.toContain("逐音与逐句证据（非评分）");
    expect(findButton(container, "查看本轮非评分反馈").disabled).toBe(true);
    expect(findButton(container, "启用麦克风").disabled).toBe(false);
  });

  it("四拍 AudioContext 双边零点拒绝 early/late，并允许 ±40ms 内启动和自动停止", async () => {
    const { container } = await renderPanel();
    await enableMicrophone(container);
    await click(findButton(container, "开始四拍预备与录音"));
    await advance(2_800);
    expect(recorderStart).not.toHaveBeenCalled();
    expect(container.textContent).toContain("尚未到达录音零点");
    expect(findButton(container, "启用麦克风").disabled).toBe(false);

    await enableMicrophone(container);
    await click(findButton(container, "开始四拍预备与录音"));
    playbackContext.currentTime += 2.827;
    await advance(2_800);
    expect(recorderStart).not.toHaveBeenCalled();
    expect(container.textContent).toContain("严重迟于录音零点");

    await enableMicrophone(container);
    await startRecording(container, 2.668);
    await advance(2_100);
    expect(recorderStop).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("本轮录音已准备好");
  });

  it("permission、迟到 stream、track ended、麦克风 context 与全局停止全部 fail closed", async () => {
    const { container } = await renderPanel();
    getUserMedia.mockRejectedValueOnce(new DOMException("denied", "NotAllowedError"));
    await click(findButton(container, "启用麦克风"));
    expect(container.textContent).toContain("麦克风权限未开启");
    expect(findButton(container, "启用麦克风").disabled).toBe(false);

    let resolveLateStream: ((stream: MediaStream) => void) | null = null;
    const lateTrackStop = vi.fn();
    getUserMedia.mockReturnValueOnce(new Promise<MediaStream>((resolve) => { resolveLateStream = resolve; }));
    await click(findButton(container, "启用麦克风"));
    await click(findButton(container, "停止并作废本轮"));
    await act(async () => resolveLateStream?.({ getTracks: () => [{ stop: lateTrackStop }] } as unknown as MediaStream));
    await advance();
    expect(lateTrackStop).toHaveBeenCalledTimes(1);

    await enableMicrophone(container);
    await act(async () => trackEnded?.());
    await advance();
    expect(container.textContent).toContain("麦克风媒体轨已中断");
    await enableMicrophone(container);
    await act(async () => microphoneContext?.interrupt());
    await advance();
    expect(container.textContent).toContain("麦克风音频上下文已中断");

    await enableMicrophone(container);
    await act(async () => stopAllBrowserAudio());
    await advance();
    expect(container.textContent).toContain("全局停止而作废");
    expect(container.querySelector('[data-testid="melody-sight-singing-target"]')).not.toBeNull();
  });

  it("Recorder 不支持、空 Blob、异步错误与录音回放 reject/error 都不会恢复旧 binding", async () => {
    const { container } = await renderPanel();
    const supportedMediaRecorder = globalThis.MediaRecorder;
    await enableMicrophone(container);
    vi.stubGlobal("MediaRecorder", undefined);
    await click(findButton(container, "开始四拍预备与录音"));
    playbackContext.currentTime += 2.7;
    await advance(2_800);
    expect(container.textContent).toContain("当前设备不支持会话内录音");

    vi.stubGlobal("MediaRecorder", supportedMediaRecorder);
    emitRecordingChunk = false;
    await enableMicrophone(container);
    await startRecording(container);
    await click(findButton(container, "停止本轮录音"));
    expect(container.textContent).toContain("没有获得可回放的录音数据");

    emitRecordingChunk = true;
    await enableMicrophone(container);
    await startRecording(container);
    await act(async () => recorderInstance?.onerror?.());
    await advance();
    expect(container.textContent).toContain("本次录音发生错误");

    await click(findButton(container, "停止并作废本轮"));
    await recordAttempt(container);
    audioPlay.mockRejectedValueOnce(new Error("blocked"));
    await click(findButton(container, "完整回放本次录音"));
    await waitFor(() => container.textContent?.includes("系统阻止了录音回放") === true, "play reject");
    expect(container.textContent).not.toContain("检查并准备分析本次录音");

    await recordAttempt(container);
    await click(findButton(container, "完整回放本次录音"));
    await act(async () => audioInstances.at(-1)?.onerror?.());
    await advance();
    expect(container.textContent).toContain("无法回放本次录音");
    expect(container.textContent).not.toContain("检查并准备分析本次录音");
  });

  it("decode 失败作废当前 run，旧计时器与卸载后的异步结果不能复活状态", async () => {
    const { container } = await renderPanel();
    await recordAttempt(container);
    await click(findButton(container, "完整回放本次录音"));
    await act(async () => audioInstances.at(-1)?.onended?.());
    await advance();
    decodeAudioData.mockRejectedValueOnce(new Error("decode failed"));
    await click(findButton(container, "检查并准备分析本次录音"));
    await click(findButton(container, "确认开始本地分析"));
    await waitFor(() => container.textContent?.includes("本机分析失败") === true, "decode 失败关闭");
    expect(container.textContent).toContain("旧录音与证据已作废");
    expect(findButton(container, "启用麦克风").disabled).toBe(false);

    await enableMicrophone(container);
    await click(findButton(container, "开始四拍预备与录音"));
    await click(findButton(container, "停止并作废本轮"));
    playbackContext.currentTime += 10;
    await advance(10_000);
    expect(recorderStart).toHaveBeenCalledTimes(1);

    await act(async () => root?.unmount());
    root = null;
    expect(trackStop).toHaveBeenCalled();
  });
});
