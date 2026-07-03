import {
  getBeatDurationSeconds,
  sanitizeMetronomeConfig,
  type MetronomeConfig,
} from "./metronomeConfig";
import {
  createMetronomeBeatMetadata,
  getBeatsPerBar,
  type MetronomeBeatMetadata,
} from "./metronomeGrid";

type BeatCallback = (beat: MetronomeBeatMetadata) => void;

type RuntimeAudioContext = AudioContext & {
  webkitAudioContext?: typeof AudioContext;
};

export type MetronomeSchedulerOptions = {
  config: MetronomeConfig;
  onBeat?: BeatCallback;
  lookaheadMs?: number;
  scheduleAheadSeconds?: number;
};

export class BrowserMetronomeScheduler {
  private audioContext: AudioContext | null = null;
  private timerId: number | null = null;
  private nextBeatTimeSeconds = 0;
  private nextBeatIndex = 0;
  private countInBeatCount = 0;
  private config: MetronomeConfig;
  private readonly onBeat?: BeatCallback;
  private readonly lookaheadMs: number;
  private readonly scheduleAheadSeconds: number;

  constructor(options: MetronomeSchedulerOptions) {
    this.config = sanitizeMetronomeConfig(options.config);
    this.onBeat = options.onBeat;
    this.lookaheadMs = options.lookaheadMs ?? 25;
    this.scheduleAheadSeconds = options.scheduleAheadSeconds ?? 0.1;
  }

  get isRunning() {
    return this.audioContext !== null;
  }

  updateConfig(config: MetronomeConfig) {
    this.config = sanitizeMetronomeConfig(config);
  }

  async start() {
    if (this.audioContext) {
      return;
    }

    const AudioContextConstructor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextConstructor) {
      throw new Error("Web Audio is not available in this browser.");
    }

    const audioContext = new AudioContextConstructor() as RuntimeAudioContext;
    this.audioContext = audioContext;

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    this.nextBeatIndex = 0;
    this.countInBeatCount = this.getCountInBeatCount();
    this.nextBeatTimeSeconds = audioContext.currentTime + 0.06;
    this.tick();
    this.timerId = window.setInterval(() => this.tick(), this.lookaheadMs);
  }

  stop() {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }

    const audioContext = this.audioContext;
    this.audioContext = null;
    this.nextBeatIndex = 0;
    this.countInBeatCount = 0;
    this.nextBeatTimeSeconds = 0;

    if (audioContext) {
      void audioContext.close().catch(() => undefined);
    }
  }

  private tick() {
    const audioContext = this.audioContext;

    if (!audioContext) {
      return;
    }

    while (
      this.nextBeatTimeSeconds <
      audioContext.currentTime + this.scheduleAheadSeconds
    ) {
      const phase =
        this.nextBeatIndex < this.countInBeatCount ? "count-in" : "practice";
      const phaseBeatIndex =
        phase === "count-in"
          ? this.nextBeatIndex
          : this.nextBeatIndex - this.countInBeatCount;
      const beat = createMetronomeBeatMetadata(
        this.config,
        phaseBeatIndex,
        this.nextBeatTimeSeconds,
        phase,
      );
      this.scheduleClick(audioContext, beat);
      this.onBeat?.(beat);
      this.nextBeatIndex += 1;
      this.nextBeatTimeSeconds += getBeatDurationSeconds(this.config.bpm);
    }
  }

  private getCountInBeatCount() {
    const safeConfig = sanitizeMetronomeConfig(this.config);
    const countIn = safeConfig.countIn;

    if (!countIn?.enabled || !countIn.bars || countIn.bars <= 0) {
      return 0;
    }

    return countIn.bars * getBeatsPerBar(safeConfig.meter);
  }

  private scheduleClick(
    audioContext: AudioContext,
    beat: MetronomeBeatMetadata,
  ) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const durationSeconds = beat.isStrongBeat ? 0.055 : 0.04;
    const peakGain = beat.isStrongBeat ? 0.28 : 0.16;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(
      beat.isStrongBeat ? 1320 : 880,
      beat.scheduledTimeSeconds,
    );
    gain.gain.setValueAtTime(0.0001, beat.scheduledTimeSeconds);
    gain.gain.exponentialRampToValueAtTime(
      peakGain,
      beat.scheduledTimeSeconds + 0.004,
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      beat.scheduledTimeSeconds + durationSeconds,
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(beat.scheduledTimeSeconds);
    oscillator.stop(beat.scheduledTimeSeconds + durationSeconds + 0.01);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
}
