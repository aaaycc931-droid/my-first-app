export type RecognitionFilePreviewPort = Readonly<{
  createPreviewUrl: (file: File) => string;
  revokePreviewUrl: (url: string) => void;
}>;

export type RecognitionFilePreviewRuntime = Readonly<{
  createObjectUrl: (file: File) => string;
  revokeObjectUrl: (url: string) => void;
}>;

export const createBrowserRecognitionFilePreviewPort = (
  runtime: RecognitionFilePreviewRuntime = {
    createObjectUrl: (file) => URL.createObjectURL(file),
    revokeObjectUrl: (url) => URL.revokeObjectURL(url),
  },
): RecognitionFilePreviewPort => ({
  createPreviewUrl: (file) => runtime.createObjectUrl(file),
  revokePreviewUrl: (url) => runtime.revokeObjectUrl(url),
});

export const browserRecognitionFilePreviewPort =
  createBrowserRecognitionFilePreviewPort();
