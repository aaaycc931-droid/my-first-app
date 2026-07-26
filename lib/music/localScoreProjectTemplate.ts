import {
  LOCAL_SCORE_PROJECT_MAX_PART_NAME_CODE_POINTS,
  LOCAL_SCORE_PROJECT_MAX_TEMPO_BPM,
  LOCAL_SCORE_PROJECT_MIN_TEMPO_BPM,
  createLocalScoreProject,
  isLocalScoreProjectPartInstrument,
  parseLocalScoreProject,
  type LocalScoreProjectV1,
} from "./localScoreProject";
import type {
  LocalScoreProjectClefV3,
  LocalScoreProjectKeySignatureV3,
  LocalScoreProjectPartInstrumentV1,
} from "./scoreDocument";
import {
  isAllowedTimeSignature,
  type NotationTimeSignature,
} from "../practice/localNotationFragmentDraft";

export type LocalScoreProjectTemplateCategory =
  | "blank"
  | "keyboard"
  | "chamber"
  | "vocal";

export type LocalScoreProjectTemplateStaffV1 = Readonly<{
  staffKind: "pitched";
  clef: LocalScoreProjectClefV3;
  voiceCount: number;
}>;

export type LocalScoreProjectTemplatePartV1 = Readonly<{
  name: string;
  instrument: LocalScoreProjectPartInstrumentV1;
  staves: readonly LocalScoreProjectTemplateStaffV1[];
}>;

export type LocalScoreProjectTemplateV1 = Readonly<{
  id: string;
  version: 1;
  category: LocalScoreProjectTemplateCategory;
  displayName: string;
  summary: string;
  meter: NotationTimeSignature;
  keySignature: LocalScoreProjectKeySignatureV3;
  tempoBpm: number;
  parts: readonly LocalScoreProjectTemplatePartV1[];
}>;

export type LocalScoreProjectTemplateStructureKind =
  | "part"
  | "staff"
  | "voice";

export class LocalScoreProjectTemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalScoreProjectTemplateError";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasExactKeys = (
  value: Record<string, unknown>,
  keys: readonly string[],
) => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
};

const containsControlCharacter = (value: string) =>
  Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f);
  });

const isCanonicalText = (
  value: unknown,
  maxCodePoints: number,
): value is string =>
  typeof value === "string"
  && value === value.trim()
  && value.length > 0
  && Array.from(value).length <= maxCodePoints
  && !containsControlCharacter(value);

const isTemplateCategory = (
  value: unknown,
): value is LocalScoreProjectTemplateCategory =>
  value === "blank"
  || value === "keyboard"
  || value === "chamber"
  || value === "vocal";

const isTemplateStaff = (
  value: unknown,
): value is LocalScoreProjectTemplateStaffV1 =>
  isRecord(value)
  && hasExactKeys(value, ["staffKind", "clef", "voiceCount"])
  && value.staffKind === "pitched"
  && (value.clef === "treble" || value.clef === "bass")
  && Number.isSafeInteger(value.voiceCount)
  && (value.voiceCount as number) >= 1
  && (value.voiceCount as number) <= 4;

const isTemplatePart = (
  value: unknown,
): value is LocalScoreProjectTemplatePartV1 =>
  isRecord(value)
  && hasExactKeys(value, ["name", "instrument", "staves"])
  && isCanonicalText(value.name, LOCAL_SCORE_PROJECT_MAX_PART_NAME_CODE_POINTS)
  && isLocalScoreProjectPartInstrument(value.instrument)
  && Array.isArray(value.staves)
  && value.staves.length >= 1
  && value.staves.length <= 4
  && value.staves.every(isTemplateStaff);

export const isLocalScoreProjectTemplate = (
  value: unknown,
): value is LocalScoreProjectTemplateV1 =>
  isRecord(value)
  && hasExactKeys(value, [
    "id",
    "version",
    "category",
    "displayName",
    "summary",
    "meter",
    "keySignature",
    "tempoBpm",
    "parts",
  ])
  && isCanonicalText(value.id, 128)
  && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.id as string)
  && value.version === 1
  && isTemplateCategory(value.category)
  && isCanonicalText(value.displayName, 40)
  && isCanonicalText(value.summary, 120)
  && isAllowedTimeSignature(value.meter)
  && isRecord(value.keySignature)
  && hasExactKeys(value.keySignature, ["fifths"])
  && (
    value.keySignature.fifths === -1
    || value.keySignature.fifths === 0
    || value.keySignature.fifths === 1
  )
  && Number.isSafeInteger(value.tempoBpm)
  && (value.tempoBpm as number) >= LOCAL_SCORE_PROJECT_MIN_TEMPO_BPM
  && (value.tempoBpm as number) <= LOCAL_SCORE_PROJECT_MAX_TEMPO_BPM
  && Array.isArray(value.parts)
  && value.parts.length >= 1
  && value.parts.length <= 12
  && value.parts.every(isTemplatePart);

const freezeDeep = <T>(value: T): T => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  Object.values(value as Record<string, unknown>).forEach(freezeDeep);
  return Object.freeze(value);
};

