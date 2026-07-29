import {
  getLocalScoreProjectEventDurationBeats,
  LOCAL_SCORE_PROJECT_MAX_LYRIC_CODE_POINTS,
  parseLocalScoreProject,
  serializeLocalScoreProject,
  type LocalScoreProjectV1,
} from "./localScoreProject";
import type { LocalScoreProjectEventV9 } from "./scoreDocument";
import {
  createMusicXmlMxlArchive,
  MUSICXML_MIME_TYPE,
  MXL_MIME_TYPE,
} from "../musicxml/mxlWriter";

export const LOCAL_SCORE_PROJECT_MUSICXML_EXPORT_MAX_BYTES = 2 * 1024 * 1024;

export type LocalScoreProjectMusicXmlExportFormat = "musicxml" | "mxl";

export type LocalScoreProjectMusicXmlExportIssue = Readonly<{
  code: string;
  severity: "blocking";
  message: string;
  partIndex?: number;
  staffIndex?: number;
  voiceIndex?: number;
  measureNumber?: number;
  eventId?: string;
}>;

export type LocalScoreProjectMusicXmlExportDraft = Readonly<{
  status: "ready" | "blocked";
  sourceProjectId: string;
  sourceRevision: number;
  sourceFingerprint: string | null;
  issues: readonly LocalScoreProjectMusicXmlExportIssue[];
  summary: Readonly<{
    partCount: number;
    staffCount: number;
    voiceCount: number;
    measureCount: number;
    eventCount: number;
  }>;
  xml: string | null;
  fileNames: Readonly<{
    musicxml: string;
    mxl: string;
  }> | null;
  byteSizes: Readonly<{
    musicxml: number;
    mxl: number;
  }> | null;
}>;

export type LocalScoreProjectMusicXmlExportPayload = Readonly<{
  fileName: string;
  mimeType: typeof MUSICXML_MIME_TYPE | typeof MXL_MIME_TYPE;
  data: string | Uint8Array;
}>;

const UINT64_MASK = BigInt("0xffffffffffffffff");
const FNV_64_PRIME = BigInt("0x00000100000001b3");
const FNV_64_OFFSET_A = BigInt("0xcbf29ce484222325");
const FNV_64_OFFSET_B = BigInt("0x84222325cbf29ce4");
const utf8Encoder = new TextEncoder();
const durationToMusicXml = {
  eighth: { duration: 2, type: "eighth" },
  quarter: { duration: 4, type: "quarter" },
  half: { duration: 8, type: "half" },
} as const;

const blockingIssue = (
  code: string,
  message: string,
  location: Omit<
    LocalScoreProjectMusicXmlExportIssue,
    "code" | "severity" | "message"
  > = {},
): LocalScoreProjectMusicXmlExportIssue => ({
  code,
  severity: "blocking",
  message,
  ...location,
});

const fnv1a64Utf16Le = (value: string, offset: bigint) => {
  let hash = offset;
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    hash ^= BigInt(codeUnit & 0xff);
    hash = hash * FNV_64_PRIME & UINT64_MASK;
    hash ^= BigInt(codeUnit >>> 8);
    hash = hash * FNV_64_PRIME & UINT64_MASK;
  }
  return hash.toString(16).padStart(16, "0");
};

const getProjectFingerprint = (project: LocalScoreProjectV1) => {
  const canonical = serializeLocalScoreProject(project);
  return `local-score-project-musicxml-export-v1:${fnv1a64Utf16Le(canonical, FNV_64_OFFSET_A)}:${fnv1a64Utf16Le(canonical, FNV_64_OFFSET_B)}`;
};

const escapeXmlText = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll("\"", "&quot;")
  .replaceAll("'", "&apos;");

const isXml10Text = (value: string) => Array.from(value).every((character) => {
  const codePoint = character.codePointAt(0) ?? 0;
  return codePoint === 0x9
    || codePoint === 0xa
    || codePoint === 0xd
    || (codePoint >= 0x20 && codePoint <= 0xd7ff)
    || (codePoint >= 0xe000 && codePoint <= 0xfffd)
    || (codePoint >= 0x10000 && codePoint <= 0x10ffff);
});

