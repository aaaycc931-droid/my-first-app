import {
  cloneLocalScoreProject,
  createLocalScoreProject,
  LOCAL_SCORE_PROJECT_DEFAULT_TEMPO_BPM,
  LOCAL_SCORE_PROJECT_MAX_LYRIC_CODE_POINTS,
  LOCAL_SCORE_PROJECT_MAX_TEMPO_BPM,
  LOCAL_SCORE_PROJECT_MIN_TEMPO_BPM,
  parseLocalScoreProject,
  type LocalScoreProjectV1,
} from "./localScoreProject";
import type {
  LocalScoreProjectArticulationV1,
  LocalScoreProjectClefV3,
  LocalScoreProjectDynamicMarkV1,
  LocalScoreProjectEventV9,
  LocalScoreProjectFingeringV1,
} from "./scoreDocument";
import type {
  NotationDuration,
  NotationPitch,
  NotationTimeSignature,
} from "../practice/localNotationFragmentDraft";
import {
  createSupportedCanonicalChordSymbol,
} from "./localScoreProjectMusicXmlChordSymbol";

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
  ["tuplet", "unsupported-tuplet", "当前导入不支持连音符。"],
  ["time-modification", "unsupported-tuplet", "当前导入不支持连音符时值比例。"],
  ["grace", "unsupported-grace", "当前导入不支持倚音。"],
  ["accidental", "unsupported-accidental", "当前导入只支持无临时升降号的自然音。"],
  ["transpose", "unsupported-transpose", "当前导入不支持移调声明。"],
  ["ornaments", "unsupported-ornament", "当前导入不支持装饰音。"],
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
  "dot",
  "rest",
  "staff",
  "direction",
  "direction-type",
  "pedal",
  "notations",
  "fermata",
  "slur",
  "tie",
  "tied",
  "technical",
  "fingering",
  "articulations",
  "accent",
  "staccato",
  "tenuto",
  "dynamics",
  "pp",
  "p",
  "mp",
  "mf",
  "f",
  "ff",
  "harmony",
  "root",
  "root-step",
  "root-alter",
  "kind",
  "sound",
  "lyric",
  "text",
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

type XmlStartTag = Readonly<{
  end: number;
  localName: string;
  markup: string;
}>;

const findXmlMarkupEnd = (
  xml: string,
  start: number,
  terminator: string,
) => {
  const end = xml.indexOf(terminator, start);
  return end === -1 ? xml.length : end + terminator.length;
};

const findXmlTagEnd = (xml: string, start: number) => {
  let quote: '"' | "'" | null = null;
  let declarationSubsetDepth = 0;
  for (let index = start + 1; index < xml.length; index += 1) {
    const character = xml[index];
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === "[") declarationSubsetDepth += 1;
    if (character === "]" && declarationSubsetDepth > 0) {
      declarationSubsetDepth -= 1;
    }
    if (character === ">" && declarationSubsetDepth === 0) return index + 1;
  }
  return xml.length;
};

const getXmlStartTags = (xml: string): readonly XmlStartTag[] => {
  const result: XmlStartTag[] = [];
  let cursor = 0;
  while (cursor < xml.length) {
    const start = xml.indexOf("<", cursor);
    if (start === -1) break;
    if (xml.startsWith("<!--", start)) {
      cursor = findXmlMarkupEnd(xml, start + 4, "-->");
      continue;
    }
    if (xml.startsWith("<![CDATA[", start)) {
      cursor = findXmlMarkupEnd(xml, start + 9, "]]>");
      continue;
    }
    if (xml.startsWith("<?", start)) {
      cursor = findXmlMarkupEnd(xml, start + 2, "?>");
      continue;
    }
    const end = findXmlTagEnd(xml, start);
    const markup = xml.slice(start, end);
    cursor = end;
    if (markup.startsWith("</") || markup.startsWith("<!")) continue;
    const qualifiedName = markup.match(
      /^<([A-Za-z_][\w.-]*(?::[A-Za-z_][\w.-]*)?)(?=[\s/>])/,
    )?.[1];
    if (!qualifiedName) continue;
    result.push({
      end,
      localName: (
        qualifiedName.split(":").at(-1) ?? qualifiedName
      ).toLowerCase(),
      markup,
    });
  }
  return result;
};

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

type SupportedNotationBundle = Readonly<{
  fermataMark: "fermata" | null;
  slurStart: boolean;
  slurStop: boolean;
  tiedTypes: readonly TieMarkerType[];
  fingering: LocalScoreProjectFingeringV1 | null;
  articulations: readonly LocalScoreProjectArticulationV1[];
  dynamicMark: LocalScoreProjectDynamicMarkV1 | null;
}>;

type TieMarkerType = "start" | "stop";
type SupportedDamperPedalMark = "down" | "up";
type SupportedChordSymbol = string;
const articulationOrder: readonly LocalScoreProjectArticulationV1[] = [
  "accent",
  "staccato",
  "tenuto",
];
const dynamicMarks: readonly LocalScoreProjectDynamicMarkV1[] = [
  "pp",
  "p",
  "mp",
  "mf",
  "f",
  "ff",
];

const containsUnsupportedLyricCharacter = (value: string) =>
  Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return (
      codePoint <= 0x1f
      || (codePoint >= 0x7f && codePoint <= 0x9f)
      || (codePoint >= 0xd800 && codePoint <= 0xdfff)
      || codePoint === 0x2028
      || codePoint === 0x2029
      || codePoint === 0xfffe
      || codePoint === 0xffff
      || codePoint > 0xeffff
    );
  });

const readSupportedLyric = ({
  noteElement,
  noteXml,
  issues,
  measureNumber,
}: {
  noteElement: Element | undefined;
  noteXml: string;
  issues: LocalScoreProjectMusicXmlImportIssue[];
  measureNumber: number;
}): string | null => {
  if (!noteElement) return null;
  const lyrics = directChildElements(noteElement).filter(
    (element) => localElementName(element) === "lyric",
  );
  const allLyrics = Array.from(noteElement.getElementsByTagName("*"))
    .filter((element) => localElementName(element) === "lyric");
  if (allLyrics.length !== lyrics.length) {
    issues.push(blockingIssue(
      "unsupported-lyric",
      "歌词 lyric 必须是 note 的直接子元素。",
      measureNumber,
    ));
  }
  if (allLyrics.length > 0 && noteElement.attributes.length !== 0) {
    issues.push(blockingIssue(
      "unsupported-lyric",
      "带歌词的 note 不能包含当前无法保留的属性。",
      measureNumber,
    ));
  }
  if (lyrics.length > 1) {
    issues.push(blockingIssue(
      "unsupported-lyric",
      "当前每个音符最多支持一个 lyric 容器。",
      measureNumber,
    ));
  }
  if (lyrics.length !== 1) return null;

  const lyric = lyrics[0];
  const noteChildren = directChildElements(noteElement);
  const lyricIndex = noteChildren.indexOf(lyric);
  const staffIndex = noteChildren.findIndex(
    (element) => localElementName(element) === "staff",
  );
  const notationsIndex = noteChildren.findIndex(
    (element) => localElementName(element) === "notations",
  );
  if (
    lyricIndex !== noteChildren.length - 1
    || staffIndex < 0
    || lyricIndex < staffIndex
    || (notationsIndex >= 0 && lyricIndex < notationsIndex)
  ) {
    issues.push(blockingIssue(
      "unsupported-lyric",
      "lyric 必须位于 note 的 staff 和可选 notations 之后，并作为当前受控 note 的最后一个子元素。",
      measureNumber,
    ));
  }
  const lyricChildren = directChildElements(lyric);
  const texts = lyricChildren.filter(
    (element) => localElementName(element) === "text",
  );
  const allTexts = Array.from(lyric.getElementsByTagName("*"))
    .filter((element) => localElementName(element) === "text");
  const hasInvalidLyricNode = Array.from(lyric.childNodes).some((child) => {
    if (child.nodeType === 1) {
      return localElementName(child as Element) !== "text";
    }
    if (child.nodeType === 3) {
      return (child.textContent ?? "").trim() !== "";
    }
    return true;
  });
  if (
    lyric.attributes.length !== 0
    || lyricChildren.length !== 1
    || texts.length !== 1
    || allTexts.length !== texts.length
    || hasInvalidLyricNode
  ) {
    issues.push(blockingIssue(
      "unsupported-lyric",
      "当前只支持无属性且仅包含一个直接 text 子元素的 lyric；不支持断词、延长、多段或其他结构。",
      measureNumber,
    ));
  }
  if (texts.length !== 1) return null;

  const text = texts[0];
  const hasInvalidTextNode = Array.from(text.childNodes).some(
    (child) => child.nodeType !== 3,
  );
  const value = text.textContent ?? "";
  if (
    text.attributes.length !== 0
    || directChildElements(text).length !== 0
    || hasInvalidTextNode
    || value.length === 0
    || value.trim() !== value
    || Array.from(value).length > LOCAL_SCORE_PROJECT_MAX_LYRIC_CODE_POINTS
    || containsUnsupportedLyricCharacter(value)
  ) {
    issues.push(blockingIssue(
      "unsupported-lyric",
      `歌词 text 必须是无属性、无子元素的非空规范文本，首尾不能留白，且最多 ${LOCAL_SCORE_PROJECT_MAX_LYRIC_CODE_POINTS} 个字符。`,
      measureNumber,
    ));
  }

  const lyricMarkup = Array.from(noteXml.matchAll(
    /<(?:[A-Za-z_][\w.-]*:)?lyric\b[^>]*>[\s\S]*?<\/(?:[A-Za-z_][\w.-]*:)?lyric\s*>/gi,
  ));
  if (lyricMarkup.some((match) => match[0].includes("<![CDATA["))) {
    issues.push(blockingIssue(
      "unsupported-lyric",
      "歌词 lyric／text 不能包含 CDATA。",
      measureNumber,
    ));
  }
  return value;
};

