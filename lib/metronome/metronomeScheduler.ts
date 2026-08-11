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
  private pendingStart: Promise<boolean> | null = null;
  private startGeneration = 0;
  private running = false;
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
    return this.running;
  }

  updateConfig(config: MetronomeConfig) {
    this.config = sanitizeMetronomeConfig(config);
  }

  start(): Promise<boolean> {
    if (this.pendingStart) {
      return this.pendingStart;
    }

    if (this.running && this.audioContext) {
      return Promise.resolve(true);
    }

    const AudioContextConstructor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextConstructor) {
      return Promise.reject(
        new Error("Web Audio is not available in this browser."),
      );
    }

    let audioContext: RuntimeAudioContext;

    try {
      audioContext = new AudioContextConstructor() as RuntimeAudioContext;
    } catch (error) {
      return Promise.reject(error);
    }

    const generation = ++this.startGeneration;
    this.audioContext = audioContext;
    const pendingStart: Promise<boolean> = Promise.resolve()
      .then(async () => {
        try {
          if (audioContext.state === "suspended") {
            await audioContext.resume();
          }

          if (!this.ownsAudioContext(audioContext, generation)) {
            return false;
          }

          this.nextBeatIndex = 0;
          this.countInBeatCount = this.getCountInBeatCount();
          this.nextBeatTimeSeconds = audioContext.currentTime + 0.06;
          this.running = true;
          this.tick(audioContext, generation);

          if (!this.ownsAudioContext(audioContext, generation)) {
            return false;
          }

          this.timerId = window.setInterval(
            () => this.tick(audioContext, generation),
            this.lookaheadMs,
          );
          return true;
        } catch (error) {
          if (!this.ownsAudioContext(audioContext, generation)) {
            return false;
          }

          this.releaseOwnedAudioContext(audioContext);
          throw error;
        }
      })
      .finally(() => {
        if (this.pendingStart === pendingStart) {
          this.pendingStart = null;
        }
      });

    this.pendingStart = pendingStart;
    return pendingStart;
  }

  stop() {
    this.startGeneration += 1;
    this.pendingStart = null;

    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }

    const audioContext = this.audioContext;
    this.audioContext = null;
    this.running = false;
    this.nextBeatIndex = 0;
    this.countInBeatCount = 0;
    this.nextBeatTimeSeconds = 0;

    if (audioContext) {
      void audioContext.close().catch(() => undefined);
    }
  }

  private ownsAudioContext(audioContext: AudioContext, generation: number) {
    return (
      this.audioContext === audioContext && this.startGeneration === generation
    );
  }

  private releaseOwnedAudioContext(audioContext: AudioContext) {
    if (this.audioContext !== audioContext) {
      return;
    }

    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }

    this.startGeneration += 1;
    this.audioContext = null;
    this.running = false;
    this.nextBeatIndex = 0;
    this.countInBeatCount = 0;
    this.nextBeatTimeSeconds = 0;
    void audioContext.close().catch(() => undefined);
  }

  private tick(audioContext: AudioContext, generation: number) {
    if (!this.ownsAudioContext(audioContext, generation)) {
      return;
    }

    while (
      this.ownsAudioContext(audioContext, generation) &&
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

      if (!this.ownsAudioContext(audioContext, generation)) {
        return;
      }

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