const getSafeFileBaseName = (title: string) => {
  const sanitized = title
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, "_")
    .replace(/[.\s]+$/g, "")
    .trim()
    .slice(0, 80);
  return sanitized || "本机乐谱";
};

const getEventLocation = ({
  partIndex,
  staffIndex,
  voiceIndex,
  measureNumber,
  eventId,
}: {
  partIndex: number;
  staffIndex: number;
  voiceIndex: number;
  measureNumber: number;
  eventId: string;
}) => ({
  partIndex,
  staffIndex,
  voiceIndex,
  measureNumber,
  eventId,
});

const isSupportedLyric = (value: unknown): value is string => {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.trim() !== value
    || Array.from(value).length > LOCAL_SCORE_PROJECT_MAX_LYRIC_CODE_POINTS
  ) {
    return false;
  }
  return !Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f
      || (codePoint >= 0x7f && codePoint <= 0x9f)
      || (codePoint >= 0xd800 && codePoint <= 0xdfff)
      || codePoint === 0x2028
      || codePoint === 0x2029
      || codePoint === 0xfffe
      || codePoint === 0xffff
      || codePoint > 0xeffff;
  });
};

const getRawUnsupportedLyricIssues = (
  project: unknown,
): LocalScoreProjectMusicXmlExportIssue[] => {
  if (typeof project !== "object" || project === null) return [];
  const document = (project as { document?: unknown }).document;
  if (typeof document !== "object" || document === null) return [];
  const parts = (document as { parts?: unknown }).parts;
  if (!Array.isArray(parts)) return [];
  const issues: LocalScoreProjectMusicXmlExportIssue[] = [];
  parts.forEach((part, partIndex) => {
    if (typeof part !== "object" || part === null) return;
    const staves = (part as { staves?: unknown }).staves;
    if (!Array.isArray(staves)) return;
    staves.forEach((staff, staffIndex) => {
      if (typeof staff !== "object" || staff === null) return;
      const voices = (staff as { voices?: unknown }).voices;
      if (!Array.isArray(voices)) return;
      voices.forEach((voice, voiceIndex) => {
        if (typeof voice !== "object" || voice === null) return;
        const measures = (voice as { measures?: unknown }).measures;
        if (!Array.isArray(measures)) return;
        measures.forEach((measure) => {
          if (typeof measure !== "object" || measure === null) return;
          const measureNumber =
            (measure as { measureNumber?: unknown }).measureNumber;
          const events = (measure as { events?: unknown }).events;
          if (!Array.isArray(events)) return;
          events.forEach((event) => {
            if (
              typeof event !== "object"
              || event === null
              || (event as { type?: unknown }).type !== "note"
            ) {
              return;
            }
            const lyric = (event as { lyric?: unknown }).lyric;
            if (lyric === null || lyric === undefined || isSupportedLyric(lyric)) {
              return;
            }
            const eventId = (event as { id?: unknown }).id;
            issues.push(blockingIssue(
              "unsupported-lyric",
              "歌词必须是首尾无空白、最多 80 个字符且可安全写入 XML 1.0 的非空文本。",
              {
                partIndex,
                staffIndex,
                voiceIndex,
                ...(typeof measureNumber === "number" ? { measureNumber } : {}),
                ...(typeof eventId === "string" ? { eventId } : {}),
              },
            ));
          });
        });
      });
    });
  });
  return issues;
};

const addEventIssues = ({
  event,
  issues,
  partIndex,
  staffIndex,
  voiceIndex,
  measureNumber,
}: {
  event: LocalScoreProjectEventV9;
  issues: LocalScoreProjectMusicXmlExportIssue[];
  partIndex: number;
  staffIndex: number;
  voiceIndex: number;
  measureNumber: number;
}) => {
  const location = getEventLocation({
    partIndex,
    staffIndex,
    voiceIndex,
    measureNumber,
    eventId: event.id,
  });
  if (event.chordSymbol !== null) {
    issues.push(blockingIssue(
      "unsupported-chord-symbol",
      "当前导出不支持和弦标记。",
      location,
    ));
  }
  if (event.type === "rest") {
    if (event.duration !== "quarter") {
      issues.push(blockingIssue(
        "unsupported-rest-duration",
        "当前导出只支持四分休止符。",
        location,
      ));
    }
    return;
  }
  if (event.lyric !== null && !isSupportedLyric(event.lyric)) {
    issues.push(blockingIssue(
      "unsupported-lyric",
      "歌词必须是首尾无空白、最多 80 个字符且可安全写入 XML 1.0 的非空文本。",
      location,
    ));
  }
};

