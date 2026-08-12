import { createBrowserAudioChannel } from "./browserAudioEngine";

export type RecognitionPlaybackTone = {
  frequencyHz: number;
  startTimeSeconds: number;
  durationSeconds: number;
};

export type PreparedRecognitionNotesPlayback = {
  currentTimeSeconds: number;
  scheduleTone: (tone: RecognitionPlaybackTone) => void;
};

export type RecognitionNotesPlaybackTimer = unknown;

export type RecognitionNotesPlaybackPort = {
  prepare: () => PreparedRecognitionNotesPlayback;
  stop: () => void;
  dispose: () => void;
  setTimer: (
    callback: () => void,
    delayMs: number,
  ) => RecognitionNotesPlaybackTimer;
  clearTimer: (timer: RecognitionNotesPlaybackTimer) => void;
};

export const createBrowserRecognitionNotesPlaybackPort = ({
  createChannel = createBrowserAudioChannel,
  setTimer = (callback: () => void, delayMs: number) =>
    globalThis.setTimeout(callback, delayMs),
  clearTimer = (timer: RecognitionNotesPlaybackTimer) =>
    globalThis.clearTimeout(
      timer as ReturnType<typeof globalThis.setTimeout>,
    ),
}: {
  createChannel?: typeof createBrowserAudioChannel;
  setTimer?: (
    callback: () => void,
    delayMs: number,
  ) => RecognitionNotesPlaybackTimer;
  clearTimer?: (timer: RecognitionNotesPlaybackTimer) => void;
} = {}): RecognitionNotesPlaybackPort => {
  const channel = createChannel();

  return {
    prepare: () => {
      const context = channel.getContext();
      return {
        currentTimeSeconds: context.currentTime,
        scheduleTone: ({
          frequencyHz,
          startTimeSeconds,
          durationSeconds,
        }) => {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = "sine";
          oscillator.frequency.value = frequencyHz;
          gain.gain.setValueAtTime(0.0001, startTimeSeconds);
          gain.gain.exponentialRampToValueAtTime(
            0.16,
            startTimeSeconds + 0.015,
          );
          gain.gain.exponentialRampToValueAtTime(
            0.0001,
            startTimeSeconds + Math.max(0.03, durationSeconds - 0.02),
          );
          oscillator.connect(gain);
          gain.connect(context.destination);
          channel.trackSource(oscillator, [gain]);
          oscillator.start(startTimeSeconds);
          oscillator.stop(startTimeSeconds + durationSeconds);
        },
      };
    },
    stop: () => channel.stop(),
    dispose: () => channel.stop(),
    setTimer,
    clearTimer,
  };
};

