import assert from "node:assert/strict";
import { DOMParser as XmlDomParser } from "@xmldom/xmldom";

import {
  confirmLocalScoreProjectMusicXmlImportDraft,
  createLocalScoreProjectMusicXmlImportDraft,
  type LocalScoreProjectMusicXmlImportDraft,
} from "../lib/music/localScoreProjectMusicXmlImport";
import {
  LOCAL_SCORE_PROJECT_SCHEMA_VERSION,
  parseLocalScoreProject,
} from "../lib/music/localScoreProject";

if (typeof globalThis.DOMParser === "undefined") {
  class QuietXmlDomParser extends XmlDomParser {
    constructor() {
      super({
        onError: (_level, message) => {
          throw new Error(message);
        },
      });
    }
  }
  (globalThis as { DOMParser?: unknown }).DOMParser = QuietXmlDomParser;
}

const supportedXml = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>练习</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>2</divisions>
        <key><fifths>1</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type><notations><fermata/></notations></note>
      <note><rest/><duration>2</duration><voice>1</voice><type>quarter</type><notations><fermata/></notations></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
    </measure>
    <measure number="2">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
    </measure>
  </part>
</score-partwise>`;

let eventSequence = 0;
const ready = createLocalScoreProjectMusicXmlImportDraft({
  xml: supportedXml,
  fileName: "我的练习.musicxml",
  sourceFormat: "musicxml",
  projectId: "import-project-1",
  now: "2026-07-27T08:00:00.000Z",
  createEventId: () => `import-event-${++eventSequence}`,
});
assert.equal(ready.status, "ready");
assert.ok(ready.project);
assert.equal(ready.fingerprint?.startsWith(
  "local-score-project-musicxml-import-v1:",
), true);
assert.deepEqual(ready.summary, { measureCount: 2, eventCount: 5 });
assert.deepEqual(ready.issues, []);
assert.equal(ready.sourceFormat, "musicxml");
assert.equal(ready.fileName, "我的练习.musicxml");
assert.equal(ready.project?.schemaVersion, LOCAL_SCORE_PROJECT_SCHEMA_VERSION);
assert.equal(ready.project?.document.schemaVersion, "score-document-v13");
assert.equal(ready.project?.document.revision, 1);
assert.equal(ready.project?.document.meter, "4/4");
assert.deepEqual(ready.project?.document.keySignature, { fifths: 1 });
assert.equal(ready.project?.document.parts[0]?.staves[0]?.clef, "treble");
assert.deepEqual(
  ready.project?.document.parts[0]?.staves[0]?.voices[0]?.measures
    .flatMap((measure) => measure.events)
    .map((event) => [
      event.type,
      event.pitch,
      event.duration,
      event.measure,
      event.fermataMark,
    ]),
  [
    ["note", "C4", "quarter", 1, "fermata"],
    ["rest", null, "quarter", 1, "fermata"],
    ["note", "D4", "half", 1, null],
    ["note", "E4", "eighth", 2, null],
    ["note", "F4", "eighth", 2, null],
  ],
);
assert.deepEqual(ready.project?.undoStack, []);
assert.deepEqual(ready.project?.redoStack, []);
assert.ok(parseLocalScoreProject(ready.project));

const strictSlurXml = supportedXml
  .replace(
    "<type>half</type></note>",
    '<type>half</type><notations><fermata/><slur type="start"/></notations></note>',
  )
  .replace(
    "<type>eighth</type></note>",
    '<type>eighth</type><notations><fermata/><slur type="stop"/><slur type="start"/></notations></note>',
  )
  .replace(
    "<type>eighth</type></note>",
    '<type>eighth</type><notations><slur type="stop"/></notations></note>',
  );
let slurEventSequence = 0;
const strictSlurReady = createLocalScoreProjectMusicXmlImportDraft({
  xml: strictSlurXml,
  fileName: "跨小节圆滑线.musicxml",
  sourceFormat: "musicxml",
  projectId: "import-project-slur",
  now: "2026-07-27T08:00:30.000Z",
  createEventId: () => `slur-event-${++slurEventSequence}`,
});
assert.equal(strictSlurReady.status, "ready");
assert.deepEqual(strictSlurReady.issues, []);
assert.deepEqual(
  strictSlurReady.project?.document.parts[0].staves[0].voices[0].measures
    .map((measure) => ({
      measureNumber: measure.measureNumber,
      events: measure.events.map((event) => ({
        type: event.type,
        pitch: event.pitch,
        fermataMark: event.fermataMark,
        slurToNext: event.type === "note" ? event.slurToNext : null,
      })),
    })),
  [
    {
      measureNumber: 1,
      events: [
        {
          type: "note",
          pitch: "C4",
          fermataMark: "fermata",
          slurToNext: false,
        },
        {
          type: "rest",
          pitch: null,
          fermataMark: "fermata",
          slurToNext: null,
        },
        {
          type: "note",
          pitch: "D4",
          fermataMark: "fermata",
          slurToNext: true,
        },
      ],
    },
    {
      measureNumber: 2,
      events: [
        {
          type: "note",
          pitch: "E4",
          fermataMark: "fermata",
          slurToNext: true,
        },
        {
          type: "note",
          pitch: "F4",
          fermataMark: null,
          slurToNext: false,
        },
      ],
    },
  ],
  "strict slur import must preserve cross-measure chains and fermata coexistence",
);

const strictTieXml = supportedXml
  .replace(
    "<note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>",
    '<note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><tie type="start"/><voice>1</voice><type>half</type><notations><fermata/><tied type="start"/><slur type="start"/></notations></note>',
  )
  .replace(
    "<note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>",
    '<note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><tie type="stop"/><tie type="start"/><voice>1</voice><type>eighth</type><notations><fermata/><tied type="stop"/><tied type="start"/><slur type="stop"/><slur type="start"/></notations></note>',
  )
  .replace(
    "<note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>",
    '<note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><tie type="stop"/><voice>1</voice><type>eighth</type><notations><tied type="stop"/><slur type="stop"/></notations></note>',
  );
let tieEventSequence = 0;
const strictTieReady = createLocalScoreProjectMusicXmlImportDraft({
  xml: strictTieXml,
  fileName: "跨小节链式延音线.musicxml",
  sourceFormat: "musicxml",
  projectId: "import-project-tie",
  now: "2026-07-27T08:00:45.000Z",
  createEventId: () => `tie-event-${++tieEventSequence}`,
});
assert.equal(strictTieReady.status, "ready");
assert.deepEqual(strictTieReady.issues, []);
assert.deepEqual(
  strictTieReady.project?.document.parts[0].staves[0].voices[0].measures
    .flatMap((measure) => measure.events)
    .map((event) => ({
      type: event.type,
      pitch: event.pitch,
      fermataMark: event.fermataMark,
      tieToNext: event.type === "note" ? event.tieToNext : null,
      slurToNext: event.type === "note" ? event.slurToNext : null,
    })),
  [
    {
      type: "note",
      pitch: "C4",
      fermataMark: "fermata",
      tieToNext: false,
      slurToNext: false,
    },
    {
      type: "rest",
      pitch: null,
      fermataMark: "fermata",
      tieToNext: null,
      slurToNext: null,
    },
    {
      type: "note",
      pitch: "D4",
      fermataMark: "fermata",
      tieToNext: true,
      slurToNext: true,
    },
    {
      type: "note",
      pitch: "D4",
      fermataMark: "fermata",
      tieToNext: true,
      slurToNext: true,
    },
    {
      type: "note",
      pitch: "D4",
      fermataMark: null,
      tieToNext: false,
      slurToNext: false,
    },
  ],
  "strict tie import must preserve cross-measure chains and coexist with fermata/slur",
);

let metadataEventSequence = 0;
const metadataReady = createLocalScoreProjectMusicXmlImportDraft({
  xml: supportedXml
    .replace(
      "<score-partwise version=\"4.0\">",
      "<score-partwise version=\"4.0\"><work><work-title>标题 &amp; 练习 &#x97F3;</work-title></work>",
    )
    .replace("<part-name>练习</part-name>", "<part-name>钢琴 &lt;主部&gt;</part-name>"),
  fileName: "文件名不应覆盖标题.musicxml",
  sourceFormat: "musicxml",
  projectId: "import-project-metadata",
  now: "2026-07-27T08:00:00.000Z",
  createEventId: () => `metadata-event-${++metadataEventSequence}`,
});
assert.equal(metadataReady.status, "ready");
assert.equal(metadataReady.project?.title, "标题 & 练习 音");
assert.equal(metadataReady.project?.document.scoreCredits.title, "标题 & 练习 音");
assert.equal(metadataReady.project?.document.parts[0]?.name, "钢琴 <主部>");

eventSequence = 0;
const mxlEquivalent = createLocalScoreProjectMusicXmlImportDraft({
  xml: supportedXml,
  fileName: "我的练习.mxl",
  sourceFormat: "mxl",
  projectId: "import-project-1",
  now: "2026-07-27T08:00:00.000Z",
  createEventId: () => `import-event-${++eventSequence}`,
});
assert.equal(mxlEquivalent.status, "ready");
assert.deepEqual(
  mxlEquivalent.project,
  ready.project,
  "相同 XML 内容经 MXL 解包后必须生成等价 canonical",
);

const confirmed = confirmLocalScoreProjectMusicXmlImportDraft(ready);
assert.deepEqual(confirmed, ready.project);
assert.notEqual(confirmed, ready.project, "确认必须返回隔离 clone");

const blockedXml = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>阻断样本</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>2</divisions>
        <key><fifths>3</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <backup><duration>2</duration></backup>
      <forward><duration>2</duration></forward>
      <note><grace/><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><voice>2</voice><type>quarter</type></note>
      <note><chord/><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>2</duration><voice>2</voice><type>quarter</type><dot/></note>
      <note><chord/><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><voice>2</voice><type>quarter</type><notations><tuplet type="start"/></notations></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>8</duration><voice>2</voice><type>whole</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>2</duration><voice>2</voice><type>quarter</type></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><voice>2</voice><type>quarter</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>2</duration><voice>2</voice><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>`;
