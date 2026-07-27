import assert from "node:assert/strict";

import {
  LOCAL_SCORE_PROJECT_MAX_CREATORS,
  LOCAL_SCORE_PROJECT_MAX_CREATOR_NAME_CODE_POINTS,
  LOCAL_SCORE_PROJECT_MAX_RIGHTS_NOTICE_CODE_POINTS,
  LOCAL_SCORE_PROJECT_MAX_SCORE_SUBTITLE_CODE_POINTS,
  LOCAL_SCORE_PROJECT_MAX_SCORE_TITLE_CODE_POINTS,
  LocalScoreProjectConflictError,
  LocalScoreProjectDomainError,
  addLocalScoreProjectEvent,
  changeLocalScoreProjectScoreCredits,
  createLocalScoreProject,
  getLocalScoreProjectContent,
  isLocalScoreProjectScoreCredits,
  parseLocalScoreProject,
  redoLocalScoreProject,
  renameLocalScoreProject,
  serializeLocalScoreProject,
  undoLocalScoreProject,
  type LocalScoreProjectScoreCredits,
} from "../lib/music/localScoreProject";

const createdAt = "2026-07-26T00:00:00.000Z";
const project = createLocalScoreProject({
  projectId: "credits",
  title: "本机项目名",
  now: createdAt,
});

assert.equal(project.schemaVersion, "local-score-project-storage-v13");
assert.equal(project.document.schemaVersion, "score-document-v12");
assert.deepEqual(project.document.scoreCredits, {
  title: "本机项目名",
  subtitle: null,
  creators: [],
  rightsNotice: null,
});

const credits: LocalScoreProjectScoreCredits = {
  title: "春日组曲",
  subtitle: "为弦乐三重奏而作",
  creators: [
    { role: "composer", name: "甲" },
    { role: "composer", name: "乙" },
    { role: "lyricist", name: "丙" },
    { role: "arranger", name: "丁" },
  ],
  rightsNotice: "版权所有，仅限私人练习。",
};
const changed = changeLocalScoreProjectScoreCredits({
  project,
  expectedRevision: 1,
  scoreCredits: credits,
  now: "2026-07-26T00:00:01.000Z",
});
assert.equal(changed.document.revision, 2);
assert.equal(changed.updatedAt, "2026-07-26T00:00:01.000Z");
assert.equal(changed.title, "本机项目名", "谱面标题不得重命名本机项目");
assert.deepEqual(changed.document.scoreCredits, credits);
assert.deepEqual(changed.document.parts, project.document.parts);
assert.equal(changed.document.meter, project.document.meter);
assert.deepEqual(changed.document.keySignature, project.document.keySignature);
assert.deepEqual(changed.undoStack[0]?.scoreCredits, project.document.scoreCredits);
assert.equal(changed.redoStack.length, 0);

const clonedInput = {
  title: "  春日组曲  ",
  subtitle: "   ",
  creators: [{ role: "composer" as const, name: "  甲  " }],
  rightsNotice: "  保留所有权利  ",
};
const normalized = changeLocalScoreProjectScoreCredits({
  project,
  expectedRevision: 1,
  scoreCredits: clonedInput,
  now: "2026-07-26T00:00:01.000Z",
});
assert.deepEqual(normalized.document.scoreCredits, {
  title: "春日组曲",
  subtitle: null,
  creators: [{ role: "composer", name: "甲" }],
  rightsNotice: "保留所有权利",
});
assert.deepEqual(clonedInput, {
  title: "  春日组曲  ",
  subtitle: "   ",
  creators: [{ role: "composer", name: "  甲  " }],
  rightsNotice: "  保留所有权利  ",
}, "规范化不得修改调用方输入");

const noop = changeLocalScoreProjectScoreCredits({
  project: normalized,
  expectedRevision: 2,
  scoreCredits: {
    title: " 春日组曲 ",
    subtitle: "",
    creators: [{ role: "composer", name: "甲" }],
    rightsNotice: "保留所有权利",
  },
  now: "2026-07-26T00:00:02.000Z",
});
assert.equal(noop, normalized, "规范化后相同必须返回原项目");

