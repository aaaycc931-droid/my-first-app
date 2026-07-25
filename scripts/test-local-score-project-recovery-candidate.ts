import assert from "node:assert/strict";

import {
  addLocalScoreProjectEvent,
  changeLocalScoreProjectKeySignature,
  createLocalScoreProject,
} from "../lib/music/localScoreProject";
import {
  LOCAL_SCORE_PROJECT_RECOVERY_SCHEMA_VERSION,
  cloneLocalScoreProjectRecoveryCandidate,
  createLocalScoreProjectRecoveryCandidate,
  deserializeLocalScoreProjectRecoveryCandidate,
  getLocalScoreProjectRecoveryBaseFingerprint,
  parseLocalScoreProjectRecoveryCandidate,
  serializeLocalScoreProjectRecoveryCandidate,
} from "../lib/music/localScoreProjectRecovery";

const initial = createLocalScoreProject({
  projectId: "recovery-project",
  title: "恢复候选测试",
  now: "2026-07-25T01:00:00.000Z",
});
const keyed = changeLocalScoreProjectKeySignature({
  project: initial,
  expectedRevision: 1,
  keySignature: { fifths: 1 },
  now: "2026-07-25T01:00:01.000Z",
});
const proposed = addLocalScoreProjectEvent({
  project: keyed,
  expectedRevision: 2,
  location: {
    partId: "part-1",
    staffId: "staff-1",
    voiceId: "voice-1",
    measureNumber: 1,
  },
  eventId: "recovered-note",
  input: {
    type: "note",
    pitch: "F4",
    duration: "quarter",
    lyric: "恢",
  },
  now: "2026-07-25T01:00:02.000Z",
});

const candidate = createLocalScoreProjectRecoveryCandidate({
  candidateId: "candidate-session-1",
  candidateSequence: 1,
  capturedAt: "2026-07-25T01:00:03.000Z",
  baseProject: keyed,
  proposedProject: proposed,
});

assert.equal(
  candidate.schemaVersion,
  LOCAL_SCORE_PROJECT_RECOVERY_SCHEMA_VERSION,
);
assert.equal(candidate.projectId, proposed.projectId);
assert.equal(candidate.documentId, proposed.document.documentId);
assert.equal(candidate.baseRevision, 2);
assert.equal(
  candidate.baseFingerprint,
  getLocalScoreProjectRecoveryBaseFingerprint(keyed),
);
assert.match(
  candidate.baseFingerprint,
  /^fnv1a64x2-u16le:[0-9a-f]{16}:[0-9a-f]{16}$/,
);
assert.equal(candidate.candidateSequence, 1);
assert.equal(candidate.proposedProject.document.revision, 3);
assert.deepEqual(candidate.proposedProject, proposed);
assert.notEqual(candidate.proposedProject, proposed);
assert.notEqual(candidate.proposedProject.document, proposed.document);
assert.notEqual(
  candidate.proposedProject.document.keySignature,
  proposed.document.keySignature,
);
assert.notEqual(
  candidate.proposedProject.document.parts,
  proposed.document.parts,
);
assert.notEqual(
  candidate.proposedProject.document.parts[0].staves[0].voices[0]
    .measures[0].events[0],
  proposed.document.parts[0].staves[0].voices[0].measures[0].events[0],
);
assert.notEqual(candidate.proposedProject.undoStack, proposed.undoStack);
assert.notEqual(candidate.proposedProject.undoStack[0], proposed.undoStack[0]);

const serialized = serializeLocalScoreProjectRecoveryCandidate(candidate);
assert.equal(
  serializeLocalScoreProjectRecoveryCandidate(candidate),
  serialized,
);
assert.deepEqual(
  deserializeLocalScoreProjectRecoveryCandidate(serialized),
  candidate,
);
assert.deepEqual(
  parseLocalScoreProjectRecoveryCandidate(
    JSON.parse(serialized),
    keyed,
  ),
  candidate,
);
assert.equal(
  deserializeLocalScoreProjectRecoveryCandidate("{broken"),
  null,
);