let blockedIdCalls = 0;
const blockedArgs = {
  xml: blockedXml,
  fileName: "blocked.xml",
  sourceFormat: "xml" as const,
  projectId: "import-project-blocked",
  now: "2026-07-27T08:05:00.000Z",
  createEventId: () => {
    blockedIdCalls += 1;
    return `should-not-be-used-${blockedIdCalls}`;
  },
};
const blockedArgsSnapshot = {
  xml: blockedArgs.xml,
  fileName: blockedArgs.fileName,
  sourceFormat: blockedArgs.sourceFormat,
  projectId: blockedArgs.projectId,
  now: blockedArgs.now,
};
const blocked = createLocalScoreProjectMusicXmlImportDraft(blockedArgs);
assert.equal(blocked.status, "blocked");
assert.equal(blocked.project, null);
assert.equal(blocked.fingerprint, null);
assert.equal(blockedIdCalls, 0, "阻断输入不得分配 canonical event id");
assert.deepEqual(
  {
    xml: blockedArgs.xml,
    fileName: blockedArgs.fileName,
    sourceFormat: blockedArgs.sourceFormat,
    projectId: blockedArgs.projectId,
    now: blockedArgs.now,
  },
  blockedArgsSnapshot,
  "导入不得修改输入参数",
);
const blockingCodes = blocked.issues
  .filter((issue) => issue.severity === "blocking")
  .map((issue) => issue.code);
