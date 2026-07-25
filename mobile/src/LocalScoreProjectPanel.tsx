"use client";

import { useCallback, useEffect, useState } from "react";

import { useLocalScoreProjectPlayback } from "../../components/piano/useLocalScoreProjectPlayback";
import {
  LocalScoreProjectDomainError,
  addLocalScoreProjectEvent,
  changeLocalScoreProjectMeter,
  createLocalScoreProject,
  deleteLocalScoreProjectEvent,
  redoLocalScoreProject,
  renameLocalScoreProject,
  undoLocalScoreProject,
  type LocalScoreProjectV1,
} from "../../lib/music/localScoreProject";
import {
  notationDurations,
  notationPitches,
  notationTimeSignatures,
  type NotationDuration,
  type NotationPitch,
  type NotationTimeSignature,
} from "../../lib/practice/localNotationFragmentDraft";
import {
  createIndexedDbLocalScoreProjectStore,
  listLocalScoreProjects,
  loadLocalScoreProject,
  persistLocalScoreProjectChange,
  persistNewLocalScoreProject,
  type LocalScoreProjectStore,
} from "./runtime/localScoreProjectStorage";

type EditorEventType = "note" | "rest";

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

const getPrimaryLocation = (project: LocalScoreProjectV1) => {
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
    measureNumber: 1,
  };
};

const getPrimaryEvents = (project: LocalScoreProjectV1) => {
  const voice = project.document.parts[0]?.staves[0]?.voices[0];
  return voice
    ? [...voice.measures]
        .sort((left, right) => left.measureNumber - right.measureNumber)
        .flatMap((measure) => measure.events)
    : [];
};

