import { extname } from "node:path";

export const forbiddenGeneratedSampleExtensions = new Set([
  ".pdf",
  ".mxl",
  ".omr",
  ".log",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".tif",
  ".tiff",
  ".bmp",
  ".heic",
  ".xml",
]);

const exactAllowedResourcePaths = new Set([
  "android/app/src/main/AndroidManifest.xml",
  "docs/companion/assets/resonance-traveler-final-head.jpg",
  "mobile/public/icons/app-icon-192.png",
  "mobile/public/icons/app-icon-512.png",
  "mobile/public/icons/app-icon-maskable-512.png",
]);

export const isAllowedTrackedResource = (filePath) =>
  exactAllowedResourcePaths.has(filePath) ||
  filePath.startsWith("android/app/src/main/res/");

export const findForbiddenTrackedFiles = (trackedFiles) =>
  trackedFiles.filter((filePath) => {
    const extension = extname(filePath).toLowerCase();
    return (
      forbiddenGeneratedSampleExtensions.has(extension) &&
      !isAllowedTrackedResource(filePath)
    );
  });
