import assert from "node:assert/strict";

import {
  createMediaProjectFromLocalMelodyGuide,
  resolveLocalPianoAudioCapability,
  validateResourcePackage,
} from "../lib/platform/sharedProjectCapability";
import { SPLENDID_GRAND_PIANO_RESOURCE_PACKAGE } from "../lib/piano/splendidGrandPiano";
import type { LocalMelodyGuideAudioSource } from "../lib/practice/localMelodyGuideAudio";

const source: LocalMelodyGuideAudioSource = {
  sourceId: "local-melody-guide-test-1",
  fileName: "teacher-guide.wav",
  fileType: "audio/wav",
  fileSizeBytes: 4096,
  fileSizeLabel: "4.0 KB",
  decodedDurationSeconds: 2,
  sampleRate: 48_000,
  channelCount: 1,
  status: "decoded",
  warnings: [],
  localOnly: true,
  analysisReady: true,
};

const project = createMediaProjectFromLocalMelodyGuide(source);
assert.equal(project.schemaVersion, "media-project-v1");
assert.equal(project.revision, 1);
assert.equal(project.status, "ready");
assert.equal(project.assets[0].immutable, true);
assert.equal(project.assets[0].storage, "memory-only");
assert.deepEqual(project.edits, []);
assert.equal(project.localOnly, true);
assert.equal(project.sessionOnly, true);
assert.equal(
  createMediaProjectFromLocalMelodyGuide({ ...source, status: "decoding" }).status,
  "draft",
);
assert.equal(
  createMediaProjectFromLocalMelodyGuide({ ...source, status: "error" }).status,
  "error",
);
assert.equal(
  createMediaProjectFromLocalMelodyGuide({ ...source }).projectId,
  project.projectId,
  "the same local source metadata must keep a stable session project identity",
);
assert.notEqual(
  createMediaProjectFromLocalMelodyGuide({
    ...source,
    sourceId: "local-melody-guide-test-2",
  }).projectId,
  project.projectId,
  "reselecting a different session source must not reuse the old project identity",
);

assert.equal(
  validateResourcePackage(SPLENDID_GRAND_PIANO_RESOURCE_PACKAGE).fileCount,
  36,
);
assert.throws(
  () => validateResourcePackage({
    ...SPLENDID_GRAND_PIANO_RESOURCE_PACKAGE,
    sha256: "not-a-digest",
  }),
  /资源包缺少有效/,
);

const sampled = resolveLocalPianoAudioCapability({
  webAudioAvailable: true,
  localAssetsEnabled: true,
  resourcePackage: SPLENDID_GRAND_PIANO_RESOURCE_PACKAGE,
});
assert.equal(sampled.status, "available");
assert.equal(sampled.selectedProvider, "sampled-local");
assert.equal(sampled.fallbackProvider, "compatibility-synth");
assert.equal(
  sampled.resourcePackageId,
  SPLENDID_GRAND_PIANO_RESOURCE_PACKAGE.packageId,
);

const disabledAssets = resolveLocalPianoAudioCapability({
  webAudioAvailable: true,
  localAssetsEnabled: false,
  resourcePackage: SPLENDID_GRAND_PIANO_RESOURCE_PACKAGE,
});
assert.equal(disabledAssets.status, "fallback");
assert.equal(disabledAssets.selectedProvider, "compatibility-synth");

const invalidPackage = resolveLocalPianoAudioCapability({
  webAudioAvailable: true,
  localAssetsEnabled: true,
  resourcePackage: {
    ...SPLENDID_GRAND_PIANO_RESOURCE_PACKAGE,
    sizeBytes: 0,
  },
});
assert.equal(invalidPackage.status, "fallback");
assert.equal(invalidPackage.resourcePackageId, null);

const unavailable = resolveLocalPianoAudioCapability({
  webAudioAvailable: false,
  localAssetsEnabled: true,
  resourcePackage: SPLENDID_GRAND_PIANO_RESOURCE_PACKAGE,
});
assert.equal(unavailable.status, "unavailable");
assert.equal(unavailable.selectedProvider, null);

console.log("P114l shared project/resource/capability tests passed.");
