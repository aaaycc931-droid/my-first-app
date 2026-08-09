export type RealtimePitchInputInterruption = "track-ended" | "context-interrupted";

export type RealtimePitchInputHandle = {
  stream: MediaStream;
  prepare: () => Promise<void>;
  start: (onSamples: (samples: Float32Array, sampleRate: number) => void) => void;
  dispose: () => void;
};

export type RealtimePitchInputPort = {
  isSupported: () => boolean;
  request: (request: {
    onInterrupted: (kind: RealtimePitchInputInterruption) => void;
  }) => Promise<RealtimePitchInputHandle>;
};

export const createBrowserRealtimePitchInputPort = ({
  getUserMedia = (constraints: MediaStreamConstraints) => navigator.mediaDevices.getUserMedia(constraints),
  createContext = () => new AudioContext({ latencyHint: "interactive" }),
  setTimer = (callback: () => void, delayMs: number) => window.setTimeout(callback, delayMs),
  clearTimer = (timer: number) => window.clearTimeout(timer),
}: {
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  createContext?: () => AudioContext;
  setTimer?: (callback: () => void, delayMs: number) => number;
  clearTimer?: (timer: number) => void;
} = {}): RealtimePitchInputPort => ({
  isSupported: () => Boolean(navigator.mediaDevices?.getUserMedia)
    && typeof AudioContext !== "undefined",
  request: async (request) => {
    const stream = await getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    let context: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;
    let timer: number | null = null;
    let disposed = false;
    let preparation: Promise<void> | null = null;
    let started = false;

    const dispose = () => {
      if (disposed) return;
      disposed = true;
      if (timer !== null) {
        try { clearTimer(timer); } catch { /* continue cleanup */ }
      }
      timer = null;
      try { source?.disconnect(); } catch { /* continue cleanup */ }
      source = null;
      analyser = null;
      stream.getTracks().forEach((track) => {
        try { track.stop(); } catch { /* continue cleanup */ }
      });
      const ownedContext = context;
      context = null;
      if (ownedContext && ownedContext.state !== "closed") {
        try {
          void ownedContext.close().catch(() => undefined);
        } catch { /* continue cleanup */ }
      }
    };

    stream.getTracks().forEach((track) => track.addEventListener?.("ended", () => {
      if (!disposed) request.onInterrupted("track-ended");
    }, { once: true }));

    return {
      stream,
      prepare: () => {
        if (disposed) return Promise.reject(new Error("Realtime pitch input is disposed"));
        if (preparation) return preparation;
        preparation = (async () => {
          try {
            context = createContext();
            source = context.createMediaStreamSource(stream);
            analyser = context.createAnalyser();
            analyser.fftSize = 4096;
            analyser.smoothingTimeConstant = 0;
            source.connect(analyser);
            await context.resume();
            context.addEventListener?.("statechange", () => {
              if (!disposed && context?.state !== "running") {
                request.onInterrupted("context-interrupted");
              }
            });
          } catch (error) {
            dispose();
            throw error;
          }
        })();
        return preparation;
      },
      start: (onSamples) => {
        if (disposed || !context || !analyser) throw new Error("Realtime pitch input is not prepared");
        if (started) return;
        started = true;
        const samples = new Float32Array(analyser.fftSize);
        const analyze = () => {
          if (disposed || !context || !analyser) return;
          analyser.getFloatTimeDomainData(samples);
          onSamples(samples, context.sampleRate);
          if (disposed || !context || !analyser) return;
          timer = setTimer(analyze, 50);
        };
        analyze();
      },
      dispose,
    };
  },
});

export const browserRealtimePitchInputPort = createBrowserRealtimePitchInputPort();
