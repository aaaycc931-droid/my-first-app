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
  ScoreDocumentEventV1,
} from "./scoreDocument";

export const LOCAL_SCORE_PROJECT_LEGACY_SCHEMA_VERSION =
  "local-score-project-storage-v1" as const;
export const LOCAL_SCORE_PROJECT_SCHEMA_VERSION =
  "local-score-project-storage-v2" as const;
export const LOCAL_SCORE_PROJECT_MAX_HISTORY = 50;
export const LOCAL_SCORE_PROJECT_MAX_TITLE_LENGTH = 80;
export const LOCAL_SCORE_PROJECT_DEFAULT_TEMPO_BPM = 90;
export const LOCAL_SCORE_PROJECT_MIN_TEMPO_BPM = 30;
export const LOCAL_SCORE_PROJECT_MAX_TEMPO_BPM = 240;

export type LocalScoreProjectContentV1 = Readonly<
  Pick<LocalNotationProjectScoreDocumentV1, "meter" | "parts">
>;

export type LocalScoreProjectV2 = Readonly<{
  schemaVersion: typeof LOCAL_SCORE_PROJECT_SCHEMA_VERSION;
  projectId: string;
  title: string;
  tempoBpm: number;
  createdAt: string;
  updatedAt: string;
  document: LocalNotationProjectScoreDocumentV1;
  undoStack: readonly LocalScoreProjectContentV1[];
  redoStack: readonly LocalScoreProjectContentV1[];
}>;

export type LocalScoreProjectV1 = LocalScoreProjectV2;

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
  | "not-found"
  | "not-empty"
  | "would-empty";

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
}>;

export type LocalScoreProjectVoiceLocation = Readonly<{
  partId: string;
  staffId: string;
  voiceId: string;
}>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isValidId = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 128;

const isValidIsoDate = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    && new Date(timestamp).toISOString() === value;
};

const cloneEvent = (event: ScoreDocumentEventV1): ScoreDocumentEventV1 => ({
  ...event,
});