const renderDamperPedalDirection = (event: LocalScoreProjectEventV9) => {
  if (event.damperPedalMark === null) return "";
  const type = event.damperPedalMark === "down" ? "start" : "stop";
  return `      <direction>
        <direction-type><pedal type="${type}"/></direction-type>
        <voice>1</voice>
        <staff>1</staff>
      </direction>
`;
};

const renderNote = ({
  event,
  tieStop,
  slurStop,
}: {
  event: LocalScoreProjectEventV9;
  tieStop: boolean;
  slurStop: boolean;
}) => {
  const duration = durationToMusicXml[event.duration];
  const durationValue = duration.duration
    * (event.augmentationDots === 1 ? 1.5 : 1);
  const dotMarkup = event.augmentationDots === 1 ? "\n        <dot/>" : "";
  const notationMarks = [
    ...(event.fermataMark === "fermata" ? ["<fermata/>"] : []),
    ...(tieStop ? ['<tied type="stop"/>'] : []),
    ...(event.type === "note" && event.tieToNext
      ? ['<tied type="start"/>']
      : []),
    ...(slurStop ? ['<slur type="stop"/>'] : []),
    ...(event.type === "note" && event.slurToNext
      ? ['<slur type="start"/>']
      : []),
    ...(event.type === "note" && event.fingering !== null
      ? [`<technical><fingering>${event.fingering}</fingering></technical>`]
      : []),
    ...(event.type === "note" && event.articulations.length > 0
      ? [
        `<articulations>${event.articulations
          .map((articulation) => `<${articulation}/>`)
          .join("")}</articulations>`,
      ]
      : []),
    ...(event.dynamicMark !== null
      ? [`<dynamics><${event.dynamicMark}/></dynamics>`]
      : []),
  ];
  const directTies = event.type === "note"
    ? [
      ...(tieStop ? ['        <tie type="stop"/>'] : []),
      ...(event.tieToNext ? ['        <tie type="start"/>'] : []),
    ]
    : [];
  const directTieMarkup = directTies.length > 0
    ? `\n${directTies.join("\n")}`
    : "";
  const notations = notationMarks.length > 0
    ? `\n        <notations>${notationMarks.join("")}</notations>`
    : "";
  const lyric = event.type === "note" && event.lyric !== null
    ? `\n        <lyric><text>${escapeXmlText(event.lyric)}</text></lyric>`
    : "";
  if (event.type === "rest") {
    return `      <note>
        <rest/>
        <duration>${durationValue}</duration>
        <voice>1</voice>
        <type>${duration.type}</type>${dotMarkup}
        <staff>1</staff>${notations}
      </note>`;
  }
  const step = event.pitch.slice(0, 1);
  const octave = event.pitch.slice(1);
  return `      <note>
        <pitch>
          <step>${step}</step>
          <octave>${octave}</octave>
        </pitch>
        <duration>${durationValue}</duration>${directTieMarkup}
        <voice>1</voice>
        <type>${duration.type}</type>${dotMarkup}
        <staff>1</staff>${notations}${lyric}
      </note>`;
};