function LocalScoreProjectPlaybackControls({
  project,
}: {
  project: LocalScoreProjectV1;
}) {
  const [bpm, setBpm] = useState(90);
  const playback = useLocalScoreProjectPlayback({
    document: project.document,
    bpm,
  });

  return (
    <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-950 shadow-sm">
      <p className="text-sm font-semibold text-rose-700">本机采样钢琴预览</p>
      <h2 className="mt-1 text-xl font-black">播放当前已保存修订</h2>
      <p className="mt-2 text-sm leading-6">
        休止会保留时长；离开页面、进入后台或主动停止时会关闭全部声音。播放不创建练习目标、演奏记录或成绩。
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm font-bold">
          速度（BPM）
          <input
            type="number"
            min="30"
            max="240"
            value={bpm}
            disabled={playback.isPlaying}
            onChange={(event) => setBpm(Number(event.target.value))}
            className="mt-2 block min-h-11 w-28 rounded-xl border border-rose-300 bg-white px-3 py-2 disabled:bg-slate-100"
          />
        </label>
        {playback.isPlaying ? (
          <button
            type="button"
            onClick={playback.stop}
            className="min-h-11 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-800"
          >
            停止播放
          </button>
        ) : (
          <button
            type="button"
            disabled={playback.plan.status === "blocked"}
            onClick={playback.play}
            className="min-h-11 rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
          >
            播放草稿
          </button>
        )}
      </div>
      {playback.plan.status === "ready" && playback.plan.warnings.length > 0 ? (
        <p className="mt-3 text-xs leading-5 text-rose-800">
          {playback.plan.warnings.join(" ")}
        </p>
      ) : null}
      {playback.plan.status === "blocked" ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {playback.plan.reason}
        </p>
      ) : null}
      {playback.notice ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="status">
          {playback.notice}
        </p>
      ) : null}
    </section>
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
  const [newTitle, setNewTitle] = useState("我的第一份谱");
  const [editorTitle, setEditorTitle] = useState("");
  const [eventType, setEventType] = useState<EditorEventType>("note");
  const [pitch, setPitch] = useState<NotationPitch>("C4");
  const [duration, setDuration] = useState<NotationDuration>("quarter");
  const [notice, setNotice] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(true);
  const [sourceStatus, setSourceStatus] =
    useState<"available" | "unavailable">("available");

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

  const publishProject = (project: LocalScoreProjectV1) => {
    setCurrentProject(project);
    setEditorTitle(project.title);
    setProjects((previous) => [
      project,
      ...previous.filter((candidate) => candidate.projectId !== project.projectId),
    ]);
  };

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
        publishProject(result.project);
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
      publishProject(result.project);
      setNotice("已重新打开本机保存的谱项目。");
    } else {
      setNotice(result.notice ?? "未找到这份本机谱项目。");
    }
    setIsBusy(false);
  };

  const persistMutation = async (
    createProposal: (project: LocalScoreProjectV1) => LocalScoreProjectV1,
  ) => {
    if (!currentProject || isBusy) return;
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

  const addEvent = () => {
    void persistMutation((project) =>
      addLocalScoreProjectEvent({
        project,
        expectedRevision: project.document.revision,
        location: getPrimaryLocation(project),
        eventId: `event-${createId()}`,
        input: eventType === "rest"
          ? { type: "rest", pitch: null, duration: "quarter" }
          : { type: "note", pitch, duration },
        now: now(),
      }),
    );
  };

  const events = currentProject ? getPrimaryEvents(currentProject) : [];

  if (!currentProject) {
    return (
      <div className="grid gap-4">
        <section className="rounded-3xl border border-teal-200 bg-teal-50 p-5 text-teal-950 shadow-sm">
          <p className="text-sm font-semibold text-teal-700">S1 本机基础谱项目</p>
          <h1 className="mt-1 text-2xl font-black">创建并保存一份基础谱</h1>
          <p className="mt-2 text-sm leading-6">
            内容、撤销历史和播放都只在本机处理，不登录、不上传，也不产生评分。
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
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold">{project.title}</p>
                    <p className="text-xs text-slate-500">
                      修订 {project.document.revision} · {project.document.meter}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void openProject(project.projectId)}
                    className="min-h-11 shrink-0 rounded-xl border border-teal-300 bg-teal-50 px-3 py-2 text-sm font-bold text-teal-900 disabled:text-slate-400"
                  >
                    打开
                  </button>
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
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
          <label className="text-sm font-bold">
            项目名称
            <input
              value={editorTitle}
              disabled={isBusy}
              onChange={(event) => setEditorTitle(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
            />
          </label>
          <button
            type="button"
            disabled={isBusy}
            onClick={() =>
              void persistMutation((project) =>
                renameLocalScoreProject({
                  project,
                  expectedRevision: project.document.revision,
                  title: editorTitle,
                  now: now(),
                }),
              )
            }
            className="min-h-11 self-end rounded-xl border border-teal-300 bg-teal-50 px-4 py-2 text-sm font-bold text-teal-900 disabled:text-slate-400"
          >
            保存名称
          </button>
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
      </section>

      <section className="rounded-3xl border border-indigo-200 bg-indigo-50 p-5 text-indigo-950 shadow-sm">
        <h2 className="text-xl font-black">输入音符或休止</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-bold">
            类型
            <select
              value={eventType}
              disabled={isBusy}
              onChange={(event) => setEventType(event.target.value as EditorEventType)}
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
        <button
          type="button"
          disabled={isBusy}
          onClick={addEvent}
          className="mt-4 min-h-11 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
        >
          添加到第一小节并保存
        </button>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">第一声部预览</h2>
            <p className="text-sm text-slate-500">
              {currentProject.document.meter} · {events.length} 个事件
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
            {events.map((event, index) => (
              <li
                key={event.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-3"
              >
                <p className="font-mono text-sm">
                  {index + 1}. {event.type === "note" ? event.pitch : "休止"} · {durationLabels[event.duration]}
                </p>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() =>
                    void persistMutation((project) =>
                      deleteLocalScoreProjectEvent({
                        project,
                        expectedRevision: project.document.revision,
                        location: getPrimaryLocation(project),
                        eventId: event.id,
                        now: now(),
                      }),
                    )
                  }
                  className="min-h-11 rounded-xl border border-rose-300 px-3 py-2 text-sm font-bold text-rose-700 disabled:text-slate-400"
                >
                  删除
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <LocalScoreProjectPlaybackControls project={currentProject} />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            setCurrentProject(null);
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