for (const code of [
  "unsupported-key-signature",
  "unsupported-voice-count",
  "unsupported-backup",
  "unsupported-forward",
  "unsupported-grace",
  "unsupported-chord",
  "unsupported-dot",
  "unsupported-tuplet",
  "unsupported-pitch",
  "unsupported-duration",
  "overfull-measure",
]) {
  assert.ok(blockingCodes.includes(code), `缺少 blocking ledger code: ${code}`);
}
assert.equal(
  blockingCodes.filter((code) => code === "unsupported-chord").length,
  2,
  "每个 chord 必须形成独立 ledger 项",
);
assert.throws(
  () => confirmLocalScoreProjectMusicXmlImportDraft(blocked),
  /阻断问题/,
);

const tampered = {
  ...ready,
  project: ready.project
    ? { ...ready.project, title: "未重新检查的标题" }
    : null,
} satisfies LocalScoreProjectMusicXmlImportDraft;
assert.throws(
  () => confirmLocalScoreProjectMusicXmlImportDraft(tampered),
  /已变化/,
);

const invalidCanonical = {
  ...ready,
  project: ready.project
    ? {
      ...ready.project,
      document: {
        ...ready.project.document,
        parts: [{
          ...ready.project.document.parts[0],
          staves: [{
            ...ready.project.document.parts[0].staves[0],
            voices: [{
              ...ready.project.document.parts[0].staves[0].voices[0],
              measures: [{
                ...ready.project.document.parts[0].staves[0].voices[0].measures[0],
                events: [{
                  ...ready.project.document.parts[0].staves[0].voices[0]
                    .measures[0].events[0],
                  pitch: "F#4",
                }],
              }],
            }],
          }],
        }],
      },
    } as unknown as NonNullable<LocalScoreProjectMusicXmlImportDraft["project"]>
    : null,
} satisfies LocalScoreProjectMusicXmlImportDraft;
assert.throws(
  () => confirmLocalScoreProjectMusicXmlImportDraft(invalidCanonical),
  /canonical/,
);

