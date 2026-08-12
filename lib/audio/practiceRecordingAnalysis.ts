export type PracticeRecordingDecodedAudio = {
  durationSeconds: number;
  sampleRate: number;
  channels: Float32Array[];
};

export type PracticeRecordingAnalysisPort = {
  decode: (recording: Blob) => Promise<PracticeRecordingDecodedAudio>;
};

type AudioContextConstructor = new () => AudioContext;

export const createBrowserPracticeRecordingAnalysisPort = ({
  createAudioContext = () => {
    const AudioContextClass = window.AudioContext as AudioContextConstructor;
    return new AudioContextClass();
  },
}: {
  createAudioContext?: () => AudioContext;
} = {}): PracticeRecordingAnalysisPort => ({
  decode: async (recording) => {
    const audioContext = createAudioContext();
    try {
      const audioData = await recording.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(audioData);
      const channels: Float32Array[] = [];
      for (
        let channelIndex = 0;
        channelIndex < audioBuffer.numberOfChannels;
        channelIndex += 1
      ) {
        channels.push(new Float32Array(audioBuffer.getChannelData(channelIndex)));
      }
      return {
        durationSeconds: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        channels,
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

export const browserPracticeRecordingAnalysisPort =
  createBrowserPracticeRecordingAnalysisPort();
