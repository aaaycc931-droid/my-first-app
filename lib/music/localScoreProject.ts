import {
  isAllowedDuration,
  isAllowedPitch,
  isAllowedTimeSignature,
  type NotationDuration,
  type NotationPitch,
  type NotationTimeSignature,
} from "../practice/localNotationFragmentDraft";
import type {
  LocalNotationProjectScoreDocumentV1,
  LocalNotationProjectScoreDocumentV3,
  LocalNotationProjectScoreDocumentV4,
  LocalNotationProjectScoreDocumentV5,
  LocalNotationProjectScoreDocumentV10,
  LocalNotationProjectScoreDocumentV11,
  LocalNotationProjectScoreDocumentV12,
  LocalScoreProjectArticulationV1 as ScoreDocumentArticulationV1,
  LocalScoreProjectClefV3,
  LocalScoreProjectAugmentationDots,
  LocalScoreProjectEventV8,
  LocalScoreProjectKeySignatureV3,
  LocalScoreProjectFingeringV1 as ScoreDocumentFingeringV1,
  LocalScoreProjectPartInstrumentV1,
  LocalScoreProjectCreatorRoleV1,
  LocalScoreProjectDynamicMarkV1 as ScoreDocumentDynamicMarkV1,
  LocalScoreProjectDamperPedalMarkV1 as ScoreDocumentDamperPedalMarkV1,
  LocalScoreProjectFermataMarkV1 as ScoreDocumentFermataMarkV1,
  LocalScoreProjectScoreCreditsV1,
} from "./scoreDocument";

export const LOCAL_SCORE_PROJECT_LEGACY_SCHEMA_VERSION =
  "local-score-project-storage-v1" as const;
export const LOCAL_SCORE_PROJECT_V2_SCHEMA_VERSION =
  "local-score-project-storage-v2" as const;
export const LOCAL_SCORE_PROJECT_PREVIOUS_SCHEMA_VERSION =
  "local-score-project-storage-v12" as const;
export const LOCAL_SCORE_PROJECT_V11_SCHEMA_VERSION =
  "local-score-project-storage-v11" as const;
export const LOCAL_SCORE_PROJECT_V10_SCHEMA_VERSION =
  "local-score-project-storage-v10" as const;
export const LOCAL_SCORE_PROJECT_V9_SCHEMA_VERSION =
  "local-score-project-storage-v9" as const;
export const LOCAL_SCORE_PROJECT_V8_SCHEMA_VERSION =
  "local-score-project-storage-v8" as const;
export const LOCAL_SCORE_PROJECT_V7_SCHEMA_VERSION =
  "local-score-project-storage-v7" as const;
export const LOCAL_SCORE_PROJECT_V6_SCHEMA_VERSION =
  "local-score-project-storage-v6" as const;
export const LOCAL_SCORE_PROJECT_V5_SCHEMA_VERSION =
  "local-score-project-storage-v5" as const;
export const LOCAL_SCORE_PROJECT_V4_SCHEMA_VERSION =
  "local-score-project-storage-v4" as const;
export const LOCAL_SCORE_PROJECT_V3_SCHEMA_VERSION =
  "local-score-project-storage-v3" as const;
export const LOCAL_SCORE_PROJECT_SCHEMA_VERSION =
  "local-score-project-storage-v13" as const;
export const LOCAL_SCORE_PROJECT_MAX_HISTORY = 50;
export const LOCAL_SCORE_PROJECT_MAX_TITLE_LENGTH = 80;
export const LOCAL_SCORE_PROJECT_DEFAULT_TEMPO_BPM = 90;
export const LOCAL_SCORE_PROJECT_MIN_TEMPO_BPM = 30;
export const LOCAL_SCORE_PROJECT_MAX_TEMPO_BPM = 240;
export const LOCAL_SCORE_PROJECT_MAX_LYRIC_CODE_POINTS = 80;
export const LOCAL_SCORE_PROJECT_MAX_CHORD_SYMBOL_CODE_POINTS = 40;
export const LOCAL_SCORE_PROJECT_MAX_PART_NAME_CODE_POINTS = 40;
export const LOCAL_SCORE_PROJECT_MAX_SCORE_TITLE_CODE_POINTS = 120;
export const LOCAL_SCORE_PROJECT_MAX_SCORE_SUBTITLE_CODE_POINTS = 120;
export const LOCAL_SCORE_PROJECT_MAX_CREATOR_NAME_CODE_POINTS = 80;
export const LOCAL_SCORE_PROJECT_MAX_CREATORS = 16;
export const LOCAL_SCORE_PROJECT_MAX_RIGHTS_NOTICE_CODE_POINTS = 240;
export const LOCAL_SCORE_PROJECT_ARTICULATION_ORDER =
  ["accent", "staccato", "tenuto"] as const;
export const LOCAL_SCORE_PROJECT_COPY_TIE_NOTICE =
  "单个事件复制不包含跨事件延音线；附点、歌词、指法、和弦标记和奏法已保留，延音线已清除。" as const;
export const LOCAL_SCORE_PROJECT_TIE_CONTINUITY_ERROR =
  "延音线必须连接同一声部中相邻、同音高且时值连续的音符；跨小节时必须结束于小节线并从下一小节第一拍开始。" as const;

export type LocalScoreProjectContentV1 = Readonly<
  Pick<
    LocalNotationProjectScoreDocumentV12,
    "meter" | "keySignature" | "parts"
  >
  & Pick<LocalNotationProjectScoreDocumentV12, "scoreCredits">
>;

type LocalScoreProjectTieContent = Readonly<
  Pick<LocalNotationProjectScoreDocumentV3, "meter" | "parts">
>;

export type LocalScoreProjectV13 = Readonly<{
  schemaVersion: typeof LOCAL_SCORE_PROJECT_SCHEMA_VERSION;
  projectId: string;
  title: string;
  tempoBpm: number;
  createdAt: string;
  updatedAt: string;
  document: LocalNotationProjectScoreDocumentV12;
  undoStack: readonly LocalScoreProjectContentV1[];
  redoStack: readonly LocalScoreProjectContentV1[];
}>;

/** 兼容既有调用方名称；运行时值始终为 storage-v13。 */
export type LocalScoreProjectV1 = LocalScoreProjectV13;
export type LocalScoreProjectV2 = LocalScoreProjectV13;
export type LocalScoreProjectV3 = LocalScoreProjectV13;
export type LocalScoreProjectV4 = LocalScoreProjectV13;
export type LocalScoreProjectV5 = LocalScoreProjectV13;
export type LocalScoreProjectV6 = LocalScoreProjectV13;
export type LocalScoreProjectV7 = LocalScoreProjectV13;
export type LocalScoreProjectV8 = LocalScoreProjectV13;
export type LocalScoreProjectV9 = LocalScoreProjectV13;
export type LocalScoreProjectV10 = LocalScoreProjectV13;
export type LocalScoreProjectV11 = LocalScoreProjectV13;
export type LocalScoreProjectV12 = LocalScoreProjectV13;

export class LocalScoreProjectConflictError extends Error {
  constructor() {
    super("乐谱项目已在其他页面更新，请重新打开后再修改。");
    this.name = "LocalScoreProjectConflictError";
  }
}

export type LocalScoreProjectDomainErrorCode =
  | "clock-regression"
  | "duplicate"
  | "invalid-input"
  | "measure-capacity"
  | "not-found"
  | "not-empty"
  | "would-empty"
  | "tie-integrity";

export class LocalScoreProjectDomainError extends Error {
  constructor(
    readonly code: LocalScoreProjectDomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "LocalScoreProjectDomainError";
  }
}

export type LocalScoreProjectEventLocation = Readonly<{
  partId: string;
  staffId: string;
  voiceId: string;
  measureNumber: number;
}>;

export type LocalScoreProjectEventInput = Readonly<{
  type: "note" | "rest";
  pitch: NotationPitch | null;
  duration: NotationDuration;
  augmentationDots?: LocalScoreProjectAugmentationDots;
  tieToNext?: boolean;
  lyric?: string | null;
  fingering?: ScoreDocumentFingeringV1 | null;
  chordSymbol?: string | null;
  articulations?: readonly ScoreDocumentArticulationV1[];
  dynamicMark?: ScoreDocumentDynamicMarkV1 | null;
  damperPedalMark?: ScoreDocumentDamperPedalMarkV1 | null;
  fermataMark?: ScoreDocumentFermataMarkV1 | null;
}>;

export type LocalScoreProjectVoiceLocation = Readonly<{
  partId: string;
  staffId: string;
  voiceId: string;
}>;

export type LocalScoreProjectStaffLocation = Readonly<{
  partId: string;
  staffId: string;
}>;

export type LocalScoreProjectScoreCredits =
  LocalScoreProjectScoreCreditsV1;
export type LocalScoreProjectCreatorRole =
  LocalScoreProjectCreatorRoleV1;
export type LocalScoreProjectFingeringV1 =
  ScoreDocumentFingeringV1;
export type LocalScoreProjectArticulationV1 =
  ScoreDocumentArticulationV1;
export type LocalScoreProjectDynamicMarkV1 =
  ScoreDocumentDynamicMarkV1;
export type LocalScoreProjectDamperPedalMarkV1 =
  ScoreDocumentDamperPedalMarkV1;
export type LocalScoreProjectFermataMarkV1 =
  ScoreDocumentFermataMarkV1;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isValidId = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 128;

const isLocalScoreProjectClef = (
  value: unknown,
): value is LocalScoreProjectClefV3 =>
  value === "treble" || value === "bass";

const isLocalScoreProjectKeySignature = (
  value: unknown,
): value is LocalScoreProjectKeySignatureV3 =>
  isRecord(value)
  && Object.keys(value).length === 1
  && (
    value.fifths === -1
    || value.fifths === 0
    || value.fifths === 1
  );

export const isLocalScoreProjectPartInstrument = (
  value: unknown,
): value is LocalScoreProjectPartInstrumentV1 => {
  if (!isRecord(value)) return false;
  if (value.kind === "unassigned") {
    return Object.keys(value).length === 1;
  }
  return value.kind === "gm1-program"
    && Object.keys(value).length === 2
    && Number.isSafeInteger(value.program)
    && (value.program as number) >= 0
    && (value.program as number) <= 127;
};

const clonePartInstrument = (
  instrument: LocalScoreProjectPartInstrumentV1,
): LocalScoreProjectPartInstrumentV1 =>
  instrument.kind === "unassigned"
    ? { kind: "unassigned" }
    : { kind: "gm1-program", program: instrument.program };

const isValidIsoDate = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    && new Date(timestamp).toISOString() === value;
};

const containsControlCharacter = (value: string) =>
  Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f);
  });

const normalizeChordSymbol = (value: unknown): string | null => {
  if (value !== null && typeof value !== "string") {
    throw new LocalScoreProjectDomainError(
      "invalid-input",
      "和弦标记必须是文本，或清除为无和弦标记；未执行修改。",
    );
  }
  const normalized = typeof value === "string"
    ? value.trim() || null
    : null;
  if (
    normalized !== null
    && (
      Array.from(normalized).length
        > LOCAL_SCORE_PROJECT_MAX_CHORD_SYMBOL_CODE_POINTS
      || containsControlCharacter(normalized)
    )
  ) {
    throw new LocalScoreProjectDomainError(
      "invalid-input",
      `和弦标记不能包含控制字符，且最多 ${LOCAL_SCORE_PROJECT_MAX_CHORD_SYMBOL_CODE_POINTS} 个字符；未执行修改。`,
    );
  }
  return normalized;
};

const isLocalScoreProjectArticulation = (
  value: unknown,
): value is LocalScoreProjectArticulationV1 =>
  value === "accent" || value === "staccato" || value === "tenuto";

const normalizeArticulations = (
  value: unknown,
): readonly LocalScoreProjectArticulationV1[] => {
  if (
    !Array.isArray(value)
    || !value.every(isLocalScoreProjectArticulation)
  ) {
    throw new LocalScoreProjectDomainError(
      "invalid-input",
      "奏法只能包含重音、断奏和保持；未执行修改。",
    );
  }
  const selected = new Set<LocalScoreProjectArticulationV1>(value);
  return LOCAL_SCORE_PROJECT_ARTICULATION_ORDER.filter((articulation) =>
    selected.has(articulation));
};

const isLocalScoreProjectDynamicMark = (
  value: unknown,
): value is LocalScoreProjectDynamicMarkV1 =>
  value === "pp"
  || value === "p"
  || value === "mp"
  || value === "mf"
  || value === "f"
  || value === "ff";

const normalizeDynamicMark = (
  value: unknown,
): LocalScoreProjectDynamicMarkV1 | null => {
  if (value !== null && !isLocalScoreProjectDynamicMark(value)) {
    throw new LocalScoreProjectDomainError(
      "invalid-input",
      "力度记号只能是 pp、p、mp、mf、f、ff，或清除为无力度记号；未执行修改。",
    );
  }
  return value as LocalScoreProjectDynamicMarkV1 | null;
};

const isLocalScoreProjectDamperPedalMark = (
  value: unknown,
): value is LocalScoreProjectDamperPedalMarkV1 =>
  value === "down" || value === "up";

const normalizeDamperPedalMark = (
  value: unknown,
): LocalScoreProjectDamperPedalMarkV1 | null => {
  if (value !== null && !isLocalScoreProjectDamperPedalMark(value)) {
    throw new LocalScoreProjectDomainError(
      "invalid-input",
      "制音踏板记号只能是 down、up，或清除为无记号；未执行修改。",
    );
  }
  return value as LocalScoreProjectDamperPedalMarkV1 | null;
};

const isLocalScoreProjectFermataMark = (
  value: unknown,
): value is LocalScoreProjectFermataMarkV1 => value === "fermata";

