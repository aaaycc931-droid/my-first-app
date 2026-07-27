"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  LocalScoreProjectNumberedPreview,
} from "../../components/music/LocalScoreProjectNumberedPreview";
import {
  LocalScoreProjectStaffPreview,
  type LocalScoreProjectStaffSelection,
} from "../../components/music/LocalScoreProjectStaffPreview";
import {
  useLocalScoreProjectTransport,
  type LocalScoreProjectTransportMode,
} from "../../components/piano/useLocalScoreProjectTransport";
import {
  LocalScoreProjectDomainError,
  addLocalScoreProjectEvent,
  addLocalScoreProjectPart,
  addLocalScoreProjectStaff,
  addLocalScoreProjectVoice,
  appendLocalScoreProjectMeasure,
  changeLocalScoreProjectClef,
  changeLocalScoreProjectEventArticulations,
  changeLocalScoreProjectEventChordSymbol,
  changeLocalScoreProjectEventDamperPedalMark,
  changeLocalScoreProjectKeySignature,
  changeLocalScoreProjectMeter,
  changeLocalScoreProjectPartInstrument,
  changeLocalScoreProjectScoreCredits,
  copyLocalScoreProjectEvent,
  deleteEmptyLocalScoreProjectMeasure,
  deleteEmptyLocalScoreProjectPart,
  deleteEmptyLocalScoreProjectStaff,
  deleteEmptyLocalScoreProjectVoice,
  deleteLocalScoreProjectEvent,
  moveLocalScoreProjectEvent,
  pasteLocalScoreProjectEvent,
  redoLocalScoreProject,
  renameLocalScoreProjectPart,
  undoLocalScoreProject,
  updateLocalScoreProjectEvent,
  type LocalScoreProjectEventInput,
  type LocalScoreProjectCreatorRole,
  type LocalScoreProjectScoreCredits,
  type LocalScoreProjectV1,
  type LocalScoreProjectVoiceLocation,
} from "../../lib/music/localScoreProject";
import {
  LOCAL_SCORE_PROJECT_TEMPLATES,
  createLocalScoreProjectFromTemplate,
  getLocalScoreProjectTemplate,
  type LocalScoreProjectTemplateCategory,
} from "../../lib/music/localScoreProjectTemplate";
import type {
  LocalScoreProjectClefV3,
  LocalScoreProjectArticulationV1,
  LocalScoreProjectFingeringV1,
  LocalScoreProjectDynamicMarkV1,
  LocalScoreProjectDamperPedalMarkV1,
  LocalScoreProjectFermataMarkV1,
  LocalScoreProjectKeySignatureV3,
  LocalScoreProjectPartInstrumentV1,
} from "../../lib/music/scoreDocument";
import {
  notationDurations,
  notationPitches,
  notationTimeSignatures,
  type NotationDuration,
  type NotationPitch,
  type NotationTimeSignature,
} from "../../lib/practice/localNotationFragmentDraft";
import {
  LOCAL_SCORE_PROJECT_STORAGE_LIMITS,
  createIndexedDbLocalScoreProjectStore,
  deleteLocalScoreProject,
  listLocalScoreProjects,
  loadLocalScoreProject,
  persistLocalScoreProjectChange,
  persistNewLocalScoreProject,
  type LocalScoreProjectStore,
} from "./runtime/localScoreProjectStorage";
import { useLocalScoreProjectAutosave } from "./useLocalScoreProjectAutosave";

type EditorEventType = "note" | "rest";
type ScorePreviewMode = "staff" | "numbered";
type ScoreCreditsDraft = Readonly<{
  title: string;
  subtitle: string;
  creators: readonly Readonly<{
    role: LocalScoreProjectCreatorRole;
    name: string;
  }>[];
  rightsNotice: string;
}>;

const DEFAULT_LOCAL_SCORE_PROJECT_TEMPLATE_ID =
  "blank-treble-staff-v1";

const articulationOptions = [
  { id: "accent", label: "重音" },
  { id: "staccato", label: "断奏" },
  { id: "tenuto", label: "保持" },
] as const satisfies readonly Readonly<{
  id: LocalScoreProjectArticulationV1;
  label: string;
}>[];

const dynamicMarkOptions = [
  { value: "", label: "无力度记号" },
  { value: "pp", label: "很弱（pp）" },
  { value: "p", label: "弱（p）" },
  { value: "mp", label: "中弱（mp）" },
  { value: "mf", label: "中强（mf）" },
  { value: "f", label: "强（f）" },
  { value: "ff", label: "很强（ff）" },
] as const;

const damperPedalMarkOptions = [
  { value: "", label: "无制音踏板记号" },
  { value: "down", label: "踩下（Ped.）" },
  { value: "up", label: "释放（✱）" },
] as const;
const fermataMarkOptions = [
  { value: "", label: "无延长记号" },
  { value: "fermata", label: "延长记号（𝄐）" },
] as const;

const templateCategoryOptions: readonly Readonly<{
  category: LocalScoreProjectTemplateCategory;
  label: string;
}>[] = [
  { category: "blank", label: "基础空白谱" },
  { category: "keyboard", label: "键盘编制" },
  { category: "chamber", label: "室内乐编制" },
  { category: "vocal", label: "声乐编制" },
];

const partInstrumentOptions = [
  { value: "unassigned", label: "未指定", instrument: { kind: "unassigned" } },
  { value: "gm1-0", label: "大钢琴（GM1 0）", instrument: { kind: "gm1-program", program: 0 } },
  { value: "gm1-40", label: "小提琴（GM1 40）", instrument: { kind: "gm1-program", program: 40 } },
  { value: "gm1-41", label: "中提琴（GM1 41）", instrument: { kind: "gm1-program", program: 41 } },
  { value: "gm1-42", label: "大提琴（GM1 42）", instrument: { kind: "gm1-program", program: 42 } },
  { value: "gm1-48", label: "弦乐合奏（GM1 48）", instrument: { kind: "gm1-program", program: 48 } },
  { value: "gm1-73", label: "长笛（GM1 73）", instrument: { kind: "gm1-program", program: 73 } },
] as const satisfies readonly Readonly<{
  value: string;
  label: string;
  instrument: LocalScoreProjectPartInstrumentV1;
}>[];

const getPartInstrumentValue = (
  instrument: LocalScoreProjectPartInstrumentV1,
) => instrument.kind === "unassigned"
  ? "unassigned"
  : `gm1-${instrument.program}`;

const getPartInstrumentLabel = (
  instrument: LocalScoreProjectPartInstrumentV1,
) => partInstrumentOptions.find(
  (option) => option.value === getPartInstrumentValue(instrument),
)?.label ?? (
  instrument.kind === "gm1-program"
    ? `GM1 程序 ${instrument.program}`
    : "未指定"
);

const durationLabels: Record<NotationDuration, string> = {
  half: "二分音符",
  quarter: "四分音符",
  eighth: "八分音符",
};

const creatorRoleLabels: Readonly<
  Record<LocalScoreProjectCreatorRole, string>
> = {
  composer: "作曲",
  lyricist: "作词",
  arranger: "编曲",
};

const creatorRoles = [
  "composer",
  "lyricist",
  "arranger",
] as const satisfies readonly LocalScoreProjectCreatorRole[];

const getScoreCreditsDraft = (
  scoreCredits: LocalScoreProjectScoreCredits,
): ScoreCreditsDraft => {
  const creators = scoreCredits.creators.map((creator) => ({ ...creator }));
  for (const role of creatorRoles) {
    if (!creators.some((creator) => creator.role === role)) {
      creators.push({ role, name: "" });
    }
  }
  return {
    title: scoreCredits.title,
    subtitle: scoreCredits.subtitle ?? "",
    creators,
    rightsNotice: scoreCredits.rightsNotice ?? "",
  };
};

