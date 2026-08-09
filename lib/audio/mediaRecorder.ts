export const PREFERRED_MEDIA_RECORDER_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
] as const;

export type MediaRecorderCaptureHandle = {
  getState: () => "inactive" | "recording";
  start: () => void;
  stop: () => void;
  dispose: () => void;
};

export type MediaRecorderCapturePort = {
  isSupported: () => boolean;
  create: (request: {
    stream: MediaStream;
    timesliceMs: number;
    onStopped: (recording: Blob | null) => void;
    onError: () => void;
  }) => MediaRecorderCaptureHandle;
};

type MediaRecorderLike = Pick<
  MediaRecorder,
  "mimeType" | "state" | "start" | "stop" | "ondataavailable" | "onstop" | "onerror"
>;

type MediaRecorderConstructorLike = {
  new (stream: MediaStream, options?: MediaRecorderOptions): MediaRecorderLike;
  isTypeSupported?: (mimeType: string) => boolean;
};

export const createBrowserMediaRecorderCapturePort = ({
  getConstructor = () => globalThis.MediaRecorder,
}: {
  getConstructor?: () => MediaRecorderConstructorLike | undefined;
} = {}): MediaRecorderCapturePort => ({
  isSupported: () => typeof getConstructor() !== "undefined",
  create: (request) => {
    const Recorder = getConstructor();
    if (!Recorder) throw new Error("MediaRecorder is unavailable");

    const supportedMimeType = PREFERRED_MEDIA_RECORDER_MIME_TYPES.find(
      (mimeType) => typeof Recorder.isTypeSupported !== "function"
        || Recorder.isTypeSupported(mimeType),
    );
    const recorder = supportedMimeType
      ? new Recorder(request.stream, { mimeType: supportedMimeType })
      : new Recorder(request.stream);
    let chunks: Blob[] = [];
    let disposed = false;
    let completed = false;

    const detach = () => {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
    };

    recorder.ondataavailable = (event) => {
      if (!disposed && !completed && event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => {
      if (!disposed && !completed) request.onError();
    };
    recorder.onstop = () => {
      if (disposed || completed) return;
      completed = true;
      const ownedChunks = chunks;
      chunks = [];
      detach();
      request.onStopped(ownedChunks.length === 0
        ? null
        : new Blob(ownedChunks, { type: recorder.mimeType || "audio/webm" }));
    };

    return {
      getState: () => !disposed && !completed && recorder.state === "recording"
        ? "recording"
        : "inactive",
      start: () => {
        if (disposed || completed) return;
        try {
          recorder.start(request.timesliceMs);
        } catch (error) {
          completed = true;
          chunks = [];
          detach();
          throw error;
        }
      },
      stop: () => {
        if (disposed || completed || recorder.state !== "recording") return;
        try {
          recorder.stop();
        } catch {
          completed = true;
          chunks = [];
          detach();
          request.onError();
        }
      },
      dispose: () => {
        if (disposed) return;
        disposed = true;
        chunks = [];
        detach();
        if (recorder.state === "recording") {
          try { recorder.stop(); } catch { /* cleanup remains terminal */ }
        }
      },
    };
  },
});

export const browserMediaRecorderCapturePort = createBrowserMediaRecorderCapturePort();
