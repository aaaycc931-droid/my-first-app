export const LOCAL_VOCAL_EXERCISE_MANIFEST_VERSION = "v1" as const;

export type LocalVocalExercisePatternId = "single" | "interval" | "major-scale" | "five-note" | "arpeggio";
export type LocalVocalExerciseDirection = "ascending" | "descending";
export type LocalVocalExerciseReferenceMode = "full" | "root-only";

export type LocalVocalExerciseConfig = {
  patternId: LocalVocalExercisePatternId;
  rootMidi: number;
  direction: LocalVocalExerciseDirection;
  bpm: number;
  octaveShift: -1 | 0 | 1;
  loops: number;
  referenceMode: LocalVocalExerciseReferenceMode;
  intervalSemitones: number;
};

export type LocalVocalExerciseEvent = {
  index: number;
  loop: number;
  midi: number;
  frequencyHz: number;
  startSeconds: number;
  durationSeconds: number;
};

export const localVocalExerciseManifest: ReadonlyArray<{
  id: LocalVocalExercisePatternId;
  title: string;
  description: string;
  intervals: readonly number[] | "configured-interval";
}> = [
  { id: "single", title: "单音长音", description: "保持一个稳定音，观察音准与连续性。", intervals: [0] },
  { id: "interval", title: "音程模唱", description: "从根音唱向指定音程，再回到根音。", intervals: "configured-interval" },
  { id: "major-scale", title: "大调音阶", description: "完整八度大调音阶往返。", intervals: [0, 2, 4, 5, 7, 9, 11, 12, 11, 9, 7, 5, 4, 2, 0] },
  { id: "five-note", title: "五声音型", description: "1-2-3-4-5-4-3-2-1 基础练声。", intervals: [0, 2, 4, 5, 7, 5, 4, 2, 0] },
  { id: "arpeggio", title: "主和弦音型", description: "1-3-5-3-1 跳进练声。", intervals: [0, 4, 7, 4, 0] },
] as const;

export const DEFAULT_LOCAL_VOCAL_EXERCISE_CONFIG: LocalVocalExerciseConfig = {
  patternId: "five-note",
  rootMidi: 60,
  direction: "ascending",
  bpm: 90,
  octaveShift: 0,
  loops: 2,
  referenceMode: "full",
  intervalSemitones: 7,
};

const midiToFrequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export const getLocalVocalExerciseIntervals = (config: LocalVocalExerciseConfig): number[] => {
  const pattern = localVocalExerciseManifest.find((candidate) => candidate.id === config.patternId);
  if (!pattern) throw new Error("未知练声音型");
  const intervals = pattern.intervals === "configured-interval"
    ? [0, config.intervalSemitones, 0]
    : [...pattern.intervals];
  return config.direction === "descending" ? intervals.map((interval) => -interval) : intervals;
};

export const generateLocalVocalExercise = (config: LocalVocalExerciseConfig) => {
  if (!Number.isInteger(config.rootMidi) || config.rootMidi < 48 || config.rootMidi > 72) throw new Error("根音超出 C3–C5 范围");
  if (!Number.isFinite(config.bpm) || config.bpm < 30 || config.bpm > 180) throw new Error("速度超出 30–180 BPM 范围");
  if (!Number.isInteger(config.loops) || config.loops < 1 || config.loops > 8) throw new Error("循环组数超出 1–8 范围");
  if (![-1, 0, 1].includes(config.octaveShift)) throw new Error("八度偏移无效");
  if (!Number.isInteger(config.intervalSemitones) || config.intervalSemitones < 1 || config.intervalSemitones > 12) throw new Error("音程超出 1–12 半音范围");
  const intervals = getLocalVocalExerciseIntervals(config);
  const beatSeconds = 60 / config.bpm;
  const eventStrideSeconds = config.patternId === "single" ? beatSeconds * 3.25 : beatSeconds;
  const baseMidi = config.rootMidi + config.octaveShift * 12;
  const events: LocalVocalExerciseEvent[] = [];
  for (let loop = 0; loop < config.loops; loop += 1) {
    intervals.forEach((interval, index) => {
      const midi = baseMidi + interval;
      if (midi < 36 || midi > 96) throw new Error("生成音高超出安全播放范围");
      events.push({
        index: events.length,
        loop,
        midi,
        frequencyHz: midiToFrequency(midi),
        startSeconds: (loop * intervals.length + index) * eventStrideSeconds,
        durationSeconds: config.patternId === "single" ? beatSeconds * 3 : beatSeconds * 0.82,
      });
    });
  }
  const playbackEvents = config.referenceMode === "root-only"
    ? events.filter((event) => event.index === 0)
    : events;
  return {
    manifestVersion: LOCAL_VOCAL_EXERCISE_MANIFEST_VERSION,
    config: { ...config },
    events,
    playbackEvents,
    durationSeconds: events.at(-1) ? events.at(-1)!.startSeconds + events.at(-1)!.durationSeconds : 0,
  };
};

export type GeneratedLocalVocalExercise = ReturnType<typeof generateLocalVocalExercise>;