const readSupportedAugmentationDots = ({
  noteElement,
  noteXml,
  issues,
  measureNumber,
}: {
  noteElement: Element | undefined;
  noteXml: string;
  issues: LocalScoreProjectMusicXmlImportIssue[];
  measureNumber: number;
}): 0 | 1 => {
  if (!noteElement) return 0;
  const dots = directChildElements(noteElement).filter(
    (element) => localElementName(element) === "dot",
  );
  const allDots = Array.from(noteElement.getElementsByTagName("*"))
    .filter((element) => localElementName(element) === "dot");
  if (allDots.length !== dots.length) {
    issues.push(blockingIssue(
      "unsupported-dot",
      "附点 dot 必须是 note 的直接子元素。",
      measureNumber,
    ));
  }
  if (dots.length > 1) {
    issues.push(blockingIssue(
      "unsupported-dot",
      "当前每个音符或休止符最多支持一个附点 dot。",
      measureNumber,
    ));
  }
  dots.forEach((dot) => {
    const hasCdataNode = Array.from(dot.childNodes).some(
      (child) => child.nodeType === 4,
    );
    const hasNonWhitespaceText = Array.from(dot.childNodes).some(
      (child) =>
        child.nodeType === 3
        && (child.textContent ?? "").trim() !== "",
    );
    if (
      dot.attributes.length !== 0
      || directChildElements(dot).length !== 0
      || hasCdataNode
      || hasNonWhitespaceText
    ) {
      issues.push(blockingIssue(
        "unsupported-dot",
        "当前只支持无属性、无子元素且无文本的空 dot 元素。",
        measureNumber,
      ));
    }
  });
  if (
    /<(?:[A-Za-z_][\w.-]*:)?dot\b[^>]*>[\s\S]*?<!\[CDATA\[[\s\S]*?\]\]>[\s\S]*?<\/(?:[A-Za-z_][\w.-]*:)?dot\s*>/i
      .test(noteXml)
    && !Array.from(noteElement.getElementsByTagName("*"))
      .some((element) =>
        localElementName(element) === "dot"
        && Array.from(element.childNodes).some((child) => child.nodeType === 4))
  ) {
    issues.push(blockingIssue(
      "unsupported-dot",
      "当前只支持无属性、无子元素且无文本或 CDATA 的空 dot 元素。",
      measureNumber,
    ));
  }
  return dots.length === 1 ? 1 : 0;
};

const haveSameTieMarkerTypes = (
  left: readonly TieMarkerType[],
  right: readonly TieMarkerType[],
) =>
  left.length === right.length
  && left.every((type, index) => type === right[index]);

const EMPTY_NOTATION_BUNDLE: SupportedNotationBundle = {
  fermataMark: null,
  slurStart: false,
  slurStop: false,
  tiedTypes: [],
  fingering: null,
  articulations: [],
  dynamicMark: null,
};

