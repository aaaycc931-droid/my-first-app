export const localSheetMusicAcceptedFileInput =
  ".png,.jpg,.jpeg,image/png,image/jpeg";

export const localSheetMusicMaxFileSizeBytes = 10 * 1024 * 1024;

export type LocalSheetMusicFileValidationResult =
  | { ok: true }
  | { ok: false; reason: "unsupported-type" | "file-too-large"; message: string };

export type LocalSheetMusicSourceIdGenerator = { randomUUID: () => string };

const supportedMimeTypes = new Set(["image/png", "image/jpeg", "image/jpg"]);
const supportedExtensions = [".png", ".jpg", ".jpeg"];

export function formatLocalSheetMusicFileSize(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
    return "未知大小";
  }

  const sizeMb = sizeBytes / (1024 * 1024);
  if (sizeMb >= 0.1) {
    return `${sizeMb.toFixed(1)} MB`;
  }

  const sizeKb = sizeBytes / 1024;
  return `${Math.max(sizeKb, 0.1).toFixed(1)} KB`;
}

export function validateLocalSheetMusicImageFile(
  file: Pick<File, "name" | "size" | "type">,
): LocalSheetMusicFileValidationResult {
  const normalizedType = file.type.trim().toLowerCase();
  const normalizedName = file.name.trim().toLowerCase();
  const hasSupportedMimeType = supportedMimeTypes.has(normalizedType);
  const hasSupportedExtension = supportedExtensions.some((extension) =>
    normalizedName.endsWith(extension),
  );

  if (!hasSupportedMimeType || !hasSupportedExtension) {
    return {
      ok: false,
      reason: "unsupported-type",
      message:
        "当前文件格式暂不支持。请使用 PNG、JPG 或 JPEG 乐谱图片；PDF、音频、视频和文档暂不支持。",
    };
  }

  if (file.size > localSheetMusicMaxFileSizeBytes) {
    return {
      ok: false,
      reason: "file-too-large",
      message: "当前文件超过 10 MB。请换用 10 MB 以内的乐谱图片。",
    };
  }

  return { ok: true };
}

export function createLocalSheetMusicSessionSourceId(
  generator: LocalSheetMusicSourceIdGenerator = crypto,
): string {
  return `local-sheet-source:${generator.randomUUID()}`;
}
