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

const dottedXml = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>附点练习</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>12</duration><tie type="start"/><voice>1</voice><type>half</type><dot/><staff>1</staff><notations><fermata/><tied type="start"/><slur type="start"/></notations></note>
    </measure>
    <measure number="2">
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>6</duration><tie type="stop"/><voice>1</voice><type>quarter</type><dot/><staff>1</staff><notations><fermata/><tied type="stop"/><slur type="stop"/></notations></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>3</duration><voice>1</voice><type>eighth</type><dot/><staff>1</staff></note>
      <note><rest/><duration>6</duration><voice>1</voice><type>quarter</type><dot/><staff>1</staff></note>
    </measure>
  </part>
</score-partwise>`;
let dottedEventSequence = 0;
const dottedReady = createLocalScoreProjectMusicXmlImportDraft({
  xml: dottedXml,
  fileName: "严格附点.musicxml",
  sourceFormat: "musicxml",
  projectId: "import-project-dotted",
  now: "2026-07-27T08:00:50.000Z",
  createEventId: () => `dotted-event-${++dottedEventSequence}`,
});
assert.equal(dottedReady.status, "ready");
assert.deepEqual(dottedReady.issues, []);
assert.deepEqual(
  dottedReady.project?.document.parts[0].staves[0].voices[0].measures
    .flatMap((measure) => measure.events)
    .map((event) => ({
      type: event.type,
      pitch: event.pitch,
      duration: event.duration,
      augmentationDots: event.augmentationDots,
      fermataMark: event.fermataMark,
      tieToNext: event.type === "note" ? event.tieToNext : null,
      slurToNext: event.type === "note" ? event.slurToNext : null,
    })),
  [
    {
      type: "note",
      pitch: "C4",
      duration: "quarter",
      augmentationDots: 0,
      fermataMark: null,
      tieToNext: false,
      slurToNext: false,
    },
    {
      type: "note",
      pitch: "D4",
      duration: "half",
      augmentationDots: 1,
      fermataMark: "fermata",
      tieToNext: true,
      slurToNext: true,
    },
    {
      type: "note",
      pitch: "D4",
      duration: "quarter",
      augmentationDots: 1,
      fermataMark: "fermata",
      tieToNext: false,
      slurToNext: false,
    },
    {
      type: "note",
      pitch: "E4",
      duration: "eighth",
      augmentationDots: 1,
      fermataMark: null,
      tieToNext: false,
      slurToNext: false,
    },
    {
      type: "rest",
      pitch: null,
      duration: "quarter",
      augmentationDots: 1,
      fermataMark: null,
      tieToNext: null,
      slurToNext: null,
    },
  ],
  "strict dot import must preserve all supported note values, the quarter rest, and notation coexistence",
);

let dottedMxlEventSequence = 0;
const dottedMxlEquivalent = createLocalScoreProjectMusicXmlImportDraft({
  xml: dottedXml,
  fileName: "严格附点.mxl",
  sourceFormat: "mxl",
  projectId: "import-project-dotted",
  now: "2026-07-27T08:00:50.000Z",
  createEventId: () => `dotted-event-${++dottedMxlEventSequence}`,
});
assert.equal(dottedMxlEquivalent.status, "ready");
assert.deepEqual(
  dottedMxlEquivalent.project,
  dottedReady.project,
  "相同附点 XML 经 MXL 解包路径必须生成等价 canonical",
);

const lyricXml = dottedXml
  .replace(
    "<type>quarter</type><staff>1</staff></note>",
    "<type>quarter</type><staff>1</staff><lyric><text>你 &amp; me</text></lyric></note>",
  )
  .replace(
    '<notations><fermata/><tied type="start"/><slur type="start"/></notations></note>',
    '<notations><fermata/><tied type="start"/><slur type="start"/></notations><lyric><text>唱 🎵 &amp; &lt;&gt;&quot;&apos;</text></lyric></note>',
  )
  .replace(
    '<notations><fermata/><tied type="stop"/><slur type="stop"/></notations></note>',
    '<notations><fermata/><tied type="stop"/><slur type="stop"/></notations><lyric><text>结束</text></lyric></note>',
  );
let lyricEventSequence = 0;
const lyricReady = createLocalScoreProjectMusicXmlImportDraft({
  xml: lyricXml,
  fileName: "严格歌词.musicxml",
  sourceFormat: "musicxml",
  projectId: "import-project-lyric",
  now: "2026-07-27T08:00:55.000Z",
  createEventId: () => `lyric-event-${++lyricEventSequence}`,
});
assert.equal(lyricReady.status, "ready");
assert.deepEqual(lyricReady.issues, []);
assert.deepEqual(
  lyricReady.project?.document.parts[0].staves[0].voices[0].measures
    .flatMap((measure) => measure.events)
    .map((event) => event.type === "note" ? event.lyric : null),
  ["你 & me", "唱 🎵 & <>\"'", "结束", null, null],
  "歌词必须解码实体并精确保留中英文、emoji 和内部空格",
);
assert.deepEqual(
  lyricReady.project?.document.parts[0].staves[0].voices[0].measures[0]
    .events[1],
  {
    ...dottedReady.project?.document.parts[0].staves[0].voices[0].measures[0]
      .events[1],
    id: "lyric-event-2",
    lyric: "唱 🎵 & <>\"'",
  },
  "歌词必须与 dot、fermata、tie 和 slur 在同一 canonical note 上共存",
);

lyricEventSequence = 0;
const lyricMxlEquivalent = createLocalScoreProjectMusicXmlImportDraft({
  xml: lyricXml,
  fileName: "严格歌词.mxl",
  sourceFormat: "mxl",
  projectId: "import-project-lyric",
  now: "2026-07-27T08:00:55.000Z",
  createEventId: () => `lyric-event-${++lyricEventSequence}`,
});
assert.equal(lyricMxlEquivalent.status, "ready");
assert.deepEqual(
  lyricMxlEquivalent.project,
  lyricReady.project,
  "相同歌词 XML 经 MXL 解包路径必须生成等价 canonical",
);

const fingeringXml = lyricXml
  .replace(
    '<notations><fermata/><tied type="start"/><slur type="start"/></notations>',
    '<notations><fermata/><tied type="start"/><slur type="start"/><technical><fingering>1</fingering></technical></notations>',
  )
  .replace(
    '<notations><fermata/><tied type="stop"/><slur type="stop"/></notations>',
    '<notations><fermata/><tied type="stop"/><slur type="stop"/><technical><fingering>3</fingering></technical></notations>',
  )
  .replace(
    "<type>eighth</type><dot/><staff>1</staff></note>",
    "<type>eighth</type><dot/><staff>1</staff><notations><technical><fingering>5</fingering></technical></notations></note>",
  );
let fingeringEventSequence = 0;
const fingeringReady = createLocalScoreProjectMusicXmlImportDraft({
  xml: fingeringXml,
  fileName: "严格指法.musicxml",
  sourceFormat: "musicxml",
  projectId: "import-project-fingering",
  now: "2026-07-27T08:00:56.000Z",
  createEventId: () => `fingering-event-${++fingeringEventSequence}`,
});
assert.equal(fingeringReady.status, "ready");
assert.deepEqual(fingeringReady.issues, []);
assert.deepEqual(
  fingeringReady.project?.document.parts[0].staves[0].voices[0].measures
    .flatMap((measure) => measure.events)
    .map((event) => event.type === "note" ? event.fingering : null),
  [null, 1, 3, 5, null],
  "指法必须精确保留 1–5 边界，并且休止符保持无指法",
);
assert.deepEqual(
  fingeringReady.project?.document.parts[0].staves[0].voices[0].measures[0]
    .events[1],
  {
    ...lyricReady.project?.document.parts[0].staves[0].voices[0].measures[0]
      .events[1],
    id: "fingering-event-2",
    fingering: 1,
  },
  "指法必须与 dot、fermata、tie、slur 和 lyric 在同一 canonical note 上共存",
);

for (const value of [1, 2, 3, 4, 5] as const) {
  let valueEventSequence = 0;
  const valueDraft = createLocalScoreProjectMusicXmlImportDraft({
    xml: supportedXml.replace(
      "<type>half</type></note>",
      `<type>half</type><notations><technical><fingering>${value}</fingering></technical></notations></note>`,
    ),
    fileName: `fingering-${value}.musicxml`,
    sourceFormat: "musicxml",
    projectId: `import-project-fingering-${value}`,
    now: "2026-07-27T08:00:56.000Z",
    createEventId: () => `fingering-${value}-event-${++valueEventSequence}`,
  });
  assert.equal(valueDraft.status, "ready");
  const valueEvent =
    valueDraft.project?.document.parts[0].staves[0].voices[0].measures[0]
      .events[2];
  assert.equal(
    valueEvent?.type === "note" ? valueEvent.fingering : null,
    value,
    `指法 ${value} 必须精确映射到 canonical`,
  );
}

fingeringEventSequence = 0;
const fingeringMxlEquivalent = createLocalScoreProjectMusicXmlImportDraft({
  xml: fingeringXml,
  fileName: "严格指法.mxl",
  sourceFormat: "mxl",
  projectId: "import-project-fingering",
  now: "2026-07-27T08:00:56.000Z",
  createEventId: () => `fingering-event-${++fingeringEventSequence}`,
});
assert.equal(fingeringMxlEquivalent.status, "ready");
assert.deepEqual(
  fingeringMxlEquivalent.project,
  fingeringReady.project,
  "相同指法 XML 经 MXL 解包路径必须生成等价 canonical",
);

const articulationXml = fingeringXml
  .replace(
    "<technical><fingering>1</fingering></technical>",
    "<technical><fingering>1</fingering></technical><articulations><accent/><staccato/><tenuto/></articulations>",
  )
  .replace(
    "<technical><fingering>3</fingering></technical>",
    "<technical><fingering>3</fingering></technical><articulations><staccato/></articulations>",
  )
  .replace(
    "<technical><fingering>5</fingering></technical>",
    "<technical><fingering>5</fingering></technical><articulations><accent/><tenuto/></articulations>",
  );
let articulationEventSequence = 0;
const articulationReady = createLocalScoreProjectMusicXmlImportDraft({
  xml: articulationXml,
  fileName: "严格演奏法.musicxml",
  sourceFormat: "musicxml",
  projectId: "import-project-articulation",
  now: "2026-07-27T08:01:00.000Z",
  createEventId: () => `articulation-event-${++articulationEventSequence}`,
});
assert.equal(articulationReady.status, "ready");
assert.deepEqual(articulationReady.issues, []);
assert.deepEqual(
  articulationReady.project?.document.parts[0].staves[0].voices[0].measures
    .flatMap((measure) => measure.events)
    .map((event) => event.type === "note" ? event.articulations : []),
  [
    [],
    ["accent", "staccato", "tenuto"],
    ["staccato"],
    ["accent", "tenuto"],
    [],
  ],
  "演奏法组合必须按 canonical 固定顺序精确保留",
);
articulationEventSequence = 0;
const articulationMxlEquivalent = createLocalScoreProjectMusicXmlImportDraft({
  xml: articulationXml,
  fileName: "严格演奏法.mxl",
  sourceFormat: "mxl",
  projectId: "import-project-articulation",
  now: "2026-07-27T08:01:00.000Z",
  createEventId: () => `articulation-event-${++articulationEventSequence}`,
});
assert.equal(articulationMxlEquivalent.status, "ready");
assert.deepEqual(
  articulationMxlEquivalent.project,
  articulationReady.project,
  "相同演奏法 XML 经 MXL 解包路径必须生成等价 canonical",
);

const invalidArticulationMarkups = [
  "<notations><articulations/></notations>",
  '<notations><articulations placement="above"><accent/></articulations></notations>',
  "<notations><articulations><accent/><accent/></articulations></notations>",
  "<notations><articulations><tenuto/><accent/></articulations></notations>",
  "<notations><articulations><strong-accent/></articulations></notations>",
  '<notations><articulations><accent type="up"/></articulations></notations>',
  "<notations><articulations><accent>text</accent></articulations></notations>",
  "<notations><articulations><accent><unexpected/></accent></articulations></notations>",
  "<notations><articulations><!--comment--><accent/></articulations></notations>",
  "<notations><articulations><![CDATA[ ]]><accent/></articulations></notations>",
  "<notations><articulations><?mark data?><accent/></articulations></notations>",
  "<notations><accent/></notations>",
  "<articulations><accent/></articulations>",
  "<notations><articulations><accent/></articulations><articulations><tenuto/></articulations></notations>",
] as const;
for (let index = 0; index < invalidArticulationMarkups.length; index += 1) {
  let invalidArticulationIdCalls = 0;
  const invalidArticulationDraft = createLocalScoreProjectMusicXmlImportDraft({
    xml: supportedXml.replace(
      "<type>half</type></note>",
      `<type>half</type>${invalidArticulationMarkups[index]}</note>`,
    ),
    fileName: `invalid-articulation-${index + 1}.musicxml`,
    sourceFormat: "musicxml",
    projectId: `blocked-invalid-articulation-${index + 1}`,
    now: "2026-07-27T08:01:01.000Z",
    createEventId: () => {
      invalidArticulationIdCalls += 1;
      return `unused-invalid-articulation-${invalidArticulationIdCalls}`;
    },
  });
  assert.equal(invalidArticulationDraft.status, "blocked");
  assert.equal(invalidArticulationIdCalls, 0);
  assert.ok(
    invalidArticulationDraft.issues.some(
      (issue) => issue.code === "unsupported-articulation",
    ),
    `演奏法结构 ${index + 1} 必须以稳定 ledger 失败关闭`,
  );
}

const attributedArticulationDraft = createLocalScoreProjectMusicXmlImportDraft({
  xml: supportedXml.replace(
    "<note><pitch><step>D</step>",
    '<note print-object="yes"><pitch><step>D</step>',
  ).replace(
    "<type>half</type></note>",
    "<type>half</type><notations><articulations><accent/></articulations></notations></note>",
  ),
  fileName: "attributed-articulation.musicxml",
  sourceFormat: "musicxml",
  projectId: "blocked-attributed-articulation",
  now: "2026-07-27T08:01:02.000Z",
  createEventId: () => "unused-attributed-articulation",
});
assert.equal(attributedArticulationDraft.status, "blocked");
assert.ok(
  attributedArticulationDraft.issues.some(
    (issue) => issue.code === "unsupported-articulation",
  ),
);

const restArticulationDraft = createLocalScoreProjectMusicXmlImportDraft({
  xml: supportedXml.replace(
    "<note><rest/><duration>2</duration><voice>1</voice><type>quarter</type><notations><fermata/></notations></note>",
    "<note><rest/><duration>2</duration><voice>1</voice><type>quarter</type><notations><fermata/><articulations><tenuto/></articulations></notations></note>",
  ),
  fileName: "rest-articulation.musicxml",
  sourceFormat: "musicxml",
  projectId: "blocked-rest-articulation",
  now: "2026-07-27T08:01:03.000Z",
  createEventId: () => "unused-rest-articulation",
});
assert.equal(restArticulationDraft.status, "blocked");
assert.ok(
  restArticulationDraft.issues.some(
    (issue) => issue.code === "unsupported-articulation-on-rest",
  ),
);

const dynamicXml = supportedXml
  .replace(
    "<notations><fermata/></notations></note>",
    "<notations><fermata/><dynamics><pp/></dynamics></notations></note>",
  )
  .replace(
    "<note><rest/><duration>2</duration><voice>1</voice><type>quarter</type><notations><fermata/></notations></note>",
    "<note><rest/><duration>2</duration><voice>1</voice><type>quarter</type><notations><fermata/><dynamics><p/></dynamics></notations></note>",
  )
  .replace(
    "<type>half</type></note>",
    "<type>half</type><notations><dynamics><mp/></dynamics></notations></note>",
  )
  .replace(
    "<type>eighth</type></note>",
    "<type>eighth</type><notations><dynamics><mf/></dynamics></notations></note>",
  )
  .replace(
    "<type>eighth</type></note>",
    "<type>eighth</type><notations><dynamics><f/></dynamics></notations></note>",
  );
let dynamicEventSequence = 0;
const dynamicReady = createLocalScoreProjectMusicXmlImportDraft({
  xml: dynamicXml,
  fileName: "严格力度记号.musicxml",
  sourceFormat: "musicxml",
  projectId: "import-project-dynamic",
  now: "2026-07-27T08:01:04.000Z",
  createEventId: () => `dynamic-event-${++dynamicEventSequence}`,
});
assert.equal(dynamicReady.status, "ready");
assert.deepEqual(dynamicReady.issues, []);
assert.deepEqual(
  dynamicReady.project?.document.parts[0].staves[0].voices[0].measures
    .flatMap((measure) => measure.events)
    .map((event) => event.dynamicMark),
  ["pp", "p", "mp", "mf", "f"],
  "note 与 rest 的受控力度记号必须精确映射到事件起点",
);
dynamicEventSequence = 0;
const dynamicMxlEquivalent = createLocalScoreProjectMusicXmlImportDraft({
  xml: dynamicXml,
  fileName: "严格力度记号.mxl",
  sourceFormat: "mxl",
  projectId: "import-project-dynamic",
  now: "2026-07-27T08:01:04.000Z",
  createEventId: () => `dynamic-event-${++dynamicEventSequence}`,
});
assert.equal(dynamicMxlEquivalent.status, "ready");
assert.deepEqual(
  dynamicMxlEquivalent.project,
  dynamicReady.project,
  "相同力度记号 XML 经 MXL 解包路径必须生成等价 canonical",
);

for (const mark of ["pp", "p", "mp", "mf", "f", "ff"] as const) {
  let markEventSequence = 0;
  const markDraft = createLocalScoreProjectMusicXmlImportDraft({
    xml: supportedXml.replace(
      "<type>half</type></note>",
      `<type>half</type><notations><dynamics><${mark}/></dynamics></notations></note>`,
    ),
    fileName: `严格力度-${mark}.musicxml`,
    sourceFormat: "musicxml",
    projectId: `import-project-dynamic-${mark}`,
    now: "2026-07-27T08:01:05.000Z",
    createEventId: () => `dynamic-${mark}-${++markEventSequence}`,
  });
  assert.equal(markDraft.status, "ready");
  assert.equal(
    markDraft.project?.document.parts[0].staves[0].voices[0].measures[0]
      .events[2]?.dynamicMark,
    mark,
    `${mark} 必须精确映射到 canonical dynamicMark`,
  );
}

const dynamicCoexistenceXml = articulationXml.replace(
  "<articulations><accent/><staccato/><tenuto/></articulations>",
  "<articulations><accent/><staccato/><tenuto/></articulations><dynamics><ff/></dynamics>",
);
let dynamicCoexistenceEventSequence = 0;
const dynamicCoexistenceReady = createLocalScoreProjectMusicXmlImportDraft({
  xml: dynamicCoexistenceXml,
  fileName: "力度与既有记号共存.musicxml",
  sourceFormat: "musicxml",
  projectId: "import-project-dynamic-coexistence",
  now: "2026-07-27T08:01:06.000Z",
  createEventId: () =>
    `dynamic-coexistence-${++dynamicCoexistenceEventSequence}`,
});
assert.equal(dynamicCoexistenceReady.status, "ready");
const dynamicCoexistenceEvent =
  dynamicCoexistenceReady.project?.document.parts[0].staves[0].voices[0]
    .measures.flatMap((measure) => measure.events)
    .find((event) => event.dynamicMark === "ff");
assert.equal(dynamicCoexistenceEvent?.type, "note");
if (dynamicCoexistenceEvent?.type === "note") {
  assert.equal(dynamicCoexistenceEvent.fingering, 1);
  assert.deepEqual(
    dynamicCoexistenceEvent.articulations,
    ["accent", "staccato", "tenuto"],
  );
  assert.equal(dynamicCoexistenceEvent.dynamicMark, "ff");
}

const invalidDynamicMarkups = [
  "<notations><dynamics/></notations>",
  '<notations><dynamics placement="below"><mf/></dynamics></notations>',
  "<notations><dynamics><p/><f/></dynamics></notations>",
  "<notations><dynamics><fff/></dynamics></notations>",
  '<notations><dynamics><mf type="other"/></dynamics></notations>',
  "<notations><dynamics><mf>text</mf></dynamics></notations>",
  "<notations><dynamics><mf><unexpected/></mf></dynamics></notations>",
  "<notations><dynamics><!--comment--><mf/></dynamics></notations>",
  "<notations><dynamics><![CDATA[ ]]><mf/></dynamics></notations>",
  "<notations><dynamics><?mark data?><mf/></dynamics></notations>",
  "<notations><mf/></notations>",
  "<dynamics><mf/></dynamics>",
  "<notations><dynamics><p/></dynamics><dynamics><f/></dynamics></notations>",
] as const;
for (let index = 0; index < invalidDynamicMarkups.length; index += 1) {
  let invalidDynamicIdCalls = 0;
  const invalidDynamicDraft = createLocalScoreProjectMusicXmlImportDraft({
    xml: supportedXml.replace(
      "<type>half</type></note>",
      `<type>half</type>${invalidDynamicMarkups[index]}</note>`,
    ),
    fileName: `invalid-dynamic-${index + 1}.musicxml`,
    sourceFormat: "musicxml",
    projectId: `blocked-invalid-dynamic-${index + 1}`,
    now: "2026-07-27T08:01:07.000Z",
    createEventId: () => {
      invalidDynamicIdCalls += 1;
      return `unused-invalid-dynamic-${invalidDynamicIdCalls}`;
    },
  });
  assert.equal(invalidDynamicDraft.status, "blocked");
  assert.equal(invalidDynamicIdCalls, 0);
  assert.ok(
    invalidDynamicDraft.issues.some(
      (issue) => issue.code === "unsupported-dynamic",
    ),
    `力度记号结构 ${index + 1} 必须以稳定 ledger 失败关闭`,
  );
}

const directionDynamicDraft = createLocalScoreProjectMusicXmlImportDraft({
  xml: supportedXml.replace(
    "<note><pitch><step>D</step>",
    "<direction><direction-type><dynamics><mf/></dynamics></direction-type></direction><note><pitch><step>D</step>",
  ),
  fileName: "direction-dynamic.musicxml",
  sourceFormat: "musicxml",
  projectId: "blocked-direction-dynamic",
  now: "2026-07-27T08:01:08.000Z",
  createEventId: () => "unused-direction-dynamic",
});
assert.equal(directionDynamicDraft.status, "blocked");
assert.ok(
  directionDynamicDraft.issues.some(
    (issue) => issue.code === "unsupported-dynamic",
  ),
);
assert.ok(
  directionDynamicDraft.issues.some(
    (issue) => issue.code === "unsupported-direction",
  ),
);

const strictPedalXml = supportedXml
  .replace(
    "<note><pitch><step>C</step>",
    '<direction><direction-type><pedal type="start"/></direction-type><voice>1</voice><staff>1</staff></direction><note><pitch><step>C</step>',
  )
  .replace(
    "<note><rest/>",
    '<direction><direction-type><pedal type="stop"/></direction-type><voice>1</voice><staff>1</staff></direction><note><rest/>',
  )
  .replace(
    "<note><pitch><step>F</step>",
    '<direction><direction-type><pedal type="stop"/></direction-type><voice>1</voice><staff>1</staff></direction><note><pitch><step>F</step>',
  );
let pedalEventSequence = 0;
const strictPedalReady = createLocalScoreProjectMusicXmlImportDraft({
  xml: strictPedalXml,
  fileName: "严格制音踏板.musicxml",
  sourceFormat: "musicxml",
  projectId: "import-project-pedal",
  now: "2026-07-27T08:01:08.500Z",
  createEventId: () => `pedal-event-${++pedalEventSequence}`,
});
assert.equal(strictPedalReady.status, "ready");
assert.deepEqual(strictPedalReady.issues, []);
assert.deepEqual(
  strictPedalReady.project?.document.parts[0].staves[0].voices[0].measures
    .flatMap((measure) => measure.events)
    .map((event) => event.damperPedalMark),
  ["down", "up", null, null, "up"],
  "strict pedal directions must map exactly to their immediate note/rest",
);
let pedalMxlEventSequence = 0;
const strictPedalMxlReady = createLocalScoreProjectMusicXmlImportDraft({
  xml: strictPedalXml,
  fileName: "严格制音踏板.mxl",
  sourceFormat: "mxl",
  projectId: "import-project-pedal-mxl",
  now: "2026-07-27T08:01:08.600Z",
  createEventId: () => `pedal-mxl-event-${++pedalMxlEventSequence}`,
});
assert.equal(strictPedalMxlReady.status, "ready");
assert.deepEqual(
  strictPedalMxlReady.project?.document.parts[0].staves[0].voices[0].measures
    .flatMap((measure) => measure.events)
    .map((event) => event.damperPedalMark),
  ["down", "up", null, null, "up"],
  "MXL payload XML must use the same strict pedal mapping",
);

const strictHarmonyXml = supportedXml
  .replace(
    "<note><pitch><step>C</step>",
    '<harmony><root><root-step>C</root-step><root-alter>1</root-alter></root><kind>major</kind><staff>1</staff></harmony><direction><direction-type><pedal type="start"/></direction-type><voice>1</voice><staff>1</staff></direction><note><pitch><step>C</step>',
  )
  .replace(
    "<note><rest/>",
    '<harmony><root><root-step>D</root-step><root-alter>-1</root-alter></root><kind>minor</kind><staff>1</staff></harmony><note><rest/>',
  )
  .replace(
    "<note><pitch><step>D</step>",
    '<harmony><root><root-step>E</root-step><root-alter>1</root-alter></root><kind>dominant</kind><staff>1</staff></harmony><note><pitch><step>D</step>',
  )
  .replace(
    "<note><pitch><step>E</step>",
    '<harmony><root><root-step>F</root-step><root-alter>-1</root-alter></root><kind>major-seventh</kind><staff>1</staff></harmony><note><pitch><step>E</step>',
  )
  .replace(
    "<note><pitch><step>F</step>",
    '<harmony><root><root-step>G</root-step></root><kind>minor-seventh</kind><staff>1</staff></harmony><note><pitch><step>F</step>',
  );
let harmonyEventSequence = 0;
const strictHarmonyReady = createLocalScoreProjectMusicXmlImportDraft({
  xml: strictHarmonyXml,
  fileName: "严格和弦标记.musicxml",
  sourceFormat: "musicxml",
  projectId: "import-project-harmony",
  now: "2026-07-27T08:01:08.650Z",
  createEventId: () => `harmony-event-${++harmonyEventSequence}`,
});
assert.equal(strictHarmonyReady.status, "ready");
assert.deepEqual(strictHarmonyReady.issues, []);
assert.deepEqual(
  strictHarmonyReady.project?.document.parts[0].staves[0].voices[0].measures
    .flatMap((measure) => measure.events)
    .map((event) => [event.chordSymbol, event.damperPedalMark]),
  [
    ["C#", "down"],
    ["Dbm", null],
    ["E#7", null],
    ["Fbmaj7", null],
    ["Gm7", null],
  ],
  "strict harmony must map to note/rest chord symbols and coexist with pedal",
);
let harmonyMxlEventSequence = 0;
const strictHarmonyMxlReady = createLocalScoreProjectMusicXmlImportDraft({
  xml: strictHarmonyXml,
  fileName: "严格和弦标记.mxl",
  sourceFormat: "mxl",
  projectId: "import-project-harmony-mxl",
  now: "2026-07-27T08:01:08.660Z",
  createEventId: () => `harmony-mxl-event-${++harmonyMxlEventSequence}`,
});
assert.equal(strictHarmonyMxlReady.status, "ready");
assert.deepEqual(
  strictHarmonyMxlReady.project?.document.parts[0].staves[0].voices[0].measures
    .flatMap((measure) => measure.events)
    .map((event) => event.chordSymbol),
  ["C#", "Dbm", "E#7", "Fbmaj7", "Gm7"],
  "MXL payload XML must use the same strict harmony mapping",
);

const harmonyAnchor = "<note><pitch><step>D</step>";
const invalidHarmonies = [
  '<harmony><root><root-step>C</root-step></root><kind>augmented</kind><staff>1</staff></harmony>',
  '<harmony placement="above"><root><root-step>C</root-step></root><kind>major</kind><staff>1</staff></harmony>',
  '<harmony><root><root-step>C</root-step><root-alter>2</root-alter></root><kind>major</kind><staff>1</staff></harmony>',
  '<harmony><root><root-step>C</root-step><root-alter>1.0</root-alter></root><kind>major</kind><staff>1</staff></harmony>',
  '<harmony><root><root-step>C</root-step><root-alter>1</root-alter><root-alter>-1</root-alter></root><kind>major</kind><staff>1</staff></harmony>',
  '<harmony><root><root-alter>1</root-alter><root-step>C</root-step></root><kind>major</kind><staff>1</staff></harmony>',
  '<harmony><root><root-step>C</root-step><root-alter print-object="no">1</root-alter></root><kind>major</kind><staff>1</staff></harmony>',
  '<harmony><root><root-step>C</root-step></root><kind text="maj">major</kind><staff>1</staff></harmony>',
  '<harmony><root><root-step>H</root-step></root><kind>major</kind><staff>1</staff></harmony>',
  '<harmony><root><root-step>C</root-step></root><kind>major</kind><staff>2</staff></harmony>',
  '<harmony><kind>major</kind><root><root-step>C</root-step></root><staff>1</staff></harmony>',
  '<harmony><root><root-step>C</root-step></root><kind>major</kind><staff>1</staff><degree/></harmony>',
  '<harmony><root><!--comment--><root-step>C</root-step></root><kind>major</kind><staff>1</staff></harmony>',
  '<harmony><root><root-step>C</root-step></root><kind>major</kind><staff>1</staff></harmony><!--gap-->',
] as const;
for (let index = 0; index < invalidHarmonies.length; index += 1) {
  let invalidHarmonyIdCalls = 0;
  const invalidHarmonyDraft = createLocalScoreProjectMusicXmlImportDraft({
    xml: supportedXml.replace(
      harmonyAnchor,
      `${invalidHarmonies[index]}${harmonyAnchor}`,
    ),
    fileName: `invalid-harmony-${index + 1}.musicxml`,
    sourceFormat: "musicxml",
    projectId: `blocked-invalid-harmony-${index + 1}`,
    now: "2026-07-27T08:01:08.670Z",
    createEventId: () => {
      invalidHarmonyIdCalls += 1;
      return `unused-invalid-harmony-${invalidHarmonyIdCalls}`;
    },
  });
  assert.equal(invalidHarmonyDraft.status, "blocked");
  assert.equal(invalidHarmonyIdCalls, 0);
  assert.ok(
    invalidHarmonyDraft.issues.some(
      (issue) =>
        issue.code === "unsupported-harmony-structure"
        || issue.code === "unsupported-harmony-anchor",
    ),
    `harmony structure ${index + 1} must fail closed with a stable ledger code`,
  );
}

const duplicateHarmony = '<harmony><root><root-step>C</root-step></root><kind>major</kind><staff>1</staff></harmony>';
const invalidHarmonyAnchors = [
  supportedXml.replace(
    harmonyAnchor,
    `${duplicateHarmony}${duplicateHarmony}${harmonyAnchor}`,
  ),
  supportedXml.replace(
    "</measure>",
    `${duplicateHarmony}</measure>`,
  ),
] as const;
for (let index = 0; index < invalidHarmonyAnchors.length; index += 1) {
  const invalidHarmonyAnchorDraft =
    createLocalScoreProjectMusicXmlImportDraft({
      xml: invalidHarmonyAnchors[index],
      fileName: `invalid-harmony-anchor-${index + 1}.musicxml`,
      sourceFormat: "musicxml",
      projectId: `blocked-invalid-harmony-anchor-${index + 1}`,
      now: "2026-07-27T08:01:08.680Z",
      createEventId: () => "unused-invalid-harmony-anchor",
    });
  assert.equal(invalidHarmonyAnchorDraft.status, "blocked");
  assert.ok(
    invalidHarmonyAnchorDraft.issues.some(
      (issue) => issue.code === "unsupported-harmony-anchor",
    ),
  );
}

for (const [label, strayMarkup] of [
  ["root", "<root><root-step>C</root-step></root>"],
  ["root-step", "<root-step>C</root-step>"],
  ["root-alter", "<root-alter>1</root-alter>"],
  ["kind", "<kind>major</kind>"],
] as const) {
  const strayHarmonyElementDraft = createLocalScoreProjectMusicXmlImportDraft({
    xml: supportedXml.replace(harmonyAnchor, `${strayMarkup}${harmonyAnchor}`),
    fileName: `stray-harmony-${label}.musicxml`,
    sourceFormat: "musicxml",
    projectId: `blocked-stray-harmony-${label}`,
    now: "2026-07-27T08:01:08.690Z",
    createEventId: () => "unused-stray-harmony",
  });
  assert.equal(strayHarmonyElementDraft.status, "blocked");
  assert.ok(
    strayHarmonyElementDraft.issues.some(
      (issue) => issue.code === "unsupported-harmony-structure",
    ),
    `stray ${label} must fail closed`,
  );
}

const pedalAnchor = "<note><pitch><step>D</step>";
const invalidPedalDirections = [
  '<direction><direction-type><pedal/></direction-type><voice>1</voice><staff>1</staff></direction>',
  '<direction><direction-type><pedal type="change"/></direction-type><voice>1</voice><staff>1</staff></direction>',
  '<direction><direction-type><pedal type="start" line="yes"/></direction-type><voice>1</voice><staff>1</staff></direction>',
  '<direction placement="below"><direction-type><pedal type="start"/></direction-type><voice>1</voice><staff>1</staff></direction>',
  '<direction><direction-type id="pedal"><pedal type="start"/></direction-type><voice>1</voice><staff>1</staff></direction>',
  '<direction><direction-type><pedal type="start">text</pedal></direction-type><voice>1</voice><staff>1</staff></direction>',
  '<direction><direction-type><!--comment--><pedal type="start"/></direction-type><voice>1</voice><staff>1</staff></direction>',
  '<direction><direction-type><![CDATA[ ]]><pedal type="start"/></direction-type><voice>1</voice><staff>1</staff></direction>',
  '<direction><direction-type><?pedal data?><pedal type="start"/></direction-type><voice>1</voice><staff>1</staff></direction>',
  '<direction><direction-type><pedal type="start"/><pedal type="stop"/></direction-type><voice>1</voice><staff>1</staff></direction>',
  '<direction><direction-type><pedal type="start"/></direction-type><voice>2</voice><staff>1</staff></direction>',
  '<direction><direction-type><pedal type="start"/></direction-type><voice>1</voice></direction>',
] as const;
for (let index = 0; index < invalidPedalDirections.length; index += 1) {
  let invalidPedalIdCalls = 0;
  const invalidPedalDraft = createLocalScoreProjectMusicXmlImportDraft({
    xml: supportedXml.replace(
      pedalAnchor,
      `${invalidPedalDirections[index]}${pedalAnchor}`,
    ),
    fileName: `invalid-pedal-${index + 1}.musicxml`,
    sourceFormat: "musicxml",
    projectId: `blocked-invalid-pedal-${index + 1}`,
    now: "2026-07-27T08:01:08.700Z",
    createEventId: () => {
      invalidPedalIdCalls += 1;
      return `unused-invalid-pedal-${invalidPedalIdCalls}`;
    },
  });
  assert.equal(invalidPedalDraft.status, "blocked");
  assert.equal(invalidPedalIdCalls, 0);
  assert.ok(
    invalidPedalDraft.issues.some(
      (issue) => issue.code === "unsupported-pedal-direction",
    ),
    `非严格 pedal direction ${index + 1} 必须失败关闭`,
  );
}

for (const invalidPedalAnchorXml of [
  supportedXml.replace(
    pedalAnchor,
    `<pedal type="start"/>${pedalAnchor}`,
  ),
  supportedXml.replace(
    pedalAnchor,
    `<direction><direction-type><pedal type="start"/></direction-type><voice>1</voice><staff>1</staff></direction><attributes></attributes>${pedalAnchor}`,
  ),
  supportedXml.replace(
    "</measure>",
    '<direction><direction-type><pedal type="stop"/></direction-type><voice>1</voice><staff>1</staff></direction></measure>',
  ),
]) {
  let invalidAnchorIdCalls = 0;
  const invalidAnchorDraft = createLocalScoreProjectMusicXmlImportDraft({
    xml: invalidPedalAnchorXml,
    fileName: "invalid-pedal-anchor.musicxml",
    sourceFormat: "musicxml",
    projectId: "blocked-invalid-pedal-anchor",
    now: "2026-07-27T08:01:08.800Z",
    createEventId: () => {
      invalidAnchorIdCalls += 1;
      return `unused-invalid-anchor-${invalidAnchorIdCalls}`;
    },
  });
  assert.equal(invalidAnchorDraft.status, "blocked");
  assert.equal(invalidAnchorIdCalls, 0);
  assert.ok(
    invalidAnchorDraft.issues.some(
      (issue) =>
        issue.code === "unsupported-pedal-anchor"
        || issue.code === "unsupported-pedal-direction",
    ),
    "错层级、非紧邻或悬空 pedal 必须失败关闭",
  );
}

const validPedalDirection =
  '<direction><direction-type><pedal type="start"/></direction-type><voice>1</voice><staff>1</staff></direction>';
for (const gap of [
  "GARBAGE",
  "<![CDATA[ ]]>",
  "<!--gap-->",
  "<?gap x?>",
] as const) {
  let gapIdCalls = 0;
  const invalidGapDraft = createLocalScoreProjectMusicXmlImportDraft({
    xml: supportedXml.replace(
      pedalAnchor,
      `${validPedalDirection}${gap}${pedalAnchor}`,
    ),
    fileName: "invalid-pedal-gap.musicxml",
    sourceFormat: "musicxml",
    projectId: "blocked-invalid-pedal-gap",
    now: "2026-07-27T08:01:08.900Z",
    createEventId: () => {
      gapIdCalls += 1;
      return `unused-invalid-gap-${gapIdCalls}`;
    },
  });
  assert.equal(invalidGapDraft.status, "blocked");
  assert.equal(gapIdCalls, 0);
  assert.ok(
    invalidGapDraft.issues.some(
      (issue) => issue.code === "unsupported-pedal-anchor",
    ),
    "direction 与目标事件之间的文本、CDATA、comment 或 PI 必须失败关闭",
  );
}

const wrongCaseDirection =
  '<DIRECTION><DIRECTION-TYPE><PEDAL type="start"/></DIRECTION-TYPE><VOICE>1</VOICE><STAFF>1</STAFF></DIRECTION>';
const foreignNamespaceXml = supportedXml
  .replace(
    '<score-partwise version="4.0">',
    '<score-partwise version="4.0" xmlns:x="urn:not-musicxml">',
  )
  .replace(
    pedalAnchor,
    '<x:direction><x:direction-type><x:pedal type="start"/></x:direction-type><x:voice>1</x:voice><x:staff>1</x:staff></x:direction><note><pitch><step>D</step>',
  );
for (const invalidIdentityXml of [
  supportedXml.replace(
    pedalAnchor,
    `${wrongCaseDirection}${pedalAnchor}`,
  ),
  foreignNamespaceXml,
]) {
  let identityIdCalls = 0;
  const invalidIdentityDraft = createLocalScoreProjectMusicXmlImportDraft({
    xml: invalidIdentityXml,
    fileName: "invalid-pedal-identity.musicxml",
    sourceFormat: "musicxml",
    projectId: "blocked-invalid-pedal-identity",
    now: "2026-07-27T08:01:09.000Z",
    createEventId: () => {
      identityIdCalls += 1;
      return `unused-invalid-identity-${identityIdCalls}`;
    },
  });
  assert.equal(invalidIdentityDraft.status, "blocked");
  assert.equal(identityIdCalls, 0);
  assert.ok(
    invalidIdentityDraft.issues.some(
      (issue) => issue.code === "unsupported-pedal-direction",
    ),
    "错大小写或外部 namespace 的 pedal direction 必须失败关闭",
  );
}

for (const attribute of ['dynamics="80"', 'end-dynamics="65"']) {
  let playbackDynamicIdCalls = 0;
  const attributedDynamicNoteDraft =
    createLocalScoreProjectMusicXmlImportDraft({
      xml: supportedXml.replace(
        "<note><pitch><step>D</step>",
        `<note ${attribute}><pitch><step>D</step>`,
      ),
      fileName: "playback-dynamic-attribute.musicxml",
      sourceFormat: "musicxml",
      projectId: "blocked-playback-dynamic-attribute",
      now: "2026-07-27T08:01:09.000Z",
      createEventId: () => {
        playbackDynamicIdCalls += 1;
        return "unused-playback-dynamic-attribute";
      },
    });
  assert.equal(attributedDynamicNoteDraft.status, "blocked");
  assert.equal(playbackDynamicIdCalls, 0);
  assert.ok(
    attributedDynamicNoteDraft.issues.some(
      (issue) => issue.code === "unsupported-dynamic",
    ),
  );
}

let soundDynamicIdCalls = 0;
const soundDynamicDraft = createLocalScoreProjectMusicXmlImportDraft({
  xml: supportedXml.replace(
    "<note><pitch><step>D</step>",
    '<sound dynamics="80"/><note><pitch><step>D</step>',
  ),
  fileName: "sound-dynamic.musicxml",
  sourceFormat: "musicxml",
  projectId: "blocked-sound-dynamic",
  now: "2026-07-27T08:01:09.500Z",
  createEventId: () => {
    soundDynamicIdCalls += 1;
    return "unused-sound-dynamic";
  },
});
assert.equal(soundDynamicDraft.status, "blocked");
assert.equal(soundDynamicIdCalls, 0);
assert.ok(
  soundDynamicDraft.issues.some(
    (issue) => issue.code === "unsupported-sound",
  ),
);

const attributedSymbolicDynamicDraft =
  createLocalScoreProjectMusicXmlImportDraft({
    xml: supportedXml.replace(
      "<note><pitch><step>D</step>",
      '<note print-object="yes"><pitch><step>D</step>',
    ).replace(
      "<type>half</type></note>",
      "<type>half</type><notations><dynamics><mf/></dynamics></notations></note>",
    ),
    fileName: "attributed-symbolic-dynamic.musicxml",
    sourceFormat: "musicxml",
    projectId: "blocked-attributed-symbolic-dynamic",
    now: "2026-07-27T08:01:10.000Z",
    createEventId: () => "unused-attributed-symbolic-dynamic",
  });
assert.equal(attributedSymbolicDynamicDraft.status, "blocked");
assert.ok(
  attributedSymbolicDynamicDraft.issues.some(
    (issue) => issue.code === "unsupported-dynamic",
  ),
);

const fingeringInsertionTarget = "<type>half</type></note>";
const invalidFingeringFixtures = [
  {
    markup: "<notations><technical><fingering>0</fingering></technical></notations>",
    codes: ["unsupported-fingering"],
  },
  {
    markup: "<notations><technical><fingering>6</fingering></technical></notations>",
    codes: ["unsupported-fingering"],
  },
  {
    markup: "<notations><technical><fingering> 1</fingering></technical></notations>",
    codes: ["unsupported-fingering"],
  },
  {
    markup: "<notations><technical><fingering/></technical></notations>",
    codes: ["unsupported-fingering"],
  },
  {
    markup: '<notations><technical><fingering placement="above">1</fingering></technical></notations>',
    codes: ["unsupported-fingering"],
  },
  {
    markup: "<notations><technical><fingering><unexpected/></fingering></technical></notations>",
    codes: ["unsupported-fingering"],
  },
  {
    markup: "<notations><technical><fingering><![CDATA[1]]></fingering></technical></notations>",
    codes: ["unsupported-fingering"],
  },
  {
    markup: "<notations><technical><fingering><!--comment-->1</fingering></technical></notations>",
    codes: ["unsupported-fingering"],
  },
  {
    markup: "<notations><technical><fingering><?value 1?>1</fingering></technical></notations>",
    codes: ["unsupported-fingering"],
  },
  {
    markup: '<notations><technical type="left"><fingering>1</fingering></technical></notations>',
    codes: ["unsupported-technical"],
  },
  {
    markup: "<notations><technical><fingering>1</fingering><fingering>2</fingering></technical></notations>",
    codes: ["unsupported-technical"],
  },
  {
    markup: "<notations><technical><pluck>p</pluck></technical></notations>",
    codes: ["unsupported-technical"],
  },
  {
    markup: "<notations><technical/></notations>",
    codes: ["unsupported-technical"],
  },
  {
    markup: "<notations><technical><fingering>1</fingering></technical><technical><fingering>2</fingering></technical></notations>",
    codes: ["unsupported-technical"],
  },
  {
    markup: "<notations><fingering>1</fingering></notations>",
    codes: ["unsupported-fingering"],
  },
  {
    markup: "<technical><fingering>1</fingering></technical>",
    codes: ["unsupported-technical", "unsupported-fingering"],
  },
  {
    markup: "<notations><technical><!--comment--><fingering>1</fingering></technical></notations>",
    codes: ["unsupported-technical"],
  },
] as const;
for (
  let index = 0;
  index < invalidFingeringFixtures.length;
  index += 1
) {
  const fixture = invalidFingeringFixtures[index];
  let invalidFingeringIdCalls = 0;
  const invalidFingeringDraft = createLocalScoreProjectMusicXmlImportDraft({
    xml: supportedXml.replace(
      fingeringInsertionTarget,
      `<type>half</type>${fixture.markup}</note>`,
    ),
    fileName: `invalid-fingering-${index + 1}.musicxml`,
    sourceFormat: "musicxml",
    projectId: `blocked-invalid-fingering-${index + 1}`,
    now: "2026-07-27T08:00:57.000Z",
    createEventId: () => {
      invalidFingeringIdCalls += 1;
      return `unused-invalid-fingering-${invalidFingeringIdCalls}`;
    },
  });
  assert.equal(invalidFingeringDraft.status, "blocked");
  assert.equal(invalidFingeringIdCalls, 0);
  for (const code of fixture.codes) {
    assert.ok(
      invalidFingeringDraft.issues.some((issue) => issue.code === code),
      `指法结构 ${index + 1} 必须以稳定 ${code} ledger 失败关闭`,
    );
  }
}

let attributedFingeringIdCalls = 0;
const attributedFingeringDraft = createLocalScoreProjectMusicXmlImportDraft({
  xml: supportedXml.replace(
    "<note><pitch><step>D</step>",
    '<note print-object="yes"><pitch><step>D</step>',
  ).replace(
    fingeringInsertionTarget,
    "<type>half</type><notations><technical><fingering>1</fingering></technical></notations></note>",
  ),
  fileName: "attributed-fingering.musicxml",
  sourceFormat: "musicxml",
  projectId: "blocked-attributed-fingering",
  now: "2026-07-27T08:00:58.000Z",
  createEventId: () => {
    attributedFingeringIdCalls += 1;
    return `unused-attributed-fingering-${attributedFingeringIdCalls}`;
  },
});
assert.equal(attributedFingeringDraft.status, "blocked");
assert.equal(attributedFingeringIdCalls, 0);
assert.ok(
  attributedFingeringDraft.issues.some(
    (issue) => issue.code === "unsupported-fingering",
  ),
  "带指法的 note 属性必须失败关闭，避免 round-trip 静默丢失",
);

let restFingeringIdCalls = 0;
const restFingeringDraft = createLocalScoreProjectMusicXmlImportDraft({
  xml: supportedXml.replace(
    "<note><rest/><duration>2</duration><voice>1</voice><type>quarter</type><notations><fermata/></notations></note>",
    "<note><rest/><duration>2</duration><voice>1</voice><type>quarter</type><notations><fermata/><technical><fingering>2</fingering></technical></notations></note>",
  ),
  fileName: "rest-fingering.musicxml",
  sourceFormat: "musicxml",
  projectId: "blocked-rest-fingering",
  now: "2026-07-27T08:00:59.000Z",
  createEventId: () => {
    restFingeringIdCalls += 1;
    return `unused-rest-fingering-${restFingeringIdCalls}`;
  },
});
assert.equal(restFingeringDraft.status, "blocked");
assert.equal(restFingeringIdCalls, 0);
assert.ok(
  restFingeringDraft.issues.some(
    (issue) => issue.code === "unsupported-fingering-on-rest",
  ),
  "休止符指法必须以稳定 ledger 失败关闭",
);

const maxLyric = `${"唱".repeat(79)}🎵`;
let maxLyricEventSequence = 0;
const maxLyricDraft = createLocalScoreProjectMusicXmlImportDraft({
  xml: supportedXml.replace(
    "<type>half</type></note>",
    `<type>half</type><staff>1</staff><lyric><text>${maxLyric}</text></lyric></note>`,
  ),
  fileName: "max-lyric.musicxml",
  sourceFormat: "musicxml",
  projectId: "import-project-max-lyric",
  now: "2026-07-27T08:00:56.000Z",
  createEventId: () => `max-lyric-event-${++maxLyricEventSequence}`,
});
assert.equal(maxLyricDraft.status, "ready");
assert.equal(
  (maxLyricDraft.project?.document.parts[0].staves[0].voices[0].measures[0]
    .events[2]?.type === "note"
    ? maxLyricDraft.project.document.parts[0].staves[0].voices[0].measures[0]
      .events[2].lyric
    : null),
  maxLyric,
  "歌词上限必须按 Unicode code point 而非 UTF-16 code unit 计算",
);

const lyricInsertionTarget = "<type>half</type></note>";
const invalidLyricXmls = [
  supportedXml.replace(
    lyricInsertionTarget,
    "<type>half</type><lyric><text>缺少 staff</text></lyric></note>",
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    "<type>half</type><lyric><text>一</text></lyric><lyric><text>二</text></lyric></note>",
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    '<type>half</type><lyric number="1"><text>歌词</text></lyric></note>',
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    "<type>half</type><lyric/></note>",
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    "<type>half</type><lyric><text/></lyric></note>",
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    "<type>half</type><lyric><text> 歌词</text></lyric></note>",
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    "<type>half</type><lyric><text>歌词 </text></lyric></note>",
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    "<type>half</type><lyric><text>   </text></lyric></note>",
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    `<type>half</type><lyric><text>${"唱".repeat(81)}</text></lyric></note>`,
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    "<type>half</type><lyric><text>坏&#x85;词</text></lyric></note>",
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    "<type>half</type><lyric><text>坏&#xFFFE;词</text></lyric></note>",
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    "<type>half</type><lyric><text>坏&#xFFFF;词</text></lyric></note>",
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    "<type>half</type><lyric><text>坏&#xD800;词</text></lyric></note>",
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    `<type>half</type><lyric><text>坏${String.fromCodePoint(0xfffe)}词</text></lyric></note>`,
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    `<type>half</type><lyric><text>坏${String.fromCharCode(0xd800)}词</text></lyric></note>`,
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    "<type>half</type><lyric><text>坏\u2028词</text></lyric></note>",
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    "<type>half</type><lyric><text>坏\u2029词</text></lyric></note>",
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    `<type>half</type><lyric><text>坏${String.fromCodePoint(0xf0000)}词</text></lyric></note>`,
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    "<type>half</type><lyric>旁路<text>歌词</text></lyric></note>",
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    "<type>half</type><lyric><![CDATA[ ]]><text>歌词</text></lyric></note>",
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    "<type>half</type><lyric><text><![CDATA[]]></text></lyric></note>",
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    "<type>half</type><lyric><!--comment--><text>歌词</text></lyric></note>",
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    "<type>half</type><lyric><?lyric data?><text>歌词</text></lyric></note>",
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    '<type>half</type><lyric><text xml:lang="zh">歌词</text></lyric></note>',
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    "<type>half</type><lyric><text><unexpected/></text></lyric></note>",
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    "<type>half</type><lyric><text>一</text><text>二</text></lyric></note>",
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    "<type>half</type><lyric><syllabic>single</syllabic><text>歌词</text></lyric></note>",
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    "<type>half</type><lyric><text>歌词</text><extend/></lyric></note>",
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    "<type>half</type><lyric><text>一</text><elision>‿</elision><text>二</text></lyric></note>",
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    "<type>half</type><lyric><laughing/></lyric></note>",
  ),
  supportedXml.replace(
    "<note><pitch><step>D</step>",
    "<lyric><text>错层级</text></lyric><note><pitch><step>D</step>",
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    "<type>half</type><text>错层级</text></note>",
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    "<type>half</type><lyric><text>错序</text></lyric><staff>1</staff></note>",
  ),
  supportedXml.replace(
    lyricInsertionTarget,
    "<type>half</type><lyric><text>错序</text></lyric><notations><fermata/></notations></note>",
  ),
  supportedXml.replace(
    "<note><rest/><duration>2</duration><voice>1</voice><type>quarter</type><notations><fermata/></notations></note>",
    "<note><rest/><duration>2</duration><voice>1</voice><type>quarter</type><notations><fermata/></notations><lyric><text>休止</text></lyric></note>",
  ),
  supportedXml
    .replace(
      "<note><pitch><step>D</step>",
      '<note print-object="yes"><pitch><step>D</step>',
    )
    .replace(
      lyricInsertionTarget,
      "<type>half</type><lyric><text>歌词</text></lyric></note>",
    ),
];
for (let index = 0; index < invalidLyricXmls.length; index += 1) {
  let invalidLyricIdCalls = 0;
  const invalidLyricDraft = createLocalScoreProjectMusicXmlImportDraft({
    xml: invalidLyricXmls[index],
    fileName: `invalid-lyric-${index + 1}.musicxml`,
    sourceFormat: "musicxml",
    projectId: `blocked-invalid-lyric-${index + 1}`,
    now: "2026-07-27T08:00:57.000Z",
    createEventId: () => {
      invalidLyricIdCalls += 1;
      return `unused-invalid-lyric-${invalidLyricIdCalls}`;
    },
  });
  assert.equal(invalidLyricDraft.status, "blocked");
  assert.equal(invalidLyricIdCalls, 0);
  assert.ok(
    invalidLyricDraft.issues.some(
      (issue) =>
        issue.code === "unsupported-lyric"
        || issue.code === "unsupported-lyric-on-rest",
    ),
    `歌词结构 ${index + 1} 必须以稳定 lyric ledger 失败关闭`,
  );
}

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
      <note><chord/><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>2</duration><voice>2</voice><type>quarter</type><dot placement="above"/></note>
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

const firstDot = "<dot/>";
const invalidDotXmls = [
  dottedXml.replace(firstDot, "<dot/><dot/>"),
  dottedXml.replace(firstDot, '<dot placement="above"/>'),
  dottedXml.replace(firstDot, "<dot>bad</dot>"),
  dottedXml.replace(firstDot, "<dot><![CDATA[bad]]></dot>"),
  dottedXml.replace(firstDot, "<dot><![CDATA[]]></dot>"),
  dottedXml.replace(firstDot, "<dot><unexpected/></dot>"),
  dottedXml.replace(
    "<notations><fermata/><tied",
    "<notations><dot/><fermata/><tied",
  ),
];
for (let index = 0; index < invalidDotXmls.length; index += 1) {
  const xml = invalidDotXmls[index];
  let invalidDotIdCalls = 0;
  const invalidDotDraft = createLocalScoreProjectMusicXmlImportDraft({
    xml,
    fileName: `invalid-dot-${index + 1}.musicxml`,
    sourceFormat: "musicxml",
    projectId: `blocked-invalid-dot-${index + 1}`,
    now: "2026-07-27T08:06:00.000Z",
    createEventId: () => {
      invalidDotIdCalls += 1;
      return `unused-invalid-dot-${invalidDotIdCalls}`;
    },
  });
  assert.equal(invalidDotDraft.status, "blocked");
  assert.equal(invalidDotIdCalls, 0);
  assert.ok(
    invalidDotDraft.issues.some((issue) => issue.code === "unsupported-dot"),
    "重复、有属性、有内容或错误层级的 dot 必须失败关闭",
  );
}

for (const xml of [
  dottedXml.replace("<duration>12</duration>", "<duration>8</duration>"),
  dottedXml.replace("<type>half</type><dot/>", "<type>half</type>"),
]) {
  const inconsistentDottedDraft = createLocalScoreProjectMusicXmlImportDraft({
    xml,
    fileName: "inconsistent-dotted-duration.musicxml",
    sourceFormat: "musicxml",
    projectId: "blocked-inconsistent-dotted-duration",
    now: "2026-07-27T08:07:00.000Z",
    createEventId: () => "unused-event",
  });
  assert.equal(inconsistentDottedDraft.status, "blocked");
  assert.ok(
    inconsistentDottedDraft.issues.some(
      (issue) => issue.code === "inconsistent-duration",
    ),
    "dot、type 与 duration 必须表达相同有效时值",
  );
}

const dottedOverfullDraft = createLocalScoreProjectMusicXmlImportDraft({
  xml: dottedXml.replace(
    "</measure>\n  </part>",
    "      <note><pitch><step>F</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>eighth</type><staff>1</staff></note>\n    </measure>\n  </part>",
  ),
  fileName: "dotted-overfull.musicxml",
  sourceFormat: "musicxml",
  projectId: "blocked-dotted-overfull",
  now: "2026-07-27T08:08:00.000Z",
  createEventId: () => "unused-event",
});
assert.equal(dottedOverfullDraft.status, "blocked");
assert.ok(
  dottedOverfullDraft.issues.some((issue) => issue.code === "overfull-measure"),
  "附点有效时值必须计入小节容量",
);

const dottedHalfRestDraft = createLocalScoreProjectMusicXmlImportDraft({
  xml: dottedXml.replace(
    "<rest/><duration>6</duration><voice>1</voice><type>quarter</type><dot/>",
    "<rest/><duration>12</duration><voice>1</voice><type>half</type><dot/>",
  ),
  fileName: "dotted-half-rest.musicxml",
  sourceFormat: "musicxml",
  projectId: "blocked-dotted-half-rest",
  now: "2026-07-27T08:09:00.000Z",
  createEventId: () => "unused-event",
});
assert.equal(dottedHalfRestDraft.status, "blocked");
assert.ok(
  dottedHalfRestDraft.issues.some(
    (issue) => issue.code === "unsupported-rest-duration",
  ),
  "本切片不得扩大既有四分休止符范围",
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
  ["<lyric><syllabic>single</syllabic><text>la</text></lyric>", "unsupported-lyric"],
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