const normalizeFermataMark = (
  value: unknown,
): LocalScoreProjectFermataMarkV1 | null => {
  if (value !== null && !isLocalScoreProjectFermataMark(value)) {
    throw new LocalScoreProjectDomainError(
      "invalid-input",
      "延长记号只能是 fermata，或清除为无记号；未执行修改。",
    );
  }
  return value as LocalScoreProjectFermataMarkV1 | null;
};

const isCanonicalArticulations = (
  value: unknown,
): value is readonly LocalScoreProjectArticulationV1[] => {
  if (!Array.isArray(value) || !value.every(isLocalScoreProjectArticulation)) {
    return false;
  }
  const canonical = LOCAL_SCORE_PROJECT_ARTICULATION_ORDER.filter(
    (articulation) => value.includes(articulation),
  );
  return canonical.length === value.length
    && canonical.every((articulation, index) => value[index] === articulation);
};

const isLocalScoreProjectCreatorRole = (
  value: unknown,
): value is LocalScoreProjectCreatorRoleV1 =>
  value === "composer" || value === "lyricist" || value === "arranger";

const isValidTrimmedText = (
  value: unknown,
  {
    nullable,
    maxCodePoints,
  }: {
    nullable: boolean;
    maxCodePoints: number;
  },
) =>
  (nullable && value === null)
  || (
    typeof value === "string"
    && value === value.trim()
    && value.length > 0
    && Array.from(value).length <= maxCodePoints
    && !containsControlCharacter(value)
  );

export const isLocalScoreProjectScoreCredits = (
  value: unknown,
): value is LocalScoreProjectScoreCreditsV1 => {
  if (
    !isRecord(value)
    || Object.keys(value).length !== 4
    || !isValidTrimmedText(value.title, {
      nullable: false,
      maxCodePoints: LOCAL_SCORE_PROJECT_MAX_SCORE_TITLE_CODE_POINTS,
    })
    || !isValidTrimmedText(value.subtitle, {
      nullable: true,
      maxCodePoints: LOCAL_SCORE_PROJECT_MAX_SCORE_SUBTITLE_CODE_POINTS,
    })
    || !isValidTrimmedText(value.rightsNotice, {
      nullable: true,
      maxCodePoints: LOCAL_SCORE_PROJECT_MAX_RIGHTS_NOTICE_CODE_POINTS,
    })
    || !Array.isArray(value.creators)
    || value.creators.length > LOCAL_SCORE_PROJECT_MAX_CREATORS
  ) return false;
  const identities = new Set<string>();
  for (const creator of value.creators) {
    if (
      !isRecord(creator)
      || Object.keys(creator).length !== 2
      || !isLocalScoreProjectCreatorRole(creator.role)
      || !isValidTrimmedText(creator.name, {
        nullable: false,
        maxCodePoints: LOCAL_SCORE_PROJECT_MAX_CREATOR_NAME_CODE_POINTS,
      })
    ) return false;
    const identity = `${creator.role}\u0000${creator.name}`;
    if (identities.has(identity)) return false;
    identities.add(identity);
  }
  return true;
};

const cloneScoreCredits = (
  scoreCredits: LocalScoreProjectScoreCreditsV1,
): LocalScoreProjectScoreCreditsV1 => ({
  title: scoreCredits.title,
  subtitle: scoreCredits.subtitle,
  creators: scoreCredits.creators.map(({ role, name }) => ({ role, name })),
  rightsNotice: scoreCredits.rightsNotice,
});

const createDefaultScoreCredits = (
  title: string,
): LocalScoreProjectScoreCreditsV1 => ({
  title,
  subtitle: null,
  creators: [],
  rightsNotice: null,
});

const normalizeOptionalScoreCreditText = (
  value: string | null,
) => {
  if (value === null) return null;
  if (typeof value !== "string") return value;
  const normalized = value.trim();
  return normalized.length === 0 ? null : normalized;
};

const normalizeScoreCredits = (
  value: LocalScoreProjectScoreCreditsV1,
): LocalScoreProjectScoreCreditsV1 => {
  const candidate: unknown = isRecord(value)
    ? {
      ...value,
      title: typeof value.title === "string"
        ? value.title.trim()
        : value.title,
      subtitle: normalizeOptionalScoreCreditText(
        value.subtitle,
      ),
      creators: Array.isArray(value.creators)
        ? value.creators.map((creator) =>
          isRecord(creator)
            ? {
              ...creator,
              name: typeof creator.name === "string"
                ? creator.name.trim()
                : creator.name,
            }
            : creator)
        : value.creators,
      rightsNotice: normalizeOptionalScoreCreditText(
        value.rightsNotice,
      ),
    }
    : value;
  if (!isLocalScoreProjectScoreCredits(candidate)) {
    throw new LocalScoreProjectDomainError(
      "invalid-input",
      "谱面标题、署名或版权声明无效，未执行修改。",
    );
  }
  return cloneScoreCredits(candidate);
};

const isValidPartName = (value: unknown): value is string =>
  typeof value === "string"
  && value === value.trim()
  && value.length > 0
  && Array.from(value).length <= LOCAL_SCORE_PROJECT_MAX_PART_NAME_CODE_POINTS
  && !containsControlCharacter(value);

const normalizePartName = (value: string) => {
  if (typeof value !== "string") {
    throw new LocalScoreProjectDomainError(
      "invalid-input",
      `声部组名称不能为空、不能包含控制字符，且最多 ${LOCAL_SCORE_PROJECT_MAX_PART_NAME_CODE_POINTS} 个字符；未执行修改。`,
    );
  }
  const normalized = value.trim();
  if (
    normalized.length === 0
    || Array.from(normalized).length
      > LOCAL_SCORE_PROJECT_MAX_PART_NAME_CODE_POINTS
    || containsControlCharacter(normalized)
  ) {
    throw new LocalScoreProjectDomainError(
      "invalid-input",
      `声部组名称不能为空、不能包含控制字符，且最多 ${LOCAL_SCORE_PROJECT_MAX_PART_NAME_CODE_POINTS} 个字符；未执行修改。`,
    );
  }
  return normalized;
};

const getMigratedPartName = (index: number) => `声部组 ${index + 1}`;

const getDefaultPartName = (
  parts: LocalScoreProjectContentV1["parts"],
) => {
  const names = new Set(parts.map((part) => part.name));
  let index = 1;
  while (names.has(`声部组 ${index}`)) index += 1;
  return `声部组 ${index}`;
};

const cloneEvent = (
  event: LocalScoreProjectEventV8,
): LocalScoreProjectEventV8 => ({
  ...event,
  ...(event.type === "note"
    ? { articulations: [...event.articulations] }
    : {}),
});

const eventDurationBeats: Readonly<Record<NotationDuration, number>> = {
  half: 2,
  quarter: 1,
  eighth: 0.5,
};

export const getLocalScoreProjectEventDurationBeats = (
  event: Pick<LocalScoreProjectEventV8, "duration" | "augmentationDots">,
) =>
  eventDurationBeats[event.duration]
  * (event.augmentationDots === 1 ? 1.5 : 1);

export const cloneLocalScoreProjectContent = (
  content: LocalScoreProjectContentV1,
): LocalScoreProjectContentV1 => ({
  scoreCredits: cloneScoreCredits(content.scoreCredits),
  meter: content.meter,
  keySignature: { ...content.keySignature },
  parts: content.parts.map((part) => ({
    partId: part.partId,
    name: part.name,
    instrument: clonePartInstrument(part.instrument),
    staves: part.staves.map((staff) => ({
      staffId: staff.staffId,
      staffKind: staff.staffKind,
      clef: staff.clef,
      voices: staff.voices.map((voice) => ({
        voiceId: voice.voiceId,
        measures: voice.measures.map((measure) => ({
          measureNumber: measure.measureNumber,
          events: measure.events.map(cloneEvent),
        })),
      })),
    })),
  })),
});

export const getLocalScoreProjectContent = (
  project: LocalScoreProjectV1,
): LocalScoreProjectContentV1 =>
  cloneLocalScoreProjectContent(project.document);

const hasUniqueIds = (values: readonly string[]) =>
  new Set(values).size === values.length;

const isValidScoreEvent = (
  value: unknown,
  measureNumber: number,
): value is LocalScoreProjectEventV8 => {
  if (!isRecord(value) || !isValidId(value.id)) return false;
  if (
    value.type !== "note"
    && value.type !== "rest"
  ) return false;
  if (!isAllowedDuration(value.duration)) return false;
  if (value.augmentationDots !== 0 && value.augmentationDots !== 1) {
    return false;
  }
  if (value.type === "note" && !isAllowedPitch(value.pitch)) return false;
  if (value.type === "rest" && value.pitch !== null) return false;
  if (!("dynamicMark" in value) || !("damperPedalMark" in value)
    || !("fermataMark" in value)) return false;
  if (
    value.dynamicMark !== null
    && !isLocalScoreProjectDynamicMark(value.dynamicMark)
  ) return false;
  if (
    value.damperPedalMark !== null
    && !isLocalScoreProjectDamperPedalMark(value.damperPedalMark)
  ) return false;
  if (
    value.fermataMark !== null
    && !isLocalScoreProjectFermataMark(value.fermataMark)
  ) return false;
  if (
    value.chordSymbol !== null
    && (
      typeof value.chordSymbol !== "string"
      || value.chordSymbol.length === 0
      || value.chordSymbol.trim() !== value.chordSymbol
      || Array.from(value.chordSymbol).length
        > LOCAL_SCORE_PROJECT_MAX_CHORD_SYMBOL_CODE_POINTS
      || containsControlCharacter(value.chordSymbol)
    )
  ) return false;
  if (
    value.type === "note"
    && (
      typeof value.tieToNext !== "boolean"
      || !isCanonicalArticulations(value.articulations)
      || (
        value.fingering !== null
        && (
          !Number.isSafeInteger(value.fingering)
          || (value.fingering as number) < 1
          || (value.fingering as number) > 5
        )
      )
      || (
        value.lyric !== null
        && (
          typeof value.lyric !== "string"
          || value.lyric.length === 0
          || Array.from(value.lyric).length > LOCAL_SCORE_PROJECT_MAX_LYRIC_CODE_POINTS
          || containsControlCharacter(value.lyric)
        )
      )
    )
  ) return false;
  if (
    value.type === "rest"
    && (
      "tieToNext" in value
      || "lyric" in value
      || "fingering" in value
      || "articulations" in value
    )
  ) return false;
  if (
    !Number.isSafeInteger(value.measure)
    || (value.measure as number) < 1
    || value.measure !== measureNumber
  ) return false;
  return value.type !== "rest" || value.duration === "quarter";
};

export const hasValidLocalScoreProjectTies = (
  content: LocalScoreProjectTieContent,
) =>
  content.parts.every((part) => part.staves.every((staff) =>
    staff.voices.every((voice) => {
      const beatsPerMeasure = Number(content.meter.split("/")[0]);
      const timedEvents = voice.measures.flatMap((measure) => {
        let cursorBeat = 0;
        return measure.events.map((event) => {
          const onsetBeat =
            (measure.measureNumber - 1) * beatsPerMeasure + cursorBeat;
          const endBeat =
            onsetBeat + getLocalScoreProjectEventDurationBeats(event);
          cursorBeat += getLocalScoreProjectEventDurationBeats(event);
          return { event, onsetBeat, endBeat };
        });
      });
      return timedEvents.every(({ event, endBeat }, index) => {
        if (event.type !== "note" || !event.tieToNext) return true;
        const next = timedEvents[index + 1];
        return next?.event.type === "note"
          && next.event.pitch === event.pitch
          && next.onsetBeat === endBeat;
      });
    })));

const assertValidTies = (content: LocalScoreProjectContentV1) => {
  if (!hasValidLocalScoreProjectTies(content)) {
    throw new LocalScoreProjectDomainError(
      "tie-integrity",
      `${LOCAL_SCORE_PROJECT_TIE_CONTINUITY_ERROR}未执行修改，已保存谱面保持不变。`,
    );
  }
};

export const isLocalScoreProjectContent = (
  value: unknown,
): value is LocalScoreProjectContentV1 => {
  if (
    !isRecord(value)
    || !isLocalScoreProjectScoreCredits(value.scoreCredits)
    || !isAllowedTimeSignature(value.meter)
    || !isLocalScoreProjectKeySignature(value.keySignature)
  ) return false;
  if (!Array.isArray(value.parts) || value.parts.length === 0) return false;

  const partIds: string[] = [];
  const staffIds: string[] = [];
  const voiceIds: string[] = [];
  const eventIds: string[] = [];

  for (const part of value.parts) {
    if (
      !isRecord(part)
      || !isValidId(part.partId)
      || !isValidPartName(part.name)
      || !isLocalScoreProjectPartInstrument(part.instrument)
    ) return false;
    if (!Array.isArray(part.staves) || part.staves.length === 0) return false;
    partIds.push(part.partId);

    for (const staff of part.staves) {
      if (
        !isRecord(staff)
        || !isValidId(staff.staffId)
        || staff.staffKind !== "pitched"
        || !isLocalScoreProjectClef(staff.clef)
        || !Array.isArray(staff.voices)
        || staff.voices.length === 0
      ) return false;
      staffIds.push(staff.staffId);

      for (const voice of staff.voices) {
        if (
          !isRecord(voice)
          || !isValidId(voice.voiceId)
          || !Array.isArray(voice.measures)
          || voice.measures.length === 0
        ) return false;
        voiceIds.push(voice.voiceId);
        const measureNumbers: number[] = [];

        for (const measure of voice.measures) {
          if (
            !isRecord(measure)
            || !Number.isSafeInteger(measure.measureNumber)
            || (measure.measureNumber as number) < 1
            || !Array.isArray(measure.events)
          ) return false;
          measureNumbers.push(measure.measureNumber as number);
          for (const event of measure.events) {
            if (!isValidScoreEvent(event, measure.measureNumber as number)) {
              return false;
            }
            eventIds.push(event.id);
          }
        }
        if (
          !hasUniqueIds(measureNumbers.map(String))
          || measureNumbers.some(
            (measureNumber, index) =>
              index > 0 && measureNumber <= measureNumbers[index - 1],
          )
        ) return false;
      }
    }
  }

  return (
    hasUniqueIds(partIds)
    && hasUniqueIds(staffIds)
    && hasUniqueIds(voiceIds)
    && hasUniqueIds(eventIds)
  );
};

