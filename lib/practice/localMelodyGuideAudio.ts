export type LocalMelodyGuideAudioDecodeStatus =
  | "idle"
  | "selected"
  | "decoding"
  | "decoded"
  | "error";

export type LocalMelodyGuideFileLike = {
  name?: string;
  type?: string;
  size?: number;
};

export type LocalMelodyGuideDecodedMetadata = {
  decodedDurationSeconds: number;
  sampleRate: number;
  channelCount: number;
};

/**
 * P36/P36b browser-local source contract for a selected melody guide audio file.
 *
 * This serializable source summary intentionally stores metadata, warnings,
 * decode status, local-only boundary intent, and whether the session has decoded
 * audio available for future analysis. It does not store AudioBuffer / PCM data.
 * P37 may add separate session-only PCM/channel state if target pitch curve
 * drafting needs it, while remaining browser-local, non-uploading, and
 * non-scoring.
 */
export type LocalMelodyGuideAudioSource = {
  sourceId: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  fileSizeLabel: string;
  decodedDurationSeconds: number | null;
  sampleRate: number | null;
  channelCount: number | null;
  status: LocalMelodyGuideAudioDecodeStatus;
  warnings: string[];
  localOnly: true;
  analysisReady: boolean;
};

export const localMelodyGuideBrowserDecodeSupportCopy =
  "WAV / MP3 / M4A support depends on browser decoding support.";

export const localMelodyGuideBestSourceCopy =
  "Best for clean vocal guide, humming, single melody instrument, or teacher-recorded melody guide.";

export const localMelodyGuideFullMixedSongDeferredWarning =
  "Full mixed songs may be unreliable until future private cloud song analysis.";

export const localMelodyGuideLocalOnlyCopy = [
  "Browser-local only.",
  "No upload.",
  "No cloud processing.",
  "No account/database.",
  "This is a melody guide source, not a scored result.",
] as const;

const unknownFileTypeLabel = "Unknown / browser-inferred type";

export const formatLocalMelodyGuideFileSize = (sizeBytes: number) => {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
    return "Unknown size";
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  const sizeKilobytes = sizeBytes / 1024;
  if (sizeKilobytes < 1024) {
    return `${sizeKilobytes.toFixed(1)} KB`;
  }

  return `${(sizeKilobytes / 1024).toFixed(1)} MB`;
};

export const createLocalMelodyGuideFileSummary = (
  file: LocalMelodyGuideFileLike,
  sourceId = "local-melody-guide-source",
): LocalMelodyGuideAudioSource => {
  const fileName = file.name?.trim() || "Unnamed local audio file";
  const fileType = file.type?.trim() || unknownFileTypeLabel;
  const fileSizeBytes = Number.isFinite(file.size) ? Number(file.size) : 0;
  const warnings = [localMelodyGuideFullMixedSongDeferredWarning];

  if (!file.name?.trim()) {
    warnings.push("Selected file has no reliable file name metadata.");
  }

  if (!file.type?.trim()) {
    warnings.push(
      "Selected file has no reliable MIME type; browser decoding may still work by content.",
    );
  }

  if (fileSizeBytes <= 0) {
    warnings.push("Selected file appears to be empty or has invalid size metadata.");
  }

  return {
    sourceId,
    fileName,
    fileType,
    fileSizeBytes,
    fileSizeLabel: formatLocalMelodyGuideFileSize(fileSizeBytes),
    decodedDurationSeconds: null,
    sampleRate: null,
    channelCount: null,
    status: "selected",
    warnings,
    localOnly: true,
    analysisReady: false,
  };
};

export const applyLocalMelodyGuideDecodedMetadata = (
  source: LocalMelodyGuideAudioSource,
  decodedMetadata: LocalMelodyGuideDecodedMetadata,
): LocalMelodyGuideAudioSource => {
  const warnings = [...source.warnings];

  if (decodedMetadata.decodedDurationSeconds <= 0) {
    warnings.push("Decoded audio duration is empty or invalid.");
  }

  if (decodedMetadata.channelCount <= 0) {
    warnings.push("Decoded audio did not expose a usable channel count.");
  }

  return {
    ...source,
    decodedDurationSeconds: decodedMetadata.decodedDurationSeconds,
    sampleRate: decodedMetadata.sampleRate,
    channelCount: decodedMetadata.channelCount,
    status: "decoded",
    warnings,
    localOnly: true,
    analysisReady: true,
  };
};

export const markLocalMelodyGuideDecodeError = (
  source: LocalMelodyGuideAudioSource,
): LocalMelodyGuideAudioSource => ({
  ...source,
  status: "error",
  analysisReady: false,
  warnings: [
    ...source.warnings,
    "This browser could not decode the selected local audio file.",
  ],
});
