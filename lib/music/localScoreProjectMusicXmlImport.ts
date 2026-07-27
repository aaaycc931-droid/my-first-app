import {
  cloneLocalScoreProject,
  createLocalScoreProject,
  parseLocalScoreProject,
  type LocalScoreProjectV1,
} from "./localScoreProject";
import type {
  LocalScoreProjectClefV3,
  LocalScoreProjectEventV9,
} from "./scoreDocument";
import type {
  NotationDuration,
  NotationPitch,
  NotationTimeSignature,
} from "../practice/localNotationFragmentDraft";

export type LocalScoreProjectMusicXmlImportIssue = Readonly<{
  code: string;
  severity: "warning" | "blocking";
  message: string;
  measureNumber?: number;
}>;

export type LocalScoreProjectMusicXmlImportSourceFormat =
  | "musicxml"
  | "xml"
  | "mxl";

export type LocalScoreProjectMusicXmlImportDraft = Readonly<{
  status: "ready" | "blocked";
  project: LocalScoreProjectV1 | null;
  issues: readonly LocalScoreProjectMusicXmlImportIssue[];
  summary: Readonly<{
    measureCount: number;
    eventCount: number;
  }>;
  sourceFormat: LocalScoreProjectMusicXmlImportSourceFormat;
  fileName: string;
  fingerprint: string | null;
}>;

type ImportArgs = Readonly<{
  xml: string;
  fileName: string;
  sourceFormat: LocalScoreProjectMusicXmlImportSourceFormat;
  projectId: string;
  now: string;
  createEventId: () => string;
}>;

type ParsedMeasure = Readonly<{
  measureNumber: number;
  events: readonly LocalScoreProjectEventV9[];
}>;

const allowedPitches = new Set<NotationPitch>([
  "C4",
  "D4",
  "E4",
  "F4",
  "G4",
  "A4",
  "B4",
  "C5",
]);
const durationBeats: Readonly<Record<NotationDuration, number>> = {
  half: 2,
  quarter: 1,
  eighth: 0.5,
};
const UINT64_MASK = BigInt("0xffffffffffffffff");
const FNV_64_PRIME = BigInt("0x00000100000001b3");
const FNV_64_OFFSET_A = BigInt("0xcbf29ce484222325");
const FNV_64_OFFSET_B = BigInt("0x84222325cbf29ce4");
const forbiddenElementCodes = [
  ["chord", "unsupported-chord", "当前导入只支持单音，不能导入和弦音。"],
  ["backup", "unsupported-backup", "当前导入不支持 backup 时间回退。"],
  ["forward", "unsupported-forward", "当前导入不支持 forward 时间前移。"],
  ["dot", "unsupported-dot", "当前导入不支持附点时值。"],
  ["tuplet", "unsupported-tuplet", "当前导入不支持连音符。"],
  ["time-modification", "unsupported-tuplet", "当前导入不支持连音符时值比例。"],
  ["grace", "unsupported-grace", "当前导入不支持倚音。"],
  ["tie", "unsupported-tie", "当前导入不支持延音线。"],
  ["tied", "unsupported-tie", "当前导入不支持延音线记谱。"],
  ["slur", "unsupported-slur", "当前导入不支持圆滑线。"],
  ["lyric", "unsupported-lyric", "当前导入不支持歌词。"],
  ["fingering", "unsupported-fingering", "当前导入不支持指法。"],
  ["harmony", "unsupported-harmony", "当前导入不支持和弦标记。"],
  ["articulations", "unsupported-articulation", "当前导入不支持演奏法。"],
  ["dynamics", "unsupported-dynamic", "当前导入不支持力度记号。"],
  ["pedal", "unsupported-pedal", "当前导入不支持踏板记号。"],
  ["accidental", "unsupported-accidental", "当前导入只支持无临时升降号的自然音。"],
  ["transpose", "unsupported-transpose", "当前导入不支持移调声明。"],
  ["technical", "unsupported-technical", "当前导入不支持其他 technical 演奏语义。"],
  ["ornaments", "unsupported-ornament", "当前导入不支持装饰音。"],
  ["direction", "unsupported-direction", "当前导入不支持速度、文字或其他 direction。"],
  ["sound", "unsupported-sound", "当前导入不支持 sound 播放指令。"],
  ["barline", "unsupported-barline", "当前导入不支持反复、终止线等 barline 语义。"],
  ["figured-bass", "unsupported-figured-bass", "当前导入不支持 figured-bass。"],
] as const;
const allowedMeasureElements = new Set([
  "attributes",
  "divisions",
  "key",
  "fifths",
  "time",
  "beats",
  "beat-type",
  "clef",
  "sign",
  "line",
  "staves",
  "note",
  "pitch",
  "step",
  "octave",
  "duration",
  "voice",
  "type",
  "rest",
  "staff",
  "notations",
  "fermata",
]);
const allowedRootElements = new Set(["work", "part-list", "part"]);
const allowedWorkElements = new Set(["work-title"]);
const allowedPartListElements = new Set(["score-part"]);
const allowedScorePartElements = new Set(["part-name"]);
const allowedPartElements = new Set(["measure"]);

