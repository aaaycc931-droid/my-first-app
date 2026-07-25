import {
  LOCAL_SCORE_PROJECT_LEGACY_SCHEMA_VERSION,
  LOCAL_SCORE_PROJECT_SCHEMA_VERSION,
  LocalScoreProjectConflictError,
  cloneLocalScoreProject,
  parseLocalScoreProject,
  type LocalScoreProjectV1,
} from "../../../lib/music/localScoreProject";

const DATABASE_NAME = "solfeggio-local-score-projects";
const DATABASE_VERSION = 1;
const STORE_NAME = "projects";

export type LocalScoreProjectStorageLimits = Readonly<{
  maxProjects: number;
  maxBytes: number;
}>;

export const LOCAL_SCORE_PROJECT_STORAGE_LIMITS: LocalScoreProjectStorageLimits =
  Object.freeze({
    maxProjects: 50,
    maxBytes: 5 * 1024 * 1024,
  });

export type LocalScoreProjectStorageStatus =
  | "capacity"
  | "blocked"
  | "conflict"
  | "invalid"
  | "quota"
  | "saved"
  | "transaction-failed"
  | "unchanged"
  | "unavailable"
  | "write-failed";

export class LocalScoreProjectStorageError extends Error {
  constructor(
    readonly code: Exclude<
      LocalScoreProjectStorageStatus,
      "saved" | "unchanged"
    >,
    message: string,
  ) {
    super(message);
    this.name = "LocalScoreProjectStorageError";
  }
}

export type LocalScoreProjectListIssue = Readonly<{
  projectId: string | null;
  status: "corrupt" | "unsupported";
}>;

export type LocalScoreProjectListSnapshot = Readonly<{
  projects: readonly LocalScoreProjectV1[];
  issues: readonly LocalScoreProjectListIssue[];
}>;

export type LocalScoreProjectStore = {
  get: (projectId: string) => Promise<LocalScoreProjectV1 | null>;
  list: () => Promise<readonly LocalScoreProjectV1[]>;
  listWithIssues?: () => Promise<LocalScoreProjectListSnapshot>;
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
  status: LocalScoreProjectStorageStatus;
}>;

export type LocalScoreProjectLoadResult = Readonly<{
  project: LocalScoreProjectV1 | null;
  notice: string | null;
  sourceStatus: "available" | "unavailable";
  status:
    | "blocked"
    | "invalid"
    | "loaded"
    | "not-found"
    | "quota"
    | "unavailable";
}>;

export type LocalScoreProjectListResult = Readonly<{
  projects: readonly LocalScoreProjectV1[];
  issues: readonly LocalScoreProjectListIssue[];
  notice: string | null;
  sourceStatus: "available" | "unavailable";
  status: "loaded" | "partial" | "blocked" | "unavailable";
}>;

const getRequestError = (
  request: IDBRequest,
  fallback: string,
) => {
  if (request.error?.name === "QuotaExceededError") {
    return new LocalScoreProjectStorageError(
      "quota",
      "浏览器或 Android WebView 分配给 IndexedDB 的空间不足，乐谱项目未保存。请清理设备空间或恢复存储条件后重试。",
    );
  }
  return new LocalScoreProjectStorageError("unavailable", fallback);
};

export const getLocalScoreProjectWriteError = (
  error: Pick<DOMException, "name"> | null,
) => {
  if (error?.name === "QuotaExceededError") {
    return new LocalScoreProjectStorageError(
      "quota",
      "浏览器或 Android WebView 分配给 IndexedDB 的空间不足，乐谱项目未保存。请清理设备空间或恢复存储条件后重试。",
    );
  }
  return new LocalScoreProjectStorageError(
    "write-failed",
    "本机存储写入失败，乐谱项目未保存；原有项目保持不变。请恢复存储条件后重试。",
  );
};

export const getLocalScoreProjectStorageBytes = (value: unknown) => {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new LocalScoreProjectStorageError(
      "invalid",
      "乐谱项目无法计算本机容量，未执行保存。",
    );
  }
  return new TextEncoder().encode(serialized).byteLength;
};

const assertValidLimits = (limits: LocalScoreProjectStorageLimits) => {
  if (
    !Number.isSafeInteger(limits.maxProjects)
    || limits.maxProjects < 1
    || !Number.isSafeInteger(limits.maxBytes)
    || limits.maxBytes < 1
  ) {
    throw new Error("本机谱项目容量限制配置无效。");
  }
};