const normalizeTitle = (title: string) => {
  const normalized = title.trim().slice(0, LOCAL_SCORE_PROJECT_MAX_TITLE_LENGTH);
  return normalized || "未命名乐谱";
};

const createEmptyProjectDocument = ({
  projectId,
  title,
}: {
  projectId: string;
  title: string;
}): LocalNotationProjectScoreDocumentV12 => ({
  schemaVersion: "score-document-v12",
  documentKind: "notation-project",
  documentId: `local.score-project.${projectId}`,
  revision: 1,
  reviewState: "draft",
  localOnly: true,
  sessionOnly: false,
  source: {
    kind: "local-score-project",
    projectId,
  },
  scoreCredits: normalizeScoreCredits(createDefaultScoreCredits(title)),
  meter: "4/4",
  keySignature: { fifths: 0 },
  parts: [{
    partId: "part-1",
    name: "声部组 1",
    instrument: { kind: "unassigned" },
    staves: [{
      staffId: "staff-1",
      staffKind: "pitched",
      clef: "treble",
      voices: [{
        voiceId: "voice-1",
        measures: [{
          measureNumber: 1,
          events: [],
        }],
      }],
    }],
  }],
});

export const createLocalScoreProject = ({
  projectId,
  title,
  now,
}: {
  projectId: string;
  title: string;
  now: string;
}): LocalScoreProjectV1 => {
  if (!isValidId(projectId)) throw new Error("乐谱项目标识无效。");
  if (!isValidIsoDate(now)) throw new Error("乐谱项目时间无效。");
  const normalizedTitle = normalizeTitle(title);
  return {
    schemaVersion: LOCAL_SCORE_PROJECT_SCHEMA_VERSION,
    projectId,
    title: normalizedTitle,
    tempoBpm: LOCAL_SCORE_PROJECT_DEFAULT_TEMPO_BPM,
    createdAt: now,
    updatedAt: now,
    document: createEmptyProjectDocument({
      projectId,
      title: normalizedTitle,
    }),
    undoStack: [],
    redoStack: [],
  };
};

const createDocumentRevision = ({
  project,
  content,
}: {
  project: LocalScoreProjectV1;
  content: LocalScoreProjectContentV1;
}): LocalNotationProjectScoreDocumentV12 => ({
  ...project.document,
  revision: project.document.revision + 1,
  ...cloneLocalScoreProjectContent(content),
});

const trimHistory = (
  history: readonly LocalScoreProjectContentV1[],
): readonly LocalScoreProjectContentV1[] =>
  history.slice(-LOCAL_SCORE_PROJECT_MAX_HISTORY);

const assertExpectedRevision = (
  project: LocalScoreProjectV1,
  expectedRevision: number,
) => {
  if (project.document.revision !== expectedRevision) {
    throw new LocalScoreProjectConflictError();
  }
};

const assertMutationTimestamp = (
  project: LocalScoreProjectV1,
  now: string,
) => {
  if (!isValidIsoDate(now)) {
    throw new LocalScoreProjectDomainError(
      "invalid-input",
      "乐谱项目时间必须是标准 ISO 时间。",
    );
  }
  if (Date.parse(now) < Date.parse(project.updatedAt)) {
    throw new LocalScoreProjectDomainError(
      "clock-regression",
      "设备时间早于当前乐谱修订时间，未执行修改。",
    );
  }
};

const contentFingerprint = (content: LocalScoreProjectContentV1) =>
  JSON.stringify(content);

export const applyLocalScoreProjectContent = ({
  project,
  expectedRevision,
  content,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  content: LocalScoreProjectContentV1;
  now: string;
}): LocalScoreProjectV1 => {
  assertExpectedRevision(project, expectedRevision);
  assertMutationTimestamp(project, now);
  if (!isLocalScoreProjectContent(content)) {
    throw new Error("乐谱内容无效，未保存本次修改。");
  }
  assertValidTies(content);
  const previousContent = getLocalScoreProjectContent(project);
  if (contentFingerprint(previousContent) === contentFingerprint(content)) {
    return project;
  }
  return {
    ...project,
    updatedAt: now,
    document: createDocumentRevision({ project, content }),
    undoStack: trimHistory([...project.undoStack, previousContent]),
    redoStack: [],
  };
};

export const undoLocalScoreProject = ({
  project,
  expectedRevision,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  now: string;
}): LocalScoreProjectV1 => {
  assertExpectedRevision(project, expectedRevision);
  assertMutationTimestamp(project, now);
  const previous = project.undoStack.at(-1);
  if (!previous) return project;
  return {
    ...project,
    updatedAt: now,
    document: createDocumentRevision({ project, content: previous }),
    undoStack: project.undoStack.slice(0, -1),
    redoStack: trimHistory([
      ...project.redoStack,
      getLocalScoreProjectContent(project),
    ]),
  };
};

export const redoLocalScoreProject = ({
  project,
  expectedRevision,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  now: string;
}): LocalScoreProjectV1 => {
  assertExpectedRevision(project, expectedRevision);
  assertMutationTimestamp(project, now);
  const next = project.redoStack.at(-1);
  if (!next) return project;
  return {
    ...project,
    updatedAt: now,
    document: createDocumentRevision({ project, content: next }),
    undoStack: trimHistory([
      ...project.undoStack,
      getLocalScoreProjectContent(project),
    ]),
    redoStack: project.redoStack.slice(0, -1),
  };
};

export const changeLocalScoreProjectSettings = ({
  project,
  expectedRevision,
  title,
  tempoBpm,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  title: string;
  tempoBpm: number;
  now: string;
}): LocalScoreProjectV1 => {
  assertExpectedRevision(project, expectedRevision);
  assertMutationTimestamp(project, now);
  const normalizedTitle = normalizeTitle(title);
  if (
    !Number.isSafeInteger(tempoBpm)
    || tempoBpm < LOCAL_SCORE_PROJECT_MIN_TEMPO_BPM
    || tempoBpm > LOCAL_SCORE_PROJECT_MAX_TEMPO_BPM
  ) {
    throw new LocalScoreProjectDomainError(
      "invalid-input",
      `速度必须是 ${LOCAL_SCORE_PROJECT_MIN_TEMPO_BPM}–${LOCAL_SCORE_PROJECT_MAX_TEMPO_BPM} 之间的整数 BPM。`,
    );
  }
  if (
    normalizedTitle === project.title
    && tempoBpm === project.tempoBpm
  ) return project;
  return {
    ...project,
    title: normalizedTitle,
    tempoBpm,
    updatedAt: now,
    document: createDocumentRevision({
      project,
      content: getLocalScoreProjectContent(project),
    }),
  };
};

export const renameLocalScoreProject = ({
  project,
  expectedRevision,
  title,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  title: string;
  now: string;
}): LocalScoreProjectV1 =>
  changeLocalScoreProjectSettings({
    project,
    expectedRevision,
    title,
    tempoBpm: project.tempoBpm,
    now,
  });

export const changeLocalScoreProjectTempo = ({
  project,
  expectedRevision,
  tempoBpm,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  tempoBpm: number;
  now: string;
}): LocalScoreProjectV1 =>
  changeLocalScoreProjectSettings({
    project,
    expectedRevision,
    title: project.title,
    tempoBpm,
    now,
  });

export const changeLocalScoreProjectScoreCredits = ({
  project,
  expectedRevision,
  scoreCredits,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  scoreCredits: LocalScoreProjectScoreCreditsV1;
  now: string;
}): LocalScoreProjectV1 => {
  assertExpectedRevision(project, expectedRevision);
  assertMutationTimestamp(project, now);
  const normalizedScoreCredits = normalizeScoreCredits(scoreCredits);
  const content = getLocalScoreProjectContent(project);
  return applyLocalScoreProjectContent({
    project,
    expectedRevision,
    content: {
      ...content,
      scoreCredits: normalizedScoreCredits,
    },
    now,
  });
};

const normalizeProjectEvent = ({
  eventId,
  location,
  input,
}: {
  eventId: string;
  location: LocalScoreProjectEventLocation;
  input: LocalScoreProjectEventInput;
}): import("./scoreDocument").LocalScoreProjectEventV8 => {
  const augmentationDots = input.augmentationDots ?? 0;
  const normalizedLyric = input.lyric?.trim() || null;
  const normalizedChordSymbol = normalizeChordSymbol(input.chordSymbol ?? null);
  const normalizedDynamicMark = normalizeDynamicMark(input.dynamicMark ?? null);
  const normalizedDamperPedalMark = normalizeDamperPedalMark(
    input.damperPedalMark ?? null,
  );
  const normalizedFermataMark = normalizeFermataMark(input.fermataMark ?? null);
  if (
    input.type === "note"
    && normalizedLyric !== null
    && (
      Array.from(normalizedLyric).length > LOCAL_SCORE_PROJECT_MAX_LYRIC_CODE_POINTS
      || containsControlCharacter(normalizedLyric)
    )
  ) {
    throw new LocalScoreProjectDomainError(
      "invalid-input",
      `歌词不能包含控制字符，且最多 ${LOCAL_SCORE_PROJECT_MAX_LYRIC_CODE_POINTS} 个字符；未执行修改。`,
    );
  }
  if (input.type === "rest" && input.articulations !== undefined) {
    throw new LocalScoreProjectDomainError(
      "invalid-input",
      "休止符不能设置奏法；未执行修改。",
    );
  }
  const normalizedArticulations = input.type === "note"
    ? normalizeArticulations(input.articulations ?? [])
    : [];
  const event: import("./scoreDocument").LocalScoreProjectEventV8 = input.type === "note"
    ? {
      id: eventId,
      type: "note",
      pitch: input.pitch as NotationPitch,
      duration: input.duration,
      measure: location.measureNumber,
      augmentationDots,
      tieToNext: input.tieToNext ?? false,
      lyric: normalizedLyric,
      fingering: input.fingering ?? null,
      chordSymbol: normalizedChordSymbol,
      articulations: normalizedArticulations,
      dynamicMark: normalizedDynamicMark,
      damperPedalMark: normalizedDamperPedalMark,
      fermataMark: normalizedFermataMark,
    }
    : {
      id: eventId,
      type: "rest",
      pitch: null,
      duration: input.duration,
      measure: location.measureNumber,
      augmentationDots,
      chordSymbol: normalizedChordSymbol,
      dynamicMark: normalizedDynamicMark,
      damperPedalMark: normalizedDamperPedalMark,
      fermataMark: normalizedFermataMark,
    };
  if (!isValidScoreEvent(event, location.measureNumber)) {
    throw new LocalScoreProjectDomainError(
      "invalid-input",
      "音符或休止符内容无效，未执行修改。",
    );
  }
  return event;
};

const assertAllMeasuresFitMeter = (
  content: LocalScoreProjectContentV1,
  meter: NotationTimeSignature,
) => {
  const capacity = Number(meter.split("/")[0]);
  for (const part of content.parts) for (const staff of part.staves) {
    for (const voice of staff.voices) for (const measure of voice.measures) {
      const used = measure.events.reduce(
        (total, event) =>
          total + getLocalScoreProjectEventDurationBeats(event),
        0,
      );
      if (used > capacity) {
        throw new LocalScoreProjectDomainError(
          "measure-capacity",
          `改为 ${meter} 后第 ${measure.measureNumber} 小节会超过容量，未修改拍号；已保存谱面保持不变。`,
        );
      }
    }
  }
};

const sameEventLocation = (
  left: LocalScoreProjectEventLocation,
  right: LocalScoreProjectEventLocation,
) =>
  left.partId === right.partId
  && left.staffId === right.staffId
  && left.voiceId === right.voiceId
  && left.measureNumber === right.measureNumber;

const assertMeasureHasCapacity = ({
  events,
  event,
  meter,
  measureNumber,
  action,
}: {
  events: readonly LocalScoreProjectEventV8[];
  event: LocalScoreProjectEventV8;
  meter: NotationTimeSignature;
  measureNumber: number;
  action: "添加" | "修改" | "移动" | "粘贴";
}) => {
  const capacity = Number(meter.split("/")[0]);
  const used = events.reduce(
    (total, existing) =>
      total + getLocalScoreProjectEventDurationBeats(existing),
    0,
  );
  if (used + getLocalScoreProjectEventDurationBeats(event) > capacity) {
    throw new LocalScoreProjectDomainError(
      "measure-capacity",
      `第 ${measureNumber} 小节剩余拍数不足，未${action}事件；已保存谱面保持不变。`,
    );
  }
};

const updateEventsAtLocation = ({
  content,
  location,
  update,
}: {
  content: LocalScoreProjectContentV1;
  location: LocalScoreProjectEventLocation;
  update: (
    events: readonly LocalScoreProjectEventV8[],
  ) => readonly LocalScoreProjectEventV8[];
}): LocalScoreProjectContentV1 => {
  let matched = 0;
  const parts = content.parts.map((part) => ({
    ...part,
    staves: part.staves.map((staff) => ({
      ...staff,
      voices: staff.voices.map((voice) => ({
        ...voice,
        measures: voice.measures.map((measure) => {
          if (
            part.partId !== location.partId
            || staff.staffId !== location.staffId
            || voice.voiceId !== location.voiceId
            || measure.measureNumber !== location.measureNumber
          ) return measure;
          matched += 1;
          return { ...measure, events: update(measure.events) };
        }),
      })),
    })),
  }));
  if (matched !== 1) {
    throw new LocalScoreProjectDomainError(
      "not-found",
      "未找到唯一的目标声部或小节，未执行修改。",
    );
  }
  return { ...content, parts };
};

