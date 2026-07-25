import assert from "node:assert/strict";

import {
  IDBDatabase as FakeIDBDatabase,
  IDBFactory as FakeIDBFactory,
} from "fake-indexeddb";

import {
  addLocalScoreProjectEvent,
  changeLocalScoreProjectMeter,
  changeLocalScoreProjectTempo,
  createLocalScoreProject,
  redoLocalScoreProject,
  undoLocalScoreProject,
} from "../lib/music/localScoreProject";
import {
  createIndexedDbLocalScoreProjectStore,
  deleteLocalScoreProject,
  listLocalScoreProjects,
  loadLocalScoreProject,
  persistLocalScoreProjectChange,
  persistNewLocalScoreProject,
} from "../mobile/src/runtime/localScoreProjectStorage";

const DATABASE_NAME = "solfeggio-local-score-projects";
const STORE_NAME = "projects";

const waitForRequest = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const waitForTransaction = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("事务被取消"));
    transaction.onerror = () => reject(transaction.error);
  });

const asQuotaRequest = <T>(request: IDBRequest<T>): IDBRequest<T> =>
  new Proxy(request, {
    get(target, property) {
      if (property === "error") {
        return new DOMException("quota", "QuotaExceededError");
      }
      return Reflect.get(target, property, target);
    },
    set(target, property, value) {
      return Reflect.set(target, property, value, target);
    },
  });

const putRawRecord = async ({
  factory,
  value,
}: {
  factory: IDBFactory;
  value: unknown;
}) => {
  const database = await waitForRequest(factory.open(DATABASE_NAME, 1));
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(value);
    await waitForTransaction(transaction);
  } finally {
    database.close();
  }
};

const getRawRecord = async ({
  factory,
  projectId,
}: {
  factory: IDBFactory;
  projectId: string;
}) => {
  const database = await waitForRequest(factory.open(DATABASE_NAME, 1));
  try {
    return await waitForRequest(
      database.transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .get(projectId),
    ) as unknown;
  } finally {
    database.close();
  }
};

const createEditedProject = ({
  project,
  eventId,
  pitch,
  now,
}: {
  project: ReturnType<typeof createLocalScoreProject>;
  eventId: string;
  pitch: "C4" | "D4" | "E4" | "F4";
  now: string;
}) =>
  addLocalScoreProjectEvent({
    project,
    expectedRevision: project.document.revision,
    location: {
      partId: "part-1",
      staffId: "staff-1",
      voiceId: "voice-1",
      measureNumber: 1,
    },
    eventId,
    input: { type: "note", pitch, duration: "quarter" },
    now,
  });

