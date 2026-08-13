import { createBrowserAudioChannel } from "./browserAudioEngine";

export type NotationReferencePlaybackTone = {
  frequencyHz: number;
  startTimeSeconds: number;
  endTimeSeconds: number;
  peakGain: number;
  attackSeconds: number;
  releaseTimeSeconds: number;
};

export type PreparedNotationReferencePlayback = {
  currentTimeSeconds: number;
  scheduleTone: (tone: NotationReferencePlaybackTone) => void;
};

export type NotationReferencePlaybackTimer = unknown;

export type NotationReferencePlaybackPort = {
  prepare: () => Promise<PreparedNotationReferencePlayback>;
  stop: () => void;
  dispose: () => void;
  setTimer: (
    callback: () => void,
    delayMs: number,
  ) => NotationReferencePlaybackTimer;
  clearTimer: (timer: NotationReferencePlaybackTimer) => void;
};

export const createBrowserNotationReferencePlaybackPort = ({
  createChannel = createBrowserAudioChannel,
  setTimer = (callback: () => void, delayMs: number) =>
    globalThis.setTimeout(callback, delayMs),
  clearTimer = (timer: NotationReferencePlaybackTimer) =>
    globalThis.clearTimeout(
      timer as ReturnType<typeof globalThis.setTimeout>,
    ),
}: {
  createChannel?: typeof createBrowserAudioChannel;
  setTimer?: (
    callback: () => void,
    delayMs: number,
  ) => NotationReferencePlaybackTimer;
  clearTimer?: (timer: NotationReferencePlaybackTimer) => void;
} = {}): NotationReferencePlaybackPort => {
  const channel = createChannel();

  return {
    prepare: async () => {
      const context = await channel.prepareForUserGesture();
      return {
        currentTimeSeconds: context.currentTime,
        scheduleTone: ({
          frequencyHz,
          startTimeSeconds,
          endTimeSeconds,
          peakGain,
          attackSeconds,
          releaseTimeSeconds,
        }) => {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(frequencyHz, startTimeSeconds);
          gain.gain.setValueAtTime(0.0001, startTimeSeconds);
          gain.gain.exponentialRampToValueAtTime(
            peakGain,
            startTimeSeconds + attackSeconds,
          );
          gain.gain.exponentialRampToValueAtTime(
            0.0001,
            releaseTimeSeconds,
          );
          oscillator.connect(gain);
          gain.connect(context.destination);
          channel.trackSource(oscillator, [gain]);
          oscillator.start(startTimeSeconds);
          oscillator.stop(endTimeSeconds);
        },
      };
    },
    stop: () => channel.stop(),
    dispose: () => channel.stop(),
    setTimer,
    clearTimer,
  };
};
