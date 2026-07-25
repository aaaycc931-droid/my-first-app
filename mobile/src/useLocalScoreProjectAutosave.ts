"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  LOCAL_SCORE_PROJECT_MAX_TITLE_LENGTH,
  changeLocalScoreProjectSettings,
  type LocalScoreProjectV1,
} from "../../lib/music/localScoreProject";
import {
  createLocalScoreProjectRecoveryCandidate,
  type LocalScoreProjectRecoveryCandidateV1,
} from "../../lib/music/localScoreProjectRecovery";
import type {
  LocalScoreProjectTransportMode,
} from "../../components/piano/useLocalScoreProjectTransport";
import type {
  LocalScoreProjectStore,
} from "./runtime/localScoreProjectStorage";

export const LOCAL_SCORE_PROJECT_AUTOSAVE_DELAY_MS = 600;

export type LocalScoreProjectAutosaveStatus =
  | "clean"
  | "dirty"
  | "deferred"
  | "saving"
  | "saved"
  | "failed"
  | "recovery-available";

type SavedSnapshot = Readonly<{
  title: string;
  tempoBpm: string;
}>;

const normalizeSettingsTitle = (title: string) =>
  title.trim().slice(0, LOCAL_SCORE_PROJECT_MAX_TITLE_LENGTH)
  || "未命名乐谱";