const run = async () => {
  const factory = new FakeIDBFactory();
  const firstStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: factory,
  });
  const initial = createLocalScoreProject({
    projectId: "idb-recovery-project",
    title: "事务恢复谱",
    now: "2026-07-24T04:00:00.000Z",
  });

  const created = await persistNewLocalScoreProject({
    store: firstStore,
    project: initial,
  });
  assert.equal(created.status, "saved");

  const migrationFactory = new FakeIDBFactory();
  const migrationSeed = createLocalScoreProject({
    projectId: "legacy-tempo-project",
    title: "旧版速度谱",
    now: "2026-07-24T03:00:00.000Z",
  });
  const legacyRaw = {
    ...structuredClone(migrationSeed),
    schemaVersion: "local-score-project-storage-v1",
    tempoBpm: undefined,
  };
  delete (legacyRaw as { tempoBpm?: number }).tempoBpm;
  const legacyRawBefore = structuredClone(legacyRaw);
  const migrationStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: migrationFactory,
  });
  await migrationStore.list();
  await putRawRecord({ factory: migrationFactory, value: legacyRaw });
  const migratedList = await migrationStore.list();
  assert.equal(migratedList[0]?.schemaVersion, "local-score-project-storage-v2");
  assert.equal(migratedList[0]?.tempoBpm, 90);
  const migratedLoad = await loadLocalScoreProject({
    store: migrationStore,
    projectId: migrationSeed.projectId,
  });
  assert.equal(migratedLoad.project?.schemaVersion, "local-score-project-storage-v2");
  assert.equal(migratedLoad.project?.tempoBpm, 90);
  assert.deepEqual(
    await getRawRecord({
      factory: migrationFactory,
      projectId: migrationSeed.projectId,
    }),
    legacyRawBefore,
    "读取旧版项目不得自动回写",
  );
  const migratedTempo = changeLocalScoreProjectTempo({
    project: migratedLoad.project!,
    expectedRevision: migratedLoad.project!.document.revision,
    tempoBpm: 72,
    now: "2026-07-24T03:00:01.000Z",
  });

  const legacyBytes = new TextEncoder().encode(
    JSON.stringify(legacyRawBefore),
  ).byteLength;
  const migrationCapacityStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: migrationFactory,
    limits: { maxProjects: 1, maxBytes: legacyBytes },
  });
  const capacityMigration = await persistLocalScoreProjectChange({
    store: migrationCapacityStore,
    currentProject: migratedLoad.project!,
    proposedProject: migratedTempo,
  });
  assert.equal(capacityMigration.status, "capacity");
  assert.deepEqual(
    await getRawRecord({
      factory: migrationFactory,
      projectId: migrationSeed.projectId,
    }),
    legacyRawBefore,
    "旧版迁移容量不足时必须保留原始记录",
  );

  const quotaMigrationStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: migrationFactory,
    writeRequest: (store, project) =>
      asQuotaRequest(store.add(project)),
  });
  assert.equal((await persistLocalScoreProjectChange({
    store: quotaMigrationStore,
    currentProject: migratedLoad.project!,
    proposedProject: migratedTempo,
  })).status, "quota");
  assert.deepEqual(
    await getRawRecord({
      factory: migrationFactory,
      projectId: migrationSeed.projectId,
    }),
    legacyRawBefore,
    "旧版迁移 quota 失败时必须保留原始记录",
  );

  const writeFailureMigrationStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: migrationFactory,
    writeRequest: (store, project) => store.add(project),
  });
  assert.equal((await persistLocalScoreProjectChange({
    store: writeFailureMigrationStore,
    currentProject: migratedLoad.project!,
    proposedProject: migratedTempo,
  })).status, "write-failed");
  assert.deepEqual(
    await getRawRecord({
      factory: migrationFactory,
      projectId: migrationSeed.projectId,
    }),
    legacyRawBefore,
    "旧版迁移普通写失败时必须保留原始记录",
  );

  const migrationOriginalTransaction =
    FakeIDBDatabase.prototype.transaction;
  let abortMigrationWrite = true;
  FakeIDBDatabase.prototype.transaction = function (
    storeNames: string | Iterable<string>,
    mode?: IDBTransactionMode,
    options?: IDBTransactionOptions,
  ) {
    const transaction = migrationOriginalTransaction.call(
      this,
      storeNames,
      mode,
      options,
    );
    if (abortMigrationWrite && mode === "readwrite") {
      abortMigrationWrite = false;
      queueMicrotask(() => transaction.abort());
    }
    return transaction;
  };
  try {
    assert.equal((await persistLocalScoreProjectChange({
      store: migrationStore,
      currentProject: migratedLoad.project!,
      proposedProject: migratedTempo,
    })).status, "transaction-failed");
  } finally {
    FakeIDBDatabase.prototype.transaction = migrationOriginalTransaction;
  }
  assert.deepEqual(
    await getRawRecord({
      factory: migrationFactory,
      projectId: migrationSeed.projectId,
    }),
    legacyRawBefore,
    "旧版迁移事务中止时必须保留原始记录",
  );

  assert.equal((await persistLocalScoreProjectChange({
    store: migrationStore,
    currentProject: migratedLoad.project!,
    proposedProject: migratedTempo,
  })).status, "saved");
  const migratedRaw = await getRawRecord({
    factory: migrationFactory,
    projectId: migrationSeed.projectId,
  }) as { schemaVersion?: string; tempoBpm?: number };
  assert.equal(migratedRaw.schemaVersion, "local-score-project-storage-v2");
  assert.equal(migratedRaw.tempoBpm, 72);

  const reopenedStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: factory,
  });
  assert.deepEqual(
    await loadLocalScoreProject({
      store: reopenedStore,
      projectId: initial.projectId,
    }),
    {
      project: initial,
      notice: null,
      sourceStatus: "available",
      status: "loaded",
    },
    "a new store instance must reopen the first committed project exactly",
  );

  const edited = createEditedProject({
    project: initial,
    eventId: "idb-note-1",
    pitch: "C4",
    now: "2026-07-24T04:00:01.000Z",
  });
  assert.equal((await persistLocalScoreProjectChange({
    store: reopenedStore,
    currentProject: initial,
    proposedProject: edited,
  })).status, "saved");

  const undone = undoLocalScoreProject({
    project: edited,
    expectedRevision: edited.document.revision,
    now: "2026-07-24T04:00:02.000Z",
  });
  assert.equal((await persistLocalScoreProjectChange({
    store: reopenedStore,
    currentProject: edited,
    proposedProject: undone,
  })).status, "saved");

  const redone = redoLocalScoreProject({
    project: undone,
    expectedRevision: undone.document.revision,
    now: "2026-07-24T04:00:03.000Z",
  });
  assert.equal((await persistLocalScoreProjectChange({
    store: reopenedStore,
    currentProject: undone,
    proposedProject: redone,
  })).status, "saved");

  const afterHistoryReopen = await loadLocalScoreProject({
    store: createIndexedDbLocalScoreProjectStore({
      indexedDbFactory: factory,
    }),
    projectId: initial.projectId,
  });
  assert.deepEqual(afterHistoryReopen.project, redone);
  assert.equal(afterHistoryReopen.project?.undoStack.length, 1);
  assert.equal(afterHistoryReopen.project?.redoStack.length, 0);

  const staleBaseA = afterHistoryReopen.project!;
  const staleBaseB = structuredClone(staleBaseA);
  const firstWriter = changeLocalScoreProjectMeter({
    project: staleBaseA,
    expectedRevision: staleBaseA.document.revision,
    meter: "3/4",
    now: "2026-07-24T04:00:04.000Z",
  });
  const secondWriter = changeLocalScoreProjectMeter({
    project: staleBaseB,
    expectedRevision: staleBaseB.document.revision,
    meter: "2/4",
    now: "2026-07-24T04:00:05.000Z",
  });
  const writerStoreA = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: factory,
  });
  const writerStoreB = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: factory,
  });
  assert.equal((await persistLocalScoreProjectChange({
    store: writerStoreA,
    currentProject: staleBaseA,
    proposedProject: firstWriter,
  })).status, "saved");
  const staleResult = await persistLocalScoreProjectChange({
    store: writerStoreB,
    currentProject: staleBaseB,
    proposedProject: secondWriter,
  });
  assert.equal(staleResult.status, "conflict");
  assert.deepEqual((await loadLocalScoreProject({
    store: writerStoreB,
    projectId: initial.projectId,
  })).project, firstWriter);

  await putRawRecord({
    factory,
    value: {
      projectId: "corrupt-project",
      schemaVersion: "local-score-project-storage-v1",
      broken: true,
    },
  });
  await putRawRecord({
    factory,
    value: {
      projectId: "future-project",
      schemaVersion: "local-score-project-storage-v3",
    },
  });
  const mixedList = await listLocalScoreProjects({
    store: createIndexedDbLocalScoreProjectStore({
      indexedDbFactory: factory,
    }),
  });
  assert.equal(mixedList.status, "partial");
  assert.deepEqual(
    mixedList.projects.map((project) => project.projectId),
    [initial.projectId],
  );
  assert.deepEqual(mixedList.issues, [
    { projectId: "corrupt-project", status: "corrupt" },
    { projectId: "future-project", status: "unsupported" },
  ]);

  const abortInitial = createLocalScoreProject({
    projectId: "idb-abort-project",
    title: "取消事务",
    now: "2026-07-24T05:00:00.000Z",
  });
  const abortStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: factory,
  });
  assert.equal((await persistNewLocalScoreProject({
    store: abortStore,
    project: abortInitial,
  })).status, "saved");
  const abortProposal = createEditedProject({
    project: abortInitial,
    eventId: "must-not-commit",
    pitch: "D4",
    now: "2026-07-24T05:00:01.000Z",
  });

  const originalTransaction = FakeIDBDatabase.prototype.transaction;
  let abortNextReadwrite = true;
  FakeIDBDatabase.prototype.transaction = function (
    storeNames: string | Iterable<string>,
    mode?: IDBTransactionMode,
    options?: IDBTransactionOptions,
  ) {
    const transaction = originalTransaction.call(
      this,
      storeNames,
      mode,
      options,
    );
    if (abortNextReadwrite && mode === "readwrite") {
      abortNextReadwrite = false;
      queueMicrotask(() => transaction.abort());
    }
    return transaction;
  };
  try {
    const aborted = await persistLocalScoreProjectChange({
      store: abortStore,
      currentProject: abortInitial,
      proposedProject: abortProposal,
    });
    assert.equal(aborted.saved, false);
    assert.equal(aborted.project.document.revision, abortInitial.document.revision);
  } finally {
    FakeIDBDatabase.prototype.transaction = originalTransaction;
  }
  assert.deepEqual((await loadLocalScoreProject({
    store: createIndexedDbLocalScoreProjectStore({
      indexedDbFactory: factory,
    }),
    projectId: abortInitial.projectId,
  })).project, abortInitial);

  const currentForDelete = (await loadLocalScoreProject({
    store: firstStore,
    projectId: initial.projectId,
  })).project!;
  const staleDelete = await deleteLocalScoreProject({
    store: firstStore,
    project: {
      ...currentForDelete,
      document: {
        ...currentForDelete.document,
        revision: currentForDelete.document.revision - 1,
      },
    },
  });
  assert.equal(staleDelete.deleted, false);
  assert.equal(staleDelete.status, "conflict");
  assert.match(staleDelete.notice ?? "", /重新读取后再删除/);
  assert.equal((await loadLocalScoreProject({
    store: firstStore,
    projectId: initial.projectId,
  })).status, "loaded");

  abortNextReadwrite = true;
  FakeIDBDatabase.prototype.transaction = function (
    storeNames: string | Iterable<string>,
    mode?: IDBTransactionMode,
    options?: IDBTransactionOptions,
  ) {
    const transaction = originalTransaction.call(
      this,
      storeNames,
      mode,
      options,
    );
    if (abortNextReadwrite && mode === "readwrite") {
      abortNextReadwrite = false;
      queueMicrotask(() => transaction.abort());
    }
    return transaction;
  };
  try {
    const abortedDelete = await deleteLocalScoreProject({
      store: firstStore,
      project: currentForDelete,
    });
    assert.equal(abortedDelete.deleted, false);
    assert.equal(abortedDelete.status, "transaction-failed");
    assert.match(abortedDelete.notice ?? "", /未删除乐谱项目/);
  } finally {
    FakeIDBDatabase.prototype.transaction = originalTransaction;
  }
  assert.equal((await loadLocalScoreProject({
    store: firstStore,
    projectId: initial.projectId,
  })).status, "loaded", "删除事务中止后原项目必须完整");

  const deleted = await deleteLocalScoreProject({
    store: firstStore,
    project: currentForDelete,
  });
  assert.equal(deleted.deleted, true);
  assert.equal((await loadLocalScoreProject({
    store: createIndexedDbLocalScoreProjectStore({
      indexedDbFactory: factory,
    }),
    projectId: initial.projectId,
  })).status, "not-found");

  console.log("Local score project IndexedDB recovery tests passed.");
};

void run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
