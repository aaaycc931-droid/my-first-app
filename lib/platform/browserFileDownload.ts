export type BrowserFileDownloadRequest = Readonly<{
  data: string | Uint8Array;
  fileName: string;
  mimeType: string;
  onCleanupError?: (error: Error) => void;
}>;

export type BrowserFileDownloadPort = Readonly<{
  download: (request: BrowserFileDownloadRequest) => void;
}>;

type BrowserFileDownloadRuntime = Readonly<{
  scheduleCleanup: (cleanup: () => void) => void;
}>;

const toError = (error: unknown) => error instanceof Error
  ? error
  : new Error("无法回收导出下载 URL。");

const toBlobPart = (data: string | Uint8Array): BlobPart => {
  if (typeof data === "string") return data;
  return data.slice().buffer;
};

export const createBrowserFileDownloadPort = (
  runtime: BrowserFileDownloadRuntime = {
    scheduleCleanup: (cleanup) => {
      window.setTimeout(cleanup, 0);
    },
  },
): BrowserFileDownloadPort => ({
  download: (request) => {
    let objectUrl: string | null = null;
    try {
      const blob = new Blob(
        [toBlobPart(request.data)],
        { type: request.mimeType },
      );
      objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = request.fileName;
      anchor.hidden = true;
      document.body.append(anchor);
      try {
        // Keep this call synchronous so browsers retain the user activation.
        anchor.click();
      } finally {
        anchor.remove();
      }
    } finally {
      if (objectUrl) {
        const urlToRevoke = objectUrl;
        let cleaned = false;
        const cleanup = () => {
          if (cleaned) return;
          cleaned = true;
          try {
            URL.revokeObjectURL(urlToRevoke);
          } catch (error) {
            request.onCleanupError?.(toError(error));
          }
        };
        try {
          runtime.scheduleCleanup(cleanup);
        } catch (error) {
          cleanup();
          throw error;
        }
      }
    }
  },
});

export const browserFileDownloadPort = createBrowserFileDownloadPort();