const readSupportedNotationBundle = ({
  noteElement,
  issues,
  measureNumber,
}: {
  noteElement: Element | undefined;
  issues: LocalScoreProjectMusicXmlImportIssue[];
  measureNumber: number;
}): SupportedNotationBundle => {
  if (!noteElement) return EMPTY_NOTATION_BUNDLE;
  const notationsElements = directChildElements(noteElement).filter(
    (element) => localElementName(element) === "notations",
  );
  const allFermatas = Array.from(noteElement.getElementsByTagName("*"))
    .filter((element) => localElementName(element) === "fermata");
  const allSlurs = Array.from(noteElement.getElementsByTagName("*"))
    .filter((element) => localElementName(element) === "slur");
  const allTieds = Array.from(noteElement.getElementsByTagName("*"))
    .filter((element) => localElementName(element) === "tied");
  const allTechnicals = Array.from(noteElement.getElementsByTagName("*"))
    .filter((element) => localElementName(element) === "technical");
  const allFingerings = Array.from(noteElement.getElementsByTagName("*"))
    .filter((element) => localElementName(element) === "fingering");
  const allArticulationContainers = Array.from(
    noteElement.getElementsByTagName("*"),
  ).filter((element) => localElementName(element) === "articulations");
  const allArticulationMarks = Array.from(
    noteElement.getElementsByTagName("*"),
  ).filter((element) =>
    articulationOrder.includes(
      localElementName(element) as LocalScoreProjectArticulationV1,
    )
  );
  const allDynamicsContainers = Array.from(
    noteElement.getElementsByTagName("*"),
  ).filter((element) => localElementName(element) === "dynamics");
  const allDynamicMarks = Array.from(
    noteElement.getElementsByTagName("*"),
  ).filter((element) =>
    dynamicMarks.includes(
      localElementName(element) as LocalScoreProjectDynamicMarkV1,
    )
  );
  if (
    noteElement.hasAttribute("dynamics")
    || noteElement.hasAttribute("end-dynamics")
  ) {
    issues.push(blockingIssue(
      "unsupported-dynamic",
      "当前不支持 note 的 dynamics／end-dynamics 播放力度属性；只支持受控记谱力度记号。",
      measureNumber,
    ));
  }
  if (notationsElements.length === 0) {
    if (allFermatas.length > 0) {
      issues.push(blockingIssue(
        "unsupported-fermata",
        "延长记号必须是 note 下 notations 中唯一的空 fermata 元素。",
        measureNumber,
      ));
    }
    if (allSlurs.length > 0) {
      issues.push(blockingIssue(
        "unsupported-slur",
        "圆滑线必须是 note 下 notations 中的空 slur 元素。",
        measureNumber,
      ));
    }
    if (allTieds.length > 0) {
      issues.push(blockingIssue(
        "unsupported-tie",
        "记谱延音线 tied 必须直接位于 note 的 notations 子元素中。",
        measureNumber,
      ));
    }
    if (allTechnicals.length > 0) {
      issues.push(blockingIssue(
        "unsupported-technical",
        "technical 必须直接位于 note 的 notations 子元素中。",
        measureNumber,
      ));
    }
    if (allFingerings.length > 0) {
      issues.push(blockingIssue(
        "unsupported-fingering",
        "指法 fingering 必须是 note／notations／technical 下唯一的直接文本子元素。",
        measureNumber,
      ));
    }
    if (
      allArticulationContainers.length > 0
      || allArticulationMarks.length > 0
    ) {
      issues.push(blockingIssue(
        "unsupported-articulation",
        "演奏法必须位于 note／notations 下唯一的 articulations 容器中。",
        measureNumber,
      ));
    }
    if (allDynamicsContainers.length > 0 || allDynamicMarks.length > 0) {
      issues.push(blockingIssue(
        "unsupported-dynamic",
        "力度记号必须位于 note／notations 下唯一的 dynamics 容器中。",
        measureNumber,
      ));
    }
    return EMPTY_NOTATION_BUNDLE;
  }
  if (notationsElements.length !== 1) {
    issues.push(blockingIssue(
      "unsupported-notations",
      "当前导入只支持每个音符或休止符一个 notations 容器。",
      measureNumber,
    ));
    return EMPTY_NOTATION_BUNDLE;
  }
  const notations = notationsElements[0];
  const notationChildren = directChildElements(notations);
  const fermatas = notationChildren.filter(
    (element) => localElementName(element) === "fermata",
  );
  const slurs = notationChildren.filter(
    (element) => localElementName(element) === "slur",
  );
  const tieds = notationChildren.filter(
    (element) => localElementName(element) === "tied",
  );
  const technicals = notationChildren.filter(
    (element) => localElementName(element) === "technical",
  );
  const articulationContainers = notationChildren.filter(
    (element) => localElementName(element) === "articulations",
  );
  const dynamicsContainers = notationChildren.filter(
    (element) => localElementName(element) === "dynamics",
  );
  const unsupportedChildren = notationChildren.filter((element) =>
    localElementName(element) !== "fermata"
    && localElementName(element) !== "slur"
    && localElementName(element) !== "tied"
    && localElementName(element) !== "technical"
    && localElementName(element) !== "articulations"
    && localElementName(element) !== "dynamics"
  );
  const hasNonWhitespaceText = Array.from(notations.childNodes).some(
    (child) =>
      (child.nodeType === 3 || child.nodeType === 4)
      && (child.textContent ?? "").trim() !== "",
  );
  if (
    notations.attributes.length !== 0
    || hasNonWhitespaceText
    || notationChildren.length === 0
    || unsupportedChildren.length > 0
  ) {
    issues.push(blockingIssue(
      "unsupported-notations",
      "当前只支持无属性的 notations，且其中只能包含受控 fermata／slur／tied／technical／articulations／dynamics 记号。",
      measureNumber,
    ));
  }
  let fermataMark: "fermata" | null = null;
  if (fermatas.length > 1 || allFermatas.length !== fermatas.length) {
    issues.push(blockingIssue(
      "unsupported-fermata",
      "当前每个 note 最多支持一个直接位于 notations 下的 fermata。",
      measureNumber,
    ));
  } else if (fermatas.length === 1) {
    const fermata = fermatas[0];
    if (
      fermata.attributes.length !== 0
      || directChildElements(fermata).length !== 0
      || (fermata.textContent ?? "").trim() !== ""
    ) {
      issues.push(blockingIssue(
        "unsupported-fermata",
        "当前只支持无属性且无文本的 fermata 延长记号。",
        measureNumber,
      ));
    } else {
      fermataMark = "fermata";
    }
  }

  let slurStart = false;
  let slurStop = false;
  if (allSlurs.length !== slurs.length) {
    issues.push(blockingIssue(
      "unsupported-slur",
      "slur 必须直接位于 note 的 notations 子元素中。",
      measureNumber,
    ));
  }
  slurs.forEach((slur) => {
    const typeAttribute = slur.attributes.item(0);
    const type = slur.getAttribute("type");
    if (
      slur.attributes.length !== 1
      || typeAttribute?.name !== "type"
      || (type !== "start" && type !== "stop")
      || directChildElements(slur).length !== 0
      || (slur.textContent ?? "").trim() !== ""
    ) {
      issues.push(blockingIssue(
        "unsupported-slur",
        "当前只支持仅含 type=\"start\" 或 type=\"stop\" 的空 slur 元素。",
        measureNumber,
      ));
      return;
    }
    if (type === "start") {
      if (slurStart) {
        issues.push(blockingIssue(
          "unsupported-slur",
          "同一音符不能包含重复的 slur start。",
          measureNumber,
        ));
      }
      slurStart = true;
      return;
    }
    if (slurStop) {
      issues.push(blockingIssue(
        "unsupported-slur",
        "同一音符不能包含重复的 slur stop。",
        measureNumber,
      ));
    }
    slurStop = true;
  });

  const tiedTypes: TieMarkerType[] = [];
  if (allTieds.length !== tieds.length) {
    issues.push(blockingIssue(
      "unsupported-tie",
      "tied 必须直接位于 note 的 notations 子元素中。",
      measureNumber,
    ));
  }
  tieds.forEach((tied) => {
    const typeAttribute = tied.attributes.item(0);
    const type = tied.getAttribute("type");
    if (
      tied.attributes.length !== 1
      || typeAttribute?.name !== "type"
      || (type !== "start" && type !== "stop")
      || directChildElements(tied).length !== 0
      || (tied.textContent ?? "").trim() !== ""
    ) {
      issues.push(blockingIssue(
        "unsupported-tie",
        "当前只支持仅含 type=\"start\" 或 type=\"stop\" 的空 tied 元素。",
        measureNumber,
      ));
      return;
    }
    if (tiedTypes.includes(type)) {
      issues.push(blockingIssue(
        "unsupported-tie",
        `同一音符不能包含重复的 tied ${type}。`,
        measureNumber,
      ));
    }
    tiedTypes.push(type);
  });
  if (
    tiedTypes.length === 2
    && (tiedTypes[0] !== "stop" || tiedTypes[1] !== "start")
  ) {
    issues.push(blockingIssue(
      "unsupported-tie-order",
      "链式延音线的同一音符必须先结束前一条 tied，再开始后一条 tied。",
      measureNumber,
    ));
  }

  let fingering: LocalScoreProjectFingeringV1 | null = null;
  if (allTechnicals.length !== technicals.length || technicals.length > 1) {
    issues.push(blockingIssue(
      "unsupported-technical",
      "当前每个 note 最多支持一个直接位于 notations 下的 technical。",
      measureNumber,
    ));
  }
  if (technicals.length === 1) {
    const technical = technicals[0];
    const technicalChildren = directChildElements(technical);
    const fingerings = technicalChildren.filter(
      (element) => localElementName(element) === "fingering",
    );
    const hasInvalidTechnicalNode = Array.from(technical.childNodes).some(
      (child) =>
        (child.nodeType === 1
          && localElementName(child as Element) !== "fingering")
        || (child.nodeType === 3
          && (child.textContent ?? "").trim() !== "")
        || (child.nodeType !== 1 && child.nodeType !== 3),
    );
    if (
      technical.attributes.length !== 0
      || technicalChildren.length !== 1
      || fingerings.length !== 1
      || allFingerings.length !== fingerings.length
      || hasInvalidTechnicalNode
    ) {
      issues.push(blockingIssue(
        "unsupported-technical",
        "当前 technical 必须无属性，且只能包含一个直接 fingering 子元素。",
        measureNumber,
      ));
    }
    if (fingerings.length === 1) {
      const fingeringElement = fingerings[0];
      const value = fingeringElement.textContent ?? "";
      const hasSingleTextNode =
        fingeringElement.childNodes.length === 1
        && fingeringElement.childNodes[0]?.nodeType === 3;
      if (
        fingeringElement.attributes.length !== 0
        || directChildElements(fingeringElement).length !== 0
        || !hasSingleTextNode
        || !/^[1-5]$/.test(value)
      ) {
        issues.push(blockingIssue(
          "unsupported-fingering",
          "指法 fingering 必须无属性、无子元素，并且只包含一个 1–5 的文本值。",
          measureNumber,
        ));
      } else {
        fingering = Number(value) as LocalScoreProjectFingeringV1;
      }
    }
  } else if (allFingerings.length > 0) {
    issues.push(blockingIssue(
      "unsupported-fingering",
      "指法 fingering 必须直接位于唯一的 technical 子元素中。",
      measureNumber,
    ));
  }
  if (allFingerings.length > 0 && noteElement.attributes.length !== 0) {
    issues.push(blockingIssue(
      "unsupported-fingering",
      "带指法的 note 不能包含当前无法保留的属性。",
      measureNumber,
    ));
  }

  let articulations: LocalScoreProjectArticulationV1[] = [];
  if (
    allArticulationContainers.length !== articulationContainers.length
    || articulationContainers.length > 1
  ) {
    issues.push(blockingIssue(
      "unsupported-articulation",
      "当前每个 note 最多支持一个直接位于 notations 下的 articulations。",
      measureNumber,
    ));
  }
  if (articulationContainers.length === 1) {
    const container = articulationContainers[0];
    const children = directChildElements(container);
    const names = children.map((element) => localElementName(element));
    const supportedNames = names.filter(
      (name): name is LocalScoreProjectArticulationV1 =>
        articulationOrder.includes(name as LocalScoreProjectArticulationV1),
    );
    const canonicalNames = articulationOrder.filter(
      (name) => supportedNames.includes(name),
    );
    const hasInvalidContainerNode = Array.from(container.childNodes).some(
      (child) =>
        (child.nodeType === 3 && (child.textContent ?? "").trim() !== "")
        || (child.nodeType !== 1 && child.nodeType !== 3),
    );
    const containerValid =
      container.attributes.length === 0
      && children.length > 0
      && supportedNames.length === children.length
      && allArticulationMarks.length === children.length
      && new Set(supportedNames).size === supportedNames.length
      && supportedNames.every(
        (name, index) => name === canonicalNames[index],
      )
      && !hasInvalidContainerNode;
    if (!containerValid) {
      issues.push(blockingIssue(
        "unsupported-articulation",
        "articulations 必须无属性，并按 accent／staccato／tenuto 固定顺序包含一个或多个唯一空记号。",
        measureNumber,
      ));
    }
    let markersValid = true;
    children.forEach((marker) => {
      if (
        marker.attributes.length !== 0
        || marker.childNodes.length !== 0
      ) {
        markersValid = false;
        issues.push(blockingIssue(
          "unsupported-articulation",
          `${localElementName(marker)} 必须是无属性、无文本且无子元素的空演奏法记号。`,
          measureNumber,
        ));
      }
    });
    if (
      containerValid
      && markersValid
      && supportedNames.length === canonicalNames.length
    ) {
      articulations = [...supportedNames];
    }
  } else if (allArticulationMarks.length > 0) {
    issues.push(blockingIssue(
      "unsupported-articulation",
      "accent／staccato／tenuto 必须直接位于唯一的 articulations 容器中。",
      measureNumber,
    ));
  }
  if (
    (
      allArticulationContainers.length > 0
      || allArticulationMarks.length > 0
    )
    && noteElement.attributes.length !== 0
  ) {
    issues.push(blockingIssue(
      "unsupported-articulation",
      "带演奏法的 note 不能包含当前无法保留的属性。",
      measureNumber,
    ));
  }
  let dynamicMark: LocalScoreProjectDynamicMarkV1 | null = null;
  if (
    allDynamicsContainers.length !== dynamicsContainers.length
    || dynamicsContainers.length > 1
  ) {
    issues.push(blockingIssue(
      "unsupported-dynamic",
      "当前每个 note 或 rest 最多支持一个直接位于 notations 下的 dynamics。",
      measureNumber,
    ));
  }
  if (dynamicsContainers.length === 1) {
    const container = dynamicsContainers[0];
    const children = directChildElements(container);
    const mark = children[0];
    const markName = mark
      ? localElementName(mark) as LocalScoreProjectDynamicMarkV1
      : null;
    const hasInvalidContainerNode = Array.from(container.childNodes).some(
      (child) =>
        (child.nodeType === 3 && (child.textContent ?? "").trim() !== "")
        || (child.nodeType !== 1 && child.nodeType !== 3),
    );
    const containerValid =
      container.attributes.length === 0
      && children.length === 1
      && markName !== null
      && dynamicMarks.includes(markName)
      && allDynamicMarks.length === 1
      && !hasInvalidContainerNode;
    if (!containerValid) {
      issues.push(blockingIssue(
        "unsupported-dynamic",
        "dynamics 必须无属性，且只能包含一个 pp／p／mp／mf／f／ff 空记号。",
        measureNumber,
      ));
    }
    const markerValid =
      mark !== undefined
      && mark.attributes.length === 0
      && mark.childNodes.length === 0;
    if (mark !== undefined && !markerValid) {
      issues.push(blockingIssue(
        "unsupported-dynamic",
        `${localElementName(mark)} 必须是无属性、无文本且无子元素的空力度记号。`,
        measureNumber,
      ));
    }
    if (containerValid && markerValid && markName !== null) {
      dynamicMark = markName;
    }
  } else if (allDynamicMarks.length > 0) {
    issues.push(blockingIssue(
      "unsupported-dynamic",
      "pp／p／mp／mf／f／ff 必须直接位于唯一的 dynamics 容器中。",
      measureNumber,
    ));
  }
  if (
    (allDynamicsContainers.length > 0 || allDynamicMarks.length > 0)
    && noteElement.attributes.length !== 0
  ) {
    issues.push(blockingIssue(
      "unsupported-dynamic",
      "带力度记号的 note 不能包含当前无法保留的属性。",
      measureNumber,
    ));
  }
  return {
    fermataMark,
    slurStart,
    slurStop,
    tiedTypes,
    fingering,
    articulations,
    dynamicMark,
  };
};

