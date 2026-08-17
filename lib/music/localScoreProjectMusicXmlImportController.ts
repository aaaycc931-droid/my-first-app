import {
  createLocalScoreProjectMusicXmlImportDraft,
  type LocalScoreProjectMusicXmlImportDraft,
  type LocalScoreProjectMusicXmlImportSourceFormat,
} from "./localScoreProjectMusicXmlImport";

export const LOCAL_SCORE_PROJECT_MUSIC_XML_IMPORT_MAX_FILE_BYTES =
  2 * 1024 * 1024;

export type LocalScoreProjectMusicXmlImportFile = Readonly<{
  name: string;
  size: number;
}>;

export type LocalScoreProjectMusicXmlImportFilePort<
  TFile extends LocalScoreProjectMusicXmlImportFile,
> = Readonly<{
  read: (
    file: TFile,
    sourceFormat: LocalScoreProjectMusicXmlImportSourceFormat,
  ) => Promise<string>;
}>;

export type LocalScoreProjectMusicXmlImportSnapshot = Readonly<{
  draft: LocalScoreProjectMusicXmlImportDraft | null;
  status: "idle" | "reading" | "ready" | "blocked" | "error";
  notice: string;
}>;

export type LocalScoreProjectMusicXmlImportController<
  TFile extends LocalScoreProjectMusicXmlImportFile,
> = Readonly<{
  getSnapshot: () => LocalScoreProjectMusicXmlImportSnapshot;
  subscribe: (listener: () => void) => () => void;
  attach: () => void;
  detach: () => void;
  select: (file: TFile | null) => Promise<boolean>;
  clear: () => void;
  consumeConfirmedDraft: () => void;
}>;

type CreateDraft = typeof createLocalScoreProjectMusicXmlImportDraft;

const initialSnapshot = (): LocalScoreProjectMusicXmlImportSnapshot => ({
  draft: null,
  status: "idle",
  notice:
    "选择 MusicXML、XML 或 MXL 后会先生成内存候选；确认前不会写入项目列表。",
});

const getSourceFormat = (
  fileName: string,
): LocalScoreProjectMusicXmlImportSourceFormat | null => {
  const extension = fileName.split(".").at(-1)?.toLowerCase();
  return extension === "musicxml" || extension === "xml" || extension === "mxl"
    ? extension
    : null;
};

export const createLocalScoreProjectMusicXmlImportController = <
  TFile extends LocalScoreProjectMusicXmlImportFile,
>({
  filePort,
  now,
  createId,
  createDraft = createLocalScoreProjectMusicXmlImportDraft,
}: {
  filePort: LocalScoreProjectMusicXmlImportFilePort<TFile>;
  now: () => string;
  createId: () => string;
  createDraft?: CreateDraft;
}): LocalScoreProjectMusicXmlImportController<TFile> => {
  let snapshot = initialSnapshot();
  let attached = true;
  let generation = 0;
  const listeners = new Set<() => void>();

  const publish = (nextSnapshot: LocalScoreProjectMusicXmlImportSnapshot) => {
    if (!attached) return;
    snapshot = nextSnapshot;
    listeners.forEach((listener) => listener());
  };

  const isCurrent = (runGeneration: number) =>
    attached && generation === runGeneration;

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
      snapshot = initialSnapshot();
    },
    clear: () => {
      generation += 1;
      publish({
        draft: null,
        status: "idle",
        notice:
          "MusicXML 导入候选已清除；没有写入或修改任何本机项目。",
      });
    },
    consumeConfirmedDraft: () => {
      generation += 1;
      publish({
        ...snapshot,
        draft: null,
        status: "idle",
      });
    },
    select: async (file) => {
      const runGeneration = ++generation;
      if (!attached) return false;
      publish({
        ...snapshot,
        draft: null,
      });
      if (!file) {
        publish({
          draft: null,
          status: "idle",
          notice: "未选择文件；没有写入或修改任何本机项目。",
        });
        return false;
      }
      const sourceFormat = getSourceFormat(file.name);
      if (!sourceFormat) {
        publish({
          draft: null,
          status: "error",
          notice: "请选择 .musicxml、.xml 或 .mxl 文件。",
        });
        return false;
      }
      if (file.size === 0) {
        publish({
          draft: null,
          status: "error",
          notice: "所选文件为空，未生成导入候选。",
        });
        return false;
      }
      if (file.size > LOCAL_SCORE_PROJECT_MUSIC_XML_IMPORT_MAX_FILE_BYTES) {
        publish({
          draft: null,
          status: "error",
          notice: "文件超过 2 MiB 本机导入上限，未生成候选。",
        });
        return false;
      }
      publish({
        draft: null,
        status: "reading",
        notice: "正在本机解析并检查受支持语义…",
      });
      try {
        const xml = await filePort.read(file, sourceFormat);
        if (!isCurrent(runGeneration)) return false;
        let eventSequence = 0;
        const draft = createDraft({
          xml,
          fileName: file.name,
          sourceFormat,
          projectId: createId(),
          now: now(),
          createEventId: () => `import-event-${++eventSequence}`,
        });
        if (!isCurrent(runGeneration)) return false;
        publish({
          draft,
          status: draft.status,
          notice: draft.status === "ready"
            ? `候选已就绪：${draft.summary.measureCount} 小节、${draft.summary.eventCount} 个事件。请检查问题清单和谱面后明确确认。`
            : "该文件包含当前 canonical 无法无损表达的内容，已阻止确认和保存。",
        });
        return true;
      } catch (error) {
        if (!isCurrent(runGeneration)) return false;
        publish({
          draft: null,
          status: "error",
          notice: error instanceof Error
            ? error.message
            : "MusicXML/MXL 解析失败，未生成导入候选。",
        });
        return false;
      }
    },
  };
};
