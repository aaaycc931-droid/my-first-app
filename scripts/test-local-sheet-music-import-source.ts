import {
  formatLocalSheetMusicFileSize,
  localSheetMusicMaxFileSizeBytes,
  validateLocalSheetMusicImageFile,
} from "../lib/practice/localSheetMusicImportSource";

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

assert(
  validateLocalSheetMusicImageFile({
    name: "score.png",
    size: 1024,
    type: "image/png",
  }).ok,
  "PNG should be supported",
);

assert(
  validateLocalSheetMusicImageFile({
    name: "score.jpeg",
    size: 1024,
    type: "image/jpeg",
  }).ok,
  "JPEG should be supported",
);

const pdfResult = validateLocalSheetMusicImageFile({
  name: "score.pdf",
  size: 1024,
  type: "application/pdf",
});
assert("reason" in pdfResult && pdfResult.reason === "unsupported-type", "PDF should be rejected");

const oversizedResult = validateLocalSheetMusicImageFile({
  name: "score.jpg",
  size: localSheetMusicMaxFileSizeBytes + 1,
  type: "image/jpeg",
});
assert("reason" in oversizedResult && oversizedResult.reason === "file-too-large", "Oversized files should be rejected");

assert(formatLocalSheetMusicFileSize(1024) === "1.0 KB", "KB formatting should be stable");
assert(formatLocalSheetMusicFileSize(1024 * 1024) === "1.0 MB", "MB formatting should be stable");

console.log("local sheet music import source helper tests passed");