const gm = (program: number): LocalScoreProjectPartInstrumentV1 => ({
  kind: "gm1-program",
  program,
});
const unassigned = (): LocalScoreProjectPartInstrumentV1 => ({
  kind: "unassigned",
});
const staff = (
  clef: LocalScoreProjectClefV3,
  voiceCount = 1,
): LocalScoreProjectTemplateStaffV1 => ({
  staffKind: "pitched",
  clef,
  voiceCount,
});
const part = (
  name: string,
  instrument: LocalScoreProjectPartInstrumentV1,
  staves: readonly LocalScoreProjectTemplateStaffV1[],
): LocalScoreProjectTemplatePartV1 => ({ name, instrument, staves });
const piano = (name = "钢琴") =>
  part(name, gm(0), [staff("treble"), staff("bass")]);
const violin = (name = "小提琴") =>
  part(name, gm(40), [staff("treble")]);
const viola = (name = "中提琴") =>
  part(name, gm(41), [staff("treble")]);
const cello = (name = "大提琴") =>
  part(name, gm(42), [staff("bass")]);
const flute = (name = "长笛") =>
  part(name, gm(73), [staff("treble")]);
const vocal = (name: string, clef: LocalScoreProjectClefV3 = "treble") =>
  part(name, unassigned(), [staff(clef)]);

const template = (
  id: string,
  category: LocalScoreProjectTemplateCategory,
  displayName: string,
  summary: string,
  parts: readonly LocalScoreProjectTemplatePartV1[],
): LocalScoreProjectTemplateV1 => ({
  id,
  version: 1,
  category,
  displayName,
  summary,
  meter: "4/4",
  keySignature: { fifths: 0 },
  tempoBpm: 90,
  parts,
});

const definitions: readonly LocalScoreProjectTemplateV1[] = [
  template(
    "blank-treble-staff-v1",
    "blank",
    "空白高音五线谱",
    "一个未指定乐器的高音谱表，适合从单旋律开始。",
    [part("声部组 1", unassigned(), [staff("treble")])],
  ),
  template(
    "blank-bass-staff-v1",
    "blank",
    "空白低音五线谱",
    "一个未指定乐器的低音谱表，适合低音旋律与低声部。",
    [part("声部组 1", unassigned(), [staff("bass")])],
  ),
  template(
    "piano-v1",
    "keyboard",
    "钢琴",
    "一个钢琴声部组，包含高音与低音两个五线谱表。",
    [piano()],
  ),
  template(
    "piano-four-voice-writing-v1",
    "keyboard",
    "钢琴四声部写作",
    "钢琴高低音谱表各含两个空声部，适合复调与和声写作。",
    [part("钢琴", gm(0), [staff("treble", 2), staff("bass", 2)])],
  ),
  template(
    "two-pianos-v1",
    "keyboard",
    "双钢琴",
    "两组独立钢琴大谱表，适合双钢琴编制。",
    [piano("第一钢琴"), piano("第二钢琴")],
  ),
  template(
    "piano-violin-v1",
    "chamber",
    "钢琴与小提琴",
    "钢琴大谱表与一个小提琴高音谱表。",
    [piano(), violin()],
  ),
  template(
    "piano-viola-v1",
    "chamber",
    "钢琴与中提琴",
    "钢琴大谱表与一个中提琴高音谱表。",
    [piano(), viola()],
  ),
  template(
    "piano-cello-v1",
    "chamber",
    "钢琴与大提琴",
    "钢琴大谱表与一个大提琴低音谱表。",
    [piano(), cello()],
  ),
  template(
    "piano-flute-v1",
    "chamber",
    "钢琴与长笛",
    "钢琴大谱表与一个长笛高音谱表。",
    [piano(), flute()],
  ),
  template(
    "piano-trio-v1",
    "chamber",
    "钢琴三重奏",
    "钢琴、小提琴与大提琴的三声部组编制。",
    [piano(), violin(), cello()],
  ),
  template(
    "string-duo-v1",
    "chamber",
    "弦乐二重奏",
    "小提琴与大提琴的高低声部组合。",
    [violin(), cello()],
  ),
  template(
    "string-trio-v1",
    "chamber",
    "弦乐三重奏",
    "小提琴、中提琴与大提琴的三声部组编制。",
    [violin(), viola(), cello()],
  ),
  template(
    "string-quartet-v1",
    "chamber",
    "弦乐四重奏",
    "两把小提琴、中提琴与大提琴的四声部组编制。",
    [violin("第一小提琴"), violin("第二小提琴"), viola(), cello()],
  ),
  template(
    "flute-violin-v1",
    "chamber",
    "长笛与小提琴",
    "长笛与小提琴的两个高音五线谱表。",
    [flute(), violin()],
  ),
  template(
    "flute-cello-v1",
    "chamber",
    "长笛与大提琴",
    "长笛高音谱表与大提琴低音谱表。",
    [flute(), cello()],
  ),
  template(
    "flute-string-trio-v1",
    "chamber",
    "长笛与弦乐三重奏",
    "长笛、小提琴、中提琴与大提琴的四声部组编制。",
    [flute(), violin(), viola(), cello()],
  ),
  template(
    "piano-string-quartet-v1",
    "chamber",
    "钢琴与弦乐四重奏",
    "钢琴大谱表与完整弦乐四重奏编制。",
    [
      piano(),
      violin("第一小提琴"),
      violin("第二小提琴"),
      viola(),
      cello(),
    ],
  ),
  template(
    "solo-vocal-piano-v1",
    "vocal",
    "独唱与钢琴",
    "一个未指定音色的独唱声部组与钢琴大谱表。",
    [vocal("独唱"), piano()],
  ),
  template(
    "two-vocals-piano-v1",
    "vocal",
    "双声部声乐与钢琴",
    "两个独立声乐高音谱表与钢琴大谱表。",
    [vocal("第一声部"), vocal("第二声部"), piano()],
  ),
  template(
    "chamber-quintet-v1",
    "chamber",
    "长笛弦乐五重奏",
    "长笛、两把小提琴、中提琴与大提琴的五声部组编制。",
    [
      flute(),
      violin("第一小提琴"),
      violin("第二小提琴"),
      viola(),
      cello(),
    ],
  ),
] as const;

