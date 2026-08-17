import type { LocalScoreProjectV1 } from "./localScoreProject";

export type LocalScoreProjectLibrarySourceStatus =
  | "available"
  | "unavailable";

export type LocalScoreProjectLibraryListResult = Readonly<{
  projects: readonly LocalScoreProjectV1[];
  sourceStatus: LocalScoreProjectLibrarySourceStatus;
  notice: string | null;
}>;

export type LocalScoreProjectLibraryLoadResult = Readonly<{
  project: LocalScoreProjectV1 | null;
  notice: string | null;
  status: string;
}>;

export type LocalScoreProjectLibraryDeleteResult = Readonly<{
  deleted: boolean;
  notice: string | null;
}>;

export type LocalScoreProjectLibraryPort = Readonly<{
  list: () => Promise<LocalScoreProjectLibraryListResult>;
  load: (projectId: string) => Promise<LocalScoreProjectLibraryLoadResult>;
  delete: (
    project: LocalScoreProjectV1,
  ) => Promise<LocalScoreProjectLibraryDeleteResult>;
}>;

export type LocalScoreProjectLibrarySnapshot = Readonly<{
  projects: readonly LocalScoreProjectV1[];
  sourceStatus: LocalScoreProjectLibrarySourceStatus;
  pendingDeleteProjectId: string | null;
  isBusy: boolean;
}>;

export type LocalScoreProjectLibraryController = Readonly<{
  getSnapshot: () => LocalScoreProjectLibrarySnapshot;
  subscribe: (listener: () => void) => () => void;
  attach: () => void;
  detach: () => void;
  refresh: () => Promise<boolean>;
  upsertProject: (project: LocalScoreProjectV1) => boolean;
  openProject: (
    projectId: string,
    onLoaded: (project: LocalScoreProjectV1) => void,
  ) => Promise<boolean>;
  requestDelete: (projectId: string) => boolean;
  cancelDelete: () => boolean;
  confirmDelete: (project: LocalScoreProjectV1) => Promise<boolean>;
}>;

const initialSnapshot = (): LocalScoreProjectLibrarySnapshot => ({
  projects: [],
  sourceStatus: "available",
  pendingDeleteProjectId: null,
  isBusy: true,
});

export const createLocalScoreProjectLibraryController = ({
  port,
  publishNotice,
}: {
  port: LocalScoreProjectLibraryPort;
  publishNotice: (notice: string | null) => void;
}): LocalScoreProjectLibraryController => {
  let snapshot = initialSnapshot();
  let attached = true;
  let generation = 0;
  const listeners = new Set<() => void>();

  const publishSnapshot = (nextSnapshot: LocalScoreProjectLibrarySnapshot) => {
    if (!attached) return;
    snapshot = nextSnapshot;
    listeners.forEach((listener) => listener());
  };

  const notify = (notice: string | null) => {
    if (attached) publishNotice(notice);
  };

  const startOperation = () => {
    if (!attached) return null;
    const runGeneration = ++generation;
    publishSnapshot({ ...snapshot, isBusy: true });
    notify(null);
    return runGeneration;
  };

  const isCurrent = (runGeneration: number) =>
    attached && generation === runGeneration;

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    attach: () => {
      attached = true;
    },
    detach: () => {
      if (!attached) return;
      attached = false;
      generation += 1;
      listeners.clear();
      snapshot = initialSnapshot();
    },
    refresh: async () => {
      const runGeneration = startOperation();
      if (runGeneration === null) return false;
      let result: LocalScoreProjectLibraryListResult;
      try {
        result = await port.list();
      } catch {
        if (!isCurrent(runGeneration)) return false;
        publishSnapshot({
          ...snapshot,
          projects: [],
          sourceStatus: "unavailable",
          isBusy: false,
        });
        notify("本机谱项目列表无法读取，原记录未被覆盖或清除。");
        return false;
      }
      if (!isCurrent(runGeneration)) return false;
      publishSnapshot({
        ...snapshot,
        projects: result.projects,
        sourceStatus: result.sourceStatus,
        isBusy: false,
      });
      notify(result.notice);
      return true;
    },
    upsertProject: (project) => {
      if (!attached) return false;
      generation += 1;
      publishSnapshot({
        ...snapshot,
        projects: [
          project,
          ...snapshot.projects.filter((candidate) =>
            candidate.projectId !== project.projectId),
        ],
        isBusy: false,
      });
      return true;
    },
    openProject: async (projectId, onLoaded) => {
      const runGeneration = startOperation();
      if (runGeneration === null) return false;
      let result: LocalScoreProjectLibraryLoadResult;
      try {
        result = await port.load(projectId);
      } catch {
        if (!isCurrent(runGeneration)) return false;
        publishSnapshot({ ...snapshot, isBusy: false });
        notify("本机乐谱项目无法读取；原记录未被覆盖或清除。");
        return false;
      }
      if (!isCurrent(runGeneration)) return false;
      if (result.status === "loaded" && result.project) {
        publishSnapshot({ ...snapshot, isBusy: false });
        notify("已重新打开本机保存的谱项目。");
        onLoaded(result.project);
        return true;
      }
      publishSnapshot({ ...snapshot, isBusy: false });
      notify(result.notice ?? "未找到这份本机谱项目。");
      return false;
    },
    requestDelete: (projectId) => {
      if (
        !attached
        || snapshot.isBusy
        || !snapshot.projects.some((project) => project.projectId === projectId)
      ) {
        return false;
      }
      publishSnapshot({ ...snapshot, pendingDeleteProjectId: projectId });
      notify(null);
      return true;
    },
    cancelDelete: () => {
      if (!attached || snapshot.isBusy) return false;
      publishSnapshot({ ...snapshot, pendingDeleteProjectId: null });
      return true;
    },
    confirmDelete: async (project) => {
      if (
        !attached
        || snapshot.isBusy
        || snapshot.pendingDeleteProjectId !== project.projectId
      ) {
        return false;
      }
      const runGeneration = startOperation();
      if (runGeneration === null) return false;
      let result: LocalScoreProjectLibraryDeleteResult;
      try {
        result = await port.delete(project);
      } catch {
        if (!isCurrent(runGeneration)) return false;
        publishSnapshot({ ...snapshot, isBusy: false });
        notify(
          "本机谱项目删除失败，当前项目仍被保留。请恢复存储条件后重试。",
        );
        return false;
      }
      if (!isCurrent(runGeneration)) return false;
      if (result.deleted) {
        publishSnapshot({
          ...snapshot,
          projects: snapshot.projects.filter((candidate) =>
            candidate.projectId !== project.projectId),
          pendingDeleteProjectId: null,
          isBusy: false,
        });
        notify("本机谱项目已删除，释放的应用容量可用于新建或保存。");
        return true;
      }
      publishSnapshot({ ...snapshot, isBusy: false });
      notify(result.notice);
      return false;
    },
  };
};