const renderMusicXml = (project: LocalScoreProjectV1) => {
  const part = project.document.parts[0];
  const staff = part.staves[0];
  const voice = staff.voices[0];
  const clef = staff.clef === "treble"
    ? { sign: "G", line: 2 }
    : { sign: "F", line: 4 };
  const [beats, beatType] = project.document.meter.split("/");
  let previousEvent: LocalScoreProjectEventV9 | null = null;
  const measures = voice.measures.map((measure, measureIndex) => {
    const attributes = measureIndex === 0
      ? `      <attributes>
        <divisions>4</divisions>
        <key><fifths>${project.document.keySignature.fifths}</fifths></key>
        <time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>
        <staves>1</staves>
        <clef><sign>${clef.sign}</sign><line>${clef.line}</line></clef>
      </attributes>
`
      : "";
    const events = measure.events.map((event) => {
      const tieStop = previousEvent?.type === "note"
        && previousEvent.tieToNext;
      const slurStop = previousEvent?.type === "note"
        && previousEvent.slurToNext;
      const rendered = `${renderDamperPedalDirection(event)}${
        renderNote({ event, tieStop, slurStop })
      }`;
      previousEvent = event;
      return rendered;
    }).join("\n");
    return `    <measure number="${measure.measureNumber}">
${attributes}${events}${events ? "\n" : ""}    </measure>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work>
    <work-title>${escapeXmlText(project.document.scoreCredits.title)}</work-title>
  </work>
  <part-list>
    <score-part id="P1">
      <part-name>${escapeXmlText(part.name)}</part-name>
    </score-part>
  </part-list>
  <part id="P1">
${measures}
  </part>
</score-partwise>
`;
};

export const createLocalScoreProjectMusicXmlExportDraft = ({
  project,
}: {
  project: LocalScoreProjectV1;
}): LocalScoreProjectMusicXmlExportDraft => {
  const rawUnsupportedLyricIssues = getRawUnsupportedLyricIssues(project);
  const parsedProject = parseLocalScoreProject(project);
  const summary = {
    partCount: parsedProject?.document.parts.length ?? 0,
    staffCount: parsedProject?.document.parts.reduce(
      (count, part) => count + part.staves.length,
      0,
    ) ?? 0,
    voiceCount: parsedProject?.document.parts.reduce(
      (count, part) => count + part.staves.reduce(
        (staffCount, staff) => staffCount + staff.voices.length,
        0,
      ),
      0,
    ) ?? 0,
    measureCount: parsedProject?.document.parts.reduce(
      (count, part) => count + part.staves.reduce(
        (staffCount, staff) => staffCount + staff.voices.reduce(
          (voiceCount, voice) => voiceCount + voice.measures.length,
          0,
        ),
        0,
      ),
      0,
    ) ?? 0,
    eventCount: parsedProject?.document.parts.reduce(
      (count, part) => count + part.staves.reduce(
        (staffCount, staff) => staffCount + staff.voices.reduce(
          (voiceCount, voice) => voiceCount + voice.measures.reduce(
            (measureCount, measure) => measureCount + measure.events.length,
            0,
          ),
          0,
        ),
        0,
      ),
      0,
    ) ?? 0,
  };
  const issues: LocalScoreProjectMusicXmlExportIssue[] = [];
  if (!parsedProject) {
    return {
      status: "blocked",
      sourceProjectId: project.projectId,
      sourceRevision: project.document.revision,
      sourceFingerprint: null,
      issues: [
        ...rawUnsupportedLyricIssues,
        blockingIssue(
          "invalid-canonical-project",
          "本机谱项目未通过当前 canonical 结构校验，不能导出。",
        ),
      ],
      summary,
      xml: null,
      fileNames: null,
      byteSizes: null,
    };
  }

  if (!isXml10Text(parsedProject.title)) {
    issues.push(blockingIssue(
      "unsupported-project-title-text",
      "项目名称包含 XML 1.0 无法无损表示的字符，不能生成导出文件名。",
    ));
  }
  if (parsedProject.title !== parsedProject.document.scoreCredits.title) {
    issues.push(blockingIssue(
      "unsupported-distinct-score-title",
      "当前导出要求项目名称与谱面标题一致，避免 round-trip 后静默丢失名称。",
    ));
  }
  if (!isXml10Text(parsedProject.document.scoreCredits.title)) {
    issues.push(blockingIssue(
      "unsupported-score-title-text",
      "谱面标题包含 XML 1.0 无法无损表示的字符，不能导出。",
    ));
  }
  if (parsedProject.tempoBpm !== 90) {
    issues.push(blockingIssue(
      "unsupported-tempo",
      "当前导出只支持 90 BPM；其他速度不会被静默丢失。",
    ));
  }
  if (parsedProject.document.scoreCredits.subtitle !== null) {
    issues.push(blockingIssue(
      "unsupported-subtitle",
      "当前导出不支持非空副标题。",
    ));
  }
  if (parsedProject.document.scoreCredits.creators.length > 0) {
    issues.push(blockingIssue(
      "unsupported-creators",
      "当前导出不支持作曲、作词或编曲署名。",
    ));
  }
  if (parsedProject.document.scoreCredits.rightsNotice !== null) {
    issues.push(blockingIssue(
      "unsupported-rights-notice",
      "当前导出不支持非空版权声明。",
    ));
  }
  if (parsedProject.document.parts.length !== 1) {
    issues.push(blockingIssue(
      "unsupported-part-count",
      `当前导出只支持一个 part；项目包含 ${parsedProject.document.parts.length} 个。`,
    ));
  }

  parsedProject.document.parts.forEach((part, partIndex) => {
    if (!isXml10Text(part.name)) {
      issues.push(blockingIssue(
        "unsupported-part-name-text",
        "声部组名称包含 XML 1.0 无法无损表示的字符，不能导出。",
        { partIndex },
      ));
    }
    if (part.instrument.kind !== "unassigned") {
      issues.push(blockingIssue(
        "unsupported-instrument",
        "当前导出只支持未指定乐器的声部组。",
        { partIndex },
      ));
    }
    if (part.staves.length !== 1) {
      issues.push(blockingIssue(
        "unsupported-staff-count",
        `当前导出每个 part 只支持一个 staff；第 ${partIndex + 1} 个 part 包含 ${part.staves.length} 个。`,
        { partIndex },
      ));
    }
    part.staves.forEach((staff, staffIndex) => {
      if (staff.voices.length !== 1) {
        issues.push(blockingIssue(
          "unsupported-voice-count",
          `当前导出每个 staff 只支持一个 voice；当前 staff 包含 ${staff.voices.length} 个。`,
          { partIndex, staffIndex },
        ));
      }
      staff.voices.forEach((voice, voiceIndex) => {
        let previousMeasureNumber = 0;
        voice.measures.forEach((measure) => {
          if (measure.measureNumber <= previousMeasureNumber) {
            issues.push(blockingIssue(
              "unordered-measures",
              "当前导出要求小节编号严格递增。",
              {
                partIndex,
                staffIndex,
                voiceIndex,
                measureNumber: measure.measureNumber,
              },
            ));
          }
          previousMeasureNumber = measure.measureNumber;
          let occupiedBeats = 0;
          measure.events.forEach((event) => {
            addEventIssues({
              event,
              issues,
              partIndex,
              staffIndex,
              voiceIndex,
              measureNumber: measure.measureNumber,
            });
            occupiedBeats += getLocalScoreProjectEventDurationBeats(event);
          });
          const measureCapacity = Number(parsedProject.document.meter.split("/")[0]);
          if (occupiedBeats > measureCapacity) {
            issues.push(blockingIssue(
              "overfull-measure",
              `第 ${measure.measureNumber} 小节共 ${occupiedBeats} 拍，超过 ${parsedProject.document.meter} 容量。`,
              { partIndex, staffIndex, voiceIndex, measureNumber: measure.measureNumber },
            ));
          }
        });
      });
    });
  });
  if (summary.eventCount === 0) {
    issues.push(blockingIssue(
      "missing-events",
      "项目没有可导出的音符或休止符。",
    ));
  }

  const sourceFingerprint = getProjectFingerprint(parsedProject);
  if (issues.length > 0) {
    return {
      status: "blocked",
      sourceProjectId: parsedProject.projectId,
      sourceRevision: parsedProject.document.revision,
      sourceFingerprint,
      issues,
      summary,
      xml: null,
      fileNames: null,
      byteSizes: null,
    };
  }

  const xml = renderMusicXml(parsedProject);
  const musicXmlByteSize = utf8Encoder.encode(xml).byteLength;
  if (musicXmlByteSize > LOCAL_SCORE_PROJECT_MUSICXML_EXPORT_MAX_BYTES) {
    return {
      status: "blocked",
      sourceProjectId: parsedProject.projectId,
      sourceRevision: parsedProject.document.revision,
      sourceFingerprint,
      issues: [blockingIssue(
        "musicxml-size-limit",
        "生成的 MusicXML 超过 2 MiB，未生成导出候选。",
      )],
      summary,
      xml: null,
      fileNames: null,
      byteSizes: null,
    };
  }
  let mxl: Uint8Array;
  try {
    mxl = createMusicXmlMxlArchive(xml);
  } catch {
    return {
      status: "blocked",
      sourceProjectId: parsedProject.projectId,
      sourceRevision: parsedProject.document.revision,
      sourceFingerprint,
      issues: [blockingIssue(
        "mxl-generation-failed",
        "无法在本机生成完整 MXL，未生成导出候选。",
      )],
      summary,
      xml: null,
      fileNames: null,
      byteSizes: null,
    };
  }
  if (mxl.byteLength > LOCAL_SCORE_PROJECT_MUSICXML_EXPORT_MAX_BYTES) {
    return {
      status: "blocked",
      sourceProjectId: parsedProject.projectId,
      sourceRevision: parsedProject.document.revision,
      sourceFingerprint,
      issues: [blockingIssue(
        "mxl-size-limit",
        "生成的 MXL 超过 2 MiB，未生成导出候选。",
      )],
      summary,
      xml: null,
      fileNames: null,
      byteSizes: null,
    };
  }
  const baseName = getSafeFileBaseName(parsedProject.title);
  return {
    status: "ready",
    sourceProjectId: parsedProject.projectId,
    sourceRevision: parsedProject.document.revision,
    sourceFingerprint,
    issues: [],
    summary,
    xml,
    fileNames: {
      musicxml: `${baseName}.musicxml`,
      mxl: `${baseName}.mxl`,
    },
    byteSizes: {
      musicxml: musicXmlByteSize,
      mxl: mxl.byteLength,
    },
  };
};

export const confirmLocalScoreProjectMusicXmlExportDraft = ({
  draft,
  currentProject,
  format,
}: {
  draft: LocalScoreProjectMusicXmlExportDraft;
  currentProject: LocalScoreProjectV1;
  format: LocalScoreProjectMusicXmlExportFormat;
}): LocalScoreProjectMusicXmlExportPayload => {
  if (
    format !== "musicxml"
    && format !== "mxl"
  ) {
    throw new Error("MusicXML 导出格式无效。");
  }
  if (
    draft.status !== "ready"
    || draft.issues.length > 0
    || !draft.xml
    || !draft.fileNames
    || !draft.byteSizes
    || !draft.sourceFingerprint
  ) {
    throw new Error("MusicXML 导出候选仍有阻断问题，不能确认。");
  }
  const currentDraft = createLocalScoreProjectMusicXmlExportDraft({
    project: currentProject,
  });
  if (
    currentDraft.status !== "ready"
    || currentDraft.sourceProjectId !== draft.sourceProjectId
    || currentDraft.sourceRevision !== draft.sourceRevision
    || currentDraft.sourceFingerprint !== draft.sourceFingerprint
  ) {
    throw new Error("本机谱项目已变化，请重新生成并检查导出候选。");
  }
  if (
    currentDraft.xml !== draft.xml
    || JSON.stringify(currentDraft.fileNames) !== JSON.stringify(draft.fileNames)
    || JSON.stringify(currentDraft.byteSizes) !== JSON.stringify(draft.byteSizes)
    || JSON.stringify(currentDraft.summary) !== JSON.stringify(draft.summary)
    || JSON.stringify(currentDraft.issues) !== JSON.stringify(draft.issues)
  ) {
    throw new Error("MusicXML 导出候选已变化，请重新生成并检查。");
  }
  if (format === "musicxml") {
    return {
      fileName: draft.fileNames.musicxml,
      mimeType: MUSICXML_MIME_TYPE,
      data: draft.xml,
    };
  }
  let data: Uint8Array;
  try {
    data = createMusicXmlMxlArchive(draft.xml);
  } catch {
    throw new Error("无法在本机生成完整 MXL，未执行下载。");
  }
  if (data.byteLength > LOCAL_SCORE_PROJECT_MUSICXML_EXPORT_MAX_BYTES) {
    throw new Error("生成的 MXL 超过 2 MiB，未执行下载。");
  }
  return {
    fileName: draft.fileNames.mxl,
    mimeType: MXL_MIME_TYPE,
    data,
  };
};
