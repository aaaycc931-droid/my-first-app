import type { MetronomeConfig } from "./metronomeConfig";
import { BrowserMetronomeScheduler } from "./metronomeScheduler";

export type PracticeRhythmRuntimeTimer = number;

export type PracticeRhythmRuntimeScheduler = {
  start: () => Promise<boolean>;
  stop: () => void;
};

export type PracticeRhythmRuntimePort = {
  now: () => number;
  createScheduler: (config: MetronomeConfig) => PracticeRhythmRuntimeScheduler;
  setTimeout: (callback: () => void, delayMs: number) => PracticeRhythmRuntimeTimer;
  clearTimeout: (timer: PracticeRhythmRuntimeTimer) => void;
  setInterval: (callback: () => void, delayMs: number) => PracticeRhythmRuntimeTimer;
  clearInterval: (timer: PracticeRhythmRuntimeTimer) => void;
};

export const createBrowserPracticeRhythmRuntimePort = (): PracticeRhythmRuntimePort => ({
  now: () => performance.now(),
  createScheduler: (config) => new BrowserMetronomeScheduler({ config }),
  setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
  clearTimeout: (timer) => window.clearTimeout(timer),
  setInterval: (callback, delayMs) => window.setInterval(callback, delayMs),
  clearInterval: (timer) => window.clearInterval(timer),
});

export const browserPracticeRhythmRuntimePort =
  createBrowserPracticeRhythmRuntimePort();