export function useLocalScoreProjectAutosave({
  store,
  project,
  title,
  tempoBpm,
  transportMode,
  now,
  onProjectSaved,
}: {
  store: LocalScoreProjectStore;
  project: LocalScoreProjectV1 | null;
  title: string;
  tempoBpm: string;
  transportMode: LocalScoreProjectTransportMode;
  now: () => string;
  onProjectSaved: (
    project: LocalScoreProjectV1,
    snapshot: SavedSnapshot,
  ) => void;
}) {
  const [status, setStatus] =
    useState<LocalScoreProjectAutosaveStatus>("clean");
  const [notice, setNotice] = useState<string | null>(null);
  const [recoveryCandidate, setRecoveryCandidate] =
    useState<LocalScoreProjectRecoveryCandidateV1 | null>(null);
  const [blockingRecoveryProjectId, setBlockingRecoveryProjectId] =
    useState<string | null>(null);
  const [isRecoveryActionPending, setIsRecoveryActionPending] =
    useState(false);
  const [recoveryLoadedProjectId, setRecoveryLoadedProjectId] =
    useState<string | null>(null);
  const [rescheduleGeneration, setRescheduleGeneration] = useState(0);
  const generationRef = useRef(0);
  const inFlightRef = useRef(false);
  const queuedRef = useRef(false);
  const recoveryActionInFlightRef = useRef(false);
  const blockingRecoveryRef =
    useRef<LocalScoreProjectRecoveryCandidateV1 | null>(null);
  const ownedRecoveryRef =
    useRef<LocalScoreProjectRecoveryCandidateV1 | null>(null);
  const latestRef = useRef({
    project,
    title,
    tempoBpm,
    transportMode,
  });

  useEffect(() => {
    latestRef.current = { project, title, tempoBpm, transportMode };
  }, [project, tempoBpm, title, transportMode]);

  const tempoNumber = Number(tempoBpm);
  const settingsAreValid = Number.isSafeInteger(tempoNumber)
    && tempoNumber >= 30
    && tempoNumber <= 240;
  const isDirty = Boolean(
    project
    && (
      normalizeSettingsTitle(title) !== project.title
      || tempoNumber !== project.tempoBpm
    ),
  );
  const supportsRecoveryProtocol = Boolean(
    store.stageRecoveryCandidate
    && store.listRecoveryCandidates
    && store.promoteRecoveryCandidate
    && store.discardRecoveryCandidate,
  );

  useEffect(() => {
    generationRef.current += 1;
  }, [project?.projectId, project?.document.revision, title, tempoBpm]);

  const projectId = project?.projectId;

  useEffect(() => {
    let active = true;
    blockingRecoveryRef.current = null;
    ownedRecoveryRef.current = null;
    if (!projectId) {
      return () => {
        active = false;
      };
    }
    if (!supportsRecoveryProtocol || !store.listRecoveryCandidates) {
      return () => {
        active = false;
      };
    }
    void store.listRecoveryCandidates(projectId)
      .then((candidates) => {
        if (!active) return;
        const candidate = candidates[0] ?? null;
        blockingRecoveryRef.current = candidate;
        setRecoveryCandidate(candidate);
        setBlockingRecoveryProjectId(candidate?.projectId ?? null);
        setStatus(candidate ? "recovery-available" : "clean");
      })
      .catch(() => {
        if (!active) return;
        setStatus("failed");
        setNotice("无法读取本机恢复候选；未自动套用或覆盖任何内容。");
      })
      .finally(() => {
        if (active) setRecoveryLoadedProjectId(projectId);
      });
    return () => {
      active = false;
    };
  }, [projectId, store, supportsRecoveryProtocol]);

  const runAutosave = useCallback(async () => {
    const snapshot = latestRef.current;
    const snapshotTempo = Number(snapshot.tempoBpm);
    const snapshotIsValid = Number.isSafeInteger(snapshotTempo)
      && snapshotTempo >= 30
      && snapshotTempo <= 240;
    const snapshotIsDirty = Boolean(
      snapshot.project
      && (
        normalizeSettingsTitle(snapshot.title) !== snapshot.project.title
        || snapshotTempo !== snapshot.project.tempoBpm
      ),
    );
    if (!snapshot.project || !snapshotIsValid || !snapshotIsDirty) return;
    if (blockingRecoveryRef.current) {
      setStatus("recovery-available");
      return;
    }
    if (
      !supportsRecoveryProtocol
      || !store.stageRecoveryCandidate
      || !store.listRecoveryCandidates
      || !store.promoteRecoveryCandidate
    ) {
      setStatus("failed");
      setNotice("当前本机存储不支持自动保存；已保存谱面保持不变。");
      return;
    }
    if (inFlightRef.current) {
      queuedRef.current = true;
      return;
    }

    inFlightRef.current = true;
    const startedGeneration = generationRef.current;
    const savedSnapshot = {
      title: snapshot.title,
      tempoBpm: snapshot.tempoBpm,
    };
    setStatus("saving");
    setNotice("正在自动保存名称与速度…");
    try {
      const existing = (
        await store.listRecoveryCandidates(snapshot.project.projectId)
      )[0] ?? null;
      if (
        latestRef.current.project?.projectId !== snapshot.project.projectId
      ) return;
      if (blockingRecoveryRef.current) {
        setStatus("recovery-available");
        return;
      }
      const ownedRecovery = ownedRecoveryRef.current;
      if (
        existing
        && (
          !ownedRecovery
          || ownedRecovery.candidateId !== existing.candidateId
          || ownedRecovery.candidateSequence !== existing.candidateSequence
        )
      ) {
        blockingRecoveryRef.current = existing;
        setRecoveryCandidate(existing);
        setBlockingRecoveryProjectId(existing.projectId);
        setStatus("recovery-available");
        setNotice(
          "发现另一页面或先前会话留下的恢复候选；请明确恢复或丢弃后再自动保存。",
        );
        return;
      }
      const proposal = changeLocalScoreProjectSettings({
        project: snapshot.project,
        expectedRevision: snapshot.project.document.revision,
        title: snapshot.title,
        tempoBpm: snapshotTempo,
        now: now(),
      });
      if (proposal === snapshot.project) {
        setStatus("clean");
        setNotice(null);
        return;
      }
      const existingMatchesProposal = Boolean(
        existing
        && existing.baseRevision === snapshot.project.document.revision
        && existing.proposedProject.title === proposal.title
        && existing.proposedProject.tempoBpm === proposal.tempoBpm,
      );
      const candidate = existingMatchesProposal && existing
        ? existing
        : createLocalScoreProjectRecoveryCandidate({
          candidateId: snapshot.project.projectId,
          baseProject: snapshot.project,
          candidateSequence: (existing?.candidateSequence ?? 0) + 1,
          capturedAt: now(),
          proposedProject: proposal,
        });
      if (!existingMatchesProposal) {
        await store.stageRecoveryCandidate(
          candidate,
          existing?.candidateSequence ?? null,
        );
      }
      ownedRecoveryRef.current = candidate;
      setBlockingRecoveryProjectId(null);
      setRecoveryCandidate(candidate);
      if (
        latestRef.current.project?.projectId !== snapshot.project.projectId
      ) return;
      if (generationRef.current !== startedGeneration) {
        queuedRef.current = true;
        return;
      }
      if (latestRef.current.transportMode !== "idle") {
        setStatus("deferred");
        setNotice("未完成修改已暂存在本机；停止播放后会继续自动保存。");
        return;
      }
      const promoted = await store.promoteRecoveryCandidate(
        candidate.candidateId,
        candidate.candidateSequence,
      );
      ownedRecoveryRef.current = null;
      setRecoveryCandidate(null);
      if (
        latestRef.current.project?.projectId !== snapshot.project.projectId
      ) return;
      onProjectSaved(promoted, savedSnapshot);
      setStatus("saved");
      setNotice(`名称与速度已自动保存到修订 ${promoted.document.revision}。`);
      if (generationRef.current !== startedGeneration) {
        queuedRef.current = true;
      }
    } catch (error) {
      setStatus("failed");
      setNotice(
        error instanceof Error
          ? `${error.message} 恢复候选和已保存谱面均未被静默覆盖。`
          : "自动保存失败；恢复候选和已保存谱面均保持不变。",
      );
    } finally {
      inFlightRef.current = false;
      if (queuedRef.current) {
        queuedRef.current = false;
        setRescheduleGeneration((current) => current + 1);
      }
    }
  }, [
    now,
    onProjectSaved,
    store,
    supportsRecoveryProtocol,
  ]);

  useEffect(() => {
    const isLoadingRecovery = Boolean(
      projectId
      && supportsRecoveryProtocol
      && recoveryLoadedProjectId !== projectId,
    );
    if (!project || isLoadingRecovery || blockingRecoveryRef.current) return;
    if (!supportsRecoveryProtocol) return;
    if (!isDirty || !settingsAreValid) return;
    const timer = window.setTimeout(() => {
      void runAutosave();
    }, LOCAL_SCORE_PROJECT_AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [
    isDirty,
    project,
    projectId,
    recoveryLoadedProjectId,
    rescheduleGeneration,
    runAutosave,
    settingsAreValid,
    supportsRecoveryProtocol,
    title,
    tempoBpm,
    transportMode,
  ]);

  const retry = useCallback(() => {
    void runAutosave();
  }, [runAutosave]);

  const deactivate = useCallback(() => {
    generationRef.current += 1;
    queuedRef.current = false;
    latestRef.current = {
      ...latestRef.current,
      project: null,
      transportMode: "idle",
    };
  }, []);

  const promoteRecovery = useCallback(async () => {
    const candidate = blockingRecoveryRef.current;
    if (
      !candidate
      || !store.promoteRecoveryCandidate
      || recoveryActionInFlightRef.current
    ) return null;
    recoveryActionInFlightRef.current = true;
    const capturedProjectId = candidate.projectId;
    setIsRecoveryActionPending(true);
    setStatus("saving");
    setNotice("正在恢复并保存未完成修改…");
    try {
      const promoted = await store.promoteRecoveryCandidate(
        candidate.candidateId,
        candidate.candidateSequence,
      );
      if (
        latestRef.current.project?.projectId !== capturedProjectId
      ) return null;
      blockingRecoveryRef.current = null;
      ownedRecoveryRef.current = null;
      setRecoveryCandidate(null);
      setBlockingRecoveryProjectId(null);
      onProjectSaved(promoted, {
        title: promoted.title,
        tempoBpm: String(promoted.tempoBpm),
      });
      setStatus("saved");
      setNotice(`未完成修改已恢复并保存到修订 ${promoted.document.revision}。`);
      return promoted;
    } catch (error) {
      if (
        latestRef.current.project?.projectId !== capturedProjectId
      ) return null;
      setStatus("failed");
      setNotice(error instanceof Error
        ? error.message
        : "恢复候选保存失败；候选和已保存谱面均保持不变。");
      return null;
    } finally {
      recoveryActionInFlightRef.current = false;
      setIsRecoveryActionPending(false);
    }
  }, [onProjectSaved, store]);

  const discardRecovery = useCallback(async () => {
    const candidate = blockingRecoveryRef.current;
    if (
      !candidate
      || !store.discardRecoveryCandidate
      || recoveryActionInFlightRef.current
    ) return false;
    recoveryActionInFlightRef.current = true;
    const capturedProjectId = candidate.projectId;
    setIsRecoveryActionPending(true);
    try {
      await store.discardRecoveryCandidate(
        candidate.candidateId,
        candidate.candidateSequence,
      );
      if (
        latestRef.current.project?.projectId !== capturedProjectId
      ) return false;
      blockingRecoveryRef.current = null;
      ownedRecoveryRef.current = null;
      setRecoveryCandidate(null);
      setBlockingRecoveryProjectId(null);
      setStatus("clean");
      setNotice("未完成恢复候选已丢弃；已保存谱面没有变化。");
      return true;
    } catch (error) {
      if (
        latestRef.current.project?.projectId !== capturedProjectId
      ) return false;
      setStatus("failed");
      setNotice(error instanceof Error
        ? error.message
        : "无法丢弃恢复候选；原候选保持不变。");
      return false;
    } finally {
      recoveryActionInFlightRef.current = false;
      setIsRecoveryActionPending(false);
    }
  }, [store]);

  const visibleRecoveryCandidate =
    recoveryCandidate?.projectId === projectId ? recoveryCandidate : null;
  const visibleBlockingRecoveryCandidate =
    blockingRecoveryProjectId === projectId ? visibleRecoveryCandidate : null;
  const isLoadingRecovery = Boolean(
    projectId
    && supportsRecoveryProtocol
    && recoveryLoadedProjectId !== projectId,
  );
  let displayedStatus = status;
  let displayedNotice = notice;
  if (!project) {
    displayedStatus = "clean";
    displayedNotice = null;
  } else if (!supportsRecoveryProtocol) {
    displayedStatus = "failed";
    displayedNotice =
      "当前本机存储不支持自动保存与中断恢复；已保存谱面保持不变。";
  } else if (
    visibleBlockingRecoveryCandidate
    && status === "recovery-available"
  ) {
    displayedStatus = "recovery-available";
  } else if (!settingsAreValid) {
    displayedStatus = "dirty";
    displayedNotice = "速度必须是 30–240 之间的整数。";
  } else if (
    isDirty
    && status !== "saving"
    && status !== "failed"
  ) {
    displayedStatus = transportMode === "idle" ? "dirty" : "deferred";
    displayedNotice = transportMode === "idle"
      ? "名称或速度有未保存修改，将自动保存。"
      : "正在播放已保存修订；修改会先暂存，停止后自动保存。";
  } else if (!isDirty && status === "dirty") {
    displayedStatus = "clean";
    displayedNotice = null;
  }

  return {
    status: displayedStatus,
    notice: displayedNotice,
    isDirty,
    isLoadingRecovery,
    recoveryCandidate: visibleBlockingRecoveryCandidate,
    isRecoveryActionPending,
    retry,
    deactivate,
    promoteRecovery,
    discardRecovery,
  };
}