const raw = structuredClone(candidate);
const rawBefore = JSON.stringify(raw);
const parsed = parseLocalScoreProjectRecoveryCandidate(raw);
assert.deepEqual(parsed, candidate);
assert.equal(JSON.stringify(raw), rawBefore, "parser 不得修改输入对象");
assert.notEqual(parsed?.proposedProject, raw.proposedProject);
assert.notEqual(parsed?.proposedProject.document, raw.proposedProject.document);
assert.notEqual(
  parsed?.proposedProject.document.parts,
  raw.proposedProject.document.parts,
);
assert.equal(
  Reflect.set(raw.proposedProject.document.keySignature, "fifths", -1),
  true,
);
assert.equal(parsed?.proposedProject.document.keySignature.fifths, 1);
assert.equal(
  Reflect.set(
    raw.proposedProject.document.parts[0].staves[0].voices[0]
      .measures[0].events[0] ?? {},
    "lyric",
    "污染",
  ),
  true,
);
assert.equal(
  parsed?.proposedProject.document.parts[0].staves[0].voices[0]
    .measures[0].events[0]?.type === "note"
    ? parsed.proposedProject.document.parts[0].staves[0].voices[0]
      .measures[0].events[0].lyric
    : null,
  "恢",
);

const cloned = cloneLocalScoreProjectRecoveryCandidate(candidate);
assert.deepEqual(cloned, candidate);
assert.notEqual(cloned, candidate);
assert.notEqual(cloned.proposedProject, candidate.proposedProject);
assert.notEqual(cloned.proposedProject.document, candidate.proposedProject.document);
assert.notEqual(
  cloned.proposedProject.document.source,
  candidate.proposedProject.document.source,
);
assert.notEqual(
  cloned.proposedProject.document.keySignature,
  candidate.proposedProject.document.keySignature,
);
assert.notEqual(
  cloned.proposedProject.document.parts[0].staves[0].voices[0]
    .measures[0].events[0],
  candidate.proposedProject.document.parts[0].staves[0].voices[0]
    .measures[0].events[0],
);

const asRaw = () => structuredClone(candidate) as Record<string, unknown>;

for (const key of [
  "schemaVersion",
  "candidateId",
  "projectId",
  "documentId",
  "baseRevision",
  "baseFingerprint",
  "candidateSequence",
  "capturedAt",
  "proposedProject",
]) {
  const missing = asRaw();
  delete missing[key];
  assert.equal(
    parseLocalScoreProjectRecoveryCandidate(missing),
    null,
    `缺少 ${key} 必须拒绝`,
  );
}

const extra = asRaw();
extra.unexpected = true;
assert.equal(parseLocalScoreProjectRecoveryCandidate(extra), null);

for (const candidateId of ["", "x".repeat(129), 42, null]) {
  const invalid = asRaw();
  invalid.candidateId = candidateId;
  assert.equal(parseLocalScoreProjectRecoveryCandidate(invalid), null);
}

for (const baseRevision of [
  0,
  -1,
  1.5,
  Number.NaN,
  Number.MAX_SAFE_INTEGER,
]) {
  const invalid = asRaw();
  invalid.baseRevision = baseRevision;
  assert.equal(parseLocalScoreProjectRecoveryCandidate(invalid), null);
}

for (const candidateSequence of [0, -1, 1.5, Number.NaN]) {
  const invalid = asRaw();
  invalid.candidateSequence = candidateSequence;
  assert.equal(parseLocalScoreProjectRecoveryCandidate(invalid), null);
}
const maxSequence = asRaw();
maxSequence.candidateSequence = Number.MAX_SAFE_INTEGER;
assert.equal(parseLocalScoreProjectRecoveryCandidate(maxSequence), null);

for (const capturedAt of [
  "",
  "2026-07-25",
  "2026-07-25T01:00:03Z",
  "not-a-date",
  42,
]) {
  const invalid = asRaw();
  invalid.capturedAt = capturedAt;
  assert.equal(parseLocalScoreProjectRecoveryCandidate(invalid), null);
}

const future = asRaw();
future.schemaVersion = "local-score-project-recovery-v2";
assert.equal(parseLocalScoreProjectRecoveryCandidate(future), null);

const mismatchedProject = asRaw();
mismatchedProject.projectId = "other-project";
assert.equal(parseLocalScoreProjectRecoveryCandidate(mismatchedProject), null);

const mismatchedDocument = asRaw();
mismatchedDocument.documentId = "local.score-project.other-project";
assert.equal(parseLocalScoreProjectRecoveryCandidate(mismatchedDocument), null);

