import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocalMelodyImitationPanel } from "../../components/practice/LocalMelodyImitationPanel";
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
let oscillatorStops: number[];
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
    stop: (at: number) => oscillatorStops.push(at),
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
  await act(async () => {
    root?.render(
      <StrictMode>
        <LocalMelodyImitationPanel question={question} createChannel={() => channel} />
      </StrictMode>,
    );
  });
  await advance();
  return { container, channel };
};

const completeHiddenPlayback = async (container: HTMLElement) => {
  await click(findButton(container, "完整播放隐藏旋律"));
  playbackContext.currentTime += 10;
  await advance(2_500);
  expect(container.textContent).toContain("已完整听完隐藏旋律");
};

const recordAttempt = async (container: HTMLElement) => {
  const getUserMediaCalls = getUserMedia.mock.calls.length;
  const recorderStartCalls = recorderStart.mock.calls.length;
  const recorderStopCalls = recorderStop.mock.calls.length;
  await click(findButton(container, "启用麦克风"));
  expect(getUserMedia).toHaveBeenCalledTimes(getUserMediaCalls + 1);
  expect(findButton(container, "开始四拍预备与录音").disabled).toBe(false);
  await click(findButton(container, "开始四拍预备与录音"));
  expect(container.textContent).toContain("预备拍 1 / 4");
  playbackContext.currentTime += 2.7;
  await advance(2_800);
  expect(recorderStart).toHaveBeenCalledTimes(recorderStartCalls + 1);
  expect(container.textContent).toContain("正在录制三个音的回唱");
  await click(findButton(container, "停止本轮录音"));
  expect(recorderStop).toHaveBeenCalledTimes(recorderStopCalls + 1);
  expect(container.textContent).toContain("本轮录音已准备好");
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
  oscillatorStops = [];
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
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn().mockReturnValue("blob:melody-imitation") });
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