if (
  definitions.length < 18
  || !definitions.every(isLocalScoreProjectTemplate)
  || new Set(definitions.map((candidate) => candidate.id)).size
    !== definitions.length
  || new Set(definitions.map((candidate) => candidate.displayName)).size
    !== definitions.length
) {
  throw new Error("本机谱项目模板 registry 无效。");
}

export const LOCAL_SCORE_PROJECT_TEMPLATES:
  readonly LocalScoreProjectTemplateV1[] =
  freezeDeep([...definitions]);

const templatesById = new Map(
  LOCAL_SCORE_PROJECT_TEMPLATES.map((candidate) =>
    [candidate.id, candidate] as const),
);

export const getLocalScoreProjectTemplate = (
  templateId: string,
): LocalScoreProjectTemplateV1 | null =>
  templatesById.get(templateId) ?? null;

const createCanonicalStructureId = ({
  kind,
  createStructureId,
}: {
  kind: LocalScoreProjectTemplateStructureKind;
  createStructureId: (
    kind: LocalScoreProjectTemplateStructureKind,
  ) => string;
}) => {
  let token: unknown;
  try {
    token = createStructureId(kind);
  } catch {
    throw new LocalScoreProjectTemplateError(
      "无法生成模板谱面结构标识，未创建项目。",
    );
  }
  if (
    typeof token !== "string"
    || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(token)
  ) {
    throw new LocalScoreProjectTemplateError(
      "模板谱面结构标识无效，未创建项目。",
    );
  }
  const id = `${kind}-${token}`;
  if (id.length > 128) {
    throw new LocalScoreProjectTemplateError(
      "模板谱面结构标识过长，未创建项目。",
    );
  }
  return id;
};

export const createLocalScoreProjectFromTemplate = ({
  projectId,
  title,
  templateId,
  now,
  createStructureId,
}: {
  projectId: string;
  title: string;
  templateId: string;
  now: string;
  createStructureId: (
    kind: LocalScoreProjectTemplateStructureKind,
  ) => string;
}): LocalScoreProjectV1 => {
  const selected = getLocalScoreProjectTemplate(templateId);
  if (!selected) {
    throw new LocalScoreProjectTemplateError(
      "未找到可用的本机谱项目模板，未创建项目。",
    );
  }
  if (typeof createStructureId !== "function") {
    throw new LocalScoreProjectTemplateError(
      "模板谱面结构标识生成器不可用，未创建项目。",
    );
  }
  const generatedIds = new Set<string>();
  const nextId = (kind: LocalScoreProjectTemplateStructureKind) => {
    const id = createCanonicalStructureId({ kind, createStructureId });
    if (generatedIds.has(id)) {
      throw new LocalScoreProjectTemplateError(
        "模板谱面结构标识重复，未创建项目。",
      );
    }
    generatedIds.add(id);
    return id;
  };

  const base = createLocalScoreProject({ projectId, title, now });
  const candidate: unknown = {
    ...base,
    tempoBpm: selected.tempoBpm,
    document: {
      ...base.document,
      meter: selected.meter,
      keySignature: { ...selected.keySignature },
      parts: selected.parts.map((templatePart) => ({
        partId: nextId("part"),
        name: templatePart.name,
        instrument: templatePart.instrument.kind === "unassigned"
          ? { kind: "unassigned" }
          : {
            kind: "gm1-program",
            program: templatePart.instrument.program,
          },
        staves: templatePart.staves.map((templateStaff) => ({
          staffId: nextId("staff"),
          staffKind: "pitched",
          clef: templateStaff.clef,
          voices: Array.from(
            { length: templateStaff.voiceCount },
            () => ({
              voiceId: nextId("voice"),
              measures: [{ measureNumber: 1, events: [] }],
            }),
          ),
        })),
      })),
    },
  };
  const project = parseLocalScoreProject(candidate);
  if (!project) {
    throw new LocalScoreProjectTemplateError(
      "模板无法生成有效的本机谱项目，未创建项目。",
    );
  }
  return project;
};