const readSupportedDirectTieTypes = ({
  noteElement,
  issues,
  measureNumber,
}: {
  noteElement: Element | undefined;
  issues: LocalScoreProjectMusicXmlImportIssue[];
  measureNumber: number;
}): readonly TieMarkerType[] => {
  if (!noteElement) return [];
  const ties = directChildElements(noteElement).filter(
    (element) => localElementName(element) === "tie",
  );
  const allTies = Array.from(noteElement.getElementsByTagName("*"))
    .filter((element) => localElementName(element) === "tie");
  if (allTies.length !== ties.length) {
    issues.push(blockingIssue(
      "unsupported-tie",
      "发声延音线 tie 必须是 note 的直接子元素。",
      measureNumber,
    ));
  }
  const tieTypes: TieMarkerType[] = [];
  ties.forEach((tie) => {
    const typeAttribute = tie.attributes.item(0);
    const type = tie.getAttribute("type");
    if (
      tie.attributes.length !== 1
      || typeAttribute?.name !== "type"
      || (type !== "start" && type !== "stop")
      || directChildElements(tie).length !== 0
      || (tie.textContent ?? "").trim() !== ""
    ) {
      issues.push(blockingIssue(
        "unsupported-tie",
        "当前只支持仅含 type=\"start\" 或 type=\"stop\" 的空 tie 元素。",
        measureNumber,
      ));
      return;
    }
    if (tieTypes.includes(type)) {
      issues.push(blockingIssue(
        "unsupported-tie",
        `同一音符不能包含重复的 tie ${type}。`,
        measureNumber,
      ));
    }
    tieTypes.push(type);
  });
  if (
    tieTypes.length === 2
    && (tieTypes[0] !== "stop" || tieTypes[1] !== "start")
  ) {
    issues.push(blockingIssue(
      "unsupported-tie-order",
      "链式延音线的同一音符必须先结束前一条 tie，再开始后一条 tie。",
      measureNumber,
    ));
  }
  return tieTypes;
};

const hasUnsupportedContainerNode = (element: Element) =>
  Array.from(element.childNodes).some((child) => {
    if (child.nodeType === 1) return false;
    if (child.nodeType === 3) return (child.textContent ?? "").trim() !== "";
    return true;
  });

const isExactUnnamespacedElement = (
  element: Element | undefined,
  expectedName: string,
) =>
  element !== undefined
  && element.nodeName === expectedName
  && (element.namespaceURI === null || element.namespaceURI === "");