for (const [element, code] of [
  ["<lyric><text>la</text></lyric>", "unsupported-lyric"],
  ["<notations><technical><fingering>1</fingering></technical></notations>", "unsupported-fingering"],
  ["<notations><articulations><accent/></articulations></notations>", "unsupported-articulation"],
  ["<accidental>sharp</accidental>", "unsupported-accidental"],
  ["<cue/>", "unsupported-element"],
] as const) {
  const semanticXml = supportedXml.replace(
    "<type>half</type></note>",
    `<type>half</type>${element}</note>`,
  );
  const semanticDraft = createLocalScoreProjectMusicXmlImportDraft({
    xml: semanticXml,
    fileName: "semantic.musicxml",
    sourceFormat: "musicxml",
    projectId: `blocked-${code}`,
    now: "2026-07-27T08:10:00.000Z",
    createEventId: () => "unused-event",
  });
  assert.equal(semanticDraft.status, "blocked");
  assert.ok(
    semanticDraft.issues.some((issue) => issue.code === code),
    `canonical 语义不得静默丢失：${code}`,
  );
}

for (const [invalidSlurXml, expectedCode] of [
  [
    supportedXml.replace(
      "<type>half</type></note>",
      '<type>half</type><notations><slur type="start"/></notations></note>',
    ),
    "unsupported-slur-pair",
  ],
  [
    supportedXml.replace(
      "<type>eighth</type></note>",
      '<type>eighth</type><notations><slur type="stop"/></notations></note>',
    ),
    "unsupported-slur-pair",
  ],
  [
    supportedXml
      .replace(
        "<type>quarter</type><notations><fermata/></notations></note>",
        '<type>quarter</type><notations><fermata/><slur type="start"/></notations></note>',
      )
      .replace(
        "<type>half</type></note>",
        '<type>half</type><notations><slur type="stop"/></notations></note>',
      ),
    "unsupported-slur-pair",
  ],
  [
    supportedXml.replace(
      "<note><rest/><duration>2</duration><voice>1</voice><type>quarter</type><notations><fermata/></notations></note>",
      '<note><rest/><duration>2</duration><voice>1</voice><type>quarter</type><notations><fermata/><slur type="start"/></notations></note>',
    ),
    "unsupported-slur",
  ],
  [
    supportedXml
      .replace(
        "<type>quarter</type><notations><fermata/></notations></note>",
        '<type>quarter</type><notations><fermata/><slur type="start"/></notations></note>',
      )
      .replace(
        "<note><rest/><duration>2</duration><voice>1</voice><type>quarter</type><notations><fermata/></notations></note>",
        '<note><rest/><duration>2</duration><voice>1</voice><type>quarter</type><notations><fermata/><slur type="stop"/></notations></note>',
      ),
    "unsupported-slur",
  ],
  [
    supportedXml.replace(
      "<type>half</type></note>",
      '<type>half</type><notations><slur type="continue"/></notations></note>',
    ),
    "unsupported-slur",
  ],
  [
    supportedXml.replace(
      "<type>half</type></note>",
      '<type>half</type><notations><slur type="stop"/><slur type="stop"/></notations></note>',
    ),
    "unsupported-slur",
  ],
  [
    supportedXml.replace(
      "<type>half</type></note>",
      '<type>half</type><notations><![CDATA[ignored-semantic-text]]><slur type="start"/></notations></note>',
    ),
    "unsupported-notations",
  ],
  [
    supportedXml.replace(
      "<type>half</type></note>",
      '<type>half</type><notations><slur/></notations></note>',
    ),
    "unsupported-slur",
  ],
  [
    supportedXml.replace(
      "<type>half</type></note>",
      '<type>half</type><notations><slur type="start">text</slur></notations></note>',
    ),
    "unsupported-slur",
  ],
  [
    supportedXml.replace(
      "<type>half</type></note>",
      '<type>half</type><notations><slur type="start"><other/></slur></notations></note>',
    ),
    "unsupported-slur",
  ],
  [
    supportedXml.replace(
      "<type>half</type></note>",
      '<type>half</type><notations><slur type="start" number="1"/></notations></note>',
    ),
    "unsupported-slur",
  ],
  [
    supportedXml.replace(
      "<type>half</type></note>",
      '<type>half</type><notations><slur type="start"/><slur type="start"/></notations></note>',
    ),
    "unsupported-slur",
  ],
  [
    supportedXml.replace(
      "<type>half</type></note>",
      '<type>half</type><notations><slur type="start"/></notations><notations><slur type="stop"/></notations></note>',
    ),
    "unsupported-notations",
  ],
  [
    supportedXml.replace(
      "<note><pitch>",
      '<slur type="start"/><note><pitch>',
    ),
    "unsupported-slur",
  ],
  [
    supportedXml
      .replace(
        "<duration>4</duration><voice>1</voice><type>half</type></note>",
        '<duration>2</duration><voice>1</voice><type>quarter</type><notations><slur type="start"/></notations></note>',
      )
      .replace(
        "<type>eighth</type></note>",
        '<type>eighth</type><notations><slur type="stop"/></notations></note>',
      ),
    "unsupported-slur-continuity",
  ],
] as const) {
  const invalidSlurDraft = createLocalScoreProjectMusicXmlImportDraft({
    xml: invalidSlurXml,
    fileName: "invalid-slur.musicxml",
    sourceFormat: "musicxml",
    projectId: "blocked-invalid-slur",
    now: "2026-07-27T08:11:00.000Z",
    createEventId: () => "unused-event",
  });
  assert.equal(invalidSlurDraft.status, "blocked");
  assert.ok(
    invalidSlurDraft.issues.some((issue) => issue.code === expectedCode),
    `非严格 slur 结构必须失败关闭：${expectedCode}`,
  );
}

