import type {
  AudiverisDevSummary,
  RecognitionApiClient,
} from "./browserRecognitionApiClient";
import type { RecognitionFilePreviewPort } from "./browserRecognitionFilePreview";
import type { RecognizedNote } from "./types";

export type RecognizeStatus =
  | "未上传"
  | "已上传"
  | "识别中"
  | "识别完成"
  | "识别失败";
export type MusicXMLImportStatus = "idle" | "importing" | "success" | "error";
export type AudiverisDevStatus = "idle" | "processing" | "success" | "error";

export type RecognitionWorkflowState = Readonly<{
  previewUrl: string | null;
  selectedFile: File | null;
  fileName: string;
  recognizedNotes: RecognizedNote[];
  recognizeStatus: RecognizeStatus;
  isRecognizing: boolean;
  recognizeError: string;
  musicXMLFile: File | null;
  musicXMLImportError: string;
  isImportingMusicXML: boolean;
  musicXMLImportStatus: MusicXMLImportStatus;
  importedMusicXMLNoteCount: number;
  audiverisDevFile: File | null;
  audiverisDevStatus: AudiverisDevStatus;
  audiverisDevError: string;
  audiverisDevSummary: AudiverisDevSummary | null;
}>;

export type RecognitionWorkflowSelection = Readonly<{
  accepted: boolean;
}>;

export type RecognitionWorkflowController = Readonly<{
  getState: () => RecognitionWorkflowState;
  subscribe: (listener: () => void) => () => void;
  selectImage: (file: File | null) => RecognitionWorkflowSelection;
  recognizeImage: () => Promise<void>;
  selectMusicXML: (file: File | null) => RecognitionWorkflowSelection;
  importMusicXML: () => Promise<void>;
  selectAudiverisPdf: (file: File | null) => RecognitionWorkflowSelection;
  recognizeAudiverisPdf: (includeFullNotes: boolean) => Promise<void>;
  dispose: () => void;
}>;

export type RecognitionWorkflowEffects = Readonly<{
  invalidateSharedResult: () => void;
  clearPlayError: () => void;
}>;

const maxMusicXMLFileSizeBytes = 2 * 1024 * 1024;

const initialState: RecognitionWorkflowState = {
  previewUrl: null,
  selectedFile: null,
  fileName: "",
  recognizedNotes: [],
  recognizeStatus: "未上传",
  isRecognizing: false,
  recognizeError: "",
  musicXMLFile: null,
  musicXMLImportError: "",
  isImportingMusicXML: false,
  musicXMLImportStatus: "idle",
  importedMusicXMLNoteCount: 0,
  audiverisDevFile: null,
  audiverisDevStatus: "idle",
  audiverisDevError: "",
  audiverisDevSummary: null,
};