const updateMeasuresAtVoice = ({
  content,
  location,
  update,
}: {
  content: LocalScoreProjectContentV1;
  location: LocalScoreProjectVoiceLocation;
  update: (
    measures: LocalScoreProjectContentV1["parts"][number]["staves"][number]["voices"][number]["measures"],
  ) => LocalScoreProjectContentV1["parts"][number]["staves"][number]["voices"][number]["measures"];
}): LocalScoreProjectContentV1 => {
  let matched = 0;
  const parts = content.parts.map((part) => ({
    ...part,
    staves: part.staves.map((staff) => ({
      ...staff,
      voices: staff.voices.map((voice) => {
        if (
          part.partId !== location.partId
          || staff.staffId !== location.staffId
          || voice.voiceId !== location.voiceId
        ) return voice;
        matched += 1;
        return { ...voice, measures: update(voice.measures) };
      }),
    })),
  }));
  if (matched !== 1) {
    throw new LocalScoreProjectDomainError(
      "not-found",
      "未找到唯一的目标声部，未执行小节修改。",
    );
  }
  return { ...content, parts };
};

const assertValidStructureId = (
  value: string,
  structureName: "声部组" | "谱表" | "声部",
) => {
  if (!isValidId(value)) {
    throw new LocalScoreProjectDomainError(
      "invalid-input",
      `${structureName}标识无效，未执行修改。`,
    );
  }
};

const getEmptyMeasureTemplate = (
  voices: LocalScoreProjectContentV1["parts"][number]["staves"][number]["voices"],
) => {
  const measureNumbers = Array.from(new Set([
    1,
    ...voices.flatMap((voice) =>
      voice.measures.map((measure) => measure.measureNumber)),
  ]))
    .sort((left, right) => left - right);
  return measureNumbers.map((measureNumber) => ({
    measureNumber,
    events: [],
  }));
};

export const addLocalScoreProjectPart = ({
  project,
  expectedRevision,
  partId,
  staffId,
  voiceId,
  clef,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  partId: string;
  staffId: string;
  voiceId: string;
  clef: LocalScoreProjectClefV3;
  now: string;
}) => {
  assertExpectedRevision(project, expectedRevision);
  assertValidStructureId(partId, "声部组");
  assertValidStructureId(staffId, "谱表");
  assertValidStructureId(voiceId, "声部");
  if (!isLocalScoreProjectClef(clef)) {
    throw new LocalScoreProjectDomainError(
      "invalid-input",
      "谱号超出当前乐谱项目范围，未新增声部组。",
    );
  }
  const content = getLocalScoreProjectContent(project);
  if (content.parts.some((part) => part.partId === partId)) {
    throw new LocalScoreProjectDomainError(
      "duplicate",
      "声部组标识已存在，未新增声部组。",
    );
  }
  if (content.parts.some((part) =>
    part.staves.some((staff) => staff.staffId === staffId))) {
    throw new LocalScoreProjectDomainError(
      "duplicate",
      "谱表标识已存在，未新增声部组。",
    );
  }
  if (content.parts.some((part) => part.staves.some((staff) =>
    staff.voices.some((voice) => voice.voiceId === voiceId)))) {
    throw new LocalScoreProjectDomainError(
      "duplicate",
      "声部标识已存在，未新增声部组。",
    );
  }
  const voices = content.parts.flatMap((part) =>
    part.staves.flatMap((staff) => staff.voices));
  return applyLocalScoreProjectContent({
    project,
    expectedRevision,
    content: {
      ...content,
      parts: [
        ...content.parts,
        {
          partId,
          name: getDefaultPartName(content.parts),
          instrument: { kind: "unassigned" },
          staves: [{
            staffId,
            staffKind: "pitched",
            clef,
            voices: [{
              voiceId,
              measures: getEmptyMeasureTemplate(voices),
            }],
          }],
        },
      ],
    },
    now,
  });
};

export const changeLocalScoreProjectPartInstrument = ({
  project,
  expectedRevision,
  partId,
  instrument,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  partId: string;
  instrument: LocalScoreProjectPartInstrumentV1;
  now: string;
}) => {
  assertExpectedRevision(project, expectedRevision);
  assertValidStructureId(partId, "声部组");
  if (!isLocalScoreProjectPartInstrument(instrument)) {
    throw new LocalScoreProjectDomainError(
      "invalid-input",
      "谱面乐器归属无效，未执行修改。",
    );
  }
  const normalizedInstrument = clonePartInstrument(instrument);
  const content = getLocalScoreProjectContent(project);
  let matched = 0;
  const parts = content.parts.map((part) => {
    if (part.partId !== partId) return part;
    matched += 1;
    return { ...part, instrument: normalizedInstrument };
  });
  if (matched !== 1) {
    throw new LocalScoreProjectDomainError(
      "not-found",
      "未找到唯一的目标声部组，未修改乐器归属。",
    );
  }
  return applyLocalScoreProjectContent({
    project,
    expectedRevision,
    content: { ...content, parts },
    now,
  });
};

export const renameLocalScoreProjectPart = ({
  project,
  expectedRevision,
  partId,
  name,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  partId: string;
  name: string;
  now: string;
}) => {
  assertExpectedRevision(project, expectedRevision);
  assertValidStructureId(partId, "声部组");
  const normalizedName = normalizePartName(name);
  const content = getLocalScoreProjectContent(project);
  let matched = 0;
  const parts = content.parts.map((part) => {
    if (part.partId !== partId) return part;
    matched += 1;
    return { ...part, name: normalizedName };
  });
  if (matched !== 1) {
    throw new LocalScoreProjectDomainError(
      "not-found",
      "未找到唯一的目标声部组，未修改名称。",
    );
  }
  return applyLocalScoreProjectContent({
    project,
    expectedRevision,
    content: { ...content, parts },
    now,
  });
};

export const deleteEmptyLocalScoreProjectPart = ({
  project,
  expectedRevision,
  partId,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  partId: string;
  now: string;
}) => {
  assertExpectedRevision(project, expectedRevision);
  assertValidStructureId(partId, "声部组");
  const content = getLocalScoreProjectContent(project);
  const part = content.parts.find((candidate) =>
    candidate.partId === partId);
  if (!part) {
    throw new LocalScoreProjectDomainError(
      "not-found",
      "未找到唯一的目标声部组，未执行删除。",
    );
  }
  if (content.parts.length <= 1) {
    throw new LocalScoreProjectDomainError(
      "would-empty",
      "乐谱至少需要保留一个声部组，未执行删除。",
    );
  }
  if (part.staves.some((staff) => staff.voices.some((voice) =>
    voice.measures.some((measure) => measure.events.length > 0)))) {
    throw new LocalScoreProjectDomainError(
      "not-empty",
      "目标声部组仍有音符或休止符，未执行删除。",
    );
  }
  return applyLocalScoreProjectContent({
    project,
    expectedRevision,
    content: {
      ...content,
      parts: content.parts.filter((candidate) =>
        candidate.partId !== partId),
    },
    now,
  });
};

export const addLocalScoreProjectStaff = ({
  project,
  expectedRevision,
  partId,
  staffId,
  voiceId,
  clef,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  partId: string;
  staffId: string;
  voiceId: string;
  clef: LocalScoreProjectClefV3;
  now: string;
}) => {
  assertExpectedRevision(project, expectedRevision);
  assertValidStructureId(staffId, "谱表");
  assertValidStructureId(voiceId, "声部");
  if (!isLocalScoreProjectClef(clef)) {
    throw new LocalScoreProjectDomainError(
      "invalid-input",
      "谱号超出当前乐谱项目范围，未新增谱表。",
    );
  }
  const content = getLocalScoreProjectContent(project);
  if (content.parts.some((part) =>
    part.staves.some((staff) => staff.staffId === staffId))) {
    throw new LocalScoreProjectDomainError(
      "duplicate",
      "谱表标识已存在，未新增谱表。",
    );
  }
  if (content.parts.some((part) => part.staves.some((staff) =>
    staff.voices.some((voice) => voice.voiceId === voiceId)))) {
    throw new LocalScoreProjectDomainError(
      "duplicate",
      "声部标识已存在，未新增谱表。",
    );
  }
  let matched = 0;
  const parts = content.parts.map((part) => {
    if (part.partId !== partId) return part;
    matched += 1;
    const voices = part.staves.flatMap((staff) => staff.voices);
    return {
      ...part,
      staves: [
        ...part.staves,
        {
          staffId,
          staffKind: "pitched" as const,
          clef,
          voices: [{
            voiceId,
            measures: getEmptyMeasureTemplate(voices),
          }],
        },
      ],
    };
  });
  if (matched !== 1) {
    throw new LocalScoreProjectDomainError(
      "not-found",
      "未找到唯一的目标声部组，未新增谱表。",
    );
  }
  return applyLocalScoreProjectContent({
    project,
    expectedRevision,
    content: { ...content, parts },
    now,
  });
};

export const addLocalScoreProjectVoice = ({
  project,
  expectedRevision,
  location,
  voiceId,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  location: LocalScoreProjectStaffLocation;
  voiceId: string;
  now: string;
}) => {
  assertExpectedRevision(project, expectedRevision);
  assertValidStructureId(voiceId, "声部");
  const content = getLocalScoreProjectContent(project);
  if (content.parts.some((part) => part.staves.some((staff) =>
    staff.voices.some((voice) => voice.voiceId === voiceId)))) {
    throw new LocalScoreProjectDomainError(
      "duplicate",
      "声部标识已存在，未新增声部。",
    );
  }
  let matched = 0;
  const parts = content.parts.map((part) => ({
    ...part,
    staves: part.staves.map((staff) => {
      if (
        part.partId !== location.partId
        || staff.staffId !== location.staffId
      ) return staff;
      matched += 1;
      return {
        ...staff,
        voices: [
          ...staff.voices,
          {
            voiceId,
            measures: getEmptyMeasureTemplate(staff.voices),
          },
        ],
      };
    }),
  }));
  if (matched !== 1) {
    throw new LocalScoreProjectDomainError(
      "not-found",
      "未找到唯一的目标谱表，未新增声部。",
    );
  }
  return applyLocalScoreProjectContent({
    project,
    expectedRevision,
    content: { ...content, parts },
    now,
  });
};

export const deleteEmptyLocalScoreProjectVoice = ({
  project,
  expectedRevision,
  location,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  location: LocalScoreProjectVoiceLocation;
  now: string;
}) => {
  assertExpectedRevision(project, expectedRevision);
  const content = getLocalScoreProjectContent(project);
  let matched = 0;
  const parts = content.parts.map((part) => ({
    ...part,
    staves: part.staves.map((staff) => {
      if (
        part.partId !== location.partId
        || staff.staffId !== location.staffId
      ) return staff;
      const voice = staff.voices.find(
        (candidate) => candidate.voiceId === location.voiceId,
      );
      if (!voice) return staff;
      matched += 1;
      if (staff.voices.length <= 1) {
        throw new LocalScoreProjectDomainError(
          "would-empty",
          "谱表至少需要保留一个声部，未执行删除。",
        );
      }
      if (voice.measures.some((measure) => measure.events.length > 0)) {
        throw new LocalScoreProjectDomainError(
          "not-empty",
          "目标声部仍有音符或休止符，未执行删除。",
        );
      }
      return {
        ...staff,
        voices: staff.voices.filter(
          (candidate) => candidate.voiceId !== location.voiceId,
        ),
      };
    }),
  }));
  if (matched !== 1) {
    throw new LocalScoreProjectDomainError(
      "not-found",
      "未找到唯一的目标声部，未执行删除。",
    );
  }
  return applyLocalScoreProjectContent({
    project,
    expectedRevision,
    content: { ...content, parts },
    now,
  });
};

export const deleteEmptyLocalScoreProjectStaff = ({
  project,
  expectedRevision,
  location,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  location: LocalScoreProjectStaffLocation;
  now: string;
}) => {
  assertExpectedRevision(project, expectedRevision);
  const content = getLocalScoreProjectContent(project);
  let matched = 0;
  const parts = content.parts.map((part) => {
    if (part.partId !== location.partId) return part;
    const staff = part.staves.find(
      (candidate) => candidate.staffId === location.staffId,
    );
    if (!staff) return part;
    matched += 1;
    if (part.staves.length <= 1) {
      throw new LocalScoreProjectDomainError(
        "would-empty",
        "声部组至少需要保留一个谱表，未执行删除。",
      );
    }
    if (staff.voices.some((voice) =>
      voice.measures.some((measure) => measure.events.length > 0))) {
      throw new LocalScoreProjectDomainError(
        "not-empty",
        "目标谱表仍有音符或休止符，未执行删除。",
      );
    }
    return {
      ...part,
      staves: part.staves.filter(
        (candidate) => candidate.staffId !== location.staffId,
      ),
    };
  });
  if (matched !== 1) {
    throw new LocalScoreProjectDomainError(
      "not-found",
      "未找到唯一的目标谱表，未执行删除。",
    );
  }
  return applyLocalScoreProjectContent({
    project,
    expectedRevision,
    content: { ...content, parts },
    now,
  });
};