const assertWithinApplicationLimits = ({
  records,
  project,
  limits,
}: {
  records: readonly unknown[];
  project: LocalScoreProjectV1;
  limits: LocalScoreProjectStorageLimits;
}) => {
  const existingIndex = records.findIndex((value) => {
    const record = value && typeof value === "object"
      ? value as Record<string, unknown>
      : null;
    return record?.projectId === project.projectId;
  });
  const nextProjectCount = records.length + (existingIndex === -1 ? 1 : 0);
  if (nextProjectCount > limits.maxProjects) {
    throw new LocalScoreProjectStorageError(
      "capacity",
      `已达到应用设定的本机谱项目数量上限（${limits.maxProjects} 个），未新增项目；原有项目保持不变。请清理不再需要的项目后重试。`,
    );
  }
  const existingBytes = existingIndex === -1
    ? 0
    : getLocalScoreProjectStorageBytes(records[existingIndex]);
  const currentBytes = records.reduce<number>(
    (total, value) => total + getLocalScoreProjectStorageBytes(value),
    0,
  );
  const nextBytes = currentBytes - existingBytes
    + getLocalScoreProjectStorageBytes(project);
  if (nextBytes > limits.maxBytes) {
    const limitMiB = limits.maxBytes / (1024 * 1024);
    throw new LocalScoreProjectStorageError(
      "capacity",
      `本次保存会超过应用设定的本机谱项目容量上限（${Number.isInteger(limitMiB) ? limitMiB : limitMiB.toFixed(2)} MiB），未写入修改；原有项目保持不变。请清理不再需要的项目后重试。`,
    );
  }
};

const requestResult = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(getRequestError(request, "本机乐谱项目操作失败。"));
  });

const openDatabase = (indexedDbFactory: IDBFactory) =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDbFactory.open(DATABASE_NAME, DATABASE_VERSION);
    let settled = false;
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, {
          keyPath: "projectId",
        });
      }
    };
    request.onsuccess = () => {
      if (settled) {
        request.result.close();
        return;
      }
      settled = true;
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => {
      if (settled) return;
      settled = true;
      reject(getRequestError(request, "无法打开本机乐谱项目存储。"));
    };
    request.onblocked = () => {
      if (settled) return;
      settled = true;
      reject(
        new LocalScoreProjectStorageError(
          "blocked",
          "本机乐谱项目存储正在被其他页面占用，请关闭其他页面后重试。",
        ),
      );
    };
  });

const getStoredProjectIssue = (
  value: unknown,
): LocalScoreProjectListIssue => {
  const record = value && typeof value === "object"
    ? value as Record<string, unknown>
    : null;
  return {
    projectId: typeof record?.projectId === "string"
      ? record.projectId
      : null,
    status: typeof record?.schemaVersion === "string"
      && record.schemaVersion !== LOCAL_SCORE_PROJECT_LEGACY_SCHEMA_VERSION
      && record.schemaVersion !== LOCAL_SCORE_PROJECT_SCHEMA_VERSION
      ? "unsupported"
      : "corrupt",
  };
};

const parseStoredProject = (value: unknown) => {
  const project = parseLocalScoreProject(value);
  if (!project) {
    throw new LocalScoreProjectStorageError(
      "invalid",
      "本机乐谱项目记录损坏或版本不受支持，原记录未被覆盖。",
    );
  }
  return project;
};

const transactionCompletion = (
  transaction: IDBTransaction,
  getFailure: () => Error | null,
  operation: "save" | "delete" = "save",
) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(
        getFailure()
        ?? (
          transaction.error?.name === "QuotaExceededError"
            ? new LocalScoreProjectStorageError(
              "quota",
              operation === "delete"
                ? "浏览器或 Android WebView 分配给 IndexedDB 的空间不足，未删除乐谱项目；原项目保持不变。请清理设备空间或恢复存储条件后重试。"
                : "浏览器或 Android WebView 分配给 IndexedDB 的空间不足，乐谱项目未保存。请清理设备空间或恢复存储条件后重试。",
            )
            : new LocalScoreProjectStorageError(
              "transaction-failed",
              operation === "delete"
                ? "IndexedDB 事务失败，未删除乐谱项目；原项目保持不变。请恢复存储条件后重试。"
                : "IndexedDB 事务失败，乐谱项目未保存；原有项目保持不变。请恢复存储条件后重试。",
            )
        ),
      );
    transaction.onabort = () =>
      reject(
        getFailure()
        ?? new LocalScoreProjectStorageError(
          "transaction-failed",
          operation === "delete"
            ? "IndexedDB 事务被中止，未删除乐谱项目；原项目保持不变。请恢复存储条件后重试。"
            : "IndexedDB 事务被中止，乐谱项目未保存；原有项目保持不变。请恢复存储条件后重试。",
        ),
      );
  });