export const cloneLocalScoreProjectContent = (
  content: LocalScoreProjectContentV1,
): LocalScoreProjectContentV1 => ({
  meter: content.meter,
  parts: content.parts.map((part) => ({
    partId: part.partId,
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
): value is ScoreDocumentEventV1 => {
  if (!isRecord(value) || !isValidId(value.id)) return false;
  if (
    value.type !== "note"
    && value.type !== "rest"
  ) return false;
  if (!isAllowedDuration(value.duration)) return false;
  if (value.type === "note" && !isAllowedPitch(value.pitch)) return false;
  if (value.type === "rest" && value.pitch !== null) return false;
  if (
    !Number.isSafeInteger(value.measure)
    || (value.measure as number) < 1
    || value.measure !== measureNumber
  ) return false;
  return value.type !== "rest" || value.duration === "quarter";
};

export const isLocalScoreProjectContent = (
  value: unknown,
): value is LocalScoreProjectContentV1 => {
  if (!isRecord(value) || !isAllowedTimeSignature(value.meter)) return false;
  if (!Array.isArray(value.parts) || value.parts.length === 0) return false;

  const partIds: string[] = [];
  const staffIds: string[] = [];
  const voiceIds: string[] = [];
  const eventIds: string[] = [];

  for (const part of value.parts) {
    if (!isRecord(part) || !isValidId(part.partId)) return false;
    if (!Array.isArray(part.staves) || part.staves.length === 0) return false;
    partIds.push(part.partId);

    for (const staff of part.staves) {
      if (
        !isRecord(staff)
        || !isValidId(staff.staffId)
        || staff.staffKind !== "pitched"
        || staff.clef !== "treble"
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
}: {
  projectId: string;
}): LocalNotationProjectScoreDocumentV1 => ({
  schemaVersion: "score-document-v1",
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
  meter: "4/4",
  parts: [{
    partId: "part-1",
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
  return {
    schemaVersion: LOCAL_SCORE_PROJECT_SCHEMA_VERSION,
    projectId,
    title: normalizeTitle(title),
    tempoBpm: LOCAL_SCORE_PROJECT_DEFAULT_TEMPO_BPM,
    createdAt: now,
    updatedAt: now,
    document: createEmptyProjectDocument({ projectId }),
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
}): LocalNotationProjectScoreDocumentV1 => ({
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
}): LocalScoreProjectV1 => {
  assertExpectedRevision(project, expectedRevision);
  assertMutationTimestamp(project, now);
  const normalizedTitle = normalizeTitle(title);
  if (normalizedTitle === project.title) return project;
  return {
    ...project,
    title: normalizedTitle,
    updatedAt: now,
    document: createDocumentRevision({
      project,
      content: getLocalScoreProjectContent(project),
    }),
  };
};

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
}): LocalScoreProjectV1 => {
  assertExpectedRevision(project, expectedRevision);
  assertMutationTimestamp(project, now);
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
  if (tempoBpm === project.tempoBpm) return project;
  return {
    ...project,
    tempoBpm,
    updatedAt: now,
    document: createDocumentRevision({
      project,
      content: getLocalScoreProjectContent(project),
    }),
  };
};

const normalizeProjectEvent = ({
  eventId,
  location,
  input,
}: {
  eventId: string;
  location: LocalScoreProjectEventLocation;
  input: LocalScoreProjectEventInput;
}): ScoreDocumentEventV1 => {
  const event = {
    id: eventId,
    type: input.type,
    pitch: input.type === "note" ? input.pitch : null,
    duration: input.duration,
    measure: location.measureNumber,
  } as const;
  if (!isValidScoreEvent(event, location.measureNumber)) {
    throw new LocalScoreProjectDomainError(
      "invalid-input",
      "音符或休止符内容无效，未执行修改。",
    );
  }
  return event;
};

const updateEventsAtLocation = ({
  content,
  location,
  update,
}: {
  content: LocalScoreProjectContentV1;
  location: LocalScoreProjectEventLocation;
  update: (
    events: readonly ScoreDocumentEventV1[],
  ) => readonly ScoreDocumentEventV1[];
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
  return { meter: content.meter, parts };
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
  return { meter: content.meter, parts };
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
      update: (events) => [...events, event],
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
    update: (events) => events.map((existing) => {
      if (existing.id !== eventId) return existing;
      found = true;
      return event;
    }),
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
  return applyLocalScoreProjectContent({
    project,
    expectedRevision,
    content: { ...content, meter },
    now,
  });
};

const isLocalNotationProjectDocument = (
  value: unknown,
  projectId: string,
): value is LocalNotationProjectScoreDocumentV1 => {
  if (!isRecord(value)) return false;
  return (
    value.schemaVersion === "score-document-v1"
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
  );
};

export const parseLocalScoreProject = (
  value: unknown,
): LocalScoreProjectV1 | null => {
  if (
    !isRecord(value)
    || (
      value.schemaVersion !== LOCAL_SCORE_PROJECT_SCHEMA_VERSION
      && value.schemaVersion !== LOCAL_SCORE_PROJECT_LEGACY_SCHEMA_VERSION
    )
    || !isValidId(value.projectId)
    || typeof value.title !== "string"
    || value.title.length === 0
    || value.title.length > LOCAL_SCORE_PROJECT_MAX_TITLE_LENGTH
    || !isValidIsoDate(value.createdAt)
    || !isValidIsoDate(value.updatedAt)
    || Date.parse(value.updatedAt) < Date.parse(value.createdAt)
    || !isLocalNotationProjectDocument(value.document, value.projectId)
    || !Array.isArray(value.undoStack)
    || value.undoStack.length > LOCAL_SCORE_PROJECT_MAX_HISTORY
    || !value.undoStack.every(isLocalScoreProjectContent)
    || !Array.isArray(value.redoStack)
    || value.redoStack.length > LOCAL_SCORE_PROJECT_MAX_HISTORY
    || !value.redoStack.every(isLocalScoreProjectContent)
  ) return null;
  const tempoBpm = value.schemaVersion === LOCAL_SCORE_PROJECT_LEGACY_SCHEMA_VERSION
    ? LOCAL_SCORE_PROJECT_DEFAULT_TEMPO_BPM
    : value.tempoBpm;
  if (
    !Number.isSafeInteger(tempoBpm)
    || (tempoBpm as number) < LOCAL_SCORE_PROJECT_MIN_TEMPO_BPM
    || (tempoBpm as number) > LOCAL_SCORE_PROJECT_MAX_TEMPO_BPM
  ) return null;
  return cloneLocalScoreProject({
    ...value,
    schemaVersion: LOCAL_SCORE_PROJECT_SCHEMA_VERSION,
    tempoBpm,
  } as LocalScoreProjectV1);
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