export const appendLocalScoreProjectMeasure = ({
  project,
  expectedRevision,
  partId,
  staffId,
  voiceId,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  partId: string;
  staffId: string;
  voiceId: string;
  now: string;
}) => {
  assertExpectedRevision(project, expectedRevision);
  const content = getLocalScoreProjectContent(project);
  const nextContent = updateMeasuresAtVoice({
    content,
    location: { partId, staffId, voiceId },
    update: (measures) => {
      const lastMeasure = measures.at(-1);
      if (!lastMeasure) {
        throw new LocalScoreProjectDomainError(
          "would-empty",
          "目标声部至少需要保留一个小节。",
        );
      }
      const nextMeasureNumber = lastMeasure.measureNumber + 1;
      if (!Number.isSafeInteger(nextMeasureNumber)) {
        throw new LocalScoreProjectDomainError(
          "invalid-input",
          "无法生成有效的下一小节编号。",
        );
      }
      if (measures.some((measure) =>
        measure.measureNumber === nextMeasureNumber)) {
        throw new LocalScoreProjectDomainError(
          "duplicate",
          "下一小节编号已存在，未执行追加。",
        );
      }
      return [
        ...measures,
        { measureNumber: nextMeasureNumber, events: [] },
      ];
    },
  });
  return applyLocalScoreProjectContent({
    project,
    expectedRevision,
    content: nextContent,
    now,
  });
};

export const deleteEmptyLocalScoreProjectMeasure = ({
  project,
  expectedRevision,
  partId,
  staffId,
  voiceId,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  partId: string;
  staffId: string;
  voiceId: string;
  now: string;
}) => {
  assertExpectedRevision(project, expectedRevision);
  const content = getLocalScoreProjectContent(project);
  const nextContent = updateMeasuresAtVoice({
    content,
    location: { partId, staffId, voiceId },
    update: (measures) => {
      if (measures.length <= 1) {
        throw new LocalScoreProjectDomainError(
          "would-empty",
          "目标声部至少需要保留一个小节，未执行删除。",
        );
      }
      const lastMeasure = measures.at(-1);
      if (!lastMeasure) {
        throw new LocalScoreProjectDomainError(
          "would-empty",
          "目标声部至少需要保留一个小节，未执行删除。",
        );
      }
      if (lastMeasure.events.length > 0) {
        throw new LocalScoreProjectDomainError(
          "not-empty",
          "最后一个小节仍有音符或休止符，未执行删除。",
        );
      }
      return measures.slice(0, -1);
    },
  });
  return applyLocalScoreProjectContent({
    project,
    expectedRevision,
    content: nextContent,
    now,
  });
};

export const addLocalScoreProjectEvent = ({
  project,
  expectedRevision,
  location,
  eventId,
  input,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  location: LocalScoreProjectEventLocation;
  eventId: string;
  input: LocalScoreProjectEventInput;
  now: string;
}) => {
  assertExpectedRevision(project, expectedRevision);
  if (!isValidId(eventId)) {
    throw new LocalScoreProjectDomainError(
      "invalid-input",
      "乐谱事件标识无效。",
    );
  }
  const content = getLocalScoreProjectContent(project);
  const hasDuplicate = content.parts.some((part) =>
    part.staves.some((staff) =>
      staff.voices.some((voice) =>
        voice.measures.some((measure) =>
          measure.events.some((event) => event.id === eventId)))));
  if (hasDuplicate) {
    throw new LocalScoreProjectDomainError(
      "duplicate",
      "乐谱事件标识重复，未执行修改。",
    );
  }
  const event = normalizeProjectEvent({ eventId, location, input });
  return applyLocalScoreProjectContent({
    project,
    expectedRevision,
    content: updateEventsAtLocation({
      content,
      location,
      update: (events) => {
        assertMeasureHasCapacity({
          events,
          event,
          meter: content.meter,
          measureNumber: location.measureNumber,
          action: "添加",
        });
        return [...events, event];
      },
    }),
    now,
  });
};

export const updateLocalScoreProjectEvent = ({
  project,
  expectedRevision,
  location,
  eventId,
  input,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  location: LocalScoreProjectEventLocation;
  eventId: string;
  input: LocalScoreProjectEventInput;
  now: string;
}) => {
  assertExpectedRevision(project, expectedRevision);
  const content = getLocalScoreProjectContent(project);
  const event = normalizeProjectEvent({ eventId, location, input });
  let found = false;
  const nextContent = updateEventsAtLocation({
    content,
    location,
    update: (events) => {
      const existing = events.find((candidate) => candidate.id === eventId);
      if (!existing) return events;
      found = true;
      assertMeasureHasCapacity({
        events: events.filter((candidate) => candidate.id !== eventId),
        event,
        meter: content.meter,
        measureNumber: location.measureNumber,
        action: "修改",
      });
      return events.map((candidate) =>
        candidate.id === eventId ? event : candidate);
    },
  });
  if (!found) {
    throw new LocalScoreProjectDomainError(
      "not-found",
      "未找到要修改的乐谱事件。",
    );
  }
  return applyLocalScoreProjectContent({
    project,
    expectedRevision,
    content: nextContent,
    now,
  });
};

export const changeLocalScoreProjectEventFingering = ({
  project,
  expectedRevision,
  location,
  eventId,
  fingering,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  location: LocalScoreProjectEventLocation;
  eventId: string;
  fingering: LocalScoreProjectFingeringV1 | null;
  now: string;
}) => {
  assertExpectedRevision(project, expectedRevision);
  if (
    fingering !== null
    && (
      !Number.isSafeInteger(fingering)
      || fingering < 1
      || fingering > 5
    )
  ) {
    throw new LocalScoreProjectDomainError(
      "invalid-input",
      "单音指法必须是 1–5，或清除为无指法；未执行修改。",
    );
  }
  const content = getLocalScoreProjectContent(project);
  let found = false;
  const nextContent = updateEventsAtLocation({
    content,
    location,
    update: (events) => events.map((event) => {
      if (event.id !== eventId) return event;
      found = true;
      if (event.type !== "note") {
        throw new LocalScoreProjectDomainError(
          "invalid-input",
          "休止符不能设置单音指法；未执行修改。",
        );
      }
      return { ...event, fingering };
    }),
  });
  if (!found) {
    throw new LocalScoreProjectDomainError(
      "not-found",
      "未找到要修改指法的音符。",
    );
  }
  return applyLocalScoreProjectContent({
    project,
    expectedRevision,
    content: nextContent,
    now,
  });
};

export const changeLocalScoreProjectEventChordSymbol = ({
  project,
  expectedRevision,
  location,
  eventId,
  chordSymbol,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  location: LocalScoreProjectEventLocation;
  eventId: string;
  chordSymbol: string | null;
  now: string;
}) => {
  assertExpectedRevision(project, expectedRevision);
  assertMutationTimestamp(project, now);
  const normalizedChordSymbol = normalizeChordSymbol(chordSymbol);
  const content = getLocalScoreProjectContent(project);
  let found = false;
  const nextContent = updateEventsAtLocation({
    content,
    location,
    update: (events) => events.map((event) => {
      if (event.id !== eventId) return event;
      found = true;
      return { ...event, chordSymbol: normalizedChordSymbol };
    }),
  });
  if (!found) {
    throw new LocalScoreProjectDomainError(
      "not-found",
      "未找到要修改和弦标记的乐谱事件。",
    );
  }
  return applyLocalScoreProjectContent({
    project,
    expectedRevision,
    content: nextContent,
    now,
  });
};

export const changeLocalScoreProjectEventArticulations = ({
  project,
  expectedRevision,
  location,
  eventId,
  articulations,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  location: LocalScoreProjectEventLocation;
  eventId: string;
  articulations: readonly LocalScoreProjectArticulationV1[];
  now: string;
}) => {
  assertExpectedRevision(project, expectedRevision);
  assertMutationTimestamp(project, now);
  const normalizedArticulations = normalizeArticulations(articulations);
  const content = getLocalScoreProjectContent(project);
  let found = false;
  const nextContent = updateEventsAtLocation({
    content,
    location,
    update: (events) => events.map((event) => {
      if (event.id !== eventId) return event;
      found = true;
      if (event.type !== "note") {
        throw new LocalScoreProjectDomainError(
          "invalid-input",
          "休止符不能设置奏法；未执行修改。",
        );
      }
      return {
        ...event,
        articulations: [...normalizedArticulations],
      };
    }),
  });
  if (!found) {
    throw new LocalScoreProjectDomainError(
      "not-found",
      "未找到要修改奏法的音符。",
    );
  }
  return applyLocalScoreProjectContent({
    project,
    expectedRevision,
    content: nextContent,
    now,
  });
};

export const changeLocalScoreProjectEventDynamicMark = ({
  project,
  expectedRevision,
  location,
  eventId,
  dynamicMark,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  location: LocalScoreProjectEventLocation;
  eventId: string;
  dynamicMark: LocalScoreProjectDynamicMarkV1 | null;
  now: string;
}) => {
  assertExpectedRevision(project, expectedRevision);
  assertMutationTimestamp(project, now);
  const normalizedDynamicMark = normalizeDynamicMark(dynamicMark);
  const content = getLocalScoreProjectContent(project);
  let found = false;
  const nextContent = updateEventsAtLocation({
    content,
    location,
    update: (events) => events.map((event) => {
      if (event.id !== eventId) return event;
      found = true;
      return { ...event, dynamicMark: normalizedDynamicMark };
    }),
  });
  if (!found) {
    throw new LocalScoreProjectDomainError(
      "not-found",
      "未找到要修改力度记号的乐谱事件。",
    );
  }
  return applyLocalScoreProjectContent({
    project,
    expectedRevision,
    content: nextContent,
    now,
  });
};

export const changeLocalScoreProjectEventDamperPedalMark = ({
  project,
  expectedRevision,
  location,
  eventId,
  damperPedalMark,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  location: LocalScoreProjectEventLocation;
  eventId: string;
  damperPedalMark: LocalScoreProjectDamperPedalMarkV1 | null;
  now: string;
}) => {
  assertExpectedRevision(project, expectedRevision);
  assertMutationTimestamp(project, now);
  const normalized = normalizeDamperPedalMark(damperPedalMark);
  const content = getLocalScoreProjectContent(project);
  let found = false;
  const nextContent = updateEventsAtLocation({
    content,
    location,
    update: (events) => events.map((event) => {
      if (event.id !== eventId) return event;
      found = true;
      return { ...event, damperPedalMark: normalized };
    }),
  });
  if (!found) {
    throw new LocalScoreProjectDomainError(
      "not-found",
      "未找到要修改制音踏板记号的乐谱事件。",
    );
  }
  return applyLocalScoreProjectContent({
    project,
    expectedRevision,
    content: nextContent,
    now,
  });
};

export const changeLocalScoreProjectEventFermataMark = ({
  project,
  expectedRevision,
  location,
  eventId,
  fermataMark,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  location: LocalScoreProjectEventLocation;
  eventId: string;
  fermataMark: LocalScoreProjectFermataMarkV1 | null;
  now: string;
}) => {
  assertExpectedRevision(project, expectedRevision);
  assertMutationTimestamp(project, now);
  const normalized = normalizeFermataMark(fermataMark);
  const content = getLocalScoreProjectContent(project);
  let found = false;
  const nextContent = updateEventsAtLocation({
    content,
    location,
    update: (events) => events.map((event) => {
      if (event.id !== eventId) return event;
      found = true;
      return { ...event, fermataMark: normalized };
    }),
  });
  if (!found) {
    throw new LocalScoreProjectDomainError(
      "not-found",
      "未找到要修改延长记号的乐谱事件。",
    );
  }
  return applyLocalScoreProjectContent({
    project,
    expectedRevision,
    content: nextContent,
    now,
  });
};

const assertEventIsNotTieParticipant = (
  content: LocalScoreProjectContentV1,
  eventId: string,
  action: "移动" | "删除",
) => {
  for (const part of content.parts) {
    for (const staff of part.staves) {
      for (const voice of staff.voices) {
        const events = voice.measures.flatMap((measure) => measure.events);
        const index = events.findIndex((event) => event.id === eventId);
        const current = events[index];
        const previous = events[index - 1];
        if (
          index >= 0
          && (
            (current?.type === "note" && current.tieToNext)
            || (
              previous?.type === "note"
              && previous.tieToNext
            )
          )
        ) {
          throw new LocalScoreProjectDomainError(
            "tie-integrity",
            `该音符属于延音线连接，请先取消延音线再${action}；未执行修改，已保存谱面保持不变。`,
          );
        }
      }
    }
  }
};

export const moveLocalScoreProjectEvent = ({
  project,
  expectedRevision,
  source,
  destination,
  eventId,
  targetIndex,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  source: LocalScoreProjectEventLocation;
  destination: LocalScoreProjectEventLocation;
  eventId: string;
  targetIndex?: number;
  now: string;
}) => {
  assertExpectedRevision(project, expectedRevision);
  if (!isValidId(eventId)) {
    throw new LocalScoreProjectDomainError(
      "invalid-input",
      "乐谱事件标识无效。",
    );
  }
  if (
    targetIndex !== undefined
    && (!Number.isSafeInteger(targetIndex) || targetIndex < 0)
  ) {
    throw new LocalScoreProjectDomainError(
      "invalid-input",
      "目标事件位置无效，未执行移动。",
    );
  }

  const content = getLocalScoreProjectContent(project);
  assertEventIsNotTieParticipant(content, eventId, "移动");
  let movedEvent: LocalScoreProjectEventV8 | undefined;
  const withoutSource = updateEventsAtLocation({
    content,
    location: source,
    update: (events) => {
      const sourceIndex = events.findIndex((event) => event.id === eventId);
      if (sourceIndex < 0) return events;
      movedEvent = events[sourceIndex];
      return [
        ...events.slice(0, sourceIndex),
        ...events.slice(sourceIndex + 1),
      ];
    },
  });
  if (!movedEvent) {
    throw new LocalScoreProjectDomainError(
      "not-found",
      "未在来源位置找到要移动的乐谱事件。",
    );
  }

  const movedToDestination: LocalScoreProjectEventV8 = {
    ...movedEvent,
    measure: destination.measureNumber,
  };
  const nextContent = updateEventsAtLocation({
    content: withoutSource,
    location: destination,
    update: (events) => {
      if (!sameEventLocation(source, destination)) {
        assertMeasureHasCapacity({
          events,
          event: movedToDestination,
          meter: content.meter,
          measureNumber: destination.measureNumber,
          action: "移动",
        });
      }
      const insertionIndex = targetIndex ?? events.length;
      if (insertionIndex > events.length) {
        throw new LocalScoreProjectDomainError(
          "invalid-input",
          "目标事件位置超出当前小节范围，未执行移动。",
        );
      }
      return [
        ...events.slice(0, insertionIndex),
        movedToDestination,
        ...events.slice(insertionIndex),
      ];
    },
  });
  return applyLocalScoreProjectContent({
    project,
    expectedRevision,
    content: nextContent,
    now,
  });
};