let blockedSlurEventIdCalls = 0;
const blockedSlurWithoutIds = createLocalScoreProjectMusicXmlImportDraft({
  xml: supportedXml.replace(
    "<type>half</type></note>",
    '<type>half</type><notations><slur type="start"/></notations></note>',
  ),
  fileName: "blocked-slur-no-ids.musicxml",
  sourceFormat: "musicxml",
  projectId: "blocked-slur-no-ids",
  now: "2026-07-27T08:11:30.000Z",
  createEventId: () => {
    blockedSlurEventIdCalls += 1;
    return `unexpected-${blockedSlurEventIdCalls}`;
  },
});
assert.equal(blockedSlurWithoutIds.status, "blocked");
assert.equal(
  blockedSlurEventIdCalls,
  0,
  "blocked slur input must not allocate canonical event ids",
);

const strictTiePairXml = supportedXml
  .replace(
    "<note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>",
    '<note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><tie type="start"/><voice>1</voice><type>half</type><notations><tied type="start"/></notations></note>',
  )
  .replace(
    "<note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>",
    '<note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><tie type="stop"/><voice>1</voice><type>eighth</type><notations><tied type="stop"/></notations></note>',
  );

for (const [invalidTieXml, expectedCode] of [
  [
    strictTiePairXml.replace('<tie type="start"/>', ""),
    "unsupported-tie-mismatch",
  ],
  [
    strictTiePairXml.replace('<tied type="start"/>', ""),
    "unsupported-tie-mismatch",
  ],
  [
    strictTiePairXml.replace(
      '<tied type="start"/>',
      '<tied type="stop"/>',
    ),
    "unsupported-tie-mismatch",
  ],
  [
    strictTiePairXml
      .replace('<tie type="stop"/>', "")
      .replace('<tied type="stop"/>', ""),
    "unsupported-tie-pair",
  ],
  [
    supportedXml.replace(
      "<duration>2</duration><voice>1</voice><type>quarter</type><notations><fermata/></notations></note>",
      '<duration>2</duration><tie type="stop"/><voice>1</voice><type>quarter</type><notations><fermata/><tied type="stop"/></notations></note>',
    ),
    "unsupported-tie-pair",
  ],
  [
    supportedXml.replace(
      "<note><rest/><duration>2</duration><voice>1</voice><type>quarter</type><notations><fermata/></notations></note>",
      '<note><rest/><duration>2</duration><tie type="start"/><voice>1</voice><type>quarter</type><notations><fermata/><tied type="start"/></notations></note>',
    ),
    "unsupported-tie",
  ],
  [
    supportedXml
      .replace(
        "<note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type><notations><fermata/></notations></note>",
        '<note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><tie type="start"/><voice>1</voice><type>quarter</type><notations><fermata/><tied type="start"/></notations></note>',
      )
      .replace(
        "<note><rest/><duration>2</duration><voice>1</voice><type>quarter</type><notations><fermata/></notations></note>",
        '<note><rest/><duration>2</duration><tie type="stop"/><voice>1</voice><type>quarter</type><notations><fermata/><tied type="stop"/></notations></note>',
      ),
    "unsupported-tie",
  ],
  [
    strictTiePairXml.replace(
      '<note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><tie type="stop"/>',
      '<note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><tie type="stop"/>',
    ),
    "unsupported-tie-pitch",
  ],
  [
    strictTiePairXml.replace(
      '<duration>4</duration><tie type="start"/><voice>1</voice><type>half</type>',
      '<duration>2</duration><tie type="start"/><voice>1</voice><type>quarter</type>',
    ),
    "unsupported-tie-continuity",
  ],
  [
    strictTiePairXml.replace(
      '<tie type="start"/>',
      '<tie type="start" time-only="1"/>',
    ),
    "unsupported-tie",
  ],
  [
    strictTiePairXml.replace(
      '<tied type="start"/>',
      '<tied type="start" placement="above"/>',
    ),
    "unsupported-tie",
  ],
  [
    strictTiePairXml.replace(
      '<tie type="start"/>',
      '<tie type="start">text</tie>',
    ),
    "unsupported-tie",
  ],
  [
    strictTiePairXml.replace(
      '<tied type="start"/>',
      '<tied type="start"><other/></tied>',
    ),
    "unsupported-tie",
  ],
  [
    strictTiePairXml.replace(
      '<tie type="start"/>',
      '<tie type="start"><other/></tie>',
    ),
    "unsupported-tie",
  ],
  [
    strictTiePairXml.replace(
      '<tied type="start"/>',
      '<tied type="start">text</tied>',
    ),
    "unsupported-tie",
  ],
  [
    strictTiePairXml
      .replace(
        '<tie type="start"/>',
        '<tie type="start"/><tie type="start"/>',
      )
      .replace(
        '<tied type="start"/>',
        '<tied type="start"/><tied type="start"/>',
      ),
    "unsupported-tie",
  ],
  [
    strictTiePairXml
      .replace(
        '<tie type="start"/>',
        '<tie type="start"/><tie type="stop"/>',
      )
      .replace(
        '<tied type="start"/>',
        '<tied type="start"/><tied type="stop"/>',
      ),
    "unsupported-tie-order",
  ],
  [
    supportedXml.replace(
      "<note><pitch>",
      '<tie type="start"/><note><pitch>',
    ),
    "unsupported-tie",
  ],
  [
    supportedXml.replace(
      "<type>half</type></note>",
      '<type>half</type><tied type="start"/></note>',
    ),
    "unsupported-tie",
  ],
  [
    strictTiePairXml.replace(
      '<tie type="start"/>',
      "<tie/>",
    ),
    "unsupported-tie",
  ],
  [
    strictTiePairXml.replace(
      '<tied type="start"/>',
      '<tied type="let-ring"/>',
    ),
    "unsupported-tie",
  ],
  [
    strictTiePairXml.replace(
      '<tied type="start"/>',
      '<tied type="continue"/>',
    ),
    "unsupported-tie",
  ],
] as const) {
  const invalidTieDraft = createLocalScoreProjectMusicXmlImportDraft({
    xml: invalidTieXml,
    fileName: "invalid-tie.musicxml",
    sourceFormat: "musicxml",
    projectId: "blocked-invalid-tie",
    now: "2026-07-27T08:11:45.000Z",
    createEventId: () => "unused-event",
  });
  assert.equal(invalidTieDraft.status, "blocked");
  assert.ok(
    invalidTieDraft.issues.some((issue) => issue.code === expectedCode),
    `非严格 tie/tied 结构必须失败关闭：${expectedCode}`,
  );
}

