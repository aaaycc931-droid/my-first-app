import { createBrowserAudioChannel } from "./browserAudioEngine";

export type PracticeTargetTone = {
  frequencyHz: number;
  startTimeSeconds: number;
  durationSeconds: number;
  stopAfterSeconds?: number;
};

export type PreparedPracticeTargetPlayback = {
  currentTimeSeconds: number;
  scheduleTone: (tone: PracticeTargetTone) => void;
};

export type PracticeTargetPlaybackTimer = unknown;

export type PracticeTargetPlaybackPort = {
  prepare: () => Promise<PreparedPracticeTargetPlayback>;
  stop: () => void;
  dispose: () => void;
  setTimer: (
    callback: () => void,
    delayMs: number,
  ) => PracticeTargetPlaybackTimer;
  clearTimer: (timer: PracticeTargetPlaybackTimer) => void;
};

export const createBrowserPracticeTargetPlaybackPort = ({
  createChannel = createBrowserAudioChannel,
  setTimer = (callback: () => void, delayMs: number) =>
    globalThis.setTimeout(callback, delayMs),
  clearTimer = (timer: PracticeTargetPlaybackTimer) =>
    globalThis.clearTimeout(
      timer as ReturnType<typeof globalThis.setTimeout>,
    ),
}: {
  createChannel?: typeof createBrowserAudioChannel;
  setTimer?: (
    callback: () => void,
    delayMs: number,
  ) => PracticeTargetPlaybackTimer;
  clearTimer?: (timer: PracticeTargetPlaybackTimer) => void;
} = {}): PracticeTargetPlaybackPort => {
  const channel = createChannel();

  return {
    prepare: async () => {
      const context = await channel.prepareForUserGesture();
      return {
        currentTimeSeconds: context.currentTime,
        scheduleTone: ({
          frequencyHz,
          startTimeSeconds,
          durationSeconds,
          stopAfterSeconds,
        }) => {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          const safeDurationSeconds = Math.max(0.05, durationSeconds);

          oscillator.type = "sine";
          oscillator.frequency.value = frequencyHz;
          gain.gain.setValueAtTime(0.0001, startTimeSeconds);
          gain.gain.exponentialRampToValueAtTime(
            0.18,
            startTimeSeconds + 0.02,
          );
          gain.gain.exponentialRampToValueAtTime(
            0.0001,
            startTimeSeconds + safeDurationSeconds * 0.9,
          );

          oscillator.connect(gain);
          gain.connect(context.destination);
          channel.trackSource(oscillator, [gain]);
          oscillator.start(startTimeSeconds);
          oscillator.stop(
            startTimeSeconds +
              Math.max(0.05, stopAfterSeconds ?? safeDurationSeconds),
          );
        },
      };
    },
    stop: () => channel.stop(),
    dispose: () => channel.stop(),
    setTimer,
    clearTimer,
  };
};

export const browserPracticeTargetPlaybackPort =
  createBrowserPracticeTargetPlaybackPort();
