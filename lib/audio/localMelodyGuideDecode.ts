import type { LocalMelodyGuideFileLike } from "../practice/localMelodyGuideAudio";

export type LocalMelodyGuideDecodeFile = LocalMelodyGuideFileLike & {
  arrayBuffer: () => Promise<ArrayBuffer>;
};

export type LocalMelodyGuideDecodedAudio = {
  channelData: Float32Array;
  sampleRate: number;
  durationSeconds: number;
  channelCount: number;
  analysisReady: true;
};

export type LocalMelodyGuideDecodePort = {
  decode: (
    file: LocalMelodyGuideDecodeFile,
  ) => Promise<LocalMelodyGuideDecodedAudio>;
};

type AudioContextConstructor = new () => AudioContext;

export const createBrowserLocalMelodyGuideDecodePort = ({
  createAudioContext = () => {
    const AudioContextClass = window.AudioContext as AudioContextConstructor;
    return new AudioContextClass();
  },
}: {
  createAudioContext?: () => AudioContext;
} = {}): LocalMelodyGuideDecodePort => ({
  decode: async (file) => {
    const audioContext = createAudioContext();
    try {
      const audioData = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(audioData);
      if (audioBuffer.numberOfChannels < 1) {
        throw new Error("Decoded audio has no usable channels.");
      }
      return {
        channelData: new Float32Array(audioBuffer.getChannelData(0)),
        sampleRate: audioBuffer.sampleRate,
        durationSeconds: audioBuffer.duration,
        channelCount: audioBuffer.numberOfChannels,
        analysisReady: true,
      };
    } finally {
      try {
        void Promise.resolve(audioContext.close()).catch(() => undefined);
      } catch {
        // Cleanup cannot replace a successful decode or its original failure.
      }
    }
  },
});

export const browserLocalMelodyGuideDecodePort =
  createBrowserLocalMelodyGuideDecodePort();