describe("P117d 三音旋律回唱挂载行为", () => {
  it("完整隐藏目标 gate 后才允许主动权限、四拍预备、录制、回放和丢弃", async () => {
    const { container } = await renderPanel();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(findButton(container, "启用麦克风").disabled).toBe(true);
    expect(findButton(container, "开始四拍预备与录音").disabled).toBe(true);
    expect(container.textContent).not.toContain("第 1 音 · 目标 C4");
    expect(container.textContent).toContain("不保存、不上传");

    await completeHiddenPlayback(container);
    expect(oscillatorStarts.slice(0, 3)).toHaveLength(3);
    oscillatorStops.slice(0, 3).forEach((stop, index) => {
      expect(stop - oscillatorStarts[index]!).toBeCloseTo(60 / 90, 5);
    });
    expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent).toContain("第 2 次尝试");
    await recordAttempt(container);
    expect(decodeAudioData).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain("第 1 音 · 目标 C4");

    expect(container.textContent).toContain("请先完整回放本次录音");
    expect(container.textContent).not.toContain("检查并准备分析本次录音");
    await click(findButton(container, "完整回放本次录音"));
    expect(audioPlay).toHaveBeenCalledTimes(1);
    await click(findButton(container, "停止录音回放"));
    expect(audioPause).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toContain("检查并准备分析本次录音");
    await click(findButton(container, "完整回放本次录音"));
    await act(async () => audioInstances.at(-1)?.onended?.());
    await advance();
    expect(container.textContent).toContain("检查并准备分析本次录音");
    await click(findButton(container, "丢弃并重新听题"));
    expect(container.textContent).toContain("请重新完整听题");
    expect(findButton(container, "启用麦克风").disabled).toBe(true);
    expect(container.textContent).not.toContain("第 1 音 · 目标 C4");
  });

  it("二次确认前不分析，主动检查后才揭示会话内逐音非评分反馈", async () => {
    const { container } = await renderPanel();
    await completeHiddenPlayback(container);
    await recordAttempt(container);
    await click(findButton(container, "完整回放本次录音"));
    await act(async () => audioInstances.at(-1)?.onended?.());
    await advance();

    await click(findButton(container, "检查并准备分析本次录音"));
    expect(container.textContent).toContain("确认停止麦克风");
    expect(decodeAudioData).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain("逐音与逐句证据（非评分）");

    await click(findButton(container, "确认开始本地分析"));
    await waitFor(() => decodeAudioData.mock.calls.length === 1, "本地分析开始");
    await waitFor(() => !findButton(container, "查看本轮非评分反馈").disabled, "Activity 等待主动检查");
    expect(container.textContent).not.toContain("逐音与逐句证据（非评分）");
    expect(container.textContent).not.toContain("第 1 音 · 目标 C4");

    await click(findButton(container, "查看本轮非评分反馈"));
    expect(container.querySelector('[data-testid="activity-protocol-state"]')?.textContent).toContain("答案已检查");
    expect(container.textContent).toContain("逐音与逐句证据（非评分）");
    expect(container.textContent).toContain("第 1 音 · 目标 C4");
    expect(container.textContent).toContain("不是分数、等级或通过／失败");
    expect(findButton(container, "完整播放隐藏旋律").disabled).toBe(true);
    expect(findButton(container, "重新完整回放本次录音").disabled).toBe(true);
  });

  it("手停、全局停止和预备拍 AudioContext 中断都会作废旧 attempt 与迟到 timer", async () => {
    const { container } = await renderPanel();
    await click(findButton(container, "完整播放隐藏旋律"));
    await click(findButton(container, "停止并作废本轮"));
    playbackContext.currentTime = 20;
    await advance(3_000);
    expect(findButton(container, "启用麦克风").disabled).toBe(true);
    expect(container.textContent).toContain("停止并作废");

    playbackContext.state = "running";
    await completeHiddenPlayback(container);
    await click(findButton(container, "启用麦克风"));
    await click(findButton(container, "开始四拍预备与录音"));
    playbackContext.interrupt();
    await advance(4_000);
    expect(recorderStart).not.toHaveBeenCalled();
    expect(container.textContent).toContain("四拍预备被音频中断");
    expect(findButton(container, "启用麦克风").disabled).toBe(true);

    playbackContext.state = "running";
    await completeHiddenPlayback(container);
    await act(async () => stopAllBrowserAudio());
    await advance();
    expect(container.textContent).toContain("全局停止而作废");
    expect(findButton(container, "启用麦克风").disabled).toBe(true);
  });

  it("录音零点必须等待四拍 AudioContext 时钟，合法窗口到时会自动停止", async () => {
    const { container } = await renderPanel();
    await completeHiddenPlayback(container);
    await click(findButton(container, "启用麦克风"));
    await click(findButton(container, "开始四拍预备与录音"));
    await advance(2_800);

    expect(recorderStart).not.toHaveBeenCalled();
    expect(container.textContent).toContain("尚未到达录音零点");
    expect(findButton(container, "启用麦克风").disabled).toBe(true);

    await completeHiddenPlayback(container);
    await click(findButton(container, "启用麦克风"));
    await click(findButton(container, "开始四拍预备与录音"));
    playbackContext.currentTime += 2.827;
    await advance(2_800);
    expect(recorderStart).not.toHaveBeenCalled();
    expect(container.textContent).toContain("严重迟于录音零点");

    await completeHiddenPlayback(container);
    await click(findButton(container, "启用麦克风"));
    await click(findButton(container, "开始四拍预备与录音"));
    playbackContext.currentTime += 2.7;
    await advance(2_800);
    expect(recorderStart).toHaveBeenCalledTimes(1);

    await advance(2_100);
    expect(recorderStop).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("本轮录音已准备好");
    expect(container.textContent).toContain("请先完整回放本次录音");

    await click(findButton(container, "丢弃并重新听题"));
    await completeHiddenPlayback(container);
    await click(findButton(container, "启用麦克风"));
    await click(findButton(container, "开始四拍预备与录音"));
    playbackContext.currentTime += 2.668;
    await advance(2_800);
    expect(recorderStart).toHaveBeenCalledTimes(2);
    await click(findButton(container, "停止本轮录音"));

    await click(findButton(container, "丢弃并重新听题"));
    await completeHiddenPlayback(container);
    await click(findButton(container, "启用麦克风"));
    await click(findButton(container, "开始四拍预备与录音"));
    playbackContext.currentTime += 2.745;
    await advance(2_800);
    expect(recorderStart).toHaveBeenCalledTimes(3);
  });

  it("权限拒绝、迟到 stream 与媒体轨结束都失败关闭且不能恢复旧资格", async () => {
    const { container } = await renderPanel();
    await completeHiddenPlayback(container);
    getUserMedia.mockRejectedValueOnce(new DOMException("denied", "NotAllowedError"));
    await click(findButton(container, "启用麦克风"));
    expect(container.textContent).toContain("麦克风权限未开启");
    expect(findButton(container, "启用麦克风").disabled).toBe(true);

    let resolveLateStream: ((stream: MediaStream) => void) | null = null;
    const lateTrackStop = vi.fn();
    getUserMedia.mockReturnValueOnce(new Promise<MediaStream>((resolve) => { resolveLateStream = resolve; }));
    await completeHiddenPlayback(container);
    await click(findButton(container, "启用麦克风"));
    await click(findButton(container, "停止并作废本轮"));
    await act(async () => resolveLateStream?.({ getTracks: () => [{ stop: lateTrackStop }] } as unknown as MediaStream));
    await advance();
    expect(lateTrackStop).toHaveBeenCalledTimes(1);
    expect(findButton(container, "启用麦克风").disabled).toBe(true);

    await completeHiddenPlayback(container);
    await click(findButton(container, "启用麦克风"));
    await act(async () => trackEnded?.());
    await advance();
    expect(container.textContent).toContain("麦克风媒体轨已中断");
    expect(findButton(container, "启用麦克风").disabled).toBe(true);

    await completeHiddenPlayback(container);
    await click(findButton(container, "启用麦克风"));
    await act(async () => microphoneContext?.interrupt());
    await advance();
    expect(container.textContent).toContain("麦克风音频上下文已中断");
    expect(findButton(container, "启用麦克风").disabled).toBe(true);
  });

  it("Recorder 不支持、空 Blob 与异步录制错误都会清除当前资格和 binding", async () => {
    const { container } = await renderPanel();
    const supportedMediaRecorder = globalThis.MediaRecorder;

    await completeHiddenPlayback(container);
    await click(findButton(container, "启用麦克风"));
    vi.stubGlobal("MediaRecorder", undefined);
    await click(findButton(container, "开始四拍预备与录音"));
    playbackContext.currentTime += 2.7;
    await advance(2_800);
    expect(container.textContent).toContain("当前设备不支持会话内录音");
    expect(findButton(container, "启用麦克风").disabled).toBe(true);

    vi.stubGlobal("MediaRecorder", supportedMediaRecorder);
    emitRecordingChunk = false;
    await completeHiddenPlayback(container);
    await click(findButton(container, "启用麦克风"));
    await click(findButton(container, "开始四拍预备与录音"));
    playbackContext.currentTime += 2.7;
    await advance(2_800);
    await click(findButton(container, "停止本轮录音"));
    expect(container.textContent).toContain("没有获得可回放的录音数据");
    expect(findButton(container, "启用麦克风").disabled).toBe(true);

    emitRecordingChunk = true;
    await completeHiddenPlayback(container);
    await click(findButton(container, "启用麦克风"));
    await click(findButton(container, "开始四拍预备与录音"));
    playbackContext.currentTime += 2.7;
    await advance(2_800);
    await act(async () => recorderInstance?.onerror?.());
    await advance();
    expect(container.textContent).toContain("本次录音发生错误");
    expect(findButton(container, "启用麦克风").disabled).toBe(true);
  });

  it("本机 decode 失败会作废录音、回放资格和 Activity 尝试", async () => {
    const { container } = await renderPanel();
    await completeHiddenPlayback(container);
    await recordAttempt(container);
    await click(findButton(container, "完整回放本次录音"));
    await act(async () => audioInstances.at(-1)?.onended?.());
    await advance();
    decodeAudioData.mockRejectedValueOnce(new Error("decode failed"));

    await click(findButton(container, "检查并准备分析本次录音"));
    await click(findButton(container, "确认开始本地分析"));
    await waitFor(() => container.textContent?.includes("本机分析失败") === true, "分析失败关闭");

    expect(container.textContent).toContain("旧录音与证据已作废");
    expect(findButton(container, "启用麦克风").disabled).toBe(true);
    expect(container.textContent).not.toContain("第 1 音 · 目标 C4");
  });

  it("录音回放 play reject 或媒体 error 都会作废当前录音与分析资格", async () => {
    const { container } = await renderPanel();
    await completeHiddenPlayback(container);
    await recordAttempt(container);
    audioPlay.mockRejectedValueOnce(new Error("blocked"));
    await click(findButton(container, "完整回放本次录音"));
    await waitFor(() => container.textContent?.includes("系统阻止了录音回放") === true, "play reject 失败关闭");
    expect(findButton(container, "启用麦克风").disabled).toBe(true);

    await completeHiddenPlayback(container);
    await recordAttempt(container);
    await click(findButton(container, "完整回放本次录音"));
    await act(async () => audioInstances.at(-1)?.onerror?.());
    await advance();
    expect(container.textContent).toContain("无法回放本次录音");
    expect(findButton(container, "启用麦克风").disabled).toBe(true);
    expect(container.textContent).not.toContain("检查并准备分析本次录音");
  });
});
