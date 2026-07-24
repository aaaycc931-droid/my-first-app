import assert from "node:assert/strict";
import {
  findForbiddenTrackedFiles,
  isAllowedTrackedResource,
} from "./repository-hygiene.mjs";

const allowedResources = [
  "android/app/src/main/AndroidManifest.xml",
  "android/app/src/main/res/layout/activity_main.xml",
  "android/app/src/main/res/drawable/splash.png",
  "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png",
  "docs/companion/assets/resonance-traveler-final-head.jpg",
  "mobile/public/icons/app-icon-192.png",
  "mobile/public/icons/app-icon-512.png",
  "mobile/public/icons/app-icon-maskable-512.png",
];

for (const filePath of allowedResources) {
  assert.equal(
    isAllowedTrackedResource(filePath),
    true,
    `${filePath} should remain an explicitly allowed product resource`,
  );
}
assert.deepEqual(findForbiddenTrackedFiles(allowedResources), []);

const forbiddenFiles = [
  "android/app/src/main/debug-screenshot.png",
  "docs/unreviewed-sample.pdf",
  "local-fixtures/private-voice.PNG",
  "mobile/public/debug-recording.mxl",
  "tmp/recognizer.log",
];
assert.deepEqual(findForbiddenTrackedFiles(forbiddenFiles), forbiddenFiles);

assert.deepEqual(
  findForbiddenTrackedFiles([
    "app/page.tsx",
    "docs/architecture.md",
    "mobile/src/main.tsx",
    "scripts/report.json",
  ]),
  [],
);

console.log("Repository hygiene focused tests passed.");
