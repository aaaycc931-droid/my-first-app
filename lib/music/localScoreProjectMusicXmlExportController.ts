import type { LocalScoreProjectV1 } from "./localScoreProject";
import {
  confirmLocalScoreProjectMusicXmlExportDraft,
  createLocalScoreProjectMusicXmlExportDraft,
  type LocalScoreProjectMusicXmlExportDraft,
  type LocalScoreProjectMusicXmlExportFormat,
  type LocalScoreProjectMusicXmlExportPayload,
} from "./localScoreProjectMusicXmlExport";

export type LocalScoreProjectMusicXmlExportDownloadRequest =
  LocalScoreProjectMusicXmlExportPayload & Readonly<{
    onCleanupError?: (error: Error) => void;
  }>;

export type LocalScoreProjectMusicXmlExportDownloadPort = Readonly<{
  download: (request: LocalScoreProjectMusicXmlExportDownloadRequest) => void;
}>;

export type LocalScoreProjectMusicXmlExportSnapshot = Readonly<{
  format: LocalScoreProjectMusicXmlExportFormat;
  draft: LocalScoreProjectMusicXmlExportDraft | null;
}>;

export type LocalScoreProjectMusicXmlExportController = Readonly<{
  getSnapshot: () => LocalScoreProjectMusicXmlExportSnapshot;
  subscribe: (listener: () => void) => () => void;
  attach: () => void;
  detach: () => void;
  inspect: (project: LocalScoreProjectV1 | null) => boolean;
  changeFormat: (format: LocalScoreProjectMusicXmlExportFormat) => void;
  clear: () => void;
  invalidate: () => void;
  confirmAndDownload: (project: LocalScoreProjectV1 | null) => boolean;
}>;

type CreateDraft = typeof createLocalScoreProjectMusicXmlExportDraft;
type ConfirmDraft = typeof confirmLocalScoreProjectMusicXmlExportDraft;

const initialSnapshot = (): LocalScoreProjectMusicXmlExportSnapshot => ({
  format: "musicxml",
  draft: null,
});

export const createLocalScoreProjectMusicXmlExportController = ({
  downloadPort,
  publishNotice,
  createDraft = createLocalScoreProjectMusicXmlExportDraft,
  confirmDraft = confirmLocalScoreProjectMusicXmlExportDraft,
}: {
  downloadPort: LocalScoreProjectMusicXmlExportDownloadPort;
  publishNotice: (notice: string | null) => void;
  createDraft?: CreateDraft;
  confirmDraft?: ConfirmDraft;
}): LocalScoreProjectMusicXmlExportController => {
  let snapshot = initialSnapshot();
  let attached = true;
  let cleanupGeneration = 0;
  const listeners = new Set<() => void>();

  const publishSnapshot = (
    nextSnapshot: LocalScoreProjectMusicXmlExportSnapshot,
  ) => {
    if (!attached) return;
    snapshot = nextSnapshot;
    listeners.forEach((listener) => listener());
  };

  const notify = (notice: string | null) => {
    if (attached) publishNotice(notice);
  };

  const invalidate = () => {
    cleanupGeneration += 1;
    publishSnapshot({ ...snapshot, draft: null });
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
      cleanupGeneration += 1;
      listeners.clear();
      snapshot = initialSnapshot();
    },
    inspect: (project) => {
      if (!attached || !project) return false;
      cleanupGeneration += 1;
      notify(null);
      try {
        const draft = createDraft({ project });
        publishSnapshot({ ...snapshot, draft });
        const formatLabel = snapshot.format === "mxl" ? "MXL" : "MusicXML";
        notify(
          draft.status === "ready"
            ? `${formatLabel} 导出候选已就绪：${draft.summary.measureCount} 小节、${draft.summary.eventCount} 个事件。当前候选仅保存在内存中，确认前不会创建下载文件。`
            : "当前项目包含本切片无法无损往返的内容，已阻止下载。",
        );
        return true;
      } catch (error) {
        publishSnapshot({ ...snapshot, draft: null });
        notify(
          error instanceof Error
            ? error.message
            : "无法生成 MusicXML/MXL 导出候选。",
        );
        return false;
      }
    },
    changeFormat: (format) => {
      cleanupGeneration += 1;
      publishSnapshot({ format, draft: null });
      notify("导出格式已切换，请重新检查当前已保存修订。");
    },
    clear: () => {
      cleanupGeneration += 1;
      publishSnapshot({ ...snapshot, draft: null });
      notify("导出候选已清除；没有生成下载或修改项目。");
    },
    invalidate,
    confirmAndDownload: (project) => {
      if (!attached || !project || !snapshot.draft) return false;
      const cleanupRun = ++cleanupGeneration;
      const draft = snapshot.draft;
      const format = snapshot.format;
      try {
        const confirmed = confirmDraft({
          draft,
          currentProject: project,
          format,
        });
        // Keep confirmation and download in the same synchronous user gesture.
        downloadPort.download({
          data: confirmed.data,
          fileName: confirmed.fileName,
          mimeType: confirmed.mimeType,
          onCleanupError: (error) => {
            if (!attached || cleanupGeneration !== cleanupRun) return;
            notify(
              `无法回收导出下载 URL：${error.message}；候选和项目均保持不变。`,
            );
          },
        });
        notify(
          `${confirmed.fileName} 已在本机生成下载；项目、修订和历史没有变化。`,
        );
        return true;
      } catch (error) {
        notify(
          error instanceof Error
            ? error.message
            : "本机下载启动失败；导出候选和项目均保持不变。",
        );
        return false;
      }
    },
  };
};