const createDefaultId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `score-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const getPrimaryVoice = (project: LocalScoreProjectV1) => {
  const part = project.document.parts[0];
  const staff = part?.staves[0];
  const voice = staff?.voices[0];
  if (!part || !staff || !voice) {
    throw new LocalScoreProjectDomainError(
      "not-found",
      "当前谱面没有可编辑的基础声部。",
    );
  }
  return {
    partId: part.partId,
    staffId: staff.staffId,
    voiceId: voice.voiceId,
    staff,
    voice,
  };
};

const getVoice = (
  project: LocalScoreProjectV1,
  location: LocalScoreProjectVoiceLocation | null,
) => {
  if (!location) return getPrimaryVoice(project);
  const part = project.document.parts.find(
    (candidate) => candidate.partId === location.partId,
  );
  if (!part) return getPrimaryVoice(project);
  const staff = part.staves.find(
    (candidate) => candidate.staffId === location.staffId,
  ) ?? part.staves[0];
  if (!staff) return getPrimaryVoice(project);
  const voice = staff.voices.find(
    (candidate) => candidate.voiceId === location.voiceId,
  ) ?? staff.voices[0];
  if (!voice) return getPrimaryVoice(project);
  return {
    partId: part.partId,
    staffId: staff.staffId,
    voiceId: voice.voiceId,
    staff,
    voice,
  };
};

const getVoiceLocation = (
  project: LocalScoreProjectV1,
  location: LocalScoreProjectVoiceLocation | null,
) => {
  const voice = getVoice(project, location);
  return {
    partId: voice.partId,
    staffId: voice.staffId,
    voiceId: voice.voiceId,
  };
};

const getVoiceMeasures = (
  project: LocalScoreProjectV1,
  location: LocalScoreProjectVoiceLocation | null,
) =>
  [...getVoice(project, location).voice.measures]
    .sort((left, right) => left.measureNumber - right.measureNumber);

const getEventLocation = (
  project: LocalScoreProjectV1,
  location: LocalScoreProjectVoiceLocation | null,
  measureNumber: number,
) => {
  const { partId, staffId, voiceId } = getVoice(project, location);
  return { partId, staffId, voiceId, measureNumber };
};

const getVoiceEvents = (
  project: LocalScoreProjectV1,
  location: LocalScoreProjectVoiceLocation | null,
) => {
  const selected = getVoice(project, location);
  return getVoiceMeasures(project, location).flatMap((measure) =>
    measure.events.map((event) => ({
      event,
      location: {
        partId: selected.partId,
        staffId: selected.staffId,
        voiceId: selected.voiceId,
        measureNumber: measure.measureNumber,
      },
    })));
};

function LocalScoreProjectPlaybackControls({
  project,
  selectedEventId,
  onSelectEvent,
  onModeChange,
  disableTransportStart = false,
  targetLocation,
}: {
  project: LocalScoreProjectV1;
  selectedEventId?: string | null;
  onSelectEvent: (selection: LocalScoreProjectStaffSelection) => void;
  onModeChange?: (mode: LocalScoreProjectTransportMode) => void;
  disableTransportStart?: boolean;
  targetLocation: LocalScoreProjectVoiceLocation;
}) {
  const [viewMode, setViewMode] = useState<ScorePreviewMode>("staff");
  const transport = useLocalScoreProjectTransport({
    document: project.document,
    bpm: project.tempoBpm,
  });
  useEffect(() => {
    onModeChange?.(transport.mode);
  }, [onModeChange, transport.mode]);

  return (
    <>
      <section className="rounded-3xl border border-indigo-200 bg-indigo-50 p-5 text-indigo-950 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-indigo-700">
              当前已保存修订
            </p>
            <h2 className="mt-1 text-xl font-black">选择谱面视图</h2>
            <p className="mt-2 text-sm leading-6 text-indigo-800">
              两种视图读取同一份谱面；切换不会重建或中断正在进行的播放。
            </p>
          </div>
          <div
            className="flex flex-wrap gap-2"
            role="radiogroup"
            aria-label="谱面视图"
          >
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === "staff"}
              onClick={() => setViewMode("staff")}
              className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-bold ${
                viewMode === "staff"
                  ? "border-indigo-600 bg-white text-indigo-950 ring-2 ring-indigo-200"
                  : "border-indigo-200 bg-indigo-50 text-indigo-700"
              }`}
            >
              五线谱
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === "numbered"}
              onClick={() => setViewMode("numbered")}
              className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-bold ${
                viewMode === "numbered"
                  ? "border-indigo-600 bg-white text-indigo-950 ring-2 ring-indigo-200"
                  : "border-indigo-200 bg-indigo-50 text-indigo-700"
              }`}
            >
              固定 C 简谱
            </button>
          </div>
        </div>
        <div className="mt-4">
          {viewMode === "staff" ? (
            <LocalScoreProjectStaffPreview
              document={project.document}
              target={targetLocation}
              selectedEventId={selectedEventId}
              activeEventIds={transport.activeSourceEventIds}
              onSelectEvent={onSelectEvent}
            />
          ) : (
            <LocalScoreProjectNumberedPreview
              document={project.document}
              target={targetLocation}
              selectedEventId={selectedEventId}
              activeEventIds={transport.activeSourceEventIds}
              onSelectEvent={onSelectEvent}
            />
          )}
        </div>
      </section>
      <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-950 shadow-sm">
      <p className="text-sm font-semibold text-rose-700">本机采样钢琴预览</p>
      <h2 className="mt-1 text-xl font-black">播放当前已保存修订</h2>
      <p className="mt-2 text-sm leading-6">
        休止会保留时长；离开页面、进入后台或主动停止时会关闭全部声音。播放不创建练习目标、演奏记录或成绩。
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <p className="self-center text-sm font-bold">
          已保存速度：{project.tempoBpm} BPM
        </p>
        {transport.mode === "score-playing" ? (
          <button
            type="button"
            onClick={transport.stop}
            className="min-h-11 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-800"
          >
            停止播放
          </button>
        ) : (
          <button
            type="button"
            disabled={
              transport.plan.status === "blocked" || disableTransportStart
            }
            onClick={transport.playScore}
            className="min-h-11 rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
          >
            播放草稿
          </button>
        )}
        {transport.mode === "metronome-running" || transport.mode === "metronome-starting" ? (
          <button
            type="button"
            onClick={transport.stop}
            className="min-h-11 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-800"
          >
            {transport.mode === "metronome-starting" ? "取消启动节拍器" : "停止节拍器"}
          </button>
        ) : (
          <button
            type="button"
            disabled={disableTransportStart}
            onClick={() => void transport.startMetronome()}
            className="min-h-11 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-800 disabled:text-slate-400"
          >
            启动节拍器
          </button>
        )}
      </div>
      <p className="mt-3 text-xs leading-5 text-rose-800">
        节拍器使用已保存的 {project.tempoBpm} BPM 与 {project.document.meter}；与谱面播放互斥，当前不表示精确相位同步。
        {transport.beat
          ? ` 当前调度拍点：第 ${transport.beat.barNumber} 小节第 ${transport.beat.beatNumber} 拍${transport.beat.isStrongBeat ? "（强拍）" : ""}。`
          : ""}
      </p>
      {transport.plan.status === "ready" && transport.plan.warnings.length > 0 ? (
        <p className="mt-3 text-xs leading-5 text-rose-800">
          {transport.plan.warnings.join(" ")}
        </p>
      ) : null}
      {transport.plan.status === "blocked" ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {transport.plan.reason}
        </p>
      ) : null}
      {transport.notice ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="status">
          {transport.notice}
        </p>
      ) : null}
      </section>
    </>
  );
}

export function LocalScoreProjectPanel({
  store,
  now = () => new Date().toISOString(),
  createId = createDefaultId,
}: {
  store?: LocalScoreProjectStore;
  now?: () => string;
  createId?: () => string;
}) {
  const [resolvedStore] = useState(
    () => store ?? createIndexedDbLocalScoreProjectStore(),
  );
  const [projects, setProjects] = useState<readonly LocalScoreProjectV1[]>([]);
  const [currentProject, setCurrentProject] =
    useState<LocalScoreProjectV1 | null>(null);
  const [selectedVoiceLocation, setSelectedVoiceLocation] =
    useState<LocalScoreProjectVoiceLocation | null>(null);
  const selectedVoiceLocationRef =
    useRef<LocalScoreProjectVoiceLocation | null>(null);
  const [newTitle, setNewTitle] = useState("我的第一份谱");
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    DEFAULT_LOCAL_SCORE_PROJECT_TEMPLATE_ID,
  );
  const [editorTitle, setEditorTitle] = useState("");
  const [editorTempoBpm, setEditorTempoBpm] = useState("90");
  const [scoreCreditsDraft, setScoreCreditsDraft] =
    useState<ScoreCreditsDraft>({
      title: "",
      subtitle: "",
      creators: creatorRoles.map((role) => ({ role, name: "" })),
      rightsNotice: "",
    });
  const [partNameDraft, setPartNameDraft] = useState("");
  const [partInstrumentDraft, setPartInstrumentDraft] =
    useState("unassigned");
  const [eventType, setEventType] = useState<EditorEventType>("note");
  const [pitch, setPitch] = useState<NotationPitch>("C4");
  const [duration, setDuration] = useState<NotationDuration>("quarter");
  const [augmentationDots, setAugmentationDots] = useState<0 | 1>(0);
  const [tieToNext, setTieToNext] = useState(false);
  const [slurToNext, setSlurToNext] = useState(false);
  const [lyric, setLyric] = useState("");
  const [fingering, setFingering] =
    useState<LocalScoreProjectFingeringV1 | null>(null);
  const [articulations, setArticulations] =
    useState<readonly LocalScoreProjectArticulationV1[]>([]);
  const [chordSymbol, setChordSymbol] = useState("");
  const [dynamicMark, setDynamicMark] =
    useState<LocalScoreProjectDynamicMarkV1 | null>(null);
  const [damperPedalMark, setDamperPedalMark] =
    useState<LocalScoreProjectDamperPedalMarkV1 | null>(null);
  const [fermataMark, setFermataMark] =
    useState<LocalScoreProjectFermataMarkV1 | null>(null);
  const [targetMeasureNumber, setTargetMeasureNumber] = useState(1);
  const [selectedEvent, setSelectedEvent] =
    useState<LocalScoreProjectStaffSelection | null>(null);
  const [copiedEvent, setCopiedEvent] =
    useState<LocalScoreProjectEventInput | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingDeleteProjectId, setPendingDeleteProjectId] =
    useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(true);
  const [sourceStatus, setSourceStatus] =
    useState<"available" | "unavailable">("available");
  const [transportMode, setTransportMode] =
    useState<LocalScoreProjectTransportMode>("idle");

  const refreshProjects = useCallback(async () => {
    setIsBusy(true);
    const result = await listLocalScoreProjects({ store: resolvedStore });
    setProjects(result.projects);
    setSourceStatus(result.sourceStatus);
    setNotice(result.notice);
    setIsBusy(false);
  }, [resolvedStore]);

  useEffect(() => {
    let active = true;
    const loadInitialProjects = async () => {
      const result = await listLocalScoreProjects({ store: resolvedStore });
      if (!active) return;
      setProjects(result.projects);
      setSourceStatus(result.sourceStatus);
      setNotice(result.notice);
      setIsBusy(false);
    };
    void loadInitialProjects();
    return () => {
      active = false;
    };
  }, [resolvedStore]);

  const publishProject = useCallback((
    project: LocalScoreProjectV1,
    {
      resetSettings = false,
      savedSettings,
      preserveScoreCreditsDraft = false,
    }: {
      resetSettings?: boolean;
      savedSettings?: Readonly<{ title: string; tempoBpm: string }>;
      preserveScoreCreditsDraft?: boolean;
    } = {},
  ) => {
    const previousLocation = selectedVoiceLocationRef.current;
    const nextLocation = resetSettings
      ? getVoiceLocation(project, null)
      : getVoiceLocation(project, selectedVoiceLocationRef.current);
    const nextMeasures = getVoiceMeasures(project, nextLocation);
    const nextEvents = getVoiceEvents(project, nextLocation);
    setCurrentProject(project);
    selectedVoiceLocationRef.current = nextLocation;
    setSelectedVoiceLocation(nextLocation);
    setPartNameDraft(
      project.document.parts.find((part) =>
        part.partId === nextLocation.partId)?.name ?? "",
    );
    setPartInstrumentDraft(getPartInstrumentValue(
      project.document.parts.find((part) =>
        part.partId === nextLocation.partId)?.instrument
        ?? { kind: "unassigned" },
    ));
    if (!preserveScoreCreditsDraft) {
      setScoreCreditsDraft(getScoreCreditsDraft(project.document.scoreCredits));
    }
    if (
      previousLocation
      && (
        previousLocation.partId !== nextLocation.partId
        || previousLocation.staffId !== nextLocation.staffId
        || previousLocation.voiceId !== nextLocation.voiceId
      )
    ) {
      setCopiedEvent(null);
    }
    if (resetSettings) {
      setEditorTitle(project.title);
      setEditorTempoBpm(String(project.tempoBpm));
      setTransportMode("idle");
    } else if (savedSettings) {
      setEditorTitle((current) =>
        current === savedSettings.title ? project.title : current);
      setEditorTempoBpm((current) =>
        current === savedSettings.tempoBpm
          ? String(project.tempoBpm)
          : current);
    }
    setTargetMeasureNumber((previous) =>
      nextMeasures.some((measure) => measure.measureNumber === previous)
        ? previous
        : nextMeasures[0]?.measureNumber ?? 1);
    setSelectedEvent((previous) =>
      previous
      && nextEvents.some(({ event, location }) =>
        event.id === previous.eventId
        && location.partId === previous.location.partId
        && location.staffId === previous.location.staffId
        && location.voiceId === previous.location.voiceId
        && location.measureNumber === previous.location.measureNumber)
        ? previous
        : null);
    setProjects((previous) => [
      project,
      ...previous.filter((candidate) => candidate.projectId !== project.projectId),
    ]);
  }, []);

  const handleAutosaveProject = useCallback((
    project: LocalScoreProjectV1,
    savedSettings: Readonly<{ title: string; tempoBpm: string }>,
  ) => {
    publishProject(project, {
      savedSettings,
      preserveScoreCreditsDraft: true,
    });
  }, [publishProject]);

  const autosave = useLocalScoreProjectAutosave({
    store: resolvedStore,
    project: currentProject,
    title: editorTitle,
    tempoBpm: editorTempoBpm,
    transportMode,
    now,
    onProjectSaved: handleAutosaveProject,
  });

  const createProject = async () => {
    setIsBusy(true);
    setNotice(null);
    try {
      const projectId = createId();
      const template = getLocalScoreProjectTemplate(selectedTemplateId);
      if (!template) {
        setNotice("所选编制模板当前不可用，未创建项目。");
        return;
      }
      let structureSequence = 0;
      const project = createLocalScoreProjectFromTemplate({
        projectId,
        title: newTitle,
        templateId: template.id,
        now: now(),
        createStructureId: () =>
          `template-${++structureSequence}`,
      });
      const result = await persistNewLocalScoreProject({
        store: resolvedStore,
        project,
      });
      if (result.status === "saved") {
        publishProject(result.project, { resetSettings: true });
        setNotice(
          `已按“${template.displayName}”创建并保存在本机；后续编辑只属于这份项目，不会改写模板或其他项目。`,
        );
      } else {
        setNotice(result.notice);
      }
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "无法创建本机谱项目。",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const openProject = async (projectId: string) => {
    setIsBusy(true);
    setNotice(null);
    const result = await loadLocalScoreProject({
      store: resolvedStore,
      projectId,
    });
    if (result.status === "loaded" && result.project) {
      publishProject(result.project, { resetSettings: true });
      setNotice("已重新打开本机保存的谱项目。");
    } else {
      setNotice(result.notice ?? "未找到这份本机谱项目。");
    }
    setIsBusy(false);
  };

  const confirmDeleteProject = async (project: LocalScoreProjectV1) => {
    if (isBusy || pendingDeleteProjectId !== project.projectId) return;
    setIsBusy(true);
    setNotice(null);
    const result = await deleteLocalScoreProject({
      store: resolvedStore,
      project,
    });
    if (result.deleted) {
      setProjects((previous) =>
        previous.filter((candidate) =>
          candidate.projectId !== project.projectId));
      setPendingDeleteProjectId(null);
      setNotice("本机谱项目已删除，释放的应用容量可用于新建或保存。");
    } else {
      setNotice(result.notice);
    }
    setIsBusy(false);
  };

  const persistMutation = async (
    createProposal: (project: LocalScoreProjectV1) => LocalScoreProjectV1,
  ) => {
    if (!currentProject || isBusy) return;
    if (
      autosave.isDirty
      || autosave.status === "saving"
      || autosave.status === "deferred"
      || autosave.status === "recovery-available"
    ) {
      setNotice("请先等待名称与速度自动保存，或处理恢复候选后再修改谱面。");
      return;
    }
    setIsBusy(true);
    setNotice(null);
    try {
      const proposal = createProposal(currentProject);
      const result = await persistLocalScoreProjectChange({
        store: resolvedStore,
        currentProject,
        proposedProject: proposal,
      });
      if (result.status === "saved") {
        publishProject(result.project);
        setNotice("修改已保存在本机。");
      } else if (result.status === "unchanged") {
        setNotice("当前内容没有变化。");
      } else {
        setNotice(result.notice);
      }
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "本次修改无效，已保留最后保存的版本。",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const saveEvent = () => {
    void persistMutation((project) =>
      selectedEvent
        ? updateLocalScoreProjectEvent({
          project,
          expectedRevision: project.document.revision,
          location: selectedEvent.location,
          eventId: selectedEvent.eventId,
          input: eventType === "rest"
            ? {
              type: "rest",
              pitch: null,
              duration: "quarter",
              augmentationDots,
              chordSymbol,
              dynamicMark,
              damperPedalMark,
              fermataMark,
            }
            : {
              type: "note",
              pitch,
              duration,
              augmentationDots,
              tieToNext,
              slurToNext,
              lyric,
              fingering,
              articulations,
              chordSymbol,
              dynamicMark,
              damperPedalMark,
              fermataMark,
            },
          now: now(),
        })
        : addLocalScoreProjectEvent({
          project,
          expectedRevision: project.document.revision,
          location: getEventLocation(project, selectedVoiceLocation, targetMeasureNumber),
          eventId: `event-${createId()}`,
          input: eventType === "rest"
          ? {
            type: "rest",
            pitch: null,
            duration: "quarter",
            augmentationDots,
            chordSymbol,
            dynamicMark,
            damperPedalMark,
            fermataMark,
          }
          : {
            type: "note",
            pitch,
            duration,
            augmentationDots,
            tieToNext,
            slurToNext,
            lyric,
            fingering,
            articulations,
            chordSymbol,
            dynamicMark,
            damperPedalMark,
            fermataMark,
          },
          now: now(),
        }),
    );
  };

  const selectEvent = (selection: LocalScoreProjectStaffSelection) => {
    if (!currentProject) return;
    const located = getVoiceEvents(currentProject, selectedVoiceLocation).find(({ event, location }) =>
      event.id === selection.eventId
      && location.partId === selection.location.partId
      && location.staffId === selection.location.staffId
      && location.voiceId === selection.location.voiceId
      && location.measureNumber === selection.location.measureNumber);
    if (!located) return;
    setSelectedEvent(selection);
    setTargetMeasureNumber(selection.location.measureNumber);
    setEventType(located.event.type);
    setChordSymbol(located.event.chordSymbol ?? "");
    setDynamicMark(located.event.dynamicMark);
    setDamperPedalMark(located.event.damperPedalMark ?? null);
    setFermataMark(located.event.fermataMark ?? null);
    if (located.event.type === "note" && located.event.pitch) {
      setPitch(located.event.pitch);
      setDuration(located.event.duration);
      setTieToNext(located.event.tieToNext);
      setSlurToNext(located.event.slurToNext);
      setLyric(located.event.lyric ?? "");
      setFingering(located.event.fingering);
      setArticulations(located.event.articulations);
    } else {
      setDuration("quarter");
      setTieToNext(false);
      setSlurToNext(false);
      setLyric("");
      setFingering(null);
      setArticulations([]);
      setDamperPedalMark(located.event.damperPedalMark ?? null);
      setFermataMark(located.event.fermataMark ?? null);
    }
    setAugmentationDots(located.event.augmentationDots);
  };

  const clearSelectedEventChordSymbol = () => {
    setChordSymbol("");
    if (!selectedEvent) {
      setNotice("和弦名称草稿已清空；新增事件尚未写入谱面。");
      return;
    }
    void persistMutation((project) =>
      changeLocalScoreProjectEventChordSymbol({
        project,
        expectedRevision: project.document.revision,
        location: selectedEvent.location,
        eventId: selectedEvent.eventId,
        chordSymbol: null,
        now: now(),
      }),
    );
  };

  const toggleArticulation = (
    articulation: LocalScoreProjectArticulationV1,
    selected: boolean,
  ) => {
    setArticulations((current) => articulationOptions
      .filter(({ id }) =>
        id === articulation ? selected : current.includes(id))
      .map(({ id }) => id));
  };

  const clearSelectedEventArticulations = () => {
    setArticulations([]);
    if (!selectedEvent) {
      setNotice("演奏法草稿已清空；新增事件尚未写入谱面。");
      return;
    }
    void persistMutation((project) =>
      changeLocalScoreProjectEventArticulations({
        project,
        expectedRevision: project.document.revision,
        location: selectedEvent.location,
        eventId: selectedEvent.eventId,
        articulations: [],
        now: now(),
      }),
    );
  };

  const events = currentProject ? getVoiceEvents(currentProject, selectedVoiceLocation) : [];
  const measures = currentProject ? getVoiceMeasures(currentProject, selectedVoiceLocation) : [];
  const selectedVoice = currentProject
    ? getVoice(currentProject, selectedVoiceLocation)
    : null;
  const selectedPart = currentProject?.document.parts.find(
    (part) => part.partId === selectedVoice?.partId,
  ) ?? null;
  const structureMutationDisabled = isBusy
    || transportMode !== "idle"
    || autosave.isDirty
    || autosave.status === "saving"
    || autosave.status === "deferred"
    || autosave.status === "recovery-available";
  const updateScoreCreatorName = (
    index: number,
    name: string,
  ) => {
    setScoreCreditsDraft((draft) => ({
      ...draft,
      creators: draft.creators.map((creator, creatorIndex) =>
        creatorIndex === index ? { ...creator, name } : creator),
    }));
  };
  const addScoreCreator = (role: LocalScoreProjectCreatorRole) => {
    setScoreCreditsDraft((draft) => ({
      ...draft,
      creators: [...draft.creators, { role, name: "" }],
    }));
  };
  const removeScoreCreator = (
    index: number,
    role: LocalScoreProjectCreatorRole,
  ) => {
    setScoreCreditsDraft((draft) => {
      const roleCount = draft.creators.filter(
        (creator) => creator.role === role,
      ).length;
      return {
        ...draft,
        creators: roleCount <= 1
          ? draft.creators.map((creator, creatorIndex) =>
            creatorIndex === index ? { ...creator, name: "" } : creator)
          : draft.creators.filter((_, creatorIndex) => creatorIndex !== index),
      };
    });
  };
  const saveScoreCredits = () => {
    if (structureMutationDisabled) return;
    const requestedCredits = {
      title: scoreCreditsDraft.title,
      subtitle: scoreCreditsDraft.subtitle,
      creators: scoreCreditsDraft.creators
        .filter((creator) => creator.name.trim().length > 0)
        .map((creator) => ({ ...creator })),
      rightsNotice: scoreCreditsDraft.rightsNotice,
    };
    void persistMutation((project) =>
      changeLocalScoreProjectScoreCredits({
        project,
        expectedRevision: project.document.revision,
        scoreCredits: requestedCredits,
        now: now(),
      }));
  };

  const chooseVoice = (location: LocalScoreProjectVoiceLocation) => {
    if (!currentProject) return;
    const next = getVoice(currentProject, location);
    const normalized = {
      partId: next.partId,
      staffId: next.staffId,
      voiceId: next.voiceId,
    };
    selectedVoiceLocationRef.current = normalized;
    setSelectedVoiceLocation(normalized);
    setPartNameDraft(
      currentProject.document.parts.find((part) =>
        part.partId === normalized.partId)?.name ?? "",
    );
    setPartInstrumentDraft(getPartInstrumentValue(
      currentProject.document.parts.find((part) =>
        part.partId === normalized.partId)?.instrument
        ?? { kind: "unassigned" },
    ));
    setSelectedEvent(null);
    setCopiedEvent(null);
    setTargetMeasureNumber(
      getVoiceMeasures(currentProject, normalized)[0]?.measureNumber ?? 1,
    );
  };

  if (!currentProject) {
    const selectedTemplate =
      getLocalScoreProjectTemplate(selectedTemplateId);
    const templatePartCount = selectedTemplate?.parts.length ?? 0;
    const templateStaffCount = selectedTemplate?.parts.reduce(
      (total, part) => total + part.staves.length,
      0,
    ) ?? 0;
    const projectCountLimitReached =
      projects.length >= LOCAL_SCORE_PROJECT_STORAGE_LIMITS.maxProjects;
    return (
      <div className="grid gap-4">
        <section className="rounded-3xl border border-teal-200 bg-teal-50 p-5 text-teal-950 shadow-sm">
          <p className="text-sm font-semibold text-teal-700">S1 本机基础谱项目</p>
          <h1 className="mt-1 text-2xl font-black">创建并保存一份基础谱</h1>
          <p className="mt-2 text-sm leading-6">
            内容、撤销历史和播放都只在本机处理，不登录、不上传，也不产生评分。
          </p>
          <p className="mt-2 text-xs leading-5 text-teal-800">
            应用保护上限：最多 {LOCAL_SCORE_PROJECT_STORAGE_LIMITS.maxProjects} 个项目、合计 5 MiB。达到上限后只拒绝新增或超限写入，不会自动删除、覆盖或压缩已有项目；清理空间或恢复存储后可直接重试。
          </p>
          <label className="mt-4 block text-sm font-bold">
            编制模板
            <select
              value={selectedTemplateId}
              disabled={isBusy || sourceStatus === "unavailable"}
              onChange={(event) => {
                setSelectedTemplateId(event.target.value);
                setNotice(null);
              }}
              className="mt-2 min-h-11 w-full rounded-xl border border-teal-300 bg-white px-3 py-2 disabled:bg-slate-100"
            >
              {templateCategoryOptions.map(({ category, label }) => (
                <optgroup key={category} label={label}>
                  {LOCAL_SCORE_PROJECT_TEMPLATES
                    .filter((template) => template.category === category)
                    .map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.displayName}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          {selectedTemplate ? (
            <div
              className="mt-3 rounded-2xl border border-teal-200 bg-white p-4"
              data-testid="local-score-project-template-preview"
            >
              <p className="font-bold">{selectedTemplate.displayName}</p>
              <p className="mt-1 text-sm leading-6 text-teal-900">
                {selectedTemplate.summary}
              </p>
              <p className="mt-2 text-xs font-semibold text-teal-800">
                {templatePartCount} 个声部组 · {templateStaffCount} 个谱表 ·
                {" "}{selectedTemplate.meter} · {selectedTemplate.tempoBpm} BPM
              </p>
              <ul className="mt-2 grid gap-1 text-xs leading-5 text-teal-800">
                {selectedTemplate.parts.map((part, index) => (
                  <li key={`${part.name}-${index}`}>
                    {part.name} · {getPartInstrumentLabel(part.instrument)} ·
                    {" "}{part.staves.map((staff) =>
                      staff.clef === "treble" ? "高音谱号" : "低音谱号")
                      .join("／")}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs leading-5 text-teal-800">
                每个声部从第 1 个空小节开始。模板只创建可编辑的空白编制，不包含曲谱内容、真实多乐器音色或完整总谱排版；所有声部仍使用钢琴采样预览。
              </p>
            </div>
          ) : (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
              所选编制模板当前不可用，请重新选择。
            </p>
          )}
          <label className="mt-4 block text-sm font-bold">
            项目名称
            <input
              value={newTitle}
              disabled={
                isBusy
                || sourceStatus === "unavailable"
                || projectCountLimitReached
              }
              onChange={(event) => setNewTitle(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-teal-300 bg-white px-3 py-2 disabled:bg-slate-100"
            />
          </label>
          <p className="mt-2 text-xs leading-5 text-teal-800">
            项目名称用于本机列表与管理；创建时也会作为初始谱面标题，之后两者可以分别修改。
          </p>
          <button
            type="button"
            disabled={
              isBusy
              || sourceStatus === "unavailable"
              || projectCountLimitReached
              || !selectedTemplate
            }
            onClick={() => void createProject()}
            className="mt-3 min-h-11 rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
          >
            {isBusy ? "正在读取本机项目…" : "创建并保存"}
          </button>
          {projectCountLimitReached ? (
            <p className="mt-2 text-sm leading-6 text-rose-800" role="status">
              已达到本机项目数量上限，请先删除一份不再需要的项目后再创建。
            </p>
          ) : null}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">本机已保存项目</h2>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void refreshProjects()}
              className="min-h-11 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold disabled:text-slate-400"
            >
              重新读取
            </button>
          </div>
          {projects.length === 0 ? (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {sourceStatus === "unavailable"
                ? "本机谱项目存储当前不可用；原记录不会被覆盖或清除。"
                : "还没有已保存的谱项目。"}
            </p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {projects.map((project) => (
                <li
                  key={project.projectId}
                  className="rounded-2xl border border-slate-200 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{project.title}</p>
                      <p className="text-xs text-slate-500">
                        修订 {project.document.revision} · {project.document.meter}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void openProject(project.projectId)}
                        className="min-h-11 rounded-xl border border-teal-300 bg-teal-50 px-3 py-2 text-sm font-bold text-teal-900 disabled:text-slate-400"
                      >
                        打开
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setPendingDeleteProjectId(project.projectId);
                          setNotice(null);
                        }}
                        className="min-h-11 rounded-xl border border-rose-300 px-3 py-2 text-sm font-bold text-rose-700 disabled:text-slate-400"
                      >
                        删除项目
                      </button>
                    </div>
                  </div>
                  {pendingDeleteProjectId === project.projectId ? (
                    <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
                      <p className="text-sm leading-6 text-rose-950">
                        确认永久删除“{project.title}”？只删除这一份本机项目，无法撤销；其他项目不会被修改。
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void confirmDeleteProject(project)}
                          className="min-h-11 rounded-xl bg-rose-700 px-3 py-2 text-sm font-bold text-white disabled:bg-slate-300"
                        >
                          确认删除
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setPendingDeleteProjectId(null)}
                          className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold disabled:text-slate-400"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
        {notice ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950" role="status">
            {notice}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-3xl border border-teal-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-teal-700">
          本机已保存 · 修订 {currentProject.document.revision}
        </p>
        {autosave.recoveryCandidate ? (
            <div
              className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-4"
              role="status"
            >
              <p className="text-sm font-bold text-amber-950">
                发现一份未完成的名称或速度修改
              </p>
              <p className="mt-1 text-sm leading-6 text-amber-900">
                候选基于修订 {autosave.recoveryCandidate.baseRevision}，
                保存于 {autosave.recoveryCandidate.capturedAt}。它不会自动套用。
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={
                    isBusy
                    || transportMode !== "idle"
                    || autosave.isRecoveryActionPending
                  }
                  onClick={() => {
                    void autosave.promoteRecovery().then((promoted) => {
                      if (!promoted) return;
                      setEditorTitle(promoted.title);
                      setEditorTempoBpm(String(promoted.tempoBpm));
                      setTransportMode("idle");
                    });
                  }}
                  className="min-h-11 rounded-xl bg-amber-800 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
                >
                  恢复并保存
                </button>
                <button
                  type="button"
                  disabled={
                    isBusy
                    || transportMode !== "idle"
                    || autosave.isRecoveryActionPending
                  }
                  onClick={() => void autosave.discardRecovery()}
                  className="min-h-11 rounded-xl border border-amber-400 bg-white px-4 py-2 text-sm font-bold text-amber-950 disabled:text-slate-400"
                >
                  丢弃
                </button>
              </div>
            </div>
          ) : null}
        {selectedVoice && selectedPart ? (
          <div className="mt-4 rounded-2xl border border-teal-100 bg-teal-50 p-4">
            <h2 className="text-base font-black">编辑目标</h2>
            <p className="mt-1 text-xs leading-5 text-teal-800">
              切换编辑目标不会停止播放；播放始终使用完整文档。
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="text-sm font-bold">
                声部组
                <select
                  value={selectedVoice.partId}
                  disabled={isBusy}
                  onChange={(event) => {
                    const part = currentProject.document.parts.find(
                      (candidate) => candidate.partId === event.target.value,
                    );
                    const staff = part?.staves[0];
                    const voice = staff?.voices[0];
                    if (part && staff && voice) {
                      chooseVoice({
                        partId: part.partId,
                        staffId: staff.staffId,
                        voiceId: voice.voiceId,
                      });
                    }
                  }}
                  className="mt-2 min-h-11 w-full rounded-xl border border-teal-200 bg-white px-3 py-2"
                >
                  {currentProject.document.parts.map((part, index) => (
                    <option key={part.partId} value={part.partId}>
                      {part.name}（第 {index + 1} 组）
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold">
                谱表
                <select
                  value={selectedVoice.staffId}
                  disabled={isBusy}
                  onChange={(event) => {
                    const staff = selectedPart.staves.find(
                      (candidate) => candidate.staffId === event.target.value,
                    );
                    const voice = staff?.voices[0];
                    if (staff && voice) {
                      chooseVoice({
                        partId: selectedPart.partId,
                        staffId: staff.staffId,
                        voiceId: voice.voiceId,
                      });
                    }
                  }}
                  className="mt-2 min-h-11 w-full rounded-xl border border-teal-200 bg-white px-3 py-2"
                >
                  {selectedPart.staves.map((staff, index) => (
                    <option key={staff.staffId} value={staff.staffId}>
                      谱表 {index + 1}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold">
                声部
                <select
                  value={selectedVoice.voiceId}
                  disabled={isBusy}
                  onChange={(event) => chooseVoice({
                    partId: selectedVoice.partId,
                    staffId: selectedVoice.staffId,
                    voiceId: event.target.value,
                  })}
                  className="mt-2 min-h-11 w-full rounded-xl border border-teal-200 bg-white px-3 py-2"
                >
                  {selectedVoice.staff.voices.map((voice, index) => (
                    <option key={voice.voiceId} value={voice.voiceId}>
                      声部 {index + 1}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3 rounded-xl border border-teal-200 bg-white p-3">
              <label className="text-sm font-bold">
                当前声部组名称
                <input
                  value={partNameDraft}
                  disabled={structureMutationDisabled}
                  onChange={(event) => setPartNameDraft(event.target.value)}
                  className="mt-2 min-h-11 w-full rounded-xl border border-teal-200 bg-white px-3 py-2 disabled:bg-slate-100"
                />
              </label>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={structureMutationDisabled}
                  onClick={() => {
                    if (structureMutationDisabled) return;
                    const requestedName = partNameDraft.trim();
                    setPartNameDraft(requestedName);
                    void persistMutation((project) =>
                      renameLocalScoreProjectPart({
                        project,
                        expectedRevision: project.document.revision,
                        partId: selectedPart.partId,
                        name: requestedName,
                        now: now(),
                      }));
                  }}
                  className="min-h-11 rounded-xl border border-teal-300 bg-white px-3 py-2 text-sm font-bold disabled:border-slate-200 disabled:text-slate-400"
                >
                  保存声部组名称
                </button>
                <p className="text-xs leading-5 text-teal-800">
                  当前已保存：{selectedPart.name}
                </p>
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-teal-200 bg-white p-3">
              <label className="text-sm font-bold">
                谱面乐器归属
                <select
                  value={partInstrumentDraft}
                  disabled={structureMutationDisabled}
                  onChange={(event) =>
                    setPartInstrumentDraft(event.target.value)}
                  className="mt-2 min-h-11 w-full rounded-xl border border-teal-200 bg-white px-3 py-2 disabled:bg-slate-100"
                >
                  {!partInstrumentOptions.some(
                    (option) =>
                      option.value
                      === getPartInstrumentValue(selectedPart.instrument),
                  ) ? (
                    <option
                      value={getPartInstrumentValue(selectedPart.instrument)}
                      disabled
                    >
                      {getPartInstrumentLabel(selectedPart.instrument)}（当前项目）
                    </option>
                  ) : null}
                  {partInstrumentOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={structureMutationDisabled}
                  onClick={() => {
                    if (structureMutationDisabled) return;
                    const selectedOption = partInstrumentOptions.find(
                      (option) => option.value === partInstrumentDraft,
                    );
                    if (!selectedOption) {
                      setNotice("请选择当前开放的谱面乐器归属。");
                      return;
                    }
                    void persistMutation((project) =>
                      changeLocalScoreProjectPartInstrument({
                        project,
                        expectedRevision: project.document.revision,
                        partId: selectedPart.partId,
                        instrument: selectedOption.instrument,
                        now: now(),
                      }));
                  }}
                  className="min-h-11 rounded-xl border border-teal-300 bg-white px-3 py-2 text-sm font-bold disabled:border-slate-200 disabled:text-slate-400"
                >
                  保存乐器归属
                </button>
                <p className="text-xs leading-5 text-teal-800">
                  当前已保存：{getPartInstrumentLabel(selectedPart.instrument)}
                </p>
              </div>
              <p className="mt-2 text-xs leading-5 text-teal-800">
                当前只记录谱面乐器归属；所有声部仍使用钢琴采样预览。
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={structureMutationDisabled}
                onClick={() => {
                  if (structureMutationDisabled) return;
                  const partId = `part-${createId()}`;
                  const staffId = `staff-${createId()}`;
                  const voiceId = `voice-${createId()}`;
                  void persistMutation((project) =>
                    addLocalScoreProjectPart({
                      project,
                      expectedRevision: project.document.revision,
                      partId,
                      staffId,
                      voiceId,
                      clef: selectedVoice.staff.clef,
                      now: now(),
                    }));
                }}
                className="min-h-11 rounded-xl border border-teal-300 bg-white px-3 py-2 text-sm font-bold disabled:border-slate-200 disabled:text-slate-400"
              >
                新增声部组
              </button>
              <button
                type="button"
                disabled={
                  structureMutationDisabled
                  || currentProject.document.parts.length <= 1
                }
                onClick={() => {
                  if (
                    structureMutationDisabled
                    || currentProject.document.parts.length <= 1
                  ) return;
                  void persistMutation((project) =>
                    deleteEmptyLocalScoreProjectPart({
                      project,
                      expectedRevision: project.document.revision,
                      partId: selectedVoice.partId,
                      now: now(),
                    }));
                }}
                className="min-h-11 rounded-xl border border-rose-300 bg-white px-3 py-2 text-sm font-bold text-rose-700 disabled:border-slate-200 disabled:text-slate-400"
              >
                删除空声部组
              </button>
              <button
                type="button"
                disabled={structureMutationDisabled}
                onClick={() => {
                  if (structureMutationDisabled) return;
                  void persistMutation((project) =>
                    addLocalScoreProjectVoice({
                    project,
                    expectedRevision: project.document.revision,
                    location: {
                      partId: selectedVoice.partId,
                      staffId: selectedVoice.staffId,
                    },
                    voiceId: `voice-${createId()}`,
                    now: now(),
                    }));
                }}
                className="min-h-11 rounded-xl border border-teal-300 bg-white px-3 py-2 text-sm font-bold"
              >
                新增声部
              </button>
              <button
                type="button"
                disabled={
                  isBusy
                  || structureMutationDisabled
                  || selectedVoice.staff.voices.length <= 1
                }
                onClick={() => {
                  if (structureMutationDisabled) return;
                  void persistMutation((project) =>
                    deleteEmptyLocalScoreProjectVoice({
                    project,
                    expectedRevision: project.document.revision,
                    location: getVoiceLocation(project, selectedVoiceLocation),
                    now: now(),
                    }));
                }}
                className="min-h-11 rounded-xl border border-rose-300 bg-white px-3 py-2 text-sm font-bold text-rose-700 disabled:text-slate-400"
              >
                删除空声部
              </button>
              <button
                type="button"
                disabled={structureMutationDisabled}
                onClick={() => {
                  if (structureMutationDisabled) return;
                  void persistMutation((project) =>
                    addLocalScoreProjectStaff({
                    project,
                    expectedRevision: project.document.revision,
                    partId: selectedVoice.partId,
                    staffId: `staff-${createId()}`,
                    voiceId: `voice-${createId()}`,
                    clef: selectedVoice.staff.clef,
                    now: now(),
                    }));
                }}
                className="min-h-11 rounded-xl border border-teal-300 bg-white px-3 py-2 text-sm font-bold"
              >
                新增谱表
              </button>
              <button
                type="button"
                disabled={
                  isBusy
                  || structureMutationDisabled
                  || selectedPart.staves.length <= 1
                }
                onClick={() => {
                  if (structureMutationDisabled) return;
                  void persistMutation((project) =>
                    deleteEmptyLocalScoreProjectStaff({
                    project,
                    expectedRevision: project.document.revision,
                    location: {
                      partId: selectedVoice.partId,
                      staffId: selectedVoice.staffId,
                    },
                    now: now(),
                    }));
                }}
                className="min-h-11 rounded-xl border border-rose-300 bg-white px-3 py-2 text-sm font-bold text-rose-700 disabled:text-slate-400"
              >
                删除空谱表
              </button>
            </div>
          </div>
        ) : null}
        <div className="mt-2">
          <label className="text-sm font-bold">
            项目名称
            <input
              value={editorTitle}
              disabled={isBusy}
              onChange={(event) => setEditorTitle(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
            />
          </label>
          <p className="mt-2 text-xs leading-5 text-slate-600">
            项目名称用于本机列表与管理，并通过自动保存更新；它不会代替谱面中显示的标题。
          </p>
        </div>
        <section
          className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4"
          aria-labelledby="local-score-project-credits-heading"
        >
          <h2
            id="local-score-project-credits-heading"
            className="text-base font-black text-violet-950"
          >
            谱面标题与署名
          </h2>
          <p className="mt-1 text-xs leading-5 text-violet-800">
            这些内容会显示在五线谱与固定 C 简谱的页眉。修改草稿后请显式保存；谱面标题不能为空。
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold text-violet-950">
              谱面标题
              <input
                value={scoreCreditsDraft.title}
                disabled={structureMutationDisabled}
                onChange={(event) => setScoreCreditsDraft((draft) => ({
                  ...draft,
                  title: event.target.value,
                }))}
                className="mt-2 min-h-11 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 disabled:bg-slate-100"
              />
            </label>
            <label className="text-sm font-bold text-violet-950">
              副标题（可选）
              <input
                value={scoreCreditsDraft.subtitle}
                disabled={structureMutationDisabled}
                onChange={(event) => setScoreCreditsDraft((draft) => ({
                  ...draft,
                  subtitle: event.target.value,
                }))}
                className="mt-2 min-h-11 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 disabled:bg-slate-100"
              />
            </label>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {creatorRoles.map((role) => (
              <fieldset
                key={role}
                className="rounded-xl border border-violet-200 bg-white p-3"
              >
                <legend className="px-1 text-sm font-bold text-violet-950">
                  {creatorRoleLabels[role]}
                </legend>
                <div className="grid gap-2">
                  {scoreCreditsDraft.creators.map((creator, index) =>
                    creator.role === role ? (
                      <div key={`${role}-${index}`} className="flex gap-2">
                        <label className="min-w-0 flex-1 text-xs text-violet-800">
                          <span className="sr-only">
                            {creatorRoleLabels[role]}姓名
                          </span>
                          <input
                            aria-label={`${creatorRoleLabels[role]}姓名`}
                            value={creator.name}
                            disabled={structureMutationDisabled}
                            onChange={(event) =>
                              updateScoreCreatorName(index, event.target.value)}
                            className="min-h-11 w-full rounded-xl border border-violet-200 px-3 py-2 text-sm disabled:bg-slate-100"
                          />
                        </label>
                        <button
                          type="button"
                          aria-label={`移除${creatorRoleLabels[role]}`}
                          disabled={structureMutationDisabled}
                          onClick={() => removeScoreCreator(index, role)}
                          className="min-h-11 rounded-xl border border-violet-200 px-3 text-sm font-bold text-violet-800 disabled:text-slate-400"
                        >
                          移除
                        </button>
                      </div>
                    ) : null)}
                </div>
                <button
                  type="button"
                  disabled={structureMutationDisabled}
                  onClick={() => addScoreCreator(role)}
                  className="mt-2 min-h-11 w-full rounded-xl border border-dashed border-violet-300 px-3 py-2 text-xs font-bold text-violet-800 disabled:text-slate-400"
                >
                  添加{creatorRoleLabels[role]}
                </button>
              </fieldset>
            ))}
          </div>
          <label className="mt-3 block text-sm font-bold text-violet-950">
            版权说明（可选）
            <input
              value={scoreCreditsDraft.rightsNotice}
              disabled={structureMutationDisabled}
              onChange={(event) => setScoreCreditsDraft((draft) => ({
                ...draft,
                rightsNotice: event.target.value,
              }))}
              className="mt-2 min-h-11 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 disabled:bg-slate-100"
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={structureMutationDisabled}
              onClick={saveScoreCredits}
              className="min-h-11 rounded-xl bg-violet-800 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
            >
              保存谱面信息
            </button>
            <p className="text-xs leading-5 text-violet-800">
              当前已保存谱面标题：{currentProject.document.scoreCredits.title}
            </p>
          </div>
        </section>
        <label className="mt-4 block text-sm font-bold">
          拍号
          <select
            value={currentProject.document.meter}
            disabled={isBusy}
            onChange={(event) => {
              const meter = event.target.value as NotationTimeSignature;
              void persistMutation((project) =>
                changeLocalScoreProjectMeter({
                  project,
                  expectedRevision: project.document.revision,
                  meter,
                  now: now(),
                }),
              );
            }}
            className="mt-2 min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-100"
          >
            {notationTimeSignatures.map((meter) => (
              <option key={meter} value={meter}>{meter}</option>
            ))}
          </select>
        </label>
        <div className="mt-4 flex flex-wrap gap-3">
          <label className="text-sm font-bold">
            谱号
            <select
              value={getVoice(currentProject, selectedVoiceLocation).staff.clef}
              disabled={isBusy}
              onChange={(event) => {
                const clef = event.target.value as LocalScoreProjectClefV3;
                void persistMutation((project) => {
                  const selected = getVoice(project, selectedVoiceLocation);
                  return changeLocalScoreProjectClef({
                    project,
                    expectedRevision: project.document.revision,
                    location: {
                      partId: selected.partId,
                      staffId: selected.staffId,
                    },
                    clef,
                    now: now(),
                  });
                });
              }}
              className="mt-2 block min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-100"
            >
              <option value="treble">高音谱号</option>
              <option value="bass">低音谱号</option>
            </select>
          </label>
          <label className="text-sm font-bold">
            调号
            <select
              value={currentProject.document.keySignature.fifths}
              disabled={isBusy}
              onChange={(event) => {
                const keySignature = {
                  fifths: Number(event.target.value),
                } as LocalScoreProjectKeySignatureV3;
                void persistMutation((project) =>
                  changeLocalScoreProjectKeySignature({
                    project,
                    expectedRevision: project.document.revision,
                    keySignature,
                    now: now(),
                  }),
                );
              }}
              className="mt-2 block min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-100"
            >
              <option value="-1">一个降号（B♭）</option>
              <option value="0">无升降号</option>
              <option value="1">一个升号（F♯）</option>
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          谱号与调号保存后会创建新修订并停止当前播放；五线谱与固定 C 简谱之间切换不会中断播放。调号不改写已保存的实际音高。
        </p>
        <div className="mt-4">
          <label className="text-sm font-bold">
            速度（BPM）
            <input
              type="number"
              min="30"
              max="240"
              step="1"
              value={editorTempoBpm}
              disabled={isBusy}
              onChange={(event) => setEditorTempoBpm(event.target.value)}
              className="mt-2 block min-h-11 w-28 rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
            />
          </label>
        </div>
        <div
          className={`mt-3 rounded-xl border p-3 text-sm leading-6 ${
            autosave.status === "failed"
              ? "border-rose-200 bg-rose-50 text-rose-950"
              : "border-teal-100 bg-teal-50 text-teal-950"
          }`}
          role={autosave.status === "failed" ? "alert" : "status"}
          aria-live="polite"
        >
          <p>
            {autosave.notice
              ?? "名称与速度会在停止输入 600 毫秒后自动保存。"}
          </p>
          {autosave.status === "failed" && autosave.isDirty ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={autosave.retry}
              className="mt-2 min-h-11 rounded-xl border border-rose-300 bg-white px-4 py-2 font-bold text-rose-900 disabled:text-slate-400"
            >
              重试自动保存
            </button>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-indigo-200 bg-indigo-50 p-5 text-indigo-950 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">
              {selectedEvent ? "编辑所选事件" : "输入音符或休止"}
            </h2>
            <p className="mt-1 text-sm text-indigo-800">
              {selectedEvent
                ? `正在编辑第 ${selectedEvent.location.measureNumber} 小节的已保存事件。`
                : `新事件将写入第 ${targetMeasureNumber} 小节。`}
            </p>
          </div>
          {selectedEvent ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setSelectedEvent(null)}
              className="min-h-11 rounded-xl border border-indigo-300 bg-white px-3 py-2 text-sm font-bold disabled:text-slate-400"
            >
              取消选择
            </button>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <label className="text-sm font-bold">
            目标小节
            <select
              value={targetMeasureNumber}
              disabled={isBusy}
              onChange={(event) => setTargetMeasureNumber(Number(event.target.value))}
              className="mt-2 min-h-11 w-full rounded-xl border border-indigo-300 bg-white px-3 py-2 disabled:bg-slate-100"
            >
              {measures.map((measure) => (
                <option key={measure.measureNumber} value={measure.measureNumber}>
                  第 {measure.measureNumber} 小节
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            类型
            <select
              value={eventType}
              disabled={isBusy}
              onChange={(event) => {
                const nextType = event.target.value as EditorEventType;
                setEventType(nextType);
                if (nextType === "rest") {
                  setTieToNext(false);
                  setLyric("");
                  setFingering(null);
                  setArticulations([]);
                }
              }}
              className="mt-2 min-h-11 w-full rounded-xl border border-indigo-300 bg-white px-3 py-2"
            >
              <option value="note">音符</option>
              <option value="rest">四分休止符</option>
            </select>
          </label>
          <label className="text-sm font-bold">
            音高
            <select
              value={pitch}
              disabled={isBusy || eventType === "rest"}
              onChange={(event) => setPitch(event.target.value as NotationPitch)}
              className="mt-2 min-h-11 w-full rounded-xl border border-indigo-300 bg-white px-3 py-2 disabled:bg-slate-100"
            >
              {notationPitches.map((candidate) => (
                <option key={candidate} value={candidate}>{candidate}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            时值
            <select
              value={eventType === "rest" ? "quarter" : duration}
              disabled={isBusy || eventType === "rest"}
              onChange={(event) => setDuration(event.target.value as NotationDuration)}
              className="mt-2 min-h-11 w-full rounded-xl border border-indigo-300 bg-white px-3 py-2 disabled:bg-slate-100"
            >
              {notationDurations.map((candidate) => (
                <option key={candidate} value={candidate}>{durationLabels[candidate]}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-5">
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-indigo-300 bg-white px-3 py-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={augmentationDots === 1}
              disabled={isBusy}
              onChange={(event) => setAugmentationDots(event.target.checked ? 1 : 0)}
            />
            一个附点
          </label>
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-indigo-300 bg-white px-3 py-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={tieToNext}
              disabled={isBusy || eventType === "rest"}
              onChange={(event) => setTieToNext(event.target.checked)}
            />
            延音到下一个同音
          </label>
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-indigo-300 bg-white px-3 py-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={slurToNext}
              disabled={isBusy || eventType === "rest"}
              onChange={(event) => setSlurToNext(event.target.checked)}
            />
            圆滑到下一音
          </label>
          <label className="text-sm font-bold">
            歌词
            <input
              value={lyric}
              maxLength={160}
              disabled={isBusy || eventType === "rest"}
              onChange={(event) => setLyric(event.target.value)}
              placeholder="可选，最多 80 个字符"
              className="mt-2 min-h-11 w-full rounded-xl border border-indigo-300 bg-white px-3 py-2 disabled:bg-slate-100"
            />
          </label>
          <label className="text-sm font-bold">
            单音指法
            <select
              value={fingering ?? ""}
              disabled={isBusy || eventType === "rest"}
              onChange={(event) => {
                const value = event.target.value;
                setFingering(
                  value === ""
                    ? null
                    : Number(value) as LocalScoreProjectFingeringV1,
                );
              }}
              className="mt-2 min-h-11 w-full rounded-xl border border-indigo-300 bg-white px-3 py-2 disabled:bg-slate-100"
            >
              <option value="">无</option>
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>{value} 指</option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs leading-5 text-indigo-800">
          延音线只连接同声部紧邻的同音音符；圆滑线可连接同声部紧邻的不同音符。两者均可跨连续小节，且不能越过休止符。歌词和 1–5 指法只附着在音符上。
        </p>
        <div className="mt-3 rounded-xl border border-indigo-300 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold">单音演奏法</p>
            <button
              type="button"
              disabled={
                isBusy
                || eventType === "rest"
                || articulations.length === 0
                || transportMode !== "idle"
              }
              onClick={clearSelectedEventArticulations}
              className="min-h-11 rounded-xl border border-indigo-300 px-3 py-2 text-sm font-bold text-indigo-800 disabled:text-slate-400"
            >
              {selectedEvent
                ? "清除演奏法并保存"
                : "清空演奏法草稿"}
            </button>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {articulationOptions.map(({ id, label }) => (
              <label
                key={id}
                className="flex min-h-11 items-center gap-2 rounded-xl border border-indigo-200 px-3 py-2 text-sm font-bold"
              >
                <input
                  type="checkbox"
                  checked={articulations.includes(id)}
                  disabled={isBusy || eventType === "rest"}
                  onChange={(event) =>
                    toggleArticulation(id, event.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs leading-5 text-indigo-800">
          重音、断奏与保持可组合并只附着在音符上；两种预览读取同一演奏法。当前演奏法只显示，不改变播放力度、音长或音色。
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="text-sm font-bold">
            事件起点和弦名称
            <input
              value={chordSymbol}
              maxLength={80}
              disabled={isBusy}
              onChange={(event) => setChordSymbol(event.target.value)}
              placeholder="可选，例如 C、Am7、G/B"
              className="mt-2 min-h-11 w-full rounded-xl border border-indigo-300 bg-white px-3 py-2 disabled:bg-slate-100"
            />
          </label>
          <button
            type="button"
            disabled={isBusy || transportMode !== "idle"}
            onClick={clearSelectedEventChordSymbol}
            className="min-h-11 rounded-xl border border-indigo-300 bg-white px-3 py-2 text-sm font-bold text-indigo-800 disabled:text-slate-400"
          >
            {selectedEvent
              ? "清除和弦名称并保存"
              : "清空和弦名称草稿"}
          </button>
        </div>
        <p className="mt-2 text-xs leading-5 text-indigo-800">
          和弦名称锚定音符或休止符的起点；五线谱与固定 C 简谱读取同一名称。当前只显示名称，不自动生成和弦图、配器或演奏。
        </p>
        <label className="mt-3 block text-sm font-bold">
          事件起点力度记号
          <select
            aria-label="力度记号"
            value={dynamicMark ?? ""}
            disabled={isBusy}
            onChange={(event) => setDynamicMark(
              event.target.value === ""
                ? null
                : event.target.value as LocalScoreProjectDynamicMarkV1,
            )}
            className="mt-2 min-h-11 w-full rounded-xl border border-indigo-300 bg-white px-3 py-2 disabled:bg-slate-100"
          >
            {dynamicMarkOptions.map((option) => (
              <option key={option.value || "none"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs leading-5 text-indigo-800">
          力度记号锚定音符或休止符的起点；两种预览读取同一记号。当前只显示 pp–ff，不改变真实播放力度、音长或音色。
        </p>
        <label className="mt-3 block text-sm font-bold">
          事件起点制音踏板记号
          <select
            aria-label="制音踏板记号"
            value={damperPedalMark ?? ""}
            disabled={isBusy}
            onChange={(event) => setDamperPedalMark(
              event.target.value === ""
                ? null
                : event.target.value as LocalScoreProjectDamperPedalMarkV1,
            )}
            className="mt-2 min-h-11 w-full rounded-xl border border-indigo-300 bg-white px-3 py-2 disabled:bg-slate-100"
          >
            {damperPedalMarkOptions.map((option) => (
              <option key={option.value || "none"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs leading-5 text-indigo-800">
          制音踏板记号锚定音符或休止符起点；当前只显示 Ped.／释放记号，不发送 MIDI CC64，也不改变真实 sustain、音长或 transport。
        </p>
        <label className="mt-3 block text-sm font-bold">
          事件起点延长记号
          <select
            aria-label="延长记号"
            value={fermataMark ?? ""}
            disabled={isBusy}
            onChange={(event) => setFermataMark(
              event.target.value === ""
                ? null
                : event.target.value as LocalScoreProjectFermataMarkV1,
            )}
            className="mt-2 min-h-11 w-full rounded-xl border border-indigo-300 bg-white px-3 py-2 disabled:bg-slate-100"
          >
            {fermataMarkOptions.map((option) => (
              <option key={option.value || "none"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs leading-5 text-indigo-800">
          延长记号锚定音符或休止符起点；当前只显示 𝄐，不延长真实播放、不改变 duration 或 transport。
        </p>
        <button
          type="button"
          disabled={isBusy || transportMode !== "idle"}
          onClick={saveEvent}
          className="mt-4 min-h-11 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
        >
          {selectedEvent
            ? "更新所选事件并保存"
            : `添加到第 ${targetMeasureNumber} 小节并保存`}
        </button>
        {transportMode !== "idle" ? (
          <p className="mt-2 text-xs font-semibold text-amber-800" role="status">
            播放或节拍器运行期间不能保存事件；停止后可继续，当前播放不会被重建或中断。
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedEvent ? (
            <>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  if (!currentProject) return;
                  try {
                    const sourceEvent = getVoiceEvents(currentProject, selectedVoiceLocation)
                      .find(({ event }) => event.id === selectedEvent.eventId)
                      ?.event;
                    setCopiedEvent(copyLocalScoreProjectEvent({
                      project: currentProject,
                      location: selectedEvent.location,
                      eventId: selectedEvent.eventId,
                    }));
                    setNotice(
                      sourceEvent?.type === "note"
                      && (sourceEvent.tieToNext || sourceEvent.slurToNext)
                      ? "已复制附点、歌词、指法和和弦名称以及演奏法，但单事件复制不包含跨事件延音或圆滑关系；粘贴副本不会带延音线或圆滑线。谱面尚未修改。"
                      : "已复制所选事件及其和弦名称，并保留适用的演奏法；谱面尚未修改，可选择目标小节后粘贴。");
                  } catch (error) {
                    setNotice(error instanceof Error
                      ? error.message
                      : "无法复制所选事件，请重新选择。");
                  }
                }}
                className="min-h-11 rounded-xl border border-indigo-300 bg-white px-3 py-2 text-sm font-bold text-indigo-800 disabled:text-slate-400"
              >
                复制所选事件
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() =>
                  void persistMutation((project) =>
                    moveLocalScoreProjectEvent({
                      project,
                      expectedRevision: project.document.revision,
                      source: selectedEvent.location,
                      destination: getEventLocation(
                        project,
                        selectedVoiceLocation,
                        targetMeasureNumber,
                      ),
                      eventId: selectedEvent.eventId,
                      now: now(),
                    }),
                  )
                }
                className="min-h-11 rounded-xl border border-indigo-300 bg-white px-3 py-2 text-sm font-bold text-indigo-800 disabled:text-slate-400"
              >
                移动到第 {targetMeasureNumber} 小节并保存
              </button>
            </>
          ) : null}
          <button
            type="button"
            disabled={isBusy || !copiedEvent}
            onClick={() => {
              if (!copiedEvent) return;
              void persistMutation((project) =>
                pasteLocalScoreProjectEvent({
                  project,
                  expectedRevision: project.document.revision,
                  destination: getEventLocation(project, selectedVoiceLocation, targetMeasureNumber),
                  eventId: `event-${createId()}`,
                  input: copiedEvent,
                  now: now(),
                }),
              );
            }}
            className="min-h-11 rounded-xl border border-indigo-300 bg-white px-3 py-2 text-sm font-bold text-indigo-800 disabled:text-slate-400"
          >
            {copiedEvent
              ? `粘贴到第 ${targetMeasureNumber} 小节并保存`
              : "尚未复制事件"}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">当前声部预览</h2>
            <p className="text-sm text-slate-500">
              {currentProject.document.meter} · {measures.length} 小节 · {events.length} 个事件
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() =>
                void persistMutation((project) => {
                  const selected = getVoice(project, selectedVoiceLocation);
                  return appendLocalScoreProjectMeasure({
                    project,
                    expectedRevision: project.document.revision,
                    partId: selected.partId,
                    staffId: selected.staffId,
                    voiceId: selected.voiceId,
                    now: now(),
                  });
                })
              }
              className="min-h-11 rounded-xl border border-indigo-300 px-3 py-2 text-sm font-bold text-indigo-800 disabled:text-slate-400"
            >
              追加空小节
            </button>
            <button
              type="button"
              disabled={isBusy || measures.length <= 1}
              title={measures.length <= 1
                ? "至少需要保留一个小节。"
                : "只有末尾小节为空时才能删除。"}
              onClick={() =>
                void persistMutation((project) => {
                  const selected = getVoice(project, selectedVoiceLocation);
                  return deleteEmptyLocalScoreProjectMeasure({
                    project,
                    expectedRevision: project.document.revision,
                    partId: selected.partId,
                    staffId: selected.staffId,
                    voiceId: selected.voiceId,
                    now: now(),
                  });
                })
              }
              className="min-h-11 rounded-xl border border-rose-300 px-3 py-2 text-sm font-bold text-rose-700 disabled:text-slate-400"
            >
              删除末尾空小节
            </button>
            <button
              type="button"
              disabled={isBusy || currentProject.undoStack.length === 0}
              onClick={() =>
                void persistMutation((project) =>
                  undoLocalScoreProject({
                    project,
                    expectedRevision: project.document.revision,
                    now: now(),
                  }),
                )
              }
              className="min-h-11 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold disabled:text-slate-400"
            >
              撤销
            </button>
            <button
              type="button"
              disabled={isBusy || currentProject.redoStack.length === 0}
              onClick={() =>
                void persistMutation((project) =>
                  redoLocalScoreProject({
                    project,
                    expectedRevision: project.document.revision,
                    now: now(),
                  }),
                )
              }
              className="min-h-11 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold disabled:text-slate-400"
            >
              重做
            </button>
          </div>
        </div>

        {events.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            当前小节为空。添加一个音符或休止符后即可预览和播放。
          </p>
        ) : (
          <ol className="mt-4 grid gap-2">
            {events.map(({ event, location }, index) => (
              <li
                key={event.id}
                className={`flex items-center justify-between gap-3 rounded-2xl border p-3 ${
                  selectedEvent?.eventId === event.id
                    ? "border-indigo-400 bg-indigo-50"
                    : "border-slate-200"
                }`}
              >
                <div>
                  <p className="font-mono text-sm">
                    {index + 1}. 第 {location.measureNumber} 小节 · {event.type === "note" ? event.pitch : "休止"} · {durationLabels[event.duration]}
                    {event.augmentationDots === 1 ? " · 附点" : ""}
                    {event.type === "note" && event.tieToNext ? " · 延音到下一音" : ""}
                    {event.type === "note" && event.slurToNext ? " · 圆滑到下一音" : ""}
                    {event.type === "note" && event.lyric ? ` · 歌词：${event.lyric}` : ""}
                    {event.type === "note" && event.fingering !== null
                      ? ` · 指法：${event.fingering}`
                      : ""}
                    {event.type === "note" && event.articulations.length > 0
                      ? ` · 演奏法：${event.articulations
                        .map((articulation) =>
                          articulationOptions.find(({ id }) =>
                            id === articulation)?.label)
                        .join("、")}`
                      : ""}
                    {event.dynamicMark === null
                      ? ""
                      : ` · 力度 ${event.dynamicMark}`}
                    {event.chordSymbol !== null
                      ? ` · 和弦：${event.chordSymbol}`
                      : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => selectEvent({ eventId: event.id, location })}
                    className="min-h-11 rounded-xl border border-indigo-300 px-3 py-2 text-sm font-bold text-indigo-800 disabled:text-slate-400"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      if (selectedEvent?.eventId === event.id) {
                        setSelectedEvent(null);
                      }
                      void persistMutation((project) =>
                        deleteLocalScoreProjectEvent({
                          project,
                          expectedRevision: project.document.revision,
                          location,
                          eventId: event.id,
                          now: now(),
                        }),
                      );
                    }}
                    className="min-h-11 rounded-xl border border-rose-300 px-3 py-2 text-sm font-bold text-rose-700 disabled:text-slate-400"
                  >
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <LocalScoreProjectPlaybackControls
        project={currentProject}
        targetLocation={getVoiceLocation(currentProject, selectedVoiceLocation)}
        selectedEventId={selectedEvent?.eventId}
        onSelectEvent={selectEvent}
        onModeChange={setTransportMode}
        disableTransportStart={
          autosave.isDirty
          || autosave.status === "saving"
          || Boolean(autosave.recoveryCandidate)
        }
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            autosave.deactivate();
            setCurrentProject(null);
            selectedVoiceLocationRef.current = null;
            setSelectedVoiceLocation(null);
            setSelectedEvent(null);
            setCopiedEvent(null);
            setTargetMeasureNumber(1);
            setTransportMode("idle");
            setNotice(null);
            void refreshProjects();
          }}
          className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold disabled:text-slate-400"
        >
          返回项目列表
        </button>
      </div>

      {notice ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950" role="status">
          {notice}
        </p>
      ) : null}
      <p className="text-xs leading-5 text-slate-500">
        当前是本机基础谱草稿，不是正式识谱、确认谱面、练习目标或评分结果。
      </p>
    </div>
  );
}
