import assert from "node:assert/strict";

import {
  LOCAL_SCORE_PROJECT_TEMPLATES,
  LocalScoreProjectTemplateError,
  createLocalScoreProjectFromTemplate,
  getLocalScoreProjectTemplate,
  isLocalScoreProjectTemplate,
} from "../lib/music/localScoreProjectTemplate";
import {
  parseLocalScoreProject,
  serializeLocalScoreProject,
} from "../lib/music/localScoreProject";

assert.ok(
  LOCAL_SCORE_PROJECT_TEMPLATES.length >= 18,
  "原创 pitched 五线谱模板必须至少 18 个",
);
assert.equal(
  new Set(LOCAL_SCORE_PROJECT_TEMPLATES.map((template) => template.id)).size,
  LOCAL_SCORE_PROJECT_TEMPLATES.length,
);
assert.equal(
  new Set(
    LOCAL_SCORE_PROJECT_TEMPLATES.map((template) => template.displayName),
  ).size,
  LOCAL_SCORE_PROJECT_TEMPLATES.length,
);
assert.ok(LOCAL_SCORE_PROJECT_TEMPLATES.every(isLocalScoreProjectTemplate));
assert.ok(Object.isFrozen(LOCAL_SCORE_PROJECT_TEMPLATES));
assert.ok(LOCAL_SCORE_PROJECT_TEMPLATES.every((template) =>
  Object.isFrozen(template)
  && Object.isFrozen(template.parts)
  && template.parts.every((part) =>
    Object.isFrozen(part)
    && Object.isFrozen(part.instrument)
    && Object.isFrozen(part.staves)
    && part.staves.every(Object.isFrozen))));
assert.ok(LOCAL_SCORE_PROJECT_TEMPLATES.every((template) =>
  template.parts.every((part) =>
    part.staves.every((staff) => staff.staffKind === "pitched"))));

const createIdFactory = () => {
  let index = 0;
  return () => `template-${++index}`;
};

LOCAL_SCORE_PROJECT_TEMPLATES.forEach((template, index) => {
  const project = createLocalScoreProjectFromTemplate({
    projectId: `template-project-${index + 1}`,
    title: `模板项目 ${index + 1}`,
    templateId: template.id,
    now: `2026-07-26T00:${String(index).padStart(2, "0")}:00.000Z`,
    createStructureId: createIdFactory(),
  });
  assert.equal(project.schemaVersion, "local-score-project-storage-v10");
  assert.equal(project.document.schemaVersion, "score-document-v9");
  assert.equal(project.document.revision, 1);
  assert.equal(project.undoStack.length, 0);
  assert.equal(project.redoStack.length, 0);
  assert.equal(project.tempoBpm, template.tempoBpm);
  assert.equal(project.document.meter, template.meter);
  assert.deepEqual(project.document.keySignature, template.keySignature);
  assert.equal(project.document.parts.length, template.parts.length);
  assert.ok(project.document.parts.every((part) =>
    part.staves.every((staff) =>
      staff.staffKind === "pitched"
      && staff.voices.every((voice) =>
        voice.measures.length === 1
        && voice.measures[0]?.measureNumber === 1
        && voice.measures[0]?.events.length === 0))));
  const partIds = project.document.parts.map((part) => part.partId);
  const staffIds = project.document.parts.flatMap((part) =>
    part.staves.map((staff) => staff.staffId));
  const voiceIds = project.document.parts.flatMap((part) =>
    part.staves.flatMap((staff) =>
      staff.voices.map((voice) => voice.voiceId)));
  assert.equal(new Set(partIds).size, partIds.length);
  assert.equal(new Set(staffIds).size, staffIds.length);
  assert.equal(new Set(voiceIds).size, voiceIds.length);
  assert.ok(partIds.every((id) => id.startsWith("part-")));
  assert.ok(staffIds.every((id) => id.startsWith("staff-")));
  assert.ok(voiceIds.every((id) => id.startsWith("voice-")));

  const serialized = serializeLocalScoreProject(project);
  assert.doesNotMatch(serialized, new RegExp(template.id));
  assert.deepEqual(parseLocalScoreProject(JSON.parse(serialized)), project);
  assert.notEqual(
    project.document.keySignature,
    template.keySignature,
    "项目必须深拷贝模板调号",
  );
  project.document.parts.forEach((part, partIndex) => {
    assert.notEqual(
      part.instrument,
      template.parts[partIndex]?.instrument,
      "项目必须深拷贝模板乐器归属",
    );
  });
});

