import { createBrowserAudioChannel } from "./browserAudioEngine";

export type LocalVocalReferencePlaybackTone = {
  frequencyHz: number;
  startSeconds: number;
  durationSeconds: number;
};

export type PreparedLocalVocalReferencePlayback = {
  scheduleTone: (tone: LocalVocalReferencePlaybackTone) => void;
};

export type LocalVocalReferencePlaybackTimer = unknown;

export type LocalVocalReferencePlaybackPort = {
  prepare: () => Promise<PreparedLocalVocalReferencePlayback>;
  stop: () => void;
  dispose: () => void;
  setTimer: (
    callback: () => void,
    delayMs: number,
  ) => LocalVocalReferencePlaybackTimer;
  clearTimer: (timer: LocalVocalReferencePlaybackTimer) => void;
};

export const createBrowserLocalVocalReferencePlaybackPort = ({
  createChannel = createBrowserAudioChannel,
  setTimer = (callback: () => void, delayMs: number) =>
    globalThis.setTimeout(callback, delayMs),
  clearTimer = (timer: LocalVocalReferencePlaybackTimer) =>
    globalThis.clearTimeout(
      timer as ReturnType<typeof globalThis.setTimeout>,
    ),
}: {
  createChannel?: typeof createBrowserAudioChannel;
  setTimer?: (
    callback: () => void,
    delayMs: number,
  ) => LocalVocalReferencePlaybackTimer;
  clearTimer?: (timer: LocalVocalReferencePlaybackTimer) => void;
} = {}): LocalVocalReferencePlaybackPort => {
  const channel = createChannel();

  return {
    prepare: async () => {
      const context = await channel.prepareForUserGesture();
      const playbackStartSeconds = context.currentTime + 0.04;
      return {
        scheduleTone: ({
          frequencyHz,
          startSeconds,
          durationSeconds,
        }) => {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          const noteStart = playbackStartSeconds + startSeconds;
          const noteEnd = noteStart + durationSeconds;
          oscillator.type = "triangle";
          oscillator.frequency.value = frequencyHz;
          gain.gain.setValueAtTime(0.0001, noteStart);
          gain.gain.exponentialRampToValueAtTime(0.09, noteStart + 0.015);
          gain.gain.setValueAtTime(
            0.09,
            Math.max(noteStart + 0.016, noteEnd - 0.04),
          );
          gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
          oscillator.connect(gain);
          gain.connect(context.destination);
          channel.trackSource(oscillator, [gain]);
          oscillator.start(noteStart);
          oscillator.stop(noteEnd + 0.01);
        },
      };
    },
    stop: () => channel.stop(),
    dispose: () => channel.stop(),
    setTimer,
    clearTimer,
  };
};
