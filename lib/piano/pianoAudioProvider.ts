import type { PianoNoteEvent } from "./pianoNoteEvents";

export type PianoTimbreDescriptor = {
  id: string;
  version: string;
  displayName: string;
  kind: "sampled" | "compatibility-synth";
  attribution: string;
  license: string;
  source: string;
};

export type PianoVoiceTrackingChannel = {
  trackSource<T extends AudioScheduledSourceNode>(source: T, nodes?: AudioNode[]): T;
};

export type PianoVoiceHandle = {
  setVolume(volume: number): void;
  release(immediately?: boolean): void;
};

export type PianoVoiceProvider = {
  descriptor: PianoTimbreDescriptor;
  startVoice(input: {
    context: AudioContext;
    channel: PianoVoiceTrackingChannel;
    event: Extract<PianoNoteEvent, { type: "note-on" }>;
    frequencyHz: number;
    volume: number;
    isCancelled: () => boolean;
  }): Promise<PianoVoiceHandle>;
};

export const COMPATIBILITY_PIANO_TIMBRE: PianoTimbreDescriptor = {
  id: "compatibility-triangle-v1",
  version: "1.0.0",
  displayName: "兼容合成音",
  kind: "compatibility-synth",
  attribution: "项目内 Web Audio 生成",
  license: "项目源代码许可；不包含外部音频资产",
  source: "OscillatorNode triangle waveform",
};

const voiceGain = (volume: number, velocity: number) => volume * velocity * 0.075;

export const COMPATIBILITY_PIANO_VOICE_PROVIDER: PianoVoiceProvider = {
  descriptor: COMPATIBILITY_PIANO_TIMBRE,
  async startVoice({ context, channel, event, frequencyHz, volume }) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startTime = context.currentTime + 0.005;
    oscillator.type = "triangle";
    oscillator.frequency.value = frequencyHz;
    const targetGain = voiceGain(volume, event.velocity);
    gain.gain.setValueAtTime(targetGain === 0 ? 0 : 0.0001, startTime);
    if (targetGain > 0) gain.gain.exponentialRampToValueAtTime(targetGain, startTime + 0.012);
    oscillator.connect(gain);
    gain.connect(context.destination);
    channel.trackSource(oscillator, [gain]);
    oscillator.start(startTime);
    let released = false;
    return {
      setVolume(nextVolume) {
        if (released) return;
        gain.gain.setTargetAtTime(
          voiceGain(nextVolume, event.velocity),
          context.currentTime,
          0.015,
        );
      },
      release(immediately = false) {
        if (released) return;
        released = true;
        if (immediately) {
          oscillator.stop();
          return;
        }
        const now = context.currentTime;
        gain.gain.cancelScheduledValues(now);
        const currentGain = gain.gain.value;
        gain.gain.setValueAtTime(Math.max(0, currentGain), now);
        if (currentGain > 0) gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
        oscillator.stop(now + 0.045);
      },
    };
  },
};

export class BoundedPianoSampleCache<T> {
  private readonly entries = new Map<string, T>();

  constructor(readonly maxEntries: number) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1) {
      throw new Error("钢琴采样缓存容量必须为正整数");
    }
  }

  get size() { return this.entries.size; }

  get(key: string): T | undefined {
    const value = this.entries.get(key);
    if (value === undefined) return undefined;
    this.entries.delete(key);
    this.entries.set(key, value);
    return value;
  }

  set(key: string, value: T): string | null {
    this.entries.delete(key);
    this.entries.set(key, value);
    if (this.entries.size <= this.maxEntries) return null;
    const oldest = this.entries.keys().next().value as string | undefined;
    if (oldest === undefined) return null;
    this.entries.delete(oldest);
    return oldest;
  }

  clear() { this.entries.clear(); }
}

export const createCachedPianoSampleLoader = ({
  cache,
  fetchAsset,
}: {
  cache: BoundedPianoSampleCache<AudioBuffer>;
  fetchAsset: (context: AudioContext, assetPath: string) => Promise<AudioBuffer>;
}) => {
  const inFlight = new Map<string, Promise<AudioBuffer>>();
  return async (context: AudioContext, zone: PianoSampleZone): Promise<AudioBuffer> => {
    const cached = cache.get(zone.assetPath);
    if (cached) return cached;
    const existing = inFlight.get(zone.assetPath);
    if (existing) return existing;
    const request = fetchAsset(context, zone.assetPath)
      .then((buffer) => {
        cache.set(zone.assetPath, buffer);
        return buffer;
      })
      .finally(() => inFlight.delete(zone.assetPath));
    inFlight.set(zone.assetPath, request);
    return request;
  };
};

export type PianoSampleZone = {
  id: string;
  rootMidi: number;
  minMidi: number;
  maxMidi: number;
  minVelocity: number;
  maxVelocity: number;
  assetPath: string;
  gain: number;
};

export const selectPianoSampleZone = (
  zones: readonly PianoSampleZone[],
  midi: number,
  velocity: number,
): PianoSampleZone | null => zones.find((zone) =>
  midi >= zone.minMidi && midi <= zone.maxMidi
  && velocity >= zone.minVelocity && velocity <= zone.maxVelocity
) ?? null;

export const createSamplePianoVoiceProvider = ({
  descriptor,
  zones,
  loadSample,
}: {
  descriptor: PianoTimbreDescriptor;
  zones: readonly PianoSampleZone[];
  loadSample: (context: AudioContext, zone: PianoSampleZone) => Promise<AudioBuffer>;
}): PianoVoiceProvider => {
  if (descriptor.kind !== "sampled") throw new Error("采样提供器必须使用 sampled 音色描述");
  return {
    descriptor,
    async startVoice({ context, channel, event, volume, isCancelled }) {
      const zone = selectPianoSampleZone(zones, event.note, event.velocity);
      if (!zone) throw new Error("当前音高或力度没有可用的本地钢琴采样");
      const buffer = await loadSample(context, zone);
      if (isCancelled()) throw new Error("钢琴采样请求已取消");
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.playbackRate.value = 2 ** ((event.note - zone.rootMidi) / 12);
      const outputGain = Math.max(0, Math.min(1, volume)) * event.velocity * zone.gain;
      gain.gain.setValueAtTime(outputGain, context.currentTime);
      source.connect(gain);
      gain.connect(context.destination);
      channel.trackSource(source, [gain]);
      source.start(context.currentTime + 0.005);
      let released = false;
      return {
        setVolume(nextVolume) {
          if (!released) gain.gain.setTargetAtTime(nextVolume * event.velocity * zone.gain, context.currentTime, 0.015);
        },
        release(immediately = false) {
          if (released) return;
          released = true;
          const now = context.currentTime;
          if (immediately) {
            source.stop();
            return;
          }
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(Math.max(0, gain.gain.value), now);
          if (gain.gain.value > 0) gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
          source.stop(now + 0.1);
        },
      };
    },
  };
};