const discontinuousRevision = asRaw();
discontinuousRevision.baseRevision = 1;
assert.equal(
  parseLocalScoreProjectRecoveryCandidate(discontinuousRevision),
  null,
);

for (const baseFingerprint of [
  "",
  "fnv1a64x2-u16le:abc:def",
  "fnv1a64x2-u16le:000000000000000g:0000000000000000",
  "FNV1A64X2-U16LE:0000000000000000:0000000000000000",
  42,
]) {
  const invalid = asRaw();
  invalid.baseFingerprint = baseFingerprint;
  assert.equal(parseLocalScoreProjectRecoveryCandidate(invalid), null);
}

const tamperedFingerprint = asRaw();
tamperedFingerprint.baseFingerprint =
  `${candidate.baseFingerprint.slice(0, -1)}${
    candidate.baseFingerprint.endsWith("0") ? "1" : "0"
  }`;
assert.notEqual(
  tamperedFingerprint.baseFingerprint,
  candidate.baseFingerprint,
);
assert.equal(
  parseLocalScoreProjectRecoveryCandidate(tamperedFingerprint, keyed),
  null,
  "有 canonical base 时必须拒绝格式合法但内容被篡改的 fingerprint",
);

const corruptProject = asRaw();
const corruptProposed = corruptProject.proposedProject as {
  document: { keySignature?: unknown };
};
delete corruptProposed.document.keySignature;
assert.equal(parseLocalScoreProjectRecoveryCandidate(corruptProject), null);

assert.throws(
  () => createLocalScoreProjectRecoveryCandidate({
    candidateId: "bad-candidate",
    candidateSequence: 1,
    capturedAt: "2026-07-25T01:00:03.000Z",
    baseProject: initial,
    proposedProject: proposed,
  }),
  /恢复候选无效/,
);

const unrelatedBase = createLocalScoreProject({
  projectId: "unrelated-project",
  title: "无关合法项目",
  now: "2026-07-25T01:00:00.000Z",
});
assert.throws(
  () => createLocalScoreProjectRecoveryCandidate({
    candidateId: "unrelated-base",
    candidateSequence: 1,
    capturedAt: "2026-07-25T01:00:03.000Z",
    baseProject: unrelatedBase,
    proposedProject: proposed,
  }),
  /恢复候选无效/,
);

const changedCreatedAt = structuredClone(proposed);
assert.equal(
  Reflect.set(
    changedCreatedAt,
    "createdAt",
    "2026-07-25T00:59:00.000Z",
  ),
  true,
);
assert.throws(
  () => createLocalScoreProjectRecoveryCandidate({
    candidateId: "changed-created-at",
    candidateSequence: 1,
    capturedAt: "2026-07-25T01:00:03.000Z",
    baseProject: keyed,
    proposedProject: changedCreatedAt,
  }),
  /恢复候选无效/,
);

const recreatedIdentityInitial = createLocalScoreProject({
  projectId: keyed.projectId,
  title: "重建但内容不同",
  now: initial.createdAt,
});
const recreatedIdentityBase = changeLocalScoreProjectKeySignature({
  project: recreatedIdentityInitial,
  expectedRevision: 1,
  keySignature: { fifths: -1 },
  now: "2026-07-25T01:00:01.000Z",
});
assert.equal(recreatedIdentityBase.projectId, keyed.projectId);
assert.equal(
  recreatedIdentityBase.document.documentId,
  keyed.document.documentId,
);
assert.equal(
  recreatedIdentityBase.document.revision,
  keyed.document.revision,
);
assert.notEqual(
  getLocalScoreProjectRecoveryBaseFingerprint(recreatedIdentityBase),
  getLocalScoreProjectRecoveryBaseFingerprint(keyed),
);
const recreatedIdentityCandidate =
  createLocalScoreProjectRecoveryCandidate({
    candidateId: "recreated-identity",
    candidateSequence: 1,
    capturedAt: "2026-07-25T01:00:03.000Z",
    baseProject: recreatedIdentityBase,
    proposedProject: proposed,
  });
assert.equal(
  parseLocalScoreProjectRecoveryCandidate(
    recreatedIdentityCandidate,
    keyed,
  ),
  null,
  "重建相同 ID/revision 不能绕过 canonical base fingerprint",
);

console.log("Local score project recovery candidate tests passed.");