const isExactPlainTextElement = (
  element: Element | undefined,
  expectedName: string,
  expectedText?: string,
) => {
  if (!element || !isExactUnnamespacedElement(element, expectedName)) {
    return false;
  }
  return (
    element.attributes.length === 0
    && directChildElements(element).length === 0
    && Array.from(element.childNodes).every((child) => child.nodeType === 3)
    && (expectedText === undefined || element.textContent === expectedText)
  );
};

const isSupportedDamperPedalDirectionElement = (direction: Element) => {
  const directionChildren = directChildElements(direction);
  const [directionType, voice, staff] = directionChildren;
  const directionTypeChildren = directionType
    && localElementName(directionType) === "direction-type"
    ? directChildElements(directionType)
    : [];
  const pedal = directionTypeChildren[0];
  const pedalType = pedal?.getAttribute("type");
  const pedalAttribute = pedal?.attributes.item(0);
  return (
    isExactUnnamespacedElement(direction, "direction")
    && direction.attributes.length === 0
    && !hasUnsupportedContainerNode(direction)
    && directionChildren.length === 3
    && isExactUnnamespacedElement(directionType, "direction-type")
    && directionType.attributes.length === 0
    && !hasUnsupportedContainerNode(directionType)
    && directionTypeChildren.length === 1
    && isExactUnnamespacedElement(pedal, "pedal")
    && pedal.attributes.length === 1
    && pedalAttribute?.name === "type"
    && (pedalType === "start" || pedalType === "stop")
    && pedal.childNodes.length === 0
    && isExactPlainTextElement(voice, "voice", "1")
    && isExactPlainTextElement(staff, "staff", "1")
  );
};

const readSupportedDamperPedalMarks = ({
  measureElement,
  issues,
  measureNumber,
}: {
  measureElement: Element | undefined;
  issues: LocalScoreProjectMusicXmlImportIssue[];
  measureNumber: number;
}): readonly (SupportedDamperPedalMark | null)[] => {
  if (!measureElement) return [];
  const measureChildren = directChildElements(measureElement);
  const noteElements = measureChildren.filter(
    (element) => localElementName(element) === "note",
  );
  const result: (SupportedDamperPedalMark | null)[] =
    noteElements.map(() => null);
  const directDirections = measureChildren.filter(
    (element) => isExactUnnamespacedElement(element, "direction"),
  );
  const allDirections = Array.from(measureElement.getElementsByTagName("*"))
    .filter((element) => localElementName(element) === "direction");
  if (allDirections.length !== directDirections.length) {
    issues.push(blockingIssue(
      "unsupported-pedal-direction",
      "踏板 direction 必须是 measure 的直接子元素。",
      measureNumber,
    ));
  }

  directDirections.forEach((direction) => {
    const measureNodes = Array.from(measureElement.childNodes);
    const directionIndex = measureNodes.indexOf(direction);
    let targetNote: Element | undefined;
    let unsupportedGapNode = false;
    for (
      let nodeIndex = directionIndex + 1;
      nodeIndex < measureNodes.length;
      nodeIndex += 1
    ) {
      const node = measureNodes[nodeIndex];
      if (node.nodeType === 3 && (node.textContent ?? "").trim() === "") {
        continue;
      }
      if (node.nodeType === 1) {
        targetNote = node as Element;
      } else {
        unsupportedGapNode = true;
      }
      break;
    }
    const targetNoteIndex = targetNote
      && isExactUnnamespacedElement(targetNote, "note")
      ? noteElements.indexOf(targetNote)
      : -1;
    const directionType = directChildElements(direction)[0];
    const pedal = directionType
      ? directChildElements(directionType)[0]
      : undefined;
    const pedalType = pedal?.getAttribute("type");
    const validStructure = isSupportedDamperPedalDirectionElement(direction);
    if (!validStructure) {
      issues.push(blockingIssue(
        "unsupported-direction",
        "当前导入不支持该 direction；只接受严格的单事件制音踏板结构。",
        measureNumber,
      ));
      issues.push(blockingIssue(
        "unsupported-pedal-direction",
        "当前只支持无属性、依次仅含单一 pedal start／stop、voice 1 和 staff 1 的严格踏板 direction。",
        measureNumber,
      ));
    }
    if (unsupportedGapNode || targetNoteIndex < 0) {
      issues.push(blockingIssue(
        "unsupported-pedal-anchor",
        "踏板 direction 与目标 note 或 rest 之间只允许格式化空白文本。",
        measureNumber,
      ));
    } else if (result[targetNoteIndex] !== null) {
      issues.push(blockingIssue(
        "unsupported-pedal-anchor",
        "每个 note 或 rest 最多只能关联一个踏板 direction。",
        measureNumber,
      ));
    } else if (validStructure && (pedalType === "start" || pedalType === "stop")) {
      result[targetNoteIndex] = pedalType === "start" ? "down" : "up";
    }
  });

  const allPedals = Array.from(measureElement.getElementsByTagName("*"))
    .filter((element) => localElementName(element) === "pedal");
  const pedalsInDirectDirections = directDirections.flatMap((direction) =>
    Array.from(direction.getElementsByTagName("*"))
      .filter((element) => localElementName(element) === "pedal")
  );
  if (
    allPedals.length !== pedalsInDirectDirections.length
    || allPedals.some((pedal) =>
      !pedal.parentElement
      || !isExactUnnamespacedElement(pedal, "pedal")
      || !isExactUnnamespacedElement(pedal.parentElement, "direction-type")
      || !pedal.parentElement.parentElement
      || !isExactUnnamespacedElement(
        pedal.parentElement.parentElement,
        "direction",
      )
      || pedal.parentElement.parentElement.parentElement !== measureElement
    )
  ) {
    issues.push(blockingIssue(
      "unsupported-pedal-direction",
      "pedal 必须直接位于 measure／direction／direction-type 的严格层级中。",
      measureNumber,
    ));
  }
  return result;
};