let blockedTieEventIdCalls = 0;
const blockedTieWithoutIds = createLocalScoreProjectMusicXmlImportDraft({
  xml: strictTiePairXml
    .replace('<tie type="stop"/>', "")
    .replace('<tied type="stop"/>', ""),
  fileName: "blocked-tie-no-ids.musicxml",
  sourceFormat: "musicxml",
  projectId: "blocked-tie-no-ids",
  now: "2026-07-27T08:11:50.000Z",
  createEventId: () => {
    blockedTieEventIdCalls += 1;
    return `unexpected-tie-${blockedTieEventIdCalls}`;
  },
});
assert.equal(blockedTieWithoutIds.status, "blocked");
assert.equal(
  blockedTieEventIdCalls,
  0,
  "blocked tie input must not allocate canonical event ids",
);

for (const invalidFermata of [
  "<notations><fermata type=\"upright\"/></notations>",
  "<notations><fermata>normal</fermata></notations>",
  "<notations placement=\"above\"><fermata/></notations>",
  "<notations><fermata><other/></fermata></notations>",
  "<notations><fermata/><fermata/></notations>",
  "<notations><fermata/></notations><notations><fermata/></notations>",
  "<notations/>",
  "<fermata/>",
]) {
  const invalidFermataDraft = createLocalScoreProjectMusicXmlImportDraft({
    xml: supportedXml.replace(
      "<type>half</type></note>",
      `<type>half</type>${invalidFermata}</note>`,
    ),
    fileName: "invalid-fermata.musicxml",
    sourceFormat: "musicxml",
    projectId: "blocked-invalid-fermata",
    now: "2026-07-27T08:12:00.000Z",
    createEventId: () => "unused-event",
  });
  assert.equal(invalidFermataDraft.status, "blocked");
  assert.ok(
    invalidFermataDraft.issues.some(
      (issue) =>
        issue.code === "unsupported-fermata"
        || issue.code === "unsupported-notations",
    ),
    "非严格 fermata 结构必须失败关闭",
  );
}

