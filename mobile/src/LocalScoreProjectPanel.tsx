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
  changeLocalScoreProjectKeySignature,
  changeLocalScoreProjectMeter,
  copyLocalScoreProjectEvent,
  createLocalScoreProject,
  deleteEmptyLocalScoreProjectMeasure,
  deleteEmptyLocalScoreProjectPart,
  deleteEmptyLocalScoreProjectStaff,
  deleteEmptyLocalScoreProjectVoice,
  deleteLocalScoreProjectEvent,
  moveLocalScoreProjectEvent,
  pasteLocalScoreProjectEvent,
  redoLocalScoreProject,
  undoLocalScoreProject,
  updateLocalScoreProjectEvent,
  type LocalScoreProjectEventInput,
  type LocalScoreProjectV1,
  type LocalScoreProjectVoiceLocation,
} from "../../lib/music/localScoreProject";
import type {
  LocalScoreProjectClefV3,
  LocalScoreProjectKeySignatureV3,
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

const durationLabels: Record<NotationDuration, string> = {
  half: "二分音符",
  quarter: "四分音符",
  eighth: "八分音符",
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
  const [editorTitle, setEditorTitle] = useState("");
  const [editorTempoBpm, setEditorTempoBpm] = useState("90");
  const [eventType, setEventType] = useState<EditorEventType>("note");
  const [pitch, setPitch] = useState<NotationPitch>("C4");
  const [duration, setDuration] = useState<NotationDuration>("quarter");
  const [augmentationDots, setAugmentationDots] = useState<0 | 1>(0);
  const [tieToNext, setTieToNext] = useState(false);
  const [lyric, setLyric] = useState("");
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
    }: {
      resetSettings?: boolean;
      savedSettings?: Readonly<{ title: string; tempoBpm: string }>;
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
    publishProject(project, { savedSettings });
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
      const project = createLocalScoreProject({
        projectId,
        title: newTitle,
        now: now(),
      });
      const result = await persistNewLocalScoreProject({
        store: resolvedStore,
        project,
      });
      if (result.status === "saved") {
        publishProject(result.project, { resetSettings: true });
        setNotice("谱项目已创建并保存在本机。");
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
            }
            : {
              type: "note",
              pitch,
              duration,
              augmentationDots,
              tieToNext,
              lyric,
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
          }
          : {
            type: "note",
            pitch,
            duration,
            augmentationDots,
            tieToNext,
            lyric,
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
    if (located.event.type === "note" && located.event.pitch) {
      setPitch(located.event.pitch);
      setDuration(located.event.duration);
      setTieToNext(located.event.tieToNext);
      setLyric(located.event.lyric ?? "");
    } else {
      setDuration("quarter");
      setTieToNext(false);
      setLyric("");
    }
    setAugmentationDots(located.event.augmentationDots);
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
    setSelectedEvent(null);
    setCopiedEvent(null);
    setTargetMeasureNumber(
      getVoiceMeasures(currentProject, normalized)[0]?.measureNumber ?? 1,
    );
  };

  if (!currentProject) {
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
            项目名称
            <input
              value={newTitle}
              disabled={isBusy || sourceStatus === "unavailable"}
              onChange={(event) => setNewTitle(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-teal-300 bg-white px-3 py-2 disabled:bg-slate-100"
            />
          </label>
          <button
            type="button"
            disabled={isBusy || sourceStatus === "unavailable"}
            onClick={() => void createProject()}
            className="mt-3 min-h-11 rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
          >
            {isBusy ? "正在读取本机项目…" : "创建并保存"}
          </button>
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
                      声部组 {index + 1}
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
        </div>
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
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
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
        </div>
        <p className="mt-2 text-xs leading-5 text-indigo-800">
          延音线只允许连接同一声部中紧邻的同音音符；可跨连续小节。歌词只附着在音符上。
        </p>
        <button
          type="button"
          disabled={isBusy}
          onClick={saveEvent}
          className="mt-4 min-h-11 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
        >
          {selectedEvent
            ? "更新所选事件并保存"
            : `添加到第 ${targetMeasureNumber} 小节并保存`}
        </button>
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
                    setNotice(sourceEvent?.type === "note" && sourceEvent.tieToNext
                      ? "已复制附点和歌词，但单事件复制不包含跨事件延音关系；粘贴副本不会带延音线。谱面尚未修改。"
                      : "已复制所选事件；谱面尚未修改，可选择目标小节后粘贴。");
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
                    {event.type === "note" && event.lyric ? ` · 歌词：${event.lyric}` : ""}
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