export const copyLocalScoreProjectEvent = ({
  project,
  location,
  eventId,
}: {
  project: LocalScoreProjectV1;
  location: LocalScoreProjectEventLocation;
  eventId: string;
}): LocalScoreProjectEventInput => {
  let copied: LocalScoreProjectEventV8 | undefined;
  updateEventsAtLocation({
    content: getLocalScoreProjectContent(project),
    location,
    update: (events) => {
      copied = events.find((event) => event.id === eventId);
      return events;
    },
  });
  if (!copied) {
    throw new LocalScoreProjectDomainError(
      "not-found",
      "未找到要复制的乐谱事件。",
    );
  }
  return copied.type === "rest"
    ? {
      type: "rest",
      pitch: null,
      duration: "quarter",
      augmentationDots: copied.augmentationDots,
      chordSymbol: copied.chordSymbol,
      dynamicMark: copied.dynamicMark,
      damperPedalMark: "damperPedalMark" in copied
        ? copied.damperPedalMark
        : null,
      fermataMark: "fermataMark" in copied ? copied.fermataMark : null,
    }
    : {
      type: "note",
      pitch: copied.pitch,
      duration: copied.duration,
      augmentationDots: copied.augmentationDots,
      tieToNext: false,
      lyric: copied.lyric,
      fingering: copied.fingering,
      chordSymbol: copied.chordSymbol,
      articulations: [...copied.articulations],
      dynamicMark: copied.dynamicMark,
      damperPedalMark: "damperPedalMark" in copied
        ? copied.damperPedalMark
        : null,
      fermataMark: "fermataMark" in copied ? copied.fermataMark : null,
    };
};

export const pasteLocalScoreProjectEvent = ({
  project,
  expectedRevision,
  destination,
  targetIndex,
  eventId,
  input,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  destination: LocalScoreProjectEventLocation;
  targetIndex?: number;
  eventId: string;
  input: LocalScoreProjectEventInput;
  now: string;
}) => {
  assertExpectedRevision(project, expectedRevision);
  if (
    targetIndex !== undefined
    && (!Number.isSafeInteger(targetIndex) || targetIndex < 0)
  ) {
    throw new LocalScoreProjectDomainError(
      "invalid-input",
      "目标事件位置无效，未执行粘贴。",
    );
  }
  const content = getLocalScoreProjectContent(project);
  if (content.parts.some((part) => part.staves.some((staff) =>
    staff.voices.some((voice) => voice.measures.some((measure) =>
      measure.events.some((event) => event.id === eventId)))))) {
    throw new LocalScoreProjectDomainError(
      "duplicate",
      "乐谱事件标识重复，未执行粘贴。",
    );
  }
  const pasted = normalizeProjectEvent({
    eventId,
    location: destination,
    input,
  });
  const nextContent = updateEventsAtLocation({
    content,
    location: destination,
    update: (events) => {
      assertMeasureHasCapacity({
        events,
        event: pasted,
        meter: content.meter,
        measureNumber: destination.measureNumber,
        action: "粘贴",
      });
      const insertionIndex = targetIndex ?? events.length;
      if (insertionIndex > events.length) {
        throw new LocalScoreProjectDomainError(
          "invalid-input",
          "目标事件位置超出当前小节范围，未执行粘贴。",
        );
      }
      return [
        ...events.slice(0, insertionIndex),
        pasted,
        ...events.slice(insertionIndex),
      ];
    },
  });
  return applyLocalScoreProjectContent({
    project,
    expectedRevision,
    content: nextContent,
    now,
  });
};

export const deleteLocalScoreProjectEvent = ({
  project,
  expectedRevision,
  location,
  eventId,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  location: LocalScoreProjectEventLocation;
  eventId: string;
  now: string;
}) => {
  assertExpectedRevision(project, expectedRevision);
  const content = getLocalScoreProjectContent(project);
  assertEventIsNotTieParticipant(content, eventId, "删除");
  let found = false;
  const nextContent = updateEventsAtLocation({
    content,
    location,
    update: (events) => events.filter((event) => {
      if (event.id !== eventId) return true;
      found = true;
      return false;
    }),
  });
  if (!found) {
    throw new LocalScoreProjectDomainError(
      "not-found",
      "未找到要删除的乐谱事件。",
    );
  }
  return applyLocalScoreProjectContent({
    project,
    expectedRevision,
    content: nextContent,
    now,
  });
};

export const changeLocalScoreProjectMeter = ({
  project,
  expectedRevision,
  meter,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  meter: NotationTimeSignature;
  now: string;
}) => {
  if (!isAllowedTimeSignature(meter)) {
    throw new LocalScoreProjectDomainError(
      "invalid-input",
      "拍号超出当前乐谱项目范围。",
    );
  }
  const content = getLocalScoreProjectContent(project);
  assertAllMeasuresFitMeter(content, meter);
  return applyLocalScoreProjectContent({
    project,
    expectedRevision,
    content: { ...content, meter },
    now,
  });
};

export const changeLocalScoreProjectClef = ({
  project,
  expectedRevision,
  location,
  clef,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  location: LocalScoreProjectStaffLocation;
  clef: LocalScoreProjectClefV3;
  now: string;
}) => {
  assertExpectedRevision(project, expectedRevision);
  if (!isLocalScoreProjectClef(clef)) {
    throw new LocalScoreProjectDomainError(
      "invalid-input",
      "谱号超出当前乐谱项目范围。",
    );
  }
  const content = getLocalScoreProjectContent(project);
  let matched = 0;
  const parts = content.parts.map((part) => ({
    ...part,
    staves: part.staves.map((staff) => {
      if (
        part.partId !== location.partId
        || staff.staffId !== location.staffId
      ) return staff;
      matched += 1;
      return { ...staff, clef };
    }),
  }));
  if (matched !== 1) {
    throw new LocalScoreProjectDomainError(
      "not-found",
      "未找到唯一的目标谱表，未修改谱号。",
    );
  }
  return applyLocalScoreProjectContent({
    project,
    expectedRevision,
    content: { ...content, parts },
    now,
  });
};

export const changeLocalScoreProjectKeySignature = ({
  project,
  expectedRevision,
  keySignature,
  now,
}: {
  project: LocalScoreProjectV1;
  expectedRevision: number;
  keySignature: LocalScoreProjectKeySignatureV3;
  now: string;
}) => {
  assertExpectedRevision(project, expectedRevision);
  if (!isLocalScoreProjectKeySignature(keySignature)) {
    throw new LocalScoreProjectDomainError(
      "invalid-input",
      "调号超出当前乐谱项目范围。",
    );
  }
  const content = getLocalScoreProjectContent(project);
  return applyLocalScoreProjectContent({
    project,
    expectedRevision,
    content: {
      ...content,
      keySignature: { ...keySignature },
    },
    now,
  });
};

const isLocalNotationProjectDocument = (
  value: unknown,
  projectId: string,
): value is LocalNotationProjectScoreDocumentV12 => {
  if (!isRecord(value)) return false;
  return (
    value.schemaVersion === "score-document-v12"
    && value.documentKind === "notation-project"
    && value.documentId === `local.score-project.${projectId}`
    && Number.isSafeInteger(value.revision)
    && (value.revision as number) >= 1
    && value.reviewState === "draft"
    && value.localOnly === true
    && value.sessionOnly === false
    && isRecord(value.source)
    && value.source.kind === "local-score-project"
    && value.source.projectId === projectId
    && isLocalScoreProjectContent(value)
    && hasValidLocalScoreProjectTies(value)
  );
};

const migratePartsWithDefaultFingerings = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map((part) =>
      isRecord(part) && Array.isArray(part.staves)
        ? {
          ...part,
          staves: part.staves.map((staff) =>
            isRecord(staff) && Array.isArray(staff.voices)
              ? {
                ...staff,
                voices: staff.voices.map((voice) =>
                  isRecord(voice) && Array.isArray(voice.measures)
                    ? {
                      ...voice,
                      measures: voice.measures.map((measure) =>
                        isRecord(measure) && Array.isArray(measure.events)
                          ? {
                            ...measure,
                            events: measure.events.map((event) =>
                              isRecord(event) && event.type === "note"
                                ? {
                                  ...event,
                                  fingering: null,
                                  chordSymbol: null,
                                  articulations: [],
                                  dynamicMark: null,
                                  damperPedalMark: null,
                                }
                                : isRecord(event)
                                  ? {
                                    ...event,
                                    chordSymbol: null,
                                    dynamicMark: null,
                                  damperPedalMark: null,
                                  }
                                  : event),
                          }
                          : measure),
                    }
                    : voice),
              }
              : staff),
        }
        : part)
    : value;

const migratePartsWithDefaultChordSymbols = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map((part) =>
      isRecord(part) && Array.isArray(part.staves)
        ? {
          ...part,
          staves: part.staves.map((staff) =>
            isRecord(staff) && Array.isArray(staff.voices)
              ? {
                ...staff,
                voices: staff.voices.map((voice) =>
                  isRecord(voice) && Array.isArray(voice.measures)
                    ? {
                      ...voice,
                      measures: voice.measures.map((measure) =>
                        isRecord(measure) && Array.isArray(measure.events)
                          ? {
                            ...measure,
                            events: measure.events.map((event) =>
                              isRecord(event) && event.type === "note"
                                ? {
                                  ...event,
                                  chordSymbol: null,
                                  articulations: [],
                                  dynamicMark: null,
                                  damperPedalMark: null,
                                }
                                : isRecord(event)
                                  ? {
                                    ...event,
                                    chordSymbol: null,
                                    dynamicMark: null,
                                  damperPedalMark: null,
                                  }
                                  : event),
                          }
                          : measure),
                    }
                    : voice),
              }
              : staff),
        }
        : part)
    : value;

const migratePartsWithDefaultArticulations = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map((part) =>
      isRecord(part) && Array.isArray(part.staves)
        ? {
          ...part,
          staves: part.staves.map((staff) =>
            isRecord(staff) && Array.isArray(staff.voices)
              ? {
                ...staff,
                voices: staff.voices.map((voice) =>
                  isRecord(voice) && Array.isArray(voice.measures)
                    ? {
                      ...voice,
                      measures: voice.measures.map((measure) =>
                        isRecord(measure) && Array.isArray(measure.events)
                          ? {
                            ...measure,
                            events: measure.events.map((event) =>
                              isRecord(event) && event.type === "note"
                                ? {
                                  ...event,
                                  articulations: [],
                                  dynamicMark: null,
                                  damperPedalMark: null,
                                }
                                : isRecord(event)
                                  ? {
                                    ...event,
                                    dynamicMark: null,
                                    damperPedalMark: null,
                                  }
                                  : event),
                          }
                          : measure),
                    }
                    : voice),
              }
              : staff),
        }
        : part)
    : value;

const migratePartsWithDefaultDynamicMarks = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map((part) =>
      isRecord(part) && Array.isArray(part.staves)
        ? {
          ...part,
          staves: part.staves.map((staff) =>
            isRecord(staff) && Array.isArray(staff.voices)
              ? {
                ...staff,
                voices: staff.voices.map((voice) =>
                  isRecord(voice) && Array.isArray(voice.measures)
                    ? {
                      ...voice,
                      measures: voice.measures.map((measure) =>
                        isRecord(measure) && Array.isArray(measure.events)
                          ? {
                            ...measure,
                            events: measure.events.map((event) =>
                              isRecord(event)
                                ? {
                                  ...event,
                                  dynamicMark: null,
                                  damperPedalMark: null,
                                }
                                : event),
                          }
                          : measure),
                    }
                    : voice),
              }
              : staff),
        }
        : part)
    : value;

const migratePartsWithDefaultDamperPedalMarks = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map((part) =>
      isRecord(part) && Array.isArray(part.staves)
        ? {
          ...part,
          staves: part.staves.map((staff) =>
            isRecord(staff) && Array.isArray(staff.voices)
              ? {
                ...staff,
                voices: staff.voices.map((voice) =>
                  isRecord(voice) && Array.isArray(voice.measures)
                    ? {
                      ...voice,
                      measures: voice.measures.map((measure) =>
                        isRecord(measure) && Array.isArray(measure.events)
                          ? {
                            ...measure,
                            events: measure.events.map((event) =>
                              isRecord(event)
                                ? {
                                  ...event,
                                  damperPedalMark: null,
                                  fermataMark: null,
                                }
                                : event),
                          }
                          : measure),
                    }
                    : voice),
              }
              : staff),
        }
        : part)
    : value;

const migratePartsWithDefaultFermataMarks = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map((part) =>
      isRecord(part) && Array.isArray(part.staves)
        ? {
          ...part,
          staves: part.staves.map((staff) =>
            isRecord(staff) && Array.isArray(staff.voices)
              ? {
                ...staff,
                voices: staff.voices.map((voice) =>
                  isRecord(voice) && Array.isArray(voice.measures)
                    ? {
                      ...voice,
                      measures: voice.measures.map((measure) =>
                        isRecord(measure) && Array.isArray(measure.events)
                          ? {
                            ...measure,
                            events: measure.events.map((event) =>
                              isRecord(event)
                                ? { ...event, fermataMark: null }
                                : event),
                          }
                          : measure),
                    }
                    : voice),
              }
              : staff),
        }
        : part)
    : value;