assert.throws(
  () => changeLocalScoreProjectScoreCredits({
    project,
    expectedRevision: 0,
    scoreCredits: credits,
    now: "2026-07-26T00:00:01.000Z",
  }),
  LocalScoreProjectConflictError,
);
assert.throws(
  () => changeLocalScoreProjectScoreCredits({
    project,
    expectedRevision: 1,
    scoreCredits: credits,
    now: "2026-07-25T23:59:59.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "clock-regression",
);

const invalidCredits: unknown[] = [
  { ...credits, title: "" },
  { ...credits, title: "a".repeat(LOCAL_SCORE_PROJECT_MAX_SCORE_TITLE_CODE_POINTS + 1) },
  { ...credits, subtitle: "a".repeat(LOCAL_SCORE_PROJECT_MAX_SCORE_SUBTITLE_CODE_POINTS + 1) },
  { ...credits, rightsNotice: "a".repeat(LOCAL_SCORE_PROJECT_MAX_RIGHTS_NOTICE_CODE_POINTS + 1) },
  { ...credits, title: "标题\n换行" },
  { ...credits, subtitle: "\u0085" },
  { ...credits, creators: [{ role: "composer", name: "" }] },
  {
    ...credits,
    creators: [{
      role: "composer",
      name: "😀".repeat(LOCAL_SCORE_PROJECT_MAX_CREATOR_NAME_CODE_POINTS + 1),
    }],
  },
  { ...credits, creators: [{ role: "publisher", name: "甲" }] },
  {
    ...credits,
    creators: [
      { role: "composer", name: "甲" },
      { role: "composer", name: " 甲 " },
    ],
  },
  {
    ...credits,
    creators: Array.from(
      { length: LOCAL_SCORE_PROJECT_MAX_CREATORS + 1 },
      (_, index) => ({ role: "composer", name: `作者${index}` }),
    ),
  },
  { ...credits, extra: true },
  {
    ...credits,
    creators: [{ role: "composer", name: "甲", extra: true }],
  },
];
for (const invalid of invalidCredits) {
  assert.equal(isLocalScoreProjectScoreCredits(invalid), false);
  assert.throws(
    () => changeLocalScoreProjectScoreCredits({
      project,
      expectedRevision: 1,
      scoreCredits: invalid as LocalScoreProjectScoreCredits,
      now: "2026-07-26T00:00:01.000Z",
    }),
    (error) =>
      error instanceof LocalScoreProjectDomainError
      && error.code === "invalid-input",
  );
}
assert.equal(isLocalScoreProjectScoreCredits({
  title: "😀".repeat(LOCAL_SCORE_PROJECT_MAX_SCORE_TITLE_CODE_POINTS),
  subtitle: "😀".repeat(LOCAL_SCORE_PROJECT_MAX_SCORE_SUBTITLE_CODE_POINTS),
  creators: Array.from(
    { length: LOCAL_SCORE_PROJECT_MAX_CREATORS },
    (_, index) => ({ role: "arranger", name: `编曲${index}` }),
  ),
  rightsNotice: "😀".repeat(LOCAL_SCORE_PROJECT_MAX_RIGHTS_NOTICE_CODE_POINTS),
}), true, "所有 Unicode code point 上界必须可用");

const undone = undoLocalScoreProject({
  project: changed,
  expectedRevision: 2,
  now: "2026-07-26T00:00:02.000Z",
});
assert.equal(undone.document.revision, 3);
assert.deepEqual(undone.document.scoreCredits, project.document.scoreCredits);
assert.deepEqual(undone.redoStack[0]?.scoreCredits, credits);
const redone = redoLocalScoreProject({
  project: undone,
  expectedRevision: 3,
  now: "2026-07-26T00:00:03.000Z",
});
assert.equal(redone.document.revision, 4);
assert.deepEqual(redone.document.scoreCredits, credits);

const editedAfterUndo = changeLocalScoreProjectScoreCredits({
  project: undone,
  expectedRevision: 3,
  scoreCredits: {
    ...undone.document.scoreCredits,
    title: "另一个标题",
  },
  now: "2026-07-26T00:00:03.000Z",
});
assert.equal(editedAfterUndo.redoStack.length, 0);

const renamed = renameLocalScoreProject({
  project: changed,
  expectedRevision: 2,
  title: "新的本机项目名",
  now: "2026-07-26T00:00:02.000Z",
});
assert.equal(renamed.title, "新的本机项目名");
assert.deepEqual(renamed.document.scoreCredits, credits);

const withNote = addLocalScoreProjectEvent({
  project,
  expectedRevision: 1,
  location: {
    partId: "part-1",
    staffId: "staff-1",
    voiceId: "voice-1",
    measureNumber: 1,
  },
  eventId: "note-1",
  input: { type: "note", pitch: "C4", duration: "quarter" },
  now: "2026-07-26T00:00:01.000Z",
});
const withRedo = undoLocalScoreProject({
  project: withNote,
  expectedRevision: 2,
  now: "2026-07-26T00:00:02.000Z",
});
const previousStorage = JSON.parse(serializeLocalScoreProject(withRedo)) as {
  schemaVersion: string;
  title: string;
  document: Record<string, unknown>;
  undoStack: Record<string, unknown>[];
  redoStack: Record<string, unknown>[];
};
previousStorage.schemaVersion = "local-score-project-storage-v6";
previousStorage.document.schemaVersion = "score-document-v5";
delete previousStorage.document.scoreCredits;
for (const content of [
  ...previousStorage.undoStack,
  ...previousStorage.redoStack,
]) delete content.scoreCredits;
const beforeMigration = JSON.stringify(previousStorage);
const migrated = parseLocalScoreProject(previousStorage);
assert.ok(migrated);
assert.equal(JSON.stringify(previousStorage), beforeMigration);
assert.equal(migrated.schemaVersion, "local-score-project-storage-v13");
assert.equal(migrated.document.schemaVersion, "score-document-v12");
assert.deepEqual(migrated.document.scoreCredits, {
  title: previousStorage.title,
  subtitle: null,
  creators: [],
  rightsNotice: null,
});
for (const content of [...migrated.undoStack, ...migrated.redoStack]) {
  assert.deepEqual(content.scoreCredits, migrated.document.scoreCredits);
}

const clone = getLocalScoreProjectContent(changed);
assert.notEqual(clone.scoreCredits, changed.document.scoreCredits);
assert.notEqual(clone.scoreCredits.creators, changed.document.scoreCredits.creators);
assert.deepEqual(clone.scoreCredits, changed.document.scoreCredits);

const invalidStoredCredits = JSON.parse(serializeLocalScoreProject(changed)) as {
  document: { scoreCredits: Record<string, unknown> };
};
invalidStoredCredits.document.scoreCredits.extra = true;
assert.equal(parseLocalScoreProject(invalidStoredCredits), null);
const invalidStoredHistory = JSON.parse(serializeLocalScoreProject(changed)) as {
  undoStack: { scoreCredits: { creators: unknown[] } }[];
};
invalidStoredHistory.undoStack[0]!.scoreCredits.creators = [
  { role: "composer", name: "甲" },
  { role: "composer", name: "甲" },
];
assert.equal(parseLocalScoreProject(invalidStoredHistory), null);

console.log("local score project score credits tests passed");