const directChildElements = (node: Node) => Array.from(node.childNodes)
  .filter((child): child is Element => child.nodeType === 1);

const localElementName = (element: Element) =>
  (element.localName || element.nodeName.split(":").at(-1) || "")
    .toLowerCase();

const parseStrictXml = (xml: string) => {
  if (
    /&(?!(?:#\d+|#x[0-9a-f]+|amp|lt|gt|quot|apos);)/i.test(xml)
  ) {
    return null;
  }
  try {
    if (typeof DOMParser === "undefined") return null;
    const document = new DOMParser().parseFromString(xml, "application/xml");
    return document.getElementsByTagName("parsererror").length === 0
      ? document
      : null;
  } catch {
    return null;
  }
};

const getElementText = (xml: string, tagName: string) =>
  xml.match(
    new RegExp(
      `<(?:[A-Za-z_][\\w.-]*:)?${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[A-Za-z_][\\w.-]*:)?${tagName}>`,
      "i",
    ),
  )?.[1].trim();

const getElementMatches = (xml: string, tagName: string) =>
  Array.from(xml.matchAll(
    new RegExp(
      `<(?:[A-Za-z_][\\w.-]*:)?${tagName}((?:\\s[^>]*)?)>([\\s\\S]*?)<\\/(?:[A-Za-z_][\\w.-]*:)?${tagName}>`,
      "gi",
    ),
  ));

const hasElement = (xml: string, tagName: string) =>
  new RegExp(
    `<(?:[A-Za-z_][\\w.-]*:)?${tagName}(?:\\s[^>]*)?\\/?>`,
    "i",
  ).test(xml);

const countElements = (xml: string, tagName: string) =>
  Array.from(xml.matchAll(
    new RegExp(
      `<(?:[A-Za-z_][\\w.-]*:)?${tagName}(?:\\s[^>]*)?\\/?>`,
      "gi",
    ),
  )).length;

const getElementNames = (xml: string) => Array.from(
  xml
    .replace(/<!--[\s\S]*?-->/g, "")
    .matchAll(/<(?![!?/])(?:[A-Za-z_][\w.-]*:)?([A-Za-z_][\w.-]*)\b[^>]*>/g),
  (match) => match[1].toLowerCase(),
);

const blockingIssue = (
  code: string,
  message: string,
  measureNumber?: number,
): LocalScoreProjectMusicXmlImportIssue => ({
  code,
  severity: "blocking",
  message,
  ...(measureNumber === undefined ? {} : { measureNumber }),
});

const readSupportedFermataMark = ({
  noteElement,
  issues,
  measureNumber,
}: {
  noteElement: Element | undefined;
  issues: LocalScoreProjectMusicXmlImportIssue[];
  measureNumber: number;
}): "fermata" | null => {
  if (!noteElement) return null;
  const notationsElements = directChildElements(noteElement).filter(
    (element) => localElementName(element) === "notations",
  );
  const allFermatas = Array.from(noteElement.getElementsByTagName("*"))
    .filter((element) => localElementName(element) === "fermata");
  if (notationsElements.length === 0) {
    if (allFermatas.length > 0) {
      issues.push(blockingIssue(
        "unsupported-fermata",
        "延长记号必须是 note 下 notations 中唯一的空 fermata 元素。",
        measureNumber,
      ));
    }
    return null;
  }
  if (notationsElements.length !== 1) {
    issues.push(blockingIssue(
      "unsupported-notations",
      "当前导入只支持每个音符或休止符一个 notations 容器。",
      measureNumber,
    ));
    return null;
  }
  const notations = notationsElements[0];
  const notationChildren = directChildElements(notations);
  const fermata = notationChildren.length === 1
    && localElementName(notationChildren[0]) === "fermata"
      ? notationChildren[0]
      : null;
  const hasNonWhitespaceText = Array.from(notations.childNodes).some(
    (child) => child.nodeType === 3 && (child.textContent ?? "").trim() !== "",
  );
  if (
    notations.attributes.length !== 0
    || !fermata
    || allFermatas.length !== 1
    || fermata.attributes.length !== 0
    || directChildElements(fermata).length !== 0
    || (fermata.textContent ?? "").trim() !== ""
    || hasNonWhitespaceText
  ) {
    issues.push(blockingIssue(
      allFermatas.length > 0 ? "unsupported-fermata" : "unsupported-notations",
      "当前只支持 notations 中唯一、无属性且无文本的 fermata 延长记号。",
      measureNumber,
    ));
    return null;
  }
  return "fermata";
};

const validateFermataHierarchy = ({
  measureElement,
  issues,
  measureNumber,
}: {
  measureElement: Element | undefined;
  issues: LocalScoreProjectMusicXmlImportIssue[];
  measureNumber: number;
}) => {
  if (!measureElement) return;
  Array.from(measureElement.getElementsByTagName("*")).forEach((element) => {
    const elementName = localElementName(element);
    if (
      elementName === "note"
      && element.parentElement !== measureElement
    ) {
      issues.push(blockingIssue(
        "unsupported-note-hierarchy",
        "note 必须是 measure 的直接子元素，不能嵌套在其他元素中。",
        measureNumber,
      ));
    }
    if (
      elementName === "notations"
      && (
        !element.parentElement
        || localElementName(element.parentElement) !== "note"
      )
    ) {
      issues.push(blockingIssue(
        "unsupported-notations",
        "notations 必须是 note 的直接子元素，不能放在其他层级。",
        measureNumber,
      ));
    }
    if (
      elementName === "fermata"
      && (
        !element.parentElement
        || localElementName(element.parentElement) !== "notations"
        || !element.parentElement.parentElement
        || localElementName(element.parentElement.parentElement) !== "note"
      )
    ) {
      issues.push(blockingIssue(
        "unsupported-fermata",
        "fermata 必须位于 note 的直接 notations 子元素中。",
        measureNumber,
      ));
    }
  });
};

const sourceTitle = (fileName: string) => {
  const withoutExtension = fileName.replace(/\.(?:musicxml|xml|mxl)$/i, "");
  return withoutExtension.trim() || "导入的 MusicXML";
};

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

/**
 * 仅用于当前会话内的 stale / mutation 检查，不是鉴权或不可信输入的防篡改证明。
 */
const getProjectFingerprint = (project: LocalScoreProjectV1) => {
  const canonical = JSON.stringify(project);
  return `local-score-project-musicxml-import-v1:${fnv1a64Utf16Le(canonical, FNV_64_OFFSET_A)}:${fnv1a64Utf16Le(canonical, FNV_64_OFFSET_B)}`;
};

const noteEvent = ({
  id,
  pitch,
  duration,
  measure,
  fermataMark,
}: {
  id: string;
  pitch: NotationPitch;
  duration: NotationDuration;
  measure: number;
  fermataMark: "fermata" | null;
}): LocalScoreProjectEventV9 => ({
  id,
  type: "note",
  pitch,
  duration,
  measure,
  augmentationDots: 0,
  tieToNext: false,
  slurToNext: false,
  lyric: null,
  fingering: null,
  chordSymbol: null,
  articulations: [],
  dynamicMark: null,
  damperPedalMark: null,
  fermataMark,
});

const restEvent = ({
  id,
  measure,
  fermataMark,
}: {
  id: string;
  measure: number;
  fermataMark: "fermata" | null;
}): LocalScoreProjectEventV9 => ({
  id,
  type: "rest",
  pitch: null,
  duration: "quarter",
  measure,
  augmentationDots: 0,
  chordSymbol: null,
  dynamicMark: null,
  damperPedalMark: null,
  fermataMark,
});

const parsePositiveInteger = (value: string | undefined) => {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

export const createLocalScoreProjectMusicXmlImportDraft = (
  args: ImportArgs,
): LocalScoreProjectMusicXmlImportDraft => {
  const issues: LocalScoreProjectMusicXmlImportIssue[] = [];
  const xml = args.xml;
  const xmlDocument = parseStrictXml(xml);
  if (!xmlDocument) {
    issues.push(blockingIssue(
      "malformed-xml",
      "MusicXML 不是良构 XML，已阻止导入。",
    ));
  }
  const rootElement = xmlDocument?.documentElement ?? null;
  if (
    rootElement
    && localElementName(rootElement) !== "score-partwise"
  ) {
    issues.push(blockingIssue(
      "unsupported-root",
      "当前导入只支持 score-partwise MusicXML 根元素。",
    ));
  }
  const rootMatches = getElementMatches(xml, "score-partwise");
  if (rootMatches.length !== 1 || hasElement(xml, "score-timewise")) {
    issues.push(blockingIssue(
      "unsupported-root",
      "当前导入只支持一个 score-partwise MusicXML 根元素。",
    ));
  }

  const scoreXml = rootMatches[0]?.[2] ?? "";
  const rootChildren = rootElement ? directChildElements(rootElement) : [];
  rootChildren.forEach((element) => {
    const elementName = localElementName(element);
    if (!allowedRootElements.has(elementName)) {
      issues.push(blockingIssue(
        "unsupported-root-element",
        `当前导入不支持根级 MusicXML 元素 <${elementName}>，不能静默忽略。`,
      ));
    }
  });
  const workElements = rootChildren.filter(
    (element) => localElementName(element) === "work",
  );
  if (workElements.length > 1) {
    issues.push(blockingIssue(
      "unsupported-work-count",
      "当前导入只支持一个 work 元素。",
    ));
  }
  workElements.forEach((work) => {
    directChildElements(work).forEach((element) => {
      const elementName = localElementName(element);
      if (!allowedWorkElements.has(elementName)) {
        issues.push(blockingIssue(
          "unsupported-work-element",
          `当前导入不支持 work 元素 <${elementName}>，不能静默忽略。`,
        ));
      }
    });
  });
  const partListElements = rootChildren.filter(
    (element) => localElementName(element) === "part-list",
  );
  if (partListElements.length !== 1) {
    issues.push(blockingIssue(
      "unsupported-part-list-count",
      "当前导入要求且只支持一个 part-list。",
    ));
  }
  partListElements.forEach((partList) => {
    directChildElements(partList).forEach((element) => {
      const elementName = localElementName(element);
      if (!allowedPartListElements.has(elementName)) {
        issues.push(blockingIssue(
          "unsupported-part-list-element",
          `当前导入不支持 part-list 元素 <${elementName}>，不能静默忽略。`,
        ));
      }
    });
  });
  const scorePartElements = partListElements.flatMap((partList) =>
    directChildElements(partList).filter(
      (element) => localElementName(element) === "score-part",
    )
  );
  scorePartElements.forEach((scorePart) => {
    directChildElements(scorePart).forEach((element) => {
      const elementName = localElementName(element);
      if (!allowedScorePartElements.has(elementName)) {
        issues.push(blockingIssue(
          "unsupported-score-part-element",
          `当前导入不支持 score-part 元素 <${elementName}>，不能静默忽略。`,
        ));
      }
    });
  });
  const workTitleMatches = getElementMatches(scoreXml, "work-title");
  if (workTitleMatches.length > 1) {
    issues.push(blockingIssue(
      "unsupported-title-count",
      "当前导入只支持一个 work-title。",
    ));
  }
  const importedTitle = workElements[0]
    ? directChildElements(workElements[0])
      .find((element) => localElementName(element) === "work-title")
      ?.textContent?.trim() ?? null
    : null;
  if (importedTitle !== null && importedTitle.length === 0) {
    issues.push(blockingIssue(
      "invalid-title",
      "MusicXML work-title 不能为空。",
    ));
  }
  if (importedTitle !== null && Array.from(importedTitle).length > 80) {
    issues.push(blockingIssue(
      "unsupported-title-length",
      "MusicXML work-title 超过当前本机项目 80 字符上限。",
    ));
  }
  const scorePartMatches = getElementMatches(scoreXml, "score-part");
  if (scorePartMatches.length !== 1) {
    issues.push(blockingIssue(
      "unsupported-score-part-count",
      "当前导入要求且只支持一个 score-part 声明。",
    ));
  }
  const partNameElements = scorePartElements[0]
    ? directChildElements(scorePartElements[0]).filter(
      (element) => localElementName(element) === "part-name",
    )
    : [];
  if (partNameElements.length !== 1) {
    issues.push(blockingIssue(
      "unsupported-part-name-count",
      "当前导入要求且只支持一个 part-name。",
    ));
  }
  const partNameText = scorePartMatches[0]
    ? getElementText(scorePartMatches[0][2], "part-name")
    : undefined;
  const importedPartName = scorePartElements[0]
    ? directChildElements(scorePartElements[0])
      .find((element) => localElementName(element) === "part-name")
      ?.textContent?.trim() ?? null
    : partNameText === undefined ? null : partNameText.trim();
  if (importedPartName !== null && importedPartName.length === 0) {
    issues.push(blockingIssue(
      "invalid-part-name",
      "MusicXML part-name 不能为空。",
    ));
  }
  if (
    importedPartName !== null
    && Array.from(importedPartName).length > 40
  ) {
    issues.push(blockingIssue(
      "unsupported-part-name-length",
      "MusicXML part-name 超过当前声部组 40 字符上限。",
    ));
  }
  const parts = getElementMatches(scoreXml, "part");
  if (parts.length !== 1) {
    issues.push(blockingIssue(
      "unsupported-part-count",
      `当前导入只支持一个 part；文件包含 ${parts.length} 个 part。`,
    ));
  }
  const partElements = rootChildren.filter(
    (element) => localElementName(element) === "part",
  );
  partElements.forEach((part) => {
    directChildElements(part).forEach((element) => {
      const elementName = localElementName(element);
      if (!allowedPartElements.has(elementName)) {
        issues.push(blockingIssue(
          "unsupported-part-element",
          `当前导入不支持 part 元素 <${elementName}>，不能静默忽略。`,
        ));
      }
    });
  });
  const declaredPartId = scorePartElements[0]?.getAttribute("id")?.trim() ?? "";
  const contentPartId = partElements[0]?.getAttribute("id")?.trim() ?? "";
  if (
    scorePartElements.length === 1
    && partElements.length === 1
    && (
      declaredPartId.length === 0
      || contentPartId.length === 0
      || declaredPartId !== contentPartId
    )
  ) {
    issues.push(blockingIssue(
      "invalid-part-reference",
      "score-part 与 part 必须使用同一个非空 id。",
    ));
  }
  const partXml = parts[0]?.[2] ?? "";
  const measureMatches = getElementMatches(partXml, "measure");
  const measureElements = partElements[0]
    ? directChildElements(partElements[0]).filter(
      (element) => localElementName(element) === "measure",
    )
    : [];

  const timeMatches = getElementMatches(partXml, "time");
  const timeXml = timeMatches[0]?.[2];
  const beats = parsePositiveInteger(
    timeXml ? getElementText(timeXml, "beats") : undefined,
  );
  const beatType = parsePositiveInteger(
    timeXml ? getElementText(timeXml, "beat-type") : undefined,
  );
  const meterCandidate = beats && beatType ? `${beats}/${beatType}` : "";
  const meter = (
    meterCandidate === "2/4"
    || meterCandidate === "3/4"
    || meterCandidate === "4/4"
  ) ? meterCandidate as NotationTimeSignature : null;
  if (!meter) {
    issues.push(blockingIssue(
      "unsupported-meter",
      "当前导入只支持明确声明的 2/4、3/4 或 4/4 拍号。",
    ));
  }
  for (const laterTime of timeMatches.slice(1)) {
    const laterBeats = parsePositiveInteger(
      getElementText(laterTime[2], "beats"),
    );
    const laterBeatType = parsePositiveInteger(
      getElementText(laterTime[2], "beat-type"),
    );
    if (`${laterBeats}/${laterBeatType}` !== meterCandidate) {
      issues.push(blockingIssue(
        "unsupported-meter-change",
        "当前导入不支持乐谱中途变更拍号。",
      ));
    }
  }

  const keyMatches = getElementMatches(partXml, "key");
  const fifthsText = keyMatches[0]
    ? getElementText(keyMatches[0][2], "fifths")
    : undefined;
  const fifths = fifthsText === undefined ? 0 : Number(fifthsText);
  if (fifths !== -1 && fifths !== 0 && fifths !== 1) {
    issues.push(blockingIssue(
      "unsupported-key-signature",
      "当前导入只支持调号 fifths 为 -1、0 或 1。",
    ));
  }
  for (const laterKey of keyMatches.slice(1)) {
    const laterFifthsText = getElementText(laterKey[2], "fifths");
    const laterFifths = laterFifthsText === undefined
      ? 0
      : Number(laterFifthsText);
    if (laterFifths !== fifths) {
      issues.push(blockingIssue(
        "unsupported-key-change",
        "当前导入不支持乐谱中途变更调号。",
      ));
    }
  }

  const clefMatches = getElementMatches(partXml, "clef");
  const clefXml = clefMatches[0]?.[2];
  const clefSign = clefXml
    ? getElementText(clefXml, "sign")?.toUpperCase()
    : undefined;
  const clefLine = clefXml
    ? parsePositiveInteger(getElementText(clefXml, "line"))
    : null;
  const clef: LocalScoreProjectClefV3 | null =
    clefSign === "G" && clefLine === 2
      ? "treble"
      : clefSign === "F" && clefLine === 4
        ? "bass"
        : null;
  if (!clef) {
    issues.push(blockingIssue(
      "unsupported-clef",
      "当前导入只支持明确声明的高音谱号 G2 或低音谱号 F4。",
    ));
  }
  if (clefMatches.length > 1) {
    issues.push(blockingIssue(
      "unsupported-clef-change",
      "当前导入只支持一个谱表与一个固定谱号。",
    ));
  }

  const staffValues = getElementMatches(partXml, "staff")
    .map((match) => getElementText(match[0], "staff"))
    .filter((value): value is string => value !== undefined);
  if (staffValues.some((value) => value !== "1")) {
    issues.push(blockingIssue(
      "unsupported-staff-count",
      "当前导入只支持单一 staff 1。",
    ));
  }
  const declaredStaves = getElementText(partXml, "staves");
  if (
    declaredStaves !== undefined
    && parsePositiveInteger(declaredStaves) !== 1
  ) {
    issues.push(blockingIssue(
      "unsupported-staff-count",
      "当前导入只支持声明为一个 staff 的乐谱。",
    ));
  }
  const voiceValues = getElementMatches(partXml, "voice")
    .map((match) => match[2].trim())
    .filter(Boolean);
  const distinctVoices = new Set(voiceValues.length > 0 ? voiceValues : ["1"]);
  if (distinctVoices.size !== 1 || !distinctVoices.has("1")) {
    issues.push(blockingIssue(
      "unsupported-voice-count",
      "当前导入只支持单一 voice 1。",
    ));
  }

  let divisions: number | null = null;
  const parsedMeasures: ParsedMeasure[] = [];
  let provisionalEventCount = 0;
  const usedMeasureNumbers = new Set<number>();

  measureMatches.forEach((measureMatch, measureIndex) => {
    const attributes = measureMatch[1];
    const measureXml = measureMatch[2];
    const rawNumber = attributes.match(
      /\bnumber\s*=\s*["']([^"']+)["']/i,
    )?.[1];
    const parsedMeasureNumber = parsePositiveInteger(rawNumber);
    const measureNumber = parsedMeasureNumber ?? measureIndex + 1;
    if (!parsedMeasureNumber) {
      issues.push(blockingIssue(
        "invalid-measure-number",
        `第 ${measureIndex + 1} 个小节缺少有效正整数编号，不能安全映射到 canonical。`,
        measureNumber,
      ));
    }
    if (usedMeasureNumbers.has(measureNumber)) {
      issues.push(blockingIssue(
        "duplicate-measure-number",
        `小节编号 ${measureNumber} 重复。`,
        measureNumber,
      ));
    }
    usedMeasureNumbers.add(measureNumber);
    if (
      parsedMeasures.length > 0
      && measureNumber <= parsedMeasures[parsedMeasures.length - 1].measureNumber
    ) {
      issues.push(blockingIssue(
        "unordered-measure-number",
        "MusicXML 小节编号必须严格递增。",
        measureNumber,
      ));
    }

    const divisionValues = getElementMatches(measureXml, "divisions")
      .map((match) => parsePositiveInteger(match[2].trim()));
    const nextDivisions = divisionValues[0] ?? null;
    if (
      divisionValues.length > 1
      && divisionValues.some((value) => value !== nextDivisions)
    ) {
      issues.push(blockingIssue(
        "unsupported-divisions-change",
        "当前导入不支持同一小节中途变更 divisions。",
        measureNumber,
      ));
    }
    if (nextDivisions) divisions = nextDivisions;
    if (!divisions) {
      issues.push(blockingIssue(
        "missing-divisions",
        "音符出现前必须声明正整数 divisions。",
        measureNumber,
      ));
    }

    forbiddenElementCodes.forEach(([tagName, code, message]) => {
      const count = countElements(measureXml, tagName);
      for (let index = 0; index < count; index += 1) {
        issues.push(blockingIssue(code, message, measureNumber));
      }
    });
    new Set(getElementNames(measureXml)).forEach((elementName) => {
      if (!allowedMeasureElements.has(elementName)) {
        issues.push(blockingIssue(
          "unsupported-element",
          `当前导入不支持 MusicXML 元素 <${elementName}>，不能静默忽略。`,
          measureNumber,
        ));
      }
    });

    const events: LocalScoreProjectEventV9[] = [];
    let occupiedBeats = 0;
    const noteElements = measureElements[measureIndex]
      ? directChildElements(measureElements[measureIndex]).filter(
        (element) => localElementName(element) === "note",
      )
      : [];
    validateFermataHierarchy({
      measureElement: measureElements[measureIndex],
      issues,
      measureNumber,
    });
    getElementMatches(measureXml, "note").forEach((noteMatch, noteIndex) => {
      const noteXml = noteMatch[2];
      const fermataMark = readSupportedFermataMark({
        noteElement: noteElements[noteIndex],
        issues,
        measureNumber,
      });
      const type = getElementText(noteXml, "type")?.toLowerCase();
      const duration: NotationDuration | null =
        type === "half" || type === "quarter" || type === "eighth"
          ? type
          : null;
      if (!duration) {
        issues.push(blockingIssue(
          "unsupported-duration",
          `不支持音符时值 ${type || "未声明"}；只支持二分、四分和八分音符。`,
          measureNumber,
        ));
      }
      const rawDuration = parsePositiveInteger(
        getElementText(noteXml, "duration"),
      );
      if (
        duration
        && divisions
        && (
          rawDuration === null
          || rawDuration / divisions !== durationBeats[duration]
        )
      ) {
        issues.push(blockingIssue(
          "inconsistent-duration",
          "MusicXML duration 与 type 不一致，未生成可保存草稿。",
          measureNumber,
        ));
      }
      if (duration) occupiedBeats += durationBeats[duration];

      if (hasElement(noteXml, "rest")) {
        if (duration && duration !== "quarter") {
          issues.push(blockingIssue(
            "unsupported-rest-duration",
            "当前导入只支持四分休止符。",
            measureNumber,
          ));
        }
        if (duration === "quarter") {
          provisionalEventCount += 1;
          if (!issues.some((issue) => issue.severity === "blocking")) {
            events.push(restEvent({
              id: args.createEventId(),
              measure: measureNumber,
              fermataMark,
            }));
          }
        }
        return;
      }

      const pitchXml = getElementMatches(noteXml, "pitch")[0]?.[2];
      const step = pitchXml
        ? getElementText(pitchXml, "step")?.toUpperCase()
        : undefined;
      const octave = pitchXml
        ? getElementText(pitchXml, "octave")
        : undefined;
      const alterText = pitchXml
        ? getElementText(pitchXml, "alter")
        : undefined;
      const alter = alterText === undefined ? 0 : Number(alterText);
      const pitch = step && octave && alter === 0
        ? `${step}${octave}`
        : "";
      if (!allowedPitches.has(pitch as NotationPitch)) {
        issues.push(blockingIssue(
          "unsupported-pitch",
          `音高 ${pitch || "无法解析"} 超出当前自然音 C4–C5 范围。`,
          measureNumber,
        ));
      }
      if (duration && allowedPitches.has(pitch as NotationPitch)) {
        provisionalEventCount += 1;
        if (!issues.some((issue) => issue.severity === "blocking")) {
          events.push(noteEvent({
            id: args.createEventId(),
            pitch: pitch as NotationPitch,
            duration,
            measure: measureNumber,
            fermataMark,
          }));
        }
      }
    });

    if (meter && occupiedBeats > Number(meter.split("/")[0])) {
      issues.push(blockingIssue(
        "overfull-measure",
        `第 ${measureNumber} 小节共 ${occupiedBeats} 拍，超过 ${meter} 容量。`,
        measureNumber,
      ));
    }
    parsedMeasures.push({ measureNumber, events });
  });

  if (measureMatches.length === 0) {
    issues.push(blockingIssue(
      "missing-measures",
      "MusicXML 没有可导入的小节。",
    ));
  }
  if (provisionalEventCount === 0) {
    issues.push(blockingIssue(
      "missing-events",
      "MusicXML 没有当前范围内可导入的音符或休止符。",
    ));
  }

  const blocked = issues.some((issue) => issue.severity === "blocking");
  if (blocked || !meter || !clef || (fifths !== -1 && fifths !== 0 && fifths !== 1)) {
    return {
      status: "blocked",
      project: null,
      issues,
      summary: {
        measureCount: measureMatches.length,
        eventCount: provisionalEventCount,
      },
      sourceFormat: args.sourceFormat,
      fileName: args.fileName,
      fingerprint: null,
    };
  }

  const baseProject = createLocalScoreProject({
    projectId: args.projectId,
    title: importedTitle ?? sourceTitle(args.fileName),
    now: args.now,
  });
  const project: LocalScoreProjectV1 = {
    ...baseProject,
    document: {
      ...baseProject.document,
      meter,
      keySignature: { fifths },
      parts: [{
        partId: "part-1",
        name: importedPartName ?? "导入声部",
        instrument: { kind: "unassigned" },
        staves: [{
          staffId: "staff-1",
          staffKind: "pitched",
          clef,
          voices: [{
            voiceId: "voice-1",
            measures: parsedMeasures,
          }],
        }],
      }],
    },
  };
  const parsedProject = parseLocalScoreProject(project);
  if (!parsedProject) {
    return {
      status: "blocked",
      project: null,
      issues: [
        ...issues,
        blockingIssue(
          "invalid-generated-project",
          "导入结果未通过当前本机谱项目结构校验，未生成草稿。",
        ),
      ],
      summary: {
        measureCount: parsedMeasures.length,
        eventCount: provisionalEventCount,
      },
      sourceFormat: args.sourceFormat,
      fileName: args.fileName,
      fingerprint: null,
    };
  }

  return {
    status: "ready",
    project: parsedProject,
    issues,
    summary: {
      measureCount: parsedMeasures.length,
      eventCount: provisionalEventCount,
    },
    sourceFormat: args.sourceFormat,
    fileName: args.fileName,
    fingerprint: getProjectFingerprint(parsedProject),
  };
};

export const confirmLocalScoreProjectMusicXmlImportDraft = (
  draft: LocalScoreProjectMusicXmlImportDraft,
): LocalScoreProjectV1 => {
  if (
    draft.status !== "ready"
    || !draft.project
    || !draft.fingerprint
    || draft.issues.some((issue) => issue.severity === "blocking")
  ) {
    throw new Error("MusicXML 导入草稿仍有阻断问题，不能确认或保存。");
  }
  const parsedProject = parseLocalScoreProject(draft.project);
  if (!parsedProject) {
    throw new Error("MusicXML 导入草稿未通过当前 canonical 结构校验。");
  }
  if (getProjectFingerprint(parsedProject) !== draft.fingerprint) {
    throw new Error("MusicXML 导入草稿已变化，请重新检查后再确认。");
  }
  return cloneLocalScoreProject(parsedProject);
};