const readSupportedChordSymbols = ({
  measureElement,
  issues,
  measureNumber,
}: {
  measureElement: Element | undefined;
  issues: LocalScoreProjectMusicXmlImportIssue[];
  measureNumber: number;
}): readonly (SupportedChordSymbol | null)[] => {
  if (!measureElement) return [];
  const measureChildren = directChildElements(measureElement);
  const noteElements = measureChildren.filter(
    (element) => localElementName(element) === "note",
  );
  const result: (SupportedChordSymbol | null)[] = noteElements.map(() => null);
  const directHarmonies = measureChildren.filter(
    (element) => isExactUnnamespacedElement(element, "harmony"),
  );
  const allHarmonies = Array.from(measureElement.getElementsByTagName("*"))
    .filter((element) => localElementName(element) === "harmony");
  if (allHarmonies.length !== directHarmonies.length) {
    issues.push(blockingIssue(
      "unsupported-harmony-structure",
      "和弦标记 harmony 必须是 measure 的直接、无命名空间子元素。",
      measureNumber,
    ));
  }
  const harmonyStructureElements = Array.from(
    measureElement.getElementsByTagName("*"),
  ).filter((element) =>
    ["root", "root-step", "root-alter", "kind"].includes(
      localElementName(element),
    )
  );
  if (harmonyStructureElements.some((element) => {
    const name = localElementName(element);
    if (name === "root") {
      return (
        !isExactUnnamespacedElement(element, "root")
        || !element.parentElement
        || !isExactUnnamespacedElement(element.parentElement, "harmony")
        || element.parentElement.parentElement !== measureElement
      );
    }
    if (name === "kind") {
      return (
        !isExactUnnamespacedElement(element, "kind")
        || !element.parentElement
        || !isExactUnnamespacedElement(element.parentElement, "harmony")
        || element.parentElement.parentElement !== measureElement
      );
    }
    return (
      (
        name !== "root-step"
        && name !== "root-alter"
      )
      || !isExactUnnamespacedElement(element, name)
      || !element.parentElement
      || !isExactUnnamespacedElement(element.parentElement, "root")
      || !element.parentElement.parentElement
      || !isExactUnnamespacedElement(
        element.parentElement.parentElement,
        "harmony",
      )
      || element.parentElement.parentElement.parentElement !== measureElement
    );
  })) {
    issues.push(blockingIssue(
      "unsupported-harmony-structure",
      "root、root-step、root-alter 和 kind 必须只位于 measure／harmony 的严格层级中。",
      measureNumber,
    ));
  }

  directHarmonies.forEach((harmony) => {
    const measureNodes = Array.from(measureElement.childNodes);
    const harmonyIndex = measureNodes.indexOf(harmony);
    let targetNote: Element | undefined;
    let unsupportedGapNode = false;
    let skippedPedalDirection = false;
    for (
      let nodeIndex = harmonyIndex + 1;
      nodeIndex < measureNodes.length;
      nodeIndex += 1
    ) {
      const node = measureNodes[nodeIndex];
      if (node.nodeType === 3 && (node.textContent ?? "").trim() === "") {
        continue;
      }
      if (
        node.nodeType === 1
        && !skippedPedalDirection
        && isSupportedDamperPedalDirectionElement(node as Element)
      ) {
        skippedPedalDirection = true;
        continue;
      }
      if (node.nodeType === 1) {
        targetNote = node as Element;
      } else {
        unsupportedGapNode = true;
      }
      break;
    }
    const targetNoteIndex = targetNote
      && isExactUnnamespacedElement(targetNote, "note")
      ? noteElements.indexOf(targetNote)
      : -1;
    const harmonyChildren = directChildElements(harmony);
    const [root, kind, staff] = harmonyChildren;
    const rootChildren = root && localElementName(root) === "root"
      ? directChildElements(root)
      : [];
    const rootStep = rootChildren[0];
    const rootAlter = rootChildren[1];
    const rootAlterValue = rootAlter?.textContent === "1"
      ? 1
      : rootAlter?.textContent === "-1"
        ? -1
        : rootAlter === undefined
          ? 0
          : Number.NaN;
    const supported = createSupportedCanonicalChordSymbol({
      rootStep: rootStep?.textContent ?? "",
      rootAlter: rootAlterValue,
      kind: kind?.textContent ?? "",
    });
    const validStructure =
      harmony.attributes.length === 0
      && !hasUnsupportedContainerNode(harmony)
      && harmonyChildren.length === 3
      && isExactUnnamespacedElement(root, "root")
      && root.attributes.length === 0
      && !hasUnsupportedContainerNode(root)
      && (rootChildren.length === 1 || rootChildren.length === 2)
      && isExactPlainTextElement(rootStep, "root-step")
      && (
        rootAlter === undefined
        || (
          isExactPlainTextElement(rootAlter, "root-alter")
          && (rootAlter.textContent === "1" || rootAlter.textContent === "-1")
        )
      )
      && isExactPlainTextElement(kind, "kind")
      && isExactPlainTextElement(staff, "staff", "1")
      && supported !== null;
    if (!validStructure) {
      issues.push(blockingIssue(
        "unsupported-harmony-structure",
        "当前只支持无属性、依次仅含自然音或单升降 root、受控 kind 和 staff 1 的严格 harmony。",
        measureNumber,
      ));
    }
    if (unsupportedGapNode || targetNoteIndex < 0) {
      issues.push(blockingIssue(
        "unsupported-harmony-anchor",
        "harmony 必须紧邻目标 note 或 rest；中间只允许格式化空白和同一事件的严格踏板 direction。",
        measureNumber,
      ));
    } else if (result[targetNoteIndex] !== null) {
      issues.push(blockingIssue(
        "unsupported-harmony-anchor",
        "每个 note 或 rest 最多只能关联一个 harmony。",
        measureNumber,
      ));
    } else if (validStructure && supported) {
      result[targetNoteIndex] = supported.canonical;
    }
  });
  return result;
};