for (const misplacedFermataXml of [
  supportedXml.replace(
    "<note><pitch>",
    "<notations><fermata/></notations><note><pitch>",
  ),
  supportedXml.replace(
    "<note><pitch>",
    "<fermata/><note><pitch>",
  ),
  supportedXml.replace(
    "<attributes>",
    "<attributes><notations><fermata/></notations>",
  ),
]) {
  const misplacedFermataDraft = createLocalScoreProjectMusicXmlImportDraft({
    xml: misplacedFermataXml,
    fileName: "misplaced-fermata.musicxml",
    sourceFormat: "musicxml",
    projectId: "blocked-misplaced-fermata",
    now: "2026-07-27T08:13:00.000Z",
    createEventId: () => "unused-event",
  });
  assert.equal(misplacedFermataDraft.status, "blocked");
  assert.ok(
    misplacedFermataDraft.issues.some(
      (issue) =>
        issue.code === "unsupported-fermata"
        || issue.code === "unsupported-notations",
    ),
    "note 外错误层级的 fermata/notations 必须失败关闭",
  );
}

const nestedNoteXml = supportedXml.replace(
  /(<note><pitch>[\s\S]*?<\/note>)/,
  "<attributes>$1</attributes>",
);
const nestedNoteDraft = createLocalScoreProjectMusicXmlImportDraft({
  xml: nestedNoteXml,
  fileName: "nested-note.musicxml",
  sourceFormat: "musicxml",
  projectId: "blocked-nested-note",
  now: "2026-07-27T08:14:00.000Z",
  createEventId: () => "unused-event",
});
assert.equal(nestedNoteDraft.status, "blocked");
assert.ok(
  nestedNoteDraft.issues.some(
    (issue) => issue.code === "unsupported-note-hierarchy",
  ),
  "嵌套在非 measure 元素中的 note 必须失败关闭",
);

