import type { LocalScoreProjectV1 } from "./localScoreProject";

export type LocalScoreProjectMutationResult = Readonly<{
  project: LocalScoreProjectV1;
  notice: string | null;
  saved: boolean;
  status: string;
}>;

export type LocalScoreProjectMutationPort = Readonly<{
  persist: (
    currentProject: LocalScoreProjectV1,
    proposedProject: LocalScoreProjectV1,
  ) => Promise<LocalScoreProjectMutationResult>;
}>;

export type LocalScoreProjectMutationSnapshot = Readonly<{
  isBusy: boolean;
}>;

export type LocalScoreProjectMutationController = Readonly<{
  getSnapshot: () => LocalScoreProjectMutationSnapshot;
  subscribe: (listener: () => void) => () => void;
  attach: () => void;
  detach: () => void;
  persistMutation: ({
    currentProject,
    createProposal,
    onSaved,
  }: {
    currentProject: LocalScoreProjectV1;
    createProposal: (project: LocalScoreProjectV1) => LocalScoreProjectV1;
    onSaved: (project: LocalScoreProjectV1) => void;
  }) => Promise<boolean>;
}>;

const initialSnapshot = (): LocalScoreProjectMutationSnapshot => ({
  isBusy: false,
});

export const createLocalScoreProjectMutationController = ({
  port,
  publishNotice,
}: {
  port: LocalScoreProjectMutationPort;
  publishNotice: (notice: string | null) => void;
}): LocalScoreProjectMutationController => {
  let snapshot = initialSnapshot();
  let attached = true;
  let generation = 0;
  const listeners = new Set<() => void>();

  const publishSnapshot = (nextSnapshot: LocalScoreProjectMutationSnapshot) => {
    if (!attached) return;
    snapshot = nextSnapshot;
    listeners.forEach((listener) => listener());
  };

  const notify = (notice: string | null) => {
    if (attached) publishNotice(notice);
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
    persistMutation: async ({
      currentProject,
      createProposal,
      onSaved,
    }) => {
      if (!attached || snapshot.isBusy) return false;
      const runGeneration = ++generation;
      publishSnapshot({ isBusy: true });
      notify(null);

      let result: LocalScoreProjectMutationResult;
      try {
        const proposedProject = createProposal(currentProject);
        result = await port.persist(currentProject, proposedProject);
      } catch (error) {
        if (!isCurrent(runGeneration)) return false;
        notify(
          error instanceof Error
            ? error.message
            : "本次修改无效，已保留最后保存的版本。",
        );
        publishSnapshot({ isBusy: false });
        return false;
      }

      if (!isCurrent(runGeneration)) return false;
      if (result.status === "saved" && result.saved) {
        onSaved(result.project);
        notify("修改已保存在本机。");
        publishSnapshot({ isBusy: false });
        return true;
      }
      if (result.status === "unchanged" && result.saved) {
        notify("当前内容没有变化。");
        publishSnapshot({ isBusy: false });
        return true;
      }
      notify(result.notice);
      publishSnapshot({ isBusy: false });
      return false;
    },
  };
};