const readSupportedGlobalTempo = ({
  xmlDocument,
  measureElements,
  issues,
  xml,
}: {
  xmlDocument: XMLDocument | null;
  measureElements: readonly Element[];
  issues: LocalScoreProjectMusicXmlImportIssue[];
  xml: string;
}) => {
  const sounds = xmlDocument
    ? Array.from(xmlDocument.getElementsByTagName("*"))
      .filter((element) => localElementName(element) === "sound")
    : [];
  const lexicalSounds = getXmlStartTags(xml)
    .filter((tag) => tag.localName === "sound");
  if (sounds.length === 0 && lexicalSounds.length === 0) {
    return LOCAL_SCORE_PROJECT_DEFAULT_TEMPO_BPM;
  }
  if (sounds.length !== 1 || lexicalSounds.length !== 1) {
    issues.push(blockingIssue(
      "unsupported-tempo",
      "当前只支持全谱唯一一个起始速度声明，不能导入重复或中途变速的 sound。",
    ));
  }

  const element = sounds[0];
  if (!element) return LOCAL_SCORE_PROJECT_DEFAULT_TEMPO_BPM;
  const measureIndex = measureElements.findIndex(
    (measureElement) => measureElement === element.parentElement,
  );
  const measureElement = measureElements[measureIndex] ?? null;
  const measureNumber = Number(measureElement?.getAttribute("number")) || 1;
  const lexicalSound = lexicalSounds[0] ?? null;
  const lexicalTempo = lexicalSound?.markup.match(
    /^<sound\s+tempo\s*=\s*(["'])(\d+)\1\s*(?:\/>|>)$/,
  )?.[2] ?? null;
  const measureChildren = measureElement
    ? directChildElements(measureElement)
    : [];
  const soundIndex = measureChildren.indexOf(element);
  const attributesElements = measureChildren.filter(
    (child) => localElementName(child) === "attributes",
  );
  const attributes = attributesElements.length === 1
    && isExactUnnamespacedElement(attributesElements[0], "attributes")
    ? attributesElements[0]
    : undefined;
  const attributesIndex = attributes
    ? measureChildren.indexOf(attributes)
    : -1;
  const measureNodes = measureElement
    ? Array.from(measureElement.childNodes)
    : [];
  const attributesNodeIndex = attributes
    ? measureNodes.indexOf(attributes)
    : -1;
  const soundNodeIndex = measureNodes.indexOf(element);
  const onlyFormattingWhitespaceBetween =
    attributesNodeIndex >= 0
    && soundNodeIndex > attributesNodeIndex
    && measureNodes
      .slice(attributesNodeIndex + 1, soundNodeIndex)
      .every((node) =>
        node.nodeType === 3 && (node.textContent ?? "").trim() === ""
      );
  const attribute = element.attributes.item(0);
  const rawTempo = element.getAttribute("tempo");
  const parsedTempo = rawTempo !== null && /^\d+$/.test(rawTempo)
    ? Number(rawTempo)
    : Number.NaN;
  const validTempo =
    Number.isSafeInteger(parsedTempo)
    && parsedTempo >= LOCAL_SCORE_PROJECT_MIN_TEMPO_BPM
    && parsedTempo <= LOCAL_SCORE_PROJECT_MAX_TEMPO_BPM
    && String(parsedTempo) === rawTempo;
  const validStructure =
    sounds.length === 1
    && measureIndex === 0
    && isExactUnnamespacedElement(element, "sound")
    && measureElement !== null
    && attributesElements.length === 1
    && soundIndex === attributesIndex + 1
    && onlyFormattingWhitespaceBetween
    && element.attributes.length === 1
    && attribute?.name === "tempo"
    && (
      attribute.namespaceURI === null
      || attribute.namespaceURI === undefined
      || attribute.namespaceURI === ""
    )
    && element.childNodes.length === 0
    && validTempo;
  const validLexicalStructure =
    lexicalSounds.length === 1
    && lexicalTempo === rawTempo
    && (
      lexicalSound?.markup.trimEnd().endsWith("/>")
      || (
        lexicalSound !== null
        && xml.startsWith("</sound>", lexicalSound.end)
      )
    );
  if (!validStructure || !validLexicalStructure) {
    issues.push(blockingIssue(
      "unsupported-tempo",
      "速度必须是首小节 attributes 后唯一、空且只含 tempo=\"30–240 整数\" 的无命名空间 sound。",
      measureNumber,
    ));
    return LOCAL_SCORE_PROJECT_DEFAULT_TEMPO_BPM;
  }
  return parsedTempo;
};

const validateNotationHierarchy = ({
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
      (
        elementName === "fermata"
        || elementName === "slur"
        || elementName === "tied"
      )
      && (
        !element.parentElement
        || localElementName(element.parentElement) !== "notations"
        || !element.parentElement.parentElement
        || localElementName(element.parentElement.parentElement) !== "note"
      )
    ) {
      issues.push(blockingIssue(
        elementName === "fermata"
          ? "unsupported-fermata"
          : elementName === "slur"
            ? "unsupported-slur"
            : "unsupported-tie",
        `${elementName} 必须位于 note 的直接 notations 子元素中。`,
        measureNumber,
      ));
    }
    if (
      elementName === "technical"
      && (
        !element.parentElement
        || localElementName(element.parentElement) !== "notations"
        || !element.parentElement.parentElement
        || localElementName(element.parentElement.parentElement) !== "note"
      )
    ) {
      issues.push(blockingIssue(
        "unsupported-technical",
        "technical 必须直接位于 note 的 notations 子元素中。",
        measureNumber,
      ));
    }
    if (
      elementName === "fingering"
      && (
        !element.parentElement
        || localElementName(element.parentElement) !== "technical"
        || !element.parentElement.parentElement
        || localElementName(element.parentElement.parentElement) !== "notations"
        || !element.parentElement.parentElement.parentElement
        || localElementName(
          element.parentElement.parentElement.parentElement,
        ) !== "note"
      )
    ) {
      issues.push(blockingIssue(
        "unsupported-fingering",
        "fingering 必须直接位于 note／notations 下的 technical 中。",
        measureNumber,
      ));
    }
    if (
      elementName === "articulations"
      && (
        !element.parentElement
        || localElementName(element.parentElement) !== "notations"
        || !element.parentElement.parentElement
        || localElementName(element.parentElement.parentElement) !== "note"
      )
    ) {
      issues.push(blockingIssue(
        "unsupported-articulation",
        "articulations 必须直接位于 note 的 notations 子元素中。",
        measureNumber,
      ));
    }
    if (
      articulationOrder.includes(elementName as LocalScoreProjectArticulationV1)
      && (
        !element.parentElement
        || localElementName(element.parentElement) !== "articulations"
        || !element.parentElement.parentElement
        || localElementName(element.parentElement.parentElement) !== "notations"
        || !element.parentElement.parentElement.parentElement
        || localElementName(
          element.parentElement.parentElement.parentElement,
        ) !== "note"
      )
    ) {
      issues.push(blockingIssue(
        "unsupported-articulation",
        `${elementName} 必须直接位于 note／notations 下的 articulations 中。`,
        measureNumber,
      ));
    }
    if (
      elementName === "dynamics"
      && (
        !element.parentElement
        || localElementName(element.parentElement) !== "notations"
        || !element.parentElement.parentElement
        || localElementName(element.parentElement.parentElement) !== "note"
      )
    ) {
      issues.push(blockingIssue(
        "unsupported-dynamic",
        "dynamics 必须直接位于 note 的 notations 子元素中。",
        measureNumber,
      ));
    }
    if (
      dynamicMarks.includes(elementName as LocalScoreProjectDynamicMarkV1)
      && (
        !element.parentElement
        || localElementName(element.parentElement) !== "dynamics"
        || !element.parentElement.parentElement
        || localElementName(element.parentElement.parentElement) !== "notations"
        || !element.parentElement.parentElement.parentElement
        || localElementName(
          element.parentElement.parentElement.parentElement,
        ) !== "note"
      )
    ) {
      issues.push(blockingIssue(
        "unsupported-dynamic",
        `${elementName} 必须直接位于 note／notations 下的 dynamics 中。`,
        measureNumber,
      ));
    }
    if (
      elementName === "tie"
      && (
        !element.parentElement
        || localElementName(element.parentElement) !== "note"
      )
    ) {
      issues.push(blockingIssue(
        "unsupported-tie",
        "tie 必须是 note 的直接子元素。",
        measureNumber,
      ));
    }
    if (
      elementName === "dot"
      && (
        !element.parentElement
        || localElementName(element.parentElement) !== "note"
      )
    ) {
      issues.push(blockingIssue(
        "unsupported-dot",
        "附点 dot 必须是 note 的直接子元素。",
        measureNumber,
      ));
    }
    if (
      elementName === "lyric"
      && (
        !element.parentElement
        || localElementName(element.parentElement) !== "note"
      )
    ) {
      issues.push(blockingIssue(
        "unsupported-lyric",
        "lyric 必须是 note 的直接子元素。",
        measureNumber,
      ));
    }
    if (
      elementName === "text"
      && (
        !element.parentElement
        || localElementName(element.parentElement) !== "lyric"
        || !element.parentElement.parentElement
        || localElementName(element.parentElement.parentElement) !== "note"
      )
    ) {
      issues.push(blockingIssue(
        "unsupported-lyric",
        "歌词 text 必须直接位于 note 的 lyric 子元素中。",
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
  augmentationDots,
  lyric,
  fingering,
  articulations,
  dynamicMark,
  damperPedalMark,
  chordSymbol,
  measure,
  fermataMark,
  tieToNext,
  slurToNext,
}: {
  id: string;
  pitch: NotationPitch;
  duration: NotationDuration;
  augmentationDots: 0 | 1;
  lyric: string | null;
  fingering: LocalScoreProjectFingeringV1 | null;
  articulations: readonly LocalScoreProjectArticulationV1[];
  dynamicMark: LocalScoreProjectDynamicMarkV1 | null;
  damperPedalMark: SupportedDamperPedalMark | null;
  chordSymbol: SupportedChordSymbol | null;
  measure: number;
  fermataMark: "fermata" | null;
  tieToNext: boolean;
  slurToNext: boolean;
}): LocalScoreProjectEventV9 => ({
  id,
  type: "note",
  pitch,
  duration,
  measure,
  augmentationDots,
  tieToNext,
  slurToNext,
  lyric,
  fingering,
  chordSymbol,
  articulations,
  dynamicMark,
  damperPedalMark,
  fermataMark,
});

const restEvent = ({
  id,
  augmentationDots,
  dynamicMark,
  damperPedalMark,
  chordSymbol,
  measure,
  fermataMark,
}: {
  id: string;
  augmentationDots: 0 | 1;
  dynamicMark: LocalScoreProjectDynamicMarkV1 | null;
  damperPedalMark: SupportedDamperPedalMark | null;
  chordSymbol: SupportedChordSymbol | null;
  measure: number;
  fermataMark: "fermata" | null;
}): LocalScoreProjectEventV9 => ({
  id,
  type: "rest",
  pitch: null,
  duration: "quarter",
  measure,
  augmentationDots,
  chordSymbol,
  dynamicMark,
  damperPedalMark,
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
  const tempoBpm = readSupportedGlobalTempo({
    xmlDocument,
    measureElements,
    issues,
    xml,
  });

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
  let pendingSlurStart: Readonly<{
    endBeat: number;
    measureNumber: number;
  }> | null = null;
  let pendingTieStart: Readonly<{
    endBeat: number;
    measureNumber: number;
    pitch: NotationPitch;
  }> | null = null;

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
    const damperPedalMarks = readSupportedDamperPedalMarks({
      measureElement: measureElements[measureIndex],
      issues,
      measureNumber,
    });
    const chordSymbols = readSupportedChordSymbols({
      measureElement: measureElements[measureIndex],
      issues,
      measureNumber,
    });
    validateNotationHierarchy({
      measureElement: measureElements[measureIndex],
      issues,
      measureNumber,
    });
    getElementMatches(measureXml, "note").forEach((noteMatch, noteIndex) => {
      const noteXml = noteMatch[2];
      const notationBundle = readSupportedNotationBundle({
        noteElement: noteElements[noteIndex],
        issues,
        measureNumber,
      });
      const directTieTypes = readSupportedDirectTieTypes({
        noteElement: noteElements[noteIndex],
        issues,
        measureNumber,
      });
      const augmentationDots = readSupportedAugmentationDots({
        noteElement: noteElements[noteIndex],
        noteXml,
        issues,
        measureNumber,
      });
      const lyric = readSupportedLyric({
        noteElement: noteElements[noteIndex],
        noteXml,
        issues,
        measureNumber,
      });
      const tieMarkersMatch = haveSameTieMarkerTypes(
        directTieTypes,
        notationBundle.tiedTypes,
      );
      if (!tieMarkersMatch) {
        issues.push(blockingIssue(
          "unsupported-tie-mismatch",
          "同一音符上的发声 tie 与记谱 tied 必须使用完全一致的 start／stop 标记和顺序。",
          measureNumber,
        ));
      }
      const tieStart = tieMarkersMatch && directTieTypes.includes("start");
      const tieStop = tieMarkersMatch && directTieTypes.includes("stop");
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
      const effectiveDurationBeats = duration
        ? durationBeats[duration] * (augmentationDots === 1 ? 1.5 : 1)
        : null;
      if (
        effectiveDurationBeats !== null
        && divisions
        && (
          rawDuration === null
          || rawDuration / divisions !== effectiveDurationBeats
        )
      ) {
        issues.push(blockingIssue(
          "inconsistent-duration",
          "MusicXML duration 与 type 不一致，未生成可保存草稿。",
          measureNumber,
        ));
      }
      const onsetBeat = meter
        ? (measureNumber - 1) * Number(meter.split("/")[0]) + occupiedBeats
        : null;
      const endBeat = effectiveDurationBeats !== null && onsetBeat !== null
        ? onsetBeat + effectiveDurationBeats
        : null;
      if (effectiveDurationBeats !== null) {
        occupiedBeats += effectiveDurationBeats;
      }

      const isRest = hasElement(noteXml, "rest");
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
      const supportedPitch = allowedPitches.has(pitch as NotationPitch);

      if (pendingSlurStart) {
        if (!notationBundle.slurStop) {
          issues.push(blockingIssue(
            "unsupported-slur-pair",
            "slur start 后必须由紧邻的下一个音符以 slur stop 闭合。",
            pendingSlurStart.measureNumber,
          ));
        } else if (isRest || onsetBeat !== pendingSlurStart.endBeat) {
          issues.push(blockingIssue(
            "unsupported-slur-continuity",
            "圆滑线只能连接时间连续的相邻音符，不能跨休止符或空拍。",
            measureNumber,
          ));
        }
      } else if (notationBundle.slurStop) {
        issues.push(blockingIssue(
          "unsupported-slur-pair",
          "slur stop 前必须是带 slur start 的紧邻音符。",
          measureNumber,
        ));
      }
      pendingSlurStart = null;
      if (notationBundle.slurStart) {
        if (isRest || endBeat === null) {
          issues.push(blockingIssue(
            "unsupported-slur",
            "休止符或无法确定时值的事件不能开始圆滑线。",
            measureNumber,
          ));
        } else {
          pendingSlurStart = { endBeat, measureNumber };
        }
      }

      if (pendingTieStart) {
        if (!tieStop) {
          issues.push(blockingIssue(
            "unsupported-tie-pair",
            "tie start 后必须由紧邻的下一个同音音符以 tie stop 和 tied stop 闭合。",
            pendingTieStart.measureNumber,
          ));
        } else if (isRest || onsetBeat !== pendingTieStart.endBeat) {
          issues.push(blockingIssue(
            "unsupported-tie-continuity",
            "延音线只能连接时间连续的相邻同音音符，不能跨休止符或空拍。",
            measureNumber,
          ));
        } else if (!supportedPitch || pitch !== pendingTieStart.pitch) {
          issues.push(blockingIssue(
            "unsupported-tie-pitch",
            "延音线两端必须是完全相同的 canonical 音高。",
            measureNumber,
          ));
        }
      } else if (tieStop) {
        issues.push(blockingIssue(
          "unsupported-tie-pair",
          "tie stop／tied stop 前必须是带 start 的紧邻同音音符。",
          measureNumber,
        ));
      }
      pendingTieStart = null;
      if (tieStart) {
        if (isRest || endBeat === null || !supportedPitch) {
          issues.push(blockingIssue(
            "unsupported-tie",
            "休止符或无法确定音高／时值的事件不能开始延音线。",
            measureNumber,
          ));
        } else {
          pendingTieStart = {
            endBeat,
            measureNumber,
            pitch: pitch as NotationPitch,
          };
        }
      }

      if (isRest) {
        if (lyric !== null || hasElement(noteXml, "lyric")) {
          issues.push(blockingIssue(
            "unsupported-lyric-on-rest",
            "休止符不能包含歌词。",
            measureNumber,
          ));
        }
        if (
          notationBundle.fingering !== null
          || hasElement(noteXml, "fingering")
        ) {
          issues.push(blockingIssue(
            "unsupported-fingering-on-rest",
            "休止符不能包含指法。",
            measureNumber,
          ));
        }
        if (
          notationBundle.articulations.length > 0
          || hasElement(noteXml, "articulations")
        ) {
          issues.push(blockingIssue(
            "unsupported-articulation-on-rest",
            "休止符不能包含演奏法。",
            measureNumber,
          ));
        }
        if (notationBundle.slurStop) {
          issues.push(blockingIssue(
            "unsupported-slur",
            "休止符不能结束圆滑线。",
            measureNumber,
          ));
        }
        if (tieStart || tieStop || directTieTypes.length > 0
          || notationBundle.tiedTypes.length > 0) {
          issues.push(blockingIssue(
            "unsupported-tie",
            "休止符不能开始或结束延音线。",
            measureNumber,
          ));
        }
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
              id: `musicxml-import-provisional-${provisionalEventCount}`,
              augmentationDots,
              dynamicMark: notationBundle.dynamicMark,
              damperPedalMark: damperPedalMarks[noteIndex] ?? null,
              chordSymbol: chordSymbols[noteIndex] ?? null,
              measure: measureNumber,
              fermataMark: notationBundle.fermataMark,
            }));
          }
        }
        return;
      }

      if (!supportedPitch) {
        issues.push(blockingIssue(
          "unsupported-pitch",
          `音高 ${pitch || "无法解析"} 超出当前自然音 C4–C5 范围。`,
          measureNumber,
        ));
      }
      if (duration && supportedPitch) {
        provisionalEventCount += 1;
        if (!issues.some((issue) => issue.severity === "blocking")) {
          events.push(noteEvent({
            id: `musicxml-import-provisional-${provisionalEventCount}`,
            pitch: pitch as NotationPitch,
            duration,
            augmentationDots,
            lyric,
            fingering: notationBundle.fingering,
            articulations: notationBundle.articulations,
            dynamicMark: notationBundle.dynamicMark,
            damperPedalMark: damperPedalMarks[noteIndex] ?? null,
            chordSymbol: chordSymbols[noteIndex] ?? null,
            measure: measureNumber,
            fermataMark: notationBundle.fermataMark,
            tieToNext: tieStart,
            slurToNext: notationBundle.slurStart,
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

  const unresolvedSlur = pendingSlurStart as Readonly<{
    endBeat: number;
    measureNumber: number;
  }> | null;
  if (unresolvedSlur) {
    issues.push(blockingIssue(
      "unsupported-slur-pair",
      "乐谱结束前的 slur start 缺少紧邻音符上的 slur stop。",
      unresolvedSlur.measureNumber,
    ));
  }
  const unresolvedTie = pendingTieStart as Readonly<{
    endBeat: number;
    measureNumber: number;
    pitch: NotationPitch;
  }> | null;
  if (unresolvedTie) {
    issues.push(blockingIssue(
      "unsupported-tie-pair",
      "乐谱结束前的 tie start／tied start 缺少紧邻同音音符上的 stop。",
      unresolvedTie.measureNumber,
    ));
  }

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
  const materializedMeasures = parsedMeasures.map((measure) => ({
    ...measure,
    events: measure.events.map((event) => ({
      ...event,
      id: args.createEventId(),
    })),
  }));
  const project: LocalScoreProjectV1 = {
    ...baseProject,
    tempoBpm,
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
            measures: materializedMeasures,
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
