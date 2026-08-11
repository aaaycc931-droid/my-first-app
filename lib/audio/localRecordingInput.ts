export type LocalRecordingInputPort = {
  isSupported: () => boolean;
  request: () => Promise<MediaStream>;
};

export type LocalRecordingPreviewPort = {
  createUrl: (recording: Blob) => string;
  revokeUrl: (url: string) => void;
};

export const createBrowserLocalRecordingInputPort = ({
  getUserMedia = (constraints: MediaStreamConstraints) =>
    navigator.mediaDevices.getUserMedia(constraints),
}: {
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
} = {}): LocalRecordingInputPort => ({
  isSupported: () => Boolean(navigator.mediaDevices?.getUserMedia),
  request: () => getUserMedia({ audio: true }),
});

export const browserLocalRecordingInputPort =
  createBrowserLocalRecordingInputPort();

export const browserLocalRecordingPreviewPort: LocalRecordingPreviewPort = {
  createUrl: (recording) => URL.createObjectURL(recording),
  revokeUrl: (url) => URL.revokeObjectURL(url),
};