const migrateLegacyLocalScoreProjectContent = (
  value: unknown,
  projectTitle: string,
): LocalScoreProjectContentV1 | null => {
  if (!isRecord(value) || !isAllowedTimeSignature(value.meter)) return null;
  if (!Array.isArray(value.parts) || value.parts.length === 0) return null;
  try {
    const migrated: LocalScoreProjectContentV1 = {
      scoreCredits: createDefaultScoreCredits(projectTitle),
      meter: value.meter,
      keySignature: { fifths: 0 },
      parts: value.parts.map((partValue, partIndex) => {
        if (!isRecord(partValue) || !isValidId(partValue.partId)
          || !Array.isArray(partValue.staves) || partValue.staves.length === 0) {
          throw new Error("invalid part");
        }
        return {
          partId: partValue.partId,
          name: getMigratedPartName(partIndex),
          instrument: { kind: "unassigned" },
          staves: partValue.staves.map((staffValue) => {
            if (
              !isRecord(staffValue)
              || !isValidId(staffValue.staffId)
              || staffValue.staffKind !== "pitched"
              || staffValue.clef !== "treble"
              || !Array.isArray(staffValue.voices)
              || staffValue.voices.length === 0
            ) throw new Error("invalid staff");
            return {
              staffId: staffValue.staffId,
              staffKind: "pitched" as const,
              clef: "treble" as const,
              voices: staffValue.voices.map((voiceValue) => {
                if (
                  !isRecord(voiceValue)
                  || !isValidId(voiceValue.voiceId)
                  || !Array.isArray(voiceValue.measures)
                  || voiceValue.measures.length === 0
                ) throw new Error("invalid voice");
                return {
                  voiceId: voiceValue.voiceId,
                  measures: voiceValue.measures.map((measureValue) => {
                    if (
                      !isRecord(measureValue)
                      || !Number.isSafeInteger(measureValue.measureNumber)
                      || (measureValue.measureNumber as number) < 1
                      || !Array.isArray(measureValue.events)
                    ) throw new Error("invalid measure");
                    const measureNumber = measureValue.measureNumber as number;
                    return {
                      measureNumber,
                      events: measureValue.events.map((eventValue) => {
                        if (
                          !isRecord(eventValue)
                          || !isValidId(eventValue.id)
                          || (eventValue.type !== "note"
                            && eventValue.type !== "rest")
                          || !isAllowedDuration(eventValue.duration)
                          || !Number.isSafeInteger(eventValue.measure)
                          || eventValue.measure !== measureNumber
                          || (
                            eventValue.type === "note"
                            && !isAllowedPitch(eventValue.pitch)
                          )
                          || (
                            eventValue.type === "rest"
                            && (
                              eventValue.pitch !== null
                              || eventValue.duration !== "quarter"
                            )
                          )
                        ) throw new Error("invalid event");
                        return eventValue.type === "note"
                          ? {
                            id: eventValue.id,
                            type: "note" as const,
                            pitch: eventValue.pitch as NotationPitch,
                            duration: eventValue.duration,
                            measure: measureNumber,
                            augmentationDots: 0 as const,
                            tieToNext: false,
                            lyric: null,
                            fingering: null,
                            chordSymbol: null,
                            articulations: [],
                            dynamicMark: null,
                            damperPedalMark: null,
                            fermataMark: null,
                          }
                          : {
                            id: eventValue.id,
                            type: "rest" as const,
                            pitch: null,
                            duration: "quarter" as const,
                            measure: measureNumber,
                            augmentationDots: 0 as const,
                            chordSymbol: null,
                            dynamicMark: null,
                            damperPedalMark: null,
                            fermataMark: null,
                          };
                      }),
                    };
                  }),
                };
              }),
            };
          }),
        };
      }),
    };
    return isLocalScoreProjectContent(migrated)
      && hasValidLocalScoreProjectTies(migrated)
      ? migrated
      : null;
  } catch {
    return null;
  }
};

const migratePreviousLocalScoreProjectContent = (
  value: unknown,
  projectTitle: string,
): LocalScoreProjectContentV1 | null => {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.parts)) return null;
  const migrated: unknown = {
    scoreCredits: createDefaultScoreCredits(projectTitle),
    meter: value.meter,
    keySignature: { fifths: 0 },
    parts: migratePartsWithDefaultFermataMarks(
      migratePartsWithDefaultFingerings(
      value.parts.map((part, index) =>
        isRecord(part)
          ? {
            ...part,
            name: getMigratedPartName(index),
            instrument: { kind: "unassigned" },
          }
          : part),
      ),
    ),
  };
  if (
    !isLocalScoreProjectContent(migrated)
    || !hasValidLocalScoreProjectTies(migrated)
    || migrated.parts.some((part) =>
      part.staves.some((staff) => staff.clef !== "treble"))
  ) return null;
  return cloneLocalScoreProjectContent(migrated);
};

const migrateStorageV4LocalScoreProjectContent = (
  value: unknown,
  projectTitle: string,
): LocalScoreProjectContentV1 | null => {
  if (!isRecord(value) || !Array.isArray(value.parts)) return null;
  const migrated: unknown = {
    scoreCredits: createDefaultScoreCredits(projectTitle),
    meter: value.meter,
    keySignature: value.keySignature,
    parts: migratePartsWithDefaultFermataMarks(
      migratePartsWithDefaultFingerings(
      value.parts.map((part, index) =>
        isRecord(part)
          ? {
            ...part,
            name: getMigratedPartName(index),
            instrument: { kind: "unassigned" },
          }
          : part),
      ),
    ),
  };
  if (
    !isLocalScoreProjectContent(migrated)
    || !hasValidLocalScoreProjectTies(migrated)
  ) return null;
  return cloneLocalScoreProjectContent(migrated);
};

const migrateStorageV5LocalScoreProjectContent = (
  value: unknown,
  projectTitle: string,
): LocalScoreProjectContentV1 | null => {
  if (!isRecord(value) || !Array.isArray(value.parts)) return null;
  const migrated: unknown = {
    scoreCredits: createDefaultScoreCredits(projectTitle),
    meter: value.meter,
    keySignature: value.keySignature,
    parts: migratePartsWithDefaultFermataMarks(
      migratePartsWithDefaultFingerings(
      value.parts.map((part) =>
        isRecord(part)
          ? { ...part, instrument: { kind: "unassigned" } }
          : part),
      ),
    ),
  };
  if (
    !isLocalScoreProjectContent(migrated)
    || !hasValidLocalScoreProjectTies(migrated)
  ) return null;
  return cloneLocalScoreProjectContent(migrated);
};

const migrateStorageV6LocalScoreProjectContent = (
  value: unknown,
  projectTitle: string,
): LocalScoreProjectContentV1 | null => {
  if (!isRecord(value)) return null;
  const migrated: unknown = {
    ...value,
    scoreCredits: createDefaultScoreCredits(projectTitle),
    parts: migratePartsWithDefaultFermataMarks(
      migratePartsWithDefaultFingerings(value.parts),
    ),
  };
  if (
    !isLocalScoreProjectContent(migrated)
    || !hasValidLocalScoreProjectTies(migrated)
  ) return null;
  return cloneLocalScoreProjectContent(migrated);
};

const migrateStorageV7LocalScoreProjectContent = (
  value: unknown,
  _projectTitle: string,
): LocalScoreProjectContentV1 | null => {
  if (!isRecord(value)) return null;
  const migrated: unknown = {
    ...value,
    parts: migratePartsWithDefaultFermataMarks(
      migratePartsWithDefaultFingerings(value.parts),
    ),
  };
  if (
    !isLocalScoreProjectContent(migrated)
    || !hasValidLocalScoreProjectTies(migrated)
  ) return null;
  return cloneLocalScoreProjectContent(migrated);
};

const migrateStorageV8LocalScoreProjectContent = (
  value: unknown,
  _projectTitle: string,
): LocalScoreProjectContentV1 | null => {
  if (!isRecord(value)) return null;
  const migrated: unknown = {
    ...value,
    parts: migratePartsWithDefaultFermataMarks(
      migratePartsWithDefaultChordSymbols(value.parts),
    ),
  };
  if (
    !isLocalScoreProjectContent(migrated)
    || !hasValidLocalScoreProjectTies(migrated)
  ) return null;
  return cloneLocalScoreProjectContent(migrated);
};

const migrateStorageV9LocalScoreProjectContent = (
  value: unknown,
  _projectTitle: string,
): LocalScoreProjectContentV1 | null => {
  if (!isRecord(value)) return null;
  const migrated: unknown = {
    ...value,
    parts: migratePartsWithDefaultFermataMarks(
      migratePartsWithDefaultArticulations(value.parts),
    ),
  };
  if (
    !isLocalScoreProjectContent(migrated)
    || !hasValidLocalScoreProjectTies(migrated)
  ) return null;
  return cloneLocalScoreProjectContent(migrated);
};

const migrateStorageV10LocalScoreProjectContent = (
  value: unknown,
  _projectTitle: string,
): LocalScoreProjectContentV1 | null => {
  if (!isRecord(value)) return null;
  const migrated: unknown = {
    ...value,
    parts: migratePartsWithDefaultFermataMarks(
      migratePartsWithDefaultDynamicMarks(value.parts),
    ),
  };
  if (
    !isLocalScoreProjectContent(migrated)
    || !hasValidLocalScoreProjectTies(migrated)
  ) return null;
  return cloneLocalScoreProjectContent(migrated);
};

const migrateStorageV11LocalScoreProjectContent = (
  value: unknown,
  _projectTitle: string,
): LocalScoreProjectContentV1 | null => {
  if (!isRecord(value)) return null;
  const migrated: unknown = {
    ...value,
    parts: migratePartsWithDefaultDamperPedalMarks(value.parts),
  };
  if (
    !isLocalScoreProjectContent(migrated)
    || !hasValidLocalScoreProjectTies(migrated)
  ) return null;
  return cloneLocalScoreProjectContent(migrated);
};

const migrateStorageV12LocalScoreProjectContent = (
  value: unknown,
  _projectTitle: string,
): LocalScoreProjectContentV1 | null => {
  if (!isRecord(value)) return null;
  const migrated: unknown = {
    ...value,
    parts: migratePartsWithDefaultFermataMarks(value.parts),
  };
  if (
    !isLocalScoreProjectContent(migrated)
    || !hasValidLocalScoreProjectTies(migrated)
  ) return null;
  return cloneLocalScoreProjectContent(migrated);
};

const isLegacyDocumentEnvelope = (
  value: Record<string, unknown>,
  projectId: string,
  schemaVersion:
    | "score-document-v1"
    | "score-document-v2"
    | "score-document-v3"
    | "score-document-v4"
    | "score-document-v5"
    | "score-document-v6"
    | "score-document-v7"
    | "score-document-v8"
    | "score-document-v9"
    | "score-document-v10"
    | "score-document-v11",
) =>
  value.schemaVersion === schemaVersion
  && value.documentKind === "notation-project"
  && value.documentId === `local.score-project.${projectId}`
  && Number.isSafeInteger(value.revision)
  && (value.revision as number) >= 1
  && value.reviewState === "draft"
  && value.localOnly === true
  && value.sessionOnly === false
  && isRecord(value.source)
  && value.source.kind === "local-score-project"
  && value.source.projectId === projectId;

const migrateLegacyLocalNotationProjectDocument = (
  value: unknown,
  projectId: string,
  projectTitle: string,
): LocalNotationProjectScoreDocumentV12 | null => {
  if (
    !isRecord(value)
    || !isLegacyDocumentEnvelope(value, projectId, "score-document-v1")
  ) return null;
  const content = migrateLegacyLocalScoreProjectContent(value, projectTitle);
  if (!content) return null;
  return {
    schemaVersion: "score-document-v12",
    documentKind: "notation-project",
    documentId: value.documentId as string,
    revision: value.revision as number,
    reviewState: "draft",
    localOnly: true,
    sessionOnly: false,
    source: { kind: "local-score-project", projectId },
    ...content,
  };
};

const migratePreviousLocalNotationProjectDocument = (
  value: unknown,
  projectId: string,
  projectTitle: string,
): LocalNotationProjectScoreDocumentV12 | null => {
  if (
    !isRecord(value)
    || !isLegacyDocumentEnvelope(value, projectId, "score-document-v2")
  ) return null;
  const content = migratePreviousLocalScoreProjectContent(value, projectTitle);
  if (!content) return null;
  return {
    schemaVersion: "score-document-v12",
    documentKind: "notation-project",
    documentId: value.documentId as string,
    revision: value.revision as number,
    reviewState: "draft",
    localOnly: true,
    sessionOnly: false,
    source: { kind: "local-score-project", projectId },
    ...content,
  };
};

const migrateStorageV4LocalNotationProjectDocument = (
  value: unknown,
  projectId: string,
  projectTitle: string,
): LocalNotationProjectScoreDocumentV12 | null => {
  if (
    !isRecord(value)
    || !isLegacyDocumentEnvelope(value, projectId, "score-document-v3")
  ) return null;
  const content = migrateStorageV4LocalScoreProjectContent(value, projectTitle);
  if (!content) return null;
  return {
    schemaVersion: "score-document-v12",
    documentKind: "notation-project",
    documentId: value.documentId as string,
    revision: value.revision as number,
    reviewState: "draft",
    localOnly: true,
    sessionOnly: false,
    source: { kind: "local-score-project", projectId },
    ...content,
  };
};

