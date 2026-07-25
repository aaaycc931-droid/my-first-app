import {
  LocalScoreProjectConflictError,
  cloneLocalScoreProject,
  parseLocalScoreProject,
  type LocalScoreProjectV1,
} from "../../../lib/music/localScoreProject";

const DATABASE_NAME = "solfeggio-local-score-projects";
const DATABASE_VERSION = 1;
const STORE_NAME = "projects";

export type LocalScoreProjectStore = {
  get: (projectId: string) => Promise<LocalScoreProjectV1 | null>;
  list: () => Promise<readonly LocalScoreProjectV1[]>;
  put: (
    project: LocalScoreProjectV1,
    expectedRevision: number | null,
  ) => Promise<void>;
  delete: (projectId: string, expectedRevision: number) => Promise<void>;
};

export type LocalScoreProjectStorageResult = Readonly<{
  project: LocalScoreProjectV1;
  notice: string | null;
  saved: boolean;
}>;

export type LocalScoreProjectLoadResult = Readonly<{
  project: LocalScoreProjectV1 | null;
  notice: string | null;
  sourceStatus: "available" | "unavailable";
}>;

const requestResult = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("本机乐谱项目操作失败。"));
  });

const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("本机乐谱项目存储不可用。"));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, {
          keyPath: "projectId",
        });
      }
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(new Error("无法打开本机乐谱项目存储。"));
    request.onblocked = () =>
      reject(
        new Error("本机乐谱项目存储正在被其他页面占用，请关闭其他页面后重试。"),
      );
  });

const parseStoredProject = (value: unknown) => {
  const project = parseLocalScoreProject(value);
  if (!project) {
    throw new Error("本机乐谱项目记录损坏或版本不受支持，原记录未被覆盖。");
  }
  return project;
};

const transactionCompletion = (
  transaction: IDBTransaction,
  getFailure: () => Error | null,
) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(getFailure() ?? new Error("本机乐谱项目操作失败。"));
    transaction.onabort = () =>
      reject(getFailure() ?? new Error("本机乐谱项目操作被取消。"));
  });

export const createIndexedDbLocalScoreProjectStore =
  (): LocalScoreProjectStore => ({
    async get(projectId) {
      const database = await openDatabase();
      try {
        const value = await requestResult(
          database.transaction(STORE_NAME, "readonly")
            .objectStore(STORE_NAME)
            .get(projectId),
        );
        return value === undefined ? null : parseStoredProject(value);
      } finally {
        database.close();
      }
    },

    async list() {
      const database = await openDatabase();
      try {
        const values = await requestResult(
          database.transaction(STORE_NAME, "readonly")
            .objectStore(STORE_NAME)
            .getAll(),
        ) as unknown[];
        return values
          .map(parseStoredProject)
          .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
      } finally {
        database.close();
      }
    },

    async put(project, expectedRevision) {
      const validProject = parseLocalScoreProject(project);
      if (!validProject) throw new Error("乐谱项目结构无效，未执行保存。");
      if (
        (expectedRevision === null && project.document.revision !== 1)
        || (
          expectedRevision !== null
          && project.document.revision !== expectedRevision + 1
        )
      ) {
        throw new LocalScoreProjectConflictError();
      }
      const database = await openDatabase();
      let failure: Error | null = null;
      try {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const completion = transactionCompletion(transaction, () => failure);
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(project.projectId);
        getRequest.onerror = () => {
          failure = new Error("无法读取当前乐谱项目修订。");
        };
        getRequest.onsuccess = () => {
          try {
            const existing = getRequest.result as unknown;
            if (expectedRevision === null) {
              if (existing !== undefined) throw new LocalScoreProjectConflictError();
            } else {
              if (existing === undefined) throw new LocalScoreProjectConflictError();
              const parsedExisting = parseStoredProject(existing);
              if (parsedExisting.document.revision !== expectedRevision) {
                throw new LocalScoreProjectConflictError();
              }
            }
            store.put(cloneLocalScoreProject(validProject));
          } catch (error) {
            failure = error instanceof Error
              ? error
              : new Error("本机乐谱项目保存失败。");
            transaction.abort();
          }
        };
        await completion;
      } finally {
        database.close();
      }
    },

    async delete(projectId, expectedRevision) {
      const database = await openDatabase();
      let failure: Error | null = null;
      try {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const completion = transactionCompletion(transaction, () => failure);
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(projectId);
        getRequest.onerror = () => {
          failure = new Error("无法读取当前乐谱项目修订。");
        };
        getRequest.onsuccess = () => {
          try {
            if (getRequest.result === undefined) {
              throw new LocalScoreProjectConflictError();
            }
            const existing = parseStoredProject(getRequest.result);
            if (existing.document.revision !== expectedRevision) {
              throw new LocalScoreProjectConflictError();
            }
            store.delete(projectId);
          } catch (error) {
            failure = error instanceof Error
              ? error
              : new Error("本机乐谱项目删除失败。");
            transaction.abort();
          }
        };
        await completion;
      } finally {
        database.close();
      }
    },
  });

const getSaveFailureNotice = (error: unknown) =>
  error instanceof LocalScoreProjectConflictError
    ? error.message
    : "本机乐谱项目保存失败，当前已保存版本保持不变。";

export const persistNewLocalScoreProject = async ({
  store,
  project,
}: {
  store: LocalScoreProjectStore;
  project: LocalScoreProjectV1;
}): Promise<LocalScoreProjectStorageResult> => {
  try {
    await store.put(project, null);
    return { project, notice: null, saved: true };
  } catch (error) {
    return { project, notice: getSaveFailureNotice(error), saved: false };
  }
};

export const persistLocalScoreProjectChange = async ({
  store,
  currentProject,
  proposedProject,
}: {
  store: LocalScoreProjectStore;
  currentProject: LocalScoreProjectV1;
  proposedProject: LocalScoreProjectV1;
}): Promise<LocalScoreProjectStorageResult> => {
  if (
    proposedProject.projectId !== currentProject.projectId
    || proposedProject.document.documentId
      !== currentProject.document.documentId
  ) {
    return {
      project: currentProject,
      notice: "乐谱项目身份不一致，未保存本次修改。",
      saved: false,
    };
  }
  if (proposedProject === currentProject) {
    return { project: currentProject, notice: null, saved: true };
  }
  try {
    await store.put(proposedProject, currentProject.document.revision);
    return { project: proposedProject, notice: null, saved: true };
  } catch (error) {
    return {
      project: currentProject,
      notice: getSaveFailureNotice(error),
      saved: false,
    };
  }
};

export const loadLocalScoreProject = async ({
  store,
  projectId,
}: {
  store: LocalScoreProjectStore;
  projectId: string;
}): Promise<LocalScoreProjectLoadResult> => {
  try {
    return {
      project: await store.get(projectId),
      notice: null,
      sourceStatus: "available",
    };
  } catch {
    return {
      project: null,
      notice: "本机乐谱项目无法读取；原记录未被覆盖或清除。",
      sourceStatus: "unavailable",
    };
  }
};

export const deleteLocalScoreProject = async ({
  store,
  project,
}: {
  store: LocalScoreProjectStore;
  project: LocalScoreProjectV1;
}) => {
  try {
    await store.delete(project.projectId, project.document.revision);
    return { notice: null, deleted: true } as const;
  } catch (error) {
    return {
      notice: error instanceof LocalScoreProjectConflictError
        ? error.message
        : "本机乐谱项目删除失败，当前项目仍被保留。",
      deleted: false,
    } as const;
  }
};