const piano = getLocalScoreProjectTemplate("piano-v1");
assert.ok(piano);
assert.equal(piano.parts.length, 1);
assert.deepEqual(
  piano.parts[0]?.staves.map((staff) => staff.clef),
  ["treble", "bass"],
);
const polyphonicPiano = getLocalScoreProjectTemplate(
  "piano-four-voice-writing-v1",
);
assert.deepEqual(
  polyphonicPiano?.parts[0]?.staves.map((staff) => staff.voiceCount),
  [2, 2],
);
assert.equal(
  getLocalScoreProjectTemplate("piano-string-quartet-v1")?.parts.length,
  5,
);
assert.equal(getLocalScoreProjectTemplate("missing-template"), null);

const validTemplate = structuredClone(LOCAL_SCORE_PROJECT_TEMPLATES[0]);
for (const mutate of [
  (value: Record<string, unknown>) => { value.extra = true; },
  (value: Record<string, unknown>) => { value.id = "Invalid ID"; },
  (value: Record<string, unknown>) => { value.displayName = ""; },
  (value: Record<string, unknown>) => { value.summary = "含\n换行"; },
  (value: Record<string, unknown>) => { value.tempoBpm = 29; },
  (value: Record<string, unknown>) => { value.meter = "5/4"; },
  (value: Record<string, unknown>) => { value.keySignature = { fifths: 2 }; },
  (value: Record<string, unknown>) => { value.parts = []; },
] as const) {
  const invalid = structuredClone(validTemplate) as unknown as
    Record<string, unknown>;
  mutate(invalid);
  assert.equal(isLocalScoreProjectTemplate(invalid), false);
}
for (const invalidPart of [
  { name: "", instrument: { kind: "unassigned" }, staves: [] },
  {
    name: "非法谱种",
    instrument: { kind: "unassigned" },
    staves: [{ staffKind: "tab", clef: "treble", voiceCount: 1 }],
  },
  {
    name: "非法乐器",
    instrument: { kind: "gm1-program", program: 128 },
    staves: [{ staffKind: "pitched", clef: "treble", voiceCount: 1 }],
  },
  {
    name: "非法声部数",
    instrument: { kind: "unassigned" },
    staves: [{ staffKind: "pitched", clef: "treble", voiceCount: 0 }],
  },
]) {
  const invalid = structuredClone(validTemplate) as unknown as {
    parts: unknown[];
  };
  invalid.parts = [invalidPart];
  assert.equal(isLocalScoreProjectTemplate(invalid), false);
}

assert.throws(
  () => createLocalScoreProjectFromTemplate({
    projectId: "unknown-template-project",
    title: "不存在的模板",
    templateId: "missing-template",
    now: "2026-07-26T01:00:00.000Z",
    createStructureId: createIdFactory(),
  }),
  LocalScoreProjectTemplateError,
);
for (const createStructureId of [
  () => "",
  () => "含空格 id",
  () => "x".repeat(128),
]) {
  assert.throws(
    () => createLocalScoreProjectFromTemplate({
      projectId: "invalid-id-project",
      title: "非法标识",
      templateId: "blank-treble-staff-v1",
      now: "2026-07-26T01:00:00.000Z",
      createStructureId,
    }),
    LocalScoreProjectTemplateError,
  );
}
assert.throws(
  () => createLocalScoreProjectFromTemplate({
    projectId: "duplicate-id-project",
    title: "重复标识",
    templateId: "two-pianos-v1",
    now: "2026-07-26T01:00:00.000Z",
    createStructureId: () => "same",
  }),
  LocalScoreProjectTemplateError,
);
let generatedCount = 0;
assert.throws(
  () => createLocalScoreProjectFromTemplate({
    projectId: "throwing-id-project",
    title: "中断标识",
    templateId: "piano-v1",
    now: "2026-07-26T01:00:00.000Z",
    createStructureId: () => {
      generatedCount += 1;
      if (generatedCount === 3) throw new Error("generator failed");
      return `before-throw-${generatedCount}`;
    },
  }),
  LocalScoreProjectTemplateError,
);

console.log("Local score project template domain tests passed.");