export const createRecognitionWorkflowController = (
  apiClient: RecognitionApiClient,
  previewPort: RecognitionFilePreviewPort,
  effects: RecognitionWorkflowEffects,
): RecognitionWorkflowController => {
  let state = initialState;
  let disposed = false;
  let sharedGeneration = 0;
  let imageGeneration = 0;
  let musicXMLGeneration = 0;
  let audiverisGeneration = 0;
  let currentPreviewUrl: string | null = null;
  const listeners = new Set<() => void>();

  const update = (patch: Partial<RecognitionWorkflowState>) => {
    if (disposed) return;
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };

  const invalidateSharedResult = () => {
    effects.invalidateSharedResult();
    effects.clearPlayError();
  };

  const selectImage = (
    file: File | null,
  ): RecognitionWorkflowSelection => {
    if (!file || disposed) return { accepted: false };

    imageGeneration += 1;
    sharedGeneration += 1;
    if (currentPreviewUrl) previewPort.revokePreviewUrl(currentPreviewUrl);
    currentPreviewUrl = previewPort.createPreviewUrl(file);
    invalidateSharedResult();
    update({
      previewUrl: currentPreviewUrl,
      selectedFile: file,
      fileName: file.name,
      recognizedNotes: [],
      recognizeStatus: "已上传",
      isRecognizing: false,
      recognizeError: "",
      isImportingMusicXML: false,
      musicXMLImportStatus: "idle",
      musicXMLImportError: "",
      importedMusicXMLNoteCount: 0,
    });
    return { accepted: true };
  };

  const recognizeImage = async () => {
    if (!state.selectedFile || state.isRecognizing || disposed) return;

    const file = state.selectedFile;
    const expectedImageGeneration = imageGeneration;
    const operationGeneration = ++sharedGeneration;
    invalidateSharedResult();
    update({
      recognizedNotes: [],
      isRecognizing: true,
      isImportingMusicXML: false,
      recognizeStatus: "识别中",
      recognizeError: "",
      musicXMLImportStatus:
        state.musicXMLImportStatus === "importing"
          ? "idle"
          : state.musicXMLImportStatus,
      musicXMLImportError:
        state.musicXMLImportStatus === "importing"
          ? ""
          : state.musicXMLImportError,
      importedMusicXMLNoteCount:
        state.musicXMLImportStatus === "importing"
          ? 0
          : state.importedMusicXMLNoteCount,
    });

    const isCurrent = () =>
      !disposed &&
      operationGeneration === sharedGeneration &&
      expectedImageGeneration === imageGeneration;

    try {
      const data = await apiClient.recognizeImage(file);
      if (!isCurrent()) return;
      update({
        recognizedNotes: data.notes || [],
        recognizeStatus: "识别完成",
      });
    } catch (error) {
      if (!isCurrent()) return;
      update({
        recognizeStatus: "识别失败",
        recognizeError:
          error instanceof Error ? error.message : "识别失败，请稍后再试。",
        recognizedNotes: [],
      });
    } finally {
      if (isCurrent()) update({ isRecognizing: false });
    }
  };

  const selectMusicXML = (
    file: File | null,
  ): RecognitionWorkflowSelection => {
    if (disposed) return { accepted: false };

    musicXMLGeneration += 1;
    sharedGeneration += 1;
    update({
      musicXMLFile: null,
      musicXMLImportError: "",
      isImportingMusicXML: false,
      musicXMLImportStatus: "idle",
      importedMusicXMLNoteCount: 0,
    });

    if (!file) return { accepted: false };

    const extension = file.name.toLowerCase().split(".").pop();
    if (
      extension !== "musicxml" &&
      extension !== "xml" &&
      extension !== "mxl"
    ) {
      update({
        musicXMLImportError: "请选择 .musicxml、.xml 或 .mxl 文件。",
        musicXMLImportStatus: "error",
      });
      return { accepted: false };
    }

    if (file.size === 0) {
      update({
        musicXMLImportError:
          "MusicXML 文件为空，请选择包含乐谱内容的文件。",
        musicXMLImportStatus: "error",
      });
      return { accepted: false };
    }

    if (file.size > maxMusicXMLFileSizeBytes) {
      update({
        musicXMLImportError: "MusicXML 文件过大，当前最大支持 2 MB。",
        musicXMLImportStatus: "error",
      });
      return { accepted: false };
    }

    invalidateSharedResult();
    update({
      musicXMLFile: file,
      recognizedNotes: [],
      recognizeStatus: state.selectedFile ? "已上传" : "未上传",
      recognizeError: "",
      isRecognizing: false,
    });
    return { accepted: true };
  };

  const importMusicXML = async () => {
    if (!state.musicXMLFile || state.isImportingMusicXML || disposed) return;

    const file = state.musicXMLFile;
    const expectedMusicXMLGeneration = musicXMLGeneration;
    const operationGeneration = ++sharedGeneration;
    invalidateSharedResult();
    update({
      recognizedNotes: [],
      isImportingMusicXML: true,
      isRecognizing: false,
      musicXMLImportStatus: "importing",
      musicXMLImportError: "",
      recognizeError: "",
    });

    const isCurrent = () =>
      !disposed &&
      operationGeneration === sharedGeneration &&
      expectedMusicXMLGeneration === musicXMLGeneration;

    try {
      const data = await apiClient.importMusicXML(file);
      if (!isCurrent()) return;
      const importedNotes = data.notes || [];
      update({
        recognizedNotes: importedNotes,
        importedMusicXMLNoteCount: importedNotes.length,
        musicXMLImportStatus: "success",
        recognizeStatus: "识别完成",
      });
    } catch (error) {
      if (!isCurrent()) return;
      update({
        musicXMLImportStatus: "error",
        musicXMLImportError:
          error instanceof Error
            ? error.message
            : "MusicXML 导入失败，请检查文件和开发 API 开关后重试。",
      });
    } finally {
      if (isCurrent()) update({ isImportingMusicXML: false });
    }
  };

  const selectAudiverisPdf = (
    file: File | null,
  ): RecognitionWorkflowSelection => {
    if (disposed) return { accepted: false };

    audiverisGeneration += 1;
    update({
      audiverisDevFile: null,
      audiverisDevStatus: "idle",
      audiverisDevError: "",
      audiverisDevSummary: null,
    });

    if (!file) return { accepted: false };

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      update({
        audiverisDevStatus: "error",
        audiverisDevError:
          "仅开发使用的 Local Audiveris 面板只接受 PDF 文件。",
      });
      return { accepted: false };
    }

    update({ audiverisDevFile: file });
    return { accepted: true };
  };

  const recognizeAudiverisPdf = async (includeFullNotes: boolean) => {
    if (
      !state.audiverisDevFile ||
      state.audiverisDevStatus === "processing" ||
      disposed
    ) {
      return;
    }

    const file = state.audiverisDevFile;
    const operationGeneration = ++audiverisGeneration;
    update({
      audiverisDevStatus: "processing",
      audiverisDevError: "",
      audiverisDevSummary: null,
    });

    const isCurrent = () =>
      !disposed && operationGeneration === audiverisGeneration;

    try {
      const summary = await apiClient.recognizeAudiverisPdf(file, {
        includeFullNotes,
      });
      if (!isCurrent()) return;
      update({
        audiverisDevSummary: summary,
        audiverisDevStatus: "success",
      });
    } catch (error) {
      if (!isCurrent()) return;
      update({
        audiverisDevStatus: "error",
        audiverisDevError:
          error instanceof Error
            ? error.message
            : "仅开发使用的 Local Audiveris PDF 测试失败。",
      });
    }
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    sharedGeneration += 1;
    imageGeneration += 1;
    musicXMLGeneration += 1;
    audiverisGeneration += 1;
    if (currentPreviewUrl) {
      previewPort.revokePreviewUrl(currentPreviewUrl);
      currentPreviewUrl = null;
    }
    listeners.clear();
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    selectImage,
    recognizeImage,
    selectMusicXML,
    importMusicXML,
    selectAudiverisPdf,
    recognizeAudiverisPdf,
    dispose,
  };
};