export const createIndexedDbLocalScoreProjectStore =
  ({
    indexedDbFactory,
    limits = LOCAL_SCORE_PROJECT_STORAGE_LIMITS,
    writeRequest = (store, project) => store.put(project),
    deleteRequest = (store, projectId) => store.delete(projectId),
  }: {
    indexedDbFactory?: IDBFactory;
    limits?: LocalScoreProjectStorageLimits;
    writeRequest?: (
      store: IDBObjectStore,
      project: LocalScoreProjectV1,
    ) => IDBRequest<IDBValidKey>;
    deleteRequest?: (
      store: IDBObjectStore,
      projectId: string,
    ) => IDBRequest<IDBValidKey> | IDBRequest<undefined>;
  } = {}): LocalScoreProjectStore => {
    assertValidLimits(limits);
    const requireFactory = () => {
      const factory = indexedDbFactory
        ?? (typeof indexedDB === "undefined" ? null : indexedDB);
      if (!factory) {
        throw new LocalScoreProjectStorageError(
          "unavailable",
          "本机乐谱项目存储不可用。",
        );
      }
      return factory;
    };
    const listWithIssues = async (): Promise<LocalScoreProjectListSnapshot> => {
      const database = await openDatabase(requireFactory());
      try {
        const values = await requestResult(
          database.transaction(STORE_NAME, "readonly")
            .objectStore(STORE_NAME)
            .getAll(),
        ) as unknown[];
        const projects: LocalScoreProjectV1[] = [];
        const issues: LocalScoreProjectListIssue[] = [];
        for (const value of values) {
          const project = parseLocalScoreProject(value);
          if (project) projects.push(project);
          else issues.push(getStoredProjectIssue(value));
        }
        projects.sort(
          (left, right) => right.updatedAt.localeCompare(left.updatedAt),
        );
        return { projects, issues };
      } finally {
        database.close();
      }
    };
    return ({
    async get(projectId) {
      const database = await openDatabase(requireFactory());
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
      return (await listWithIssues()).projects;
    },

    listWithIssues,

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
      const database = await openDatabase(requireFactory());
      let failure: Error | null = null;
      try {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const completion = transactionCompletion(transaction, () => failure);
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.getAll();
        getRequest.onerror = () => {
          failure = new LocalScoreProjectStorageError(
            "transaction-failed",
            getRequest.error?.name === "AbortError"
              ? "IndexedDB 事务被中止，乐谱项目未保存；原有项目保持不变。请恢复存储条件后重试。"
              : "IndexedDB 事务无法读取现有项目，未执行保存；原有项目保持不变。",
          );
        };
        getRequest.onsuccess = () => {
          try {
            const records = getRequest.result as unknown[];
            const existing = records.find((value) => {
              const record = value && typeof value === "object"
                ? value as Record<string, unknown>
                : null;
              return record?.projectId === project.projectId;
            });
            if (expectedRevision === null) {
              if (existing !== undefined) {
                throw new LocalScoreProjectConflictError();
              }
            } else {
              if (existing === undefined) throw new LocalScoreProjectConflictError();
              const parsedExisting = parseStoredProject(existing);
              if (parsedExisting.document.revision !== expectedRevision) {
                throw new LocalScoreProjectConflictError();
              }
            }
            assertWithinApplicationLimits({
              records,
              project: validProject,
              limits,
            });
            const putRequest = writeRequest(
              store,
              cloneLocalScoreProject(validProject),
            );
            putRequest.onerror = () => {
              failure = getLocalScoreProjectWriteError(putRequest.error);
            };
          } catch (error) {
            failure = error instanceof LocalScoreProjectStorageError
              || error instanceof LocalScoreProjectConflictError
              ? error
              : getLocalScoreProjectWriteError(
                error instanceof DOMException ? error : null,
              );
            transaction.abort();
          }
        };
        await completion;
      } finally {
        database.close();
      }
    },

    async delete(projectId, expectedRevision) {
      const database = await openDatabase(requireFactory());
      let failure: Error | null = null;
      try {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const completion = transactionCompletion(
          transaction,
          () => failure,
          "delete",
        );
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(projectId);
        getRequest.onerror = () => {
          failure = new LocalScoreProjectStorageError(
            "transaction-failed",
            getRequest.error?.name === "AbortError"
              ? "IndexedDB 事务被中止，未删除乐谱项目；原项目保持不变。请恢复存储条件后重试。"
              : "IndexedDB 事务无法读取当前乐谱项目，未执行删除；原项目保持不变。",
          );
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
            const request = deleteRequest(store, projectId);
            request.onerror = () => {
              failure = request.error?.name === "QuotaExceededError"
                ? new LocalScoreProjectStorageError(
                  "quota",
                  "浏览器或 Android WebView 分配给 IndexedDB 的空间不足，未删除乐谱项目；原项目保持不变。请清理设备空间或恢复存储条件后重试。",
                )
                : new LocalScoreProjectStorageError(
                  "write-failed",
                  "本机存储删除写入失败，未删除乐谱项目；原项目保持不变。请恢复存储条件后重试。",
                );
            };
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
  };

const getStorageFailure = (error: unknown): {
  status: Exclude<LocalScoreProjectStorageStatus, "saved" | "unchanged">;
  notice: string;
} => {
  if (error instanceof LocalScoreProjectConflictError) {
    return { status: "conflict", notice: error.message };
  }
  if (error instanceof LocalScoreProjectStorageError) {
    return { status: error.code, notice: error.message };
  }
  return {
    status: "unavailable",
    notice: "本机乐谱项目保存失败，当前已保存版本保持不变。",
  };
};

export const persistNewLocalScoreProject = async ({
  store,
  project,
}: {
  store: LocalScoreProjectStore;
  project: LocalScoreProjectV1;
}): Promise<LocalScoreProjectStorageResult> => {
  try {
    await store.put(project, null);
    return { project, notice: null, saved: true, status: "saved" };
  } catch (error) {
    const failure = getStorageFailure(error);
    return { project, notice: failure.notice, saved: false, status: failure.status };
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
    || proposedProject.createdAt !== currentProject.createdAt
    || !parseLocalScoreProject(currentProject)
    || !parseLocalScoreProject(proposedProject)
  ) {
    return {
      project: currentProject,
      notice: "乐谱项目身份不一致，未保存本次修改。",
      saved: false,
      status: "invalid",
    };
  }
  if (proposedProject === currentProject) {
    return {
      project: currentProject,
      notice: null,
      saved: true,
      status: "unchanged",
    };
  }
  if (
    proposedProject.document.revision === currentProject.document.revision
    && JSON.stringify(parseLocalScoreProject(proposedProject))
      === JSON.stringify(parseLocalScoreProject(currentProject))
  ) {
    return {
      project: currentProject,
      notice: null,
      saved: true,
      status: "unchanged",
    };
  }
  if (
    proposedProject.document.revision
      !== currentProject.document.revision + 1
  ) {
    return {
      project: currentProject,
      notice: "乐谱项目修订号不连续，未保存本次修改。",
      saved: false,
      status: "invalid",
    };
  }
  try {
    await store.put(proposedProject, currentProject.document.revision);
    return {
      project: proposedProject,
      notice: null,
      saved: true,
      status: "saved",
    };
  } catch (error) {
    const failure = getStorageFailure(error);
    return {
      project: currentProject,
      notice: failure.notice,
      saved: false,
      status: failure.status,
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
    const project = await store.get(projectId);
    return {
      project,
      notice: null,
      sourceStatus: "available",
      status: project ? "loaded" : "not-found",
    };
  } catch (error) {
    const failure = getStorageFailure(error);
    return {
      project: null,
      notice: failure.status === "unavailable"
        ? "本机乐谱项目无法读取；原记录未被覆盖或清除。"
        : failure.notice,
      sourceStatus: "unavailable",
      status: failure.status === "blocked"
        || failure.status === "invalid"
        || failure.status === "quota"
        ? failure.status
        : "unavailable",
    };
  }
};

export const listLocalScoreProjects = async ({
  store,
}: {
  store: LocalScoreProjectStore;
}): Promise<LocalScoreProjectListResult> => {
  try {
    const snapshot = store.listWithIssues
      ? await store.listWithIssues()
      : { projects: await store.list(), issues: [] };
    return {
      ...snapshot,
      notice: snapshot.issues.length > 0
        ? "部分本机乐谱项目记录损坏或版本不受支持，原记录已保留。"
        : null,
      sourceStatus: "available",
      status: snapshot.issues.length > 0 ? "partial" : "loaded",
    };
  } catch (error) {
    const failure = getStorageFailure(error);
    return {
      projects: [],
      issues: [],
      notice: failure.status === "blocked"
        ? failure.notice
        : "本机乐谱项目列表无法读取，原记录未被覆盖或清除。",
      sourceStatus: "unavailable",
      status: failure.status === "blocked" ? "blocked" : "unavailable",
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
    return { notice: null, deleted: true, status: "deleted" } as const;
  } catch (error) {
    const failure = getStorageFailure(error);
    return {
      notice: failure.status === "conflict"
        ? "乐谱项目已在其他页面更新，请重新读取后再删除。"
        : failure.status === "unavailable"
          ? "本机乐谱项目删除失败，当前项目仍被保留。请恢复存储条件后重试。"
          : failure.notice,
      deleted: false,
      status: failure.status,
    } as const;
  }
};