const missingMeasureNumber = createLocalScoreProjectMusicXmlImportDraft({
  xml: supportedXml.replace('measure number="1"', "measure"),
  fileName: "missing-measure-number.musicxml",
  sourceFormat: "musicxml",
  projectId: "blocked-measure-number",
  now: "2026-07-27T08:15:00.000Z",
  createEventId: () => "unused-event",
});
assert.equal(missingMeasureNumber.status, "blocked");
assert.ok(
  missingMeasureNumber.issues.some(
    (issue) => issue.code === "invalid-measure-number",
  ),
);

for (const malformedXml of [
  supportedXml.replace("<part-name>练习</part-name>", "<part-name>A & B</part-name>"),
  supportedXml.replace("</part-name>", "</part-name-broken>"),
  supportedXml.slice(0, -20),
]) {
  const malformedDraft = createLocalScoreProjectMusicXmlImportDraft({
    xml: malformedXml,
    fileName: "malformed.musicxml",
    sourceFormat: "musicxml",
    projectId: "blocked-malformed",
    now: "2026-07-27T08:20:00.000Z",
    createEventId: () => "unused-event",
  });
  assert.equal(malformedDraft.status, "blocked");
  assert.ok(
    malformedDraft.issues.some((issue) => issue.code === "malformed-xml"),
    "非良构 XML 必须失败关闭",
  );
}

for (const [unsupportedXml, code] of [
  [
    supportedXml.replace(
      "<part-list>",
      "<identification><creator type=\"composer\">作者</creator><rights>保留权利</rights></identification><part-list>",
    ),
    "unsupported-root-element",
  ],
  [
    supportedXml.replace(
      "</part-name>",
      "</part-name><score-instrument id=\"P1-I1\"><instrument-name>Piano</instrument-name></score-instrument>",
    ),
    "unsupported-score-part-element",
  ],
  [
    supportedXml.replace('<part id="P1">', '<part id="P2">'),
    "invalid-part-reference",
  ],
  [
    supportedXml.replace(
      '<measure number="1">',
      '<direction><direction-type><words>Allegro</words></direction-type></direction><measure number="1">',
    ),
    "unsupported-part-element",
  ],
  [
    supportedXml.replace("<part-name>练习</part-name>", ""),
    "unsupported-part-name-count",
  ],
] as const) {
  const unsupportedDraft = createLocalScoreProjectMusicXmlImportDraft({
    xml: unsupportedXml,
    fileName: "unsupported-metadata.musicxml",
    sourceFormat: "musicxml",
    projectId: `blocked-${code}`,
    now: "2026-07-27T08:25:00.000Z",
    createEventId: () => "unused-event",
  });
  assert.equal(unsupportedDraft.status, "blocked");
  assert.ok(
    unsupportedDraft.issues.some((issue) => issue.code === code),
    `根级 MusicXML 语义不得静默丢失：${code}`,
  );
}

console.log("Local score project MusicXML import tests passed.");
