import type {
  LocalMelodyGuideDecodeFile,
  LocalMelodyGuideDecodedAudio,
  LocalMelodyGuideDecodePort,
} from "../audio/localMelodyGuideDecode";
import {
  applyLocalMelodyGuideDecodedMetadata,
  createLocalMelodyGuideFileSummary,
  markLocalMelodyGuideDecodeError,
  type LocalMelodyGuideAudioSource,
} from "./localMelodyGuideAudio";

export type LocalMelodyGuideDecodeSnapshot = {
  source: LocalMelodyGuideAudioSource | null;
  decodedAudio: LocalMelodyGuideDecodedAudio | null;
  error: string;
};

export type LocalMelodyGuideDecodeController = {
  getSnapshot: () => LocalMelodyGuideDecodeSnapshot;
  subscribe: (listener: () => void) => () => void;
  attach: () => void;
  detach: () => void;
  select: (file: LocalMelodyGuideDecodeFile | null) => Promise<boolean>;
  clear: () => void;
};

const emptySnapshot = (): LocalMelodyGuideDecodeSnapshot => ({
  source: null,
  decodedAudio: null,
  error: "",
});

export const localMelodyGuideDecodeError =
  "此浏览器无法解码所选的本地旋律参考音频。请尝试此浏览器支持的其他 WAV、MP3 或 M4A 文件。";

export const createLocalMelodyGuideDecodeController = ({
  port,
}: {
  port: LocalMelodyGuideDecodePort;
}): LocalMelodyGuideDecodeController => {
  let snapshot = emptySnapshot();
  let attached = true;
  let generation = 0;
  const listeners = new Set<() => void>();

  const publish = (nextSnapshot: LocalMelodyGuideDecodeSnapshot) => {
    if (!attached) return;
    snapshot = nextSnapshot;
    listeners.forEach((listener) => listener());
  };

  const clear = () => {
    generation += 1;
    publish(emptySnapshot());
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    attach: () => {
      attached = true;
    },
    detach: () => {
      if (!attached) return;
      attached = false;
      generation += 1;
      listeners.clear();
      snapshot = emptySnapshot();
    },
    clear,
    select: async (file) => {
      if (!attached) return false;
      const runGeneration = ++generation;
      if (!file) {
        publish(emptySnapshot());
        return false;
      }
      const selectedSummary = createLocalMelodyGuideFileSummary(
        file,
        `local-melody-guide-${runGeneration}`,
      );
      publish({
        source: { ...selectedSummary, status: "decoding" },
        decodedAudio: null,
        error: "",
      });
      try {
        const decodedAudio = await port.decode(file);
        if (!attached || generation !== runGeneration) return false;
        publish({
          source: applyLocalMelodyGuideDecodedMetadata(selectedSummary, {
            decodedDurationSeconds: decodedAudio.durationSeconds,
            sampleRate: decodedAudio.sampleRate,
            channelCount: decodedAudio.channelCount,
          }),
          decodedAudio,
          error: "",
        });
        return true;
      } catch {
        if (!attached || generation !== runGeneration) return false;
        publish({
          source: markLocalMelodyGuideDecodeError(selectedSummary),
          decodedAudio: null,
          error: localMelodyGuideDecodeError,
        });
        return false;
      }
    },
  };
};