const migrateStorageV5LocalNotationProjectDocument = (
  value: unknown,
  projectId: string,
  projectTitle: string,
): LocalNotationProjectScoreDocumentV12 | null => {
  if (
    !isRecord(value)
    || !isLegacyDocumentEnvelope(value, projectId, "score-document-v4")
  ) return null;
  const content = migrateStorageV5LocalScoreProjectContent(value, projectTitle);
  if (!content) return null;
  return {
    schemaVersion: "score-document-v12",
    documentKind: "notation-project",
    documentId: value.documentId as string,
    revision: value.revision as number,
    reviewState: "draft",
    localOnly: true,
    sessionOnly: false,
    source: { kind: "local-score-project", projectId },
    ...content,
  };
};

const migrateStorageV6LocalNotationProjectDocument = (
  value: unknown,
  projectId: string,
  projectTitle: string,
): LocalNotationProjectScoreDocumentV12 | null => {
  if (
    !isRecord(value)
    || !isLegacyDocumentEnvelope(value, projectId, "score-document-v5")
  ) return null;
  const content = migrateStorageV6LocalScoreProjectContent(value, projectTitle);
  if (!content) return null;
  return {
    schemaVersion: "score-document-v12",
    documentKind: "notation-project",
    documentId: value.documentId as string,
    revision: value.revision as number,
    reviewState: "draft",
    localOnly: true,
    sessionOnly: false,
    source: { kind: "local-score-project", projectId },
    ...content,
  };
};

const migrateStorageV7LocalNotationProjectDocument = (
  value: unknown,
  projectId: string,
  projectTitle: string,
): LocalNotationProjectScoreDocumentV12 | null => {
  if (
    !isRecord(value)
    || !isLegacyDocumentEnvelope(value, projectId, "score-document-v6")
  ) return null;
  const content = migrateStorageV7LocalScoreProjectContent(value, projectTitle);
  if (!content) return null;
  return {
    schemaVersion: "score-document-v12",
    documentKind: "notation-project",
    documentId: value.documentId as string,
    revision: value.revision as number,
    reviewState: "draft",
    localOnly: true,
    sessionOnly: false,
    source: { kind: "local-score-project", projectId },
    ...content,
  };
};

const migrateStorageV8LocalNotationProjectDocument = (
  value: unknown,
  projectId: string,
  projectTitle: string,
): LocalNotationProjectScoreDocumentV12 | null => {
  if (
    !isRecord(value)
    || !isLegacyDocumentEnvelope(value, projectId, "score-document-v7")
  ) return null;
  const content = migrateStorageV8LocalScoreProjectContent(value, projectTitle);
  if (!content) return null;
  return {
    schemaVersion: "score-document-v12",
    documentKind: "notation-project",
    documentId: value.documentId as string,
    revision: value.revision as number,
    reviewState: "draft",
    localOnly: true,
    sessionOnly: false,
    source: { kind: "local-score-project", projectId },
    ...content,
  };
};

const migrateStorageV9LocalNotationProjectDocument = (
  value: unknown,
  projectId: string,
  projectTitle: string,
): LocalNotationProjectScoreDocumentV12 | null => {
  if (
    !isRecord(value)
    || !isLegacyDocumentEnvelope(value, projectId, "score-document-v8")
  ) return null;
  const content = migrateStorageV9LocalScoreProjectContent(value, projectTitle);
  if (!content) return null;
  return {
    schemaVersion: "score-document-v12",
    documentKind: "notation-project",
    documentId: value.documentId as string,
    revision: value.revision as number,
    reviewState: "draft",
    localOnly: true,
    sessionOnly: false,
    source: { kind: "local-score-project", projectId },
    ...content,
  };
};

const migrateStorageV10LocalNotationProjectDocument = (
  value: unknown,
  projectId: string,
  projectTitle: string,
): LocalNotationProjectScoreDocumentV12 | null => {
  if (
    !isRecord(value)
    || !isLegacyDocumentEnvelope(value, projectId, "score-document-v9")
  ) return null;
  const content = migrateStorageV10LocalScoreProjectContent(value, projectTitle);
  if (!content) return null;
  return {
    schemaVersion: "score-document-v12",
    documentKind: "notation-project",
    documentId: value.documentId as string,
    revision: value.revision as number,
    reviewState: "draft",
    localOnly: true,
    sessionOnly: false,
    source: { kind: "local-score-project", projectId },
    ...content,
  };
};

const migrateStorageV11LocalNotationProjectDocument = (
  value: unknown,
  projectId: string,
  projectTitle: string,
): LocalNotationProjectScoreDocumentV11 | null => {
  if (
    !isRecord(value)
    || !isLegacyDocumentEnvelope(value, projectId, "score-document-v10")
  ) return null;
  const content = migrateStorageV11LocalScoreProjectContent(value, projectTitle);
  if (!content) return null;
  return {
    schemaVersion: "score-document-v11",
    documentKind: "notation-project",
    documentId: value.documentId as string,
    revision: value.revision as number,
    reviewState: "draft",
    localOnly: true,
    sessionOnly: false,
    source: { kind: "local-score-project", projectId },
    ...content,
  };
};

const migrateStorageV12LocalNotationProjectDocument = (
  value: unknown,
  projectId: string,
  projectTitle: string,
): LocalNotationProjectScoreDocumentV12 | null => {
  if (
    !isRecord(value)
    || !isLegacyDocumentEnvelope(value, projectId, "score-document-v11")
  ) return null;
  const content = migrateStorageV12LocalScoreProjectContent(value, projectTitle);
  if (!content) return null;
  return {
    schemaVersion: "score-document-v12",
    documentKind: "notation-project",
    documentId: value.documentId as string,
    revision: value.revision as number,
    reviewState: "draft",
    localOnly: true,
    sessionOnly: false,
    source: { kind: "local-score-project", projectId },
    ...content,
  };
};

export const parseLocalScoreProject = (
  value: unknown,
): LocalScoreProjectV1 | null => {
  if (
    !isRecord(value)
    || (
      value.schemaVersion !== LOCAL_SCORE_PROJECT_SCHEMA_VERSION
      && value.schemaVersion !== LOCAL_SCORE_PROJECT_PREVIOUS_SCHEMA_VERSION
      && value.schemaVersion !== LOCAL_SCORE_PROJECT_V11_SCHEMA_VERSION
      && value.schemaVersion !== LOCAL_SCORE_PROJECT_V10_SCHEMA_VERSION
      && value.schemaVersion !== LOCAL_SCORE_PROJECT_V9_SCHEMA_VERSION
      && value.schemaVersion !== LOCAL_SCORE_PROJECT_V8_SCHEMA_VERSION
      && value.schemaVersion !== LOCAL_SCORE_PROJECT_V7_SCHEMA_VERSION
      && value.schemaVersion !== LOCAL_SCORE_PROJECT_V6_SCHEMA_VERSION
      && value.schemaVersion !== LOCAL_SCORE_PROJECT_V5_SCHEMA_VERSION
      && value.schemaVersion !== LOCAL_SCORE_PROJECT_V4_SCHEMA_VERSION
      && value.schemaVersion !== LOCAL_SCORE_PROJECT_V3_SCHEMA_VERSION
      && value.schemaVersion !== LOCAL_SCORE_PROJECT_V2_SCHEMA_VERSION
      && value.schemaVersion !== LOCAL_SCORE_PROJECT_LEGACY_SCHEMA_VERSION
    )
    || !isValidId(value.projectId)
    || typeof value.title !== "string"
    || value.title.length === 0
    || value.title.length > LOCAL_SCORE_PROJECT_MAX_TITLE_LENGTH
    || !isValidIsoDate(value.createdAt)
    || !isValidIsoDate(value.updatedAt)
    || Date.parse(value.updatedAt) < Date.parse(value.createdAt)
  ) return null;
  if (
    !Array.isArray(value.undoStack)
    || value.undoStack.length > LOCAL_SCORE_PROJECT_MAX_HISTORY
    || !Array.isArray(value.redoStack)
    || value.redoStack.length > LOCAL_SCORE_PROJECT_MAX_HISTORY
  ) return null;
  const tempoBpm = value.schemaVersion === LOCAL_SCORE_PROJECT_LEGACY_SCHEMA_VERSION
    ? LOCAL_SCORE_PROJECT_DEFAULT_TEMPO_BPM
    : value.tempoBpm;
  if (
    !Number.isSafeInteger(tempoBpm)
    || (tempoBpm as number) < LOCAL_SCORE_PROJECT_MIN_TEMPO_BPM
    || (tempoBpm as number) > LOCAL_SCORE_PROJECT_MAX_TEMPO_BPM
  ) return null;
  if (value.schemaVersion === LOCAL_SCORE_PROJECT_SCHEMA_VERSION) {
    if (
      !isLocalNotationProjectDocument(value.document, value.projectId)
      || !value.undoStack.every((content) =>
        isLocalScoreProjectContent(content)
        && hasValidLocalScoreProjectTies(content))
      || !value.redoStack.every((content) =>
        isLocalScoreProjectContent(content)
        && hasValidLocalScoreProjectTies(content))
    ) return null;
    return cloneLocalScoreProject({
      ...value,
      tempoBpm,
    } as LocalScoreProjectV1);
  }
  const isStorageV10 =
    value.schemaVersion === LOCAL_SCORE_PROJECT_V10_SCHEMA_VERSION;
  const isStorageV12 =
    value.schemaVersion === LOCAL_SCORE_PROJECT_PREVIOUS_SCHEMA_VERSION;
  const isStorageV11 =
    value.schemaVersion === LOCAL_SCORE_PROJECT_V11_SCHEMA_VERSION;
  const isStorageV9 =
    value.schemaVersion === LOCAL_SCORE_PROJECT_V9_SCHEMA_VERSION;
  const isStorageV8 =
    value.schemaVersion === LOCAL_SCORE_PROJECT_V8_SCHEMA_VERSION;
  const isStorageV7 =
    value.schemaVersion === LOCAL_SCORE_PROJECT_V7_SCHEMA_VERSION;
  const isStorageV6 =
    value.schemaVersion === LOCAL_SCORE_PROJECT_V6_SCHEMA_VERSION;
  const isStorageV5 =
    value.schemaVersion === LOCAL_SCORE_PROJECT_V5_SCHEMA_VERSION;
  const isStorageV4 =
    value.schemaVersion === LOCAL_SCORE_PROJECT_V4_SCHEMA_VERSION;
  const isStorageV3 =
    value.schemaVersion === LOCAL_SCORE_PROJECT_V3_SCHEMA_VERSION;
  const migrateDocument = isStorageV12
    ? migrateStorageV12LocalNotationProjectDocument
    : isStorageV11
    ? migrateStorageV11LocalNotationProjectDocument
    : isStorageV10
    ? migrateStorageV10LocalNotationProjectDocument
    : isStorageV9
      ? migrateStorageV9LocalNotationProjectDocument
    : isStorageV8
      ? migrateStorageV8LocalNotationProjectDocument
      : isStorageV7
      ? migrateStorageV7LocalNotationProjectDocument
      : isStorageV6
      ? migrateStorageV6LocalNotationProjectDocument
      : isStorageV5
      ? migrateStorageV5LocalNotationProjectDocument
      : isStorageV4
        ? migrateStorageV4LocalNotationProjectDocument
        : isStorageV3
          ? migratePreviousLocalNotationProjectDocument
          : migrateLegacyLocalNotationProjectDocument;
  const migrateContent = isStorageV12
    ? migrateStorageV12LocalScoreProjectContent
    : isStorageV11
    ? migrateStorageV11LocalScoreProjectContent
    : isStorageV10
    ? migrateStorageV10LocalScoreProjectContent
    : isStorageV9
      ? migrateStorageV9LocalScoreProjectContent
    : isStorageV8
      ? migrateStorageV8LocalScoreProjectContent
      : isStorageV7
      ? migrateStorageV7LocalScoreProjectContent
      : isStorageV6
      ? migrateStorageV6LocalScoreProjectContent
      : isStorageV5
      ? migrateStorageV5LocalScoreProjectContent
      : isStorageV4
        ? migrateStorageV4LocalScoreProjectContent
        : isStorageV3
          ? migratePreviousLocalScoreProjectContent
          : migrateLegacyLocalScoreProjectContent;
  const document = migrateDocument(
    value.document,
    value.projectId,
    value.title,
  );
  const undoStack = value.undoStack.map((content) =>
    migrateContent(content, value.title as string));
  const redoStack = value.redoStack.map((content) =>
    migrateContent(content, value.title as string));
  if (
    !document
    || undoStack.some((content) => content === null)
    || redoStack.some((content) => content === null)
  ) return null;
  return cloneLocalScoreProject({
    schemaVersion: LOCAL_SCORE_PROJECT_SCHEMA_VERSION,
    projectId: value.projectId,
    title: value.title,
    tempoBpm: tempoBpm as number,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    document: document as unknown as LocalNotationProjectScoreDocumentV12,
    undoStack: undoStack as readonly LocalScoreProjectContentV1[],
    redoStack: redoStack as readonly LocalScoreProjectContentV1[],
  });
};

export const cloneLocalScoreProject = (
  project: LocalScoreProjectV1,
): LocalScoreProjectV1 => ({
  ...project,
  document: {
    ...project.document,
    source: { ...project.document.source },
    ...cloneLocalScoreProjectContent(project.document),
  },
  undoStack: project.undoStack.map(cloneLocalScoreProjectContent),
  redoStack: project.redoStack.map(cloneLocalScoreProjectContent),
});

export const serializeLocalScoreProject = (project: LocalScoreProjectV1) => {
  const parsed = parseLocalScoreProject(project);
  if (!parsed) throw new Error("乐谱项目结构无效，无法保存。");
  return JSON.stringify(parsed);
};

export const deserializeLocalScoreProject = (serialized: string) => {
  try {
    return parseLocalScoreProject(JSON.parse(serialized));
  } catch {
    return null;
  }
};
