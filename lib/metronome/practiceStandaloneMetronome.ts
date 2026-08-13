import {
  BrowserMetronomeScheduler,
  type MetronomeSchedulerOptions,
} from "./metronomeScheduler";

export type PracticeStandaloneMetronomeScheduler = {
  start: () => Promise<boolean>;
  stop: () => void;
};

export type PracticeStandaloneMetronomePort = {
  createScheduler: (
    options: MetronomeSchedulerOptions,
  ) => PracticeStandaloneMetronomeScheduler;
};

export const browserPracticeStandaloneMetronomePort:
  PracticeStandaloneMetronomePort = {
    createScheduler: (options) => new BrowserMetronomeScheduler(options),
  };
