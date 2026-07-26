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
  createLocalScoreProjectRecoveryCandidate,
} from "../lib/music/localScoreProjectRecovery";
import {
  createIndexedDbLocalScoreProjectStore,
  deleteLocalScoreProject,
  getLocalScoreProjectStorageBytes,
  listLocalScoreProjects,
  loadLocalScoreProject,
  persistLocalScoreProjectChange,
  persistNewLocalScoreProject,
} from "../mobile/src/runtime/localScoreProjectStorage";

const DATABASE_NAME = "solfeggio-local-score-projects";
const DATABASE_VERSION = 2;
const STORE_NAME = "projects";
const RECOVERY_CANDIDATE_STORE_NAME = "recovery-candidates";

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
  const database = await waitForRequest(
    factory.open(DATABASE_NAME, DATABASE_VERSION),
  );
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
  const database = await waitForRequest(
    factory.open(DATABASE_NAME, DATABASE_VERSION),
  );
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

const seedVersionOneProject = async ({
  factory,
  value,
}: {
  factory: IDBFactory;
  value: unknown;
}) => {
  const request = factory.open(DATABASE_NAME, 1);
  request.onupgradeneeded = () => {
    request.result.createObjectStore(STORE_NAME, { keyPath: "projectId" });
  };
  const database = await waitForRequest(request);
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(value);
    await waitForTransaction(transaction);
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
  const upgradeFactory = new FakeIDBFactory();
  const upgradeSeed = createLocalScoreProject({
    projectId: "database-v1-upgrade-project",
    title: "升级保留谱",
    now: "2026-07-24T02:00:00.000Z",
  });
  const upgradeRawBefore = structuredClone(upgradeSeed);
  await seedVersionOneProject({
    factory: upgradeFactory,
    value: upgradeRawBefore,
  });
  const upgradedStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: upgradeFactory,
  });
  assert.deepEqual(await upgradedStore.get(upgradeSeed.projectId), upgradeSeed);
  assert.deepEqual(
    await getRawRecord({
      factory: upgradeFactory,
      projectId: upgradeSeed.projectId,
    }),
    upgradeRawBefore,
    "数据库 v1→v2 升级不得改写 projects 记录",
  );
  const upgradedDatabase = await waitForRequest(
    upgradeFactory.open(DATABASE_NAME, DATABASE_VERSION),
  );
  assert.equal(
    upgradedDatabase.objectStoreNames.contains(RECOVERY_CANDIDATE_STORE_NAME),
    true,
  );
  const upgradeCandidateStore = upgradedDatabase
    .transaction(RECOVERY_CANDIDATE_STORE_NAME, "readonly")
    .objectStore(RECOVERY_CANDIDATE_STORE_NAME);
  assert.equal(upgradeCandidateStore.indexNames.contains("projectId"), true);
  upgradedDatabase.close();

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
    document: {
      ...structuredClone(migrationSeed.document),
      schemaVersion: "score-document-v1",
    },
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
  assert.equal(migratedList[0]?.schemaVersion, "local-score-project-storage-v7");
  assert.equal(migratedList[0]?.document.schemaVersion, "score-document-v6");
  assert.equal(migratedList[0]?.document.parts[0]?.name, "声部组 1");
  assert.deepEqual(
    migratedList[0]?.document.parts[0]?.instrument,
    { kind: "unassigned" },
  );
  assert.equal(migratedList[0]?.tempoBpm, 90);
  const migratedLoad = await loadLocalScoreProject({
    store: migrationStore,
    projectId: migrationSeed.projectId,
  });
  assert.equal(migratedLoad.project?.schemaVersion, "local-score-project-storage-v7");
  assert.equal(migratedLoad.project?.tempoBpm, 90);
  assert.deepEqual(
    await getRawRecord({
      factory: migrationFactory,
      projectId: migrationSeed.projectId,
    }),
    legacyRawBefore,
    "读取旧版项目不得自动回写",
  );

  const previousFactory = new FakeIDBFactory();
  const previousSeed = createLocalScoreProject({
    projectId: "previous-v2-project",
    title: "上一版存储谱",
    now: "2026-07-24T03:10:00.000Z",
  });
  const previousRaw = {
    ...structuredClone(previousSeed),
    schemaVersion: "local-score-project-storage-v2",
    document: {
      ...structuredClone(previousSeed.document),
      schemaVersion: "score-document-v1",
    },
  };
  const previousRawBefore = structuredClone(previousRaw);
  const previousStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: previousFactory,
  });
  await previousStore.list();
  await putRawRecord({ factory: previousFactory, value: previousRaw });
  const previousList = await previousStore.list();
  assert.equal(previousList[0]?.schemaVersion, "local-score-project-storage-v7");
  assert.equal(previousList[0]?.document.schemaVersion, "score-document-v6");
  const previousLoad = await previousStore.get(previousSeed.projectId);
  assert.equal(previousLoad?.schemaVersion, "local-score-project-storage-v7");
  assert.deepEqual(
    await getRawRecord({
      factory: previousFactory,
      projectId: previousSeed.projectId,
    }),
    previousRawBefore,
    "读取 storage-v2 项目也不得自动回写",
  );

  const storageV6Factory = new FakeIDBFactory();
  const storageV6Seed = createLocalScoreProject({
    projectId: "previous-v6-project",
    title: "上一代署名谱",
    now: "2026-07-24T03:20:00.000Z",
  });
  const storageV6Raw = structuredClone(storageV6Seed) as unknown as {
    schemaVersion: string;
    document: Record<string, unknown>;
    undoStack: Record<string, unknown>[];
    redoStack: Record<string, unknown>[];
  };
  storageV6Raw.schemaVersion = "local-score-project-storage-v6";
  storageV6Raw.document.schemaVersion = "score-document-v5";
  delete storageV6Raw.document.scoreCredits;
  for (const content of [
    ...storageV6Raw.undoStack,
    ...storageV6Raw.redoStack,
  ]) delete content.scoreCredits;
  const storageV6Before = structuredClone(storageV6Raw);
  const storageV6Store = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: storageV6Factory,
  });
  await storageV6Store.list();
  await putRawRecord({ factory: storageV6Factory, value: storageV6Raw });
  const storageV6List = await storageV6Store.list();
  assert.equal(
    storageV6List[0]?.schemaVersion,
    "local-score-project-storage-v7",
  );
  assert.equal(storageV6List[0]?.document.schemaVersion, "score-document-v6");
  assert.deepEqual(storageV6List[0]?.document.scoreCredits, {
    title: storageV6Seed.title,
    subtitle: null,
    creators: [],
    rightsNotice: null,
  });
  assert.deepEqual(
    await getRawRecord({
      factory: storageV6Factory,
      projectId: storageV6Seed.projectId,
    }),
    storageV6Before,
    "读取 storage-v6 项目不得自动回写",
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
  assert.equal(migratedRaw.schemaVersion, "local-score-project-storage-v7");
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
      schemaVersion: "local-score-project-storage-v8",
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

  const candidateFactory = new FakeIDBFactory();
  const candidateBase = createLocalScoreProject({
    projectId: "candidate-project",
    title: "恢复候选谱",
    now: "2026-07-24T06:00:00.000Z",
  });
  const candidateProposal = createEditedProject({
    project: candidateBase,
    eventId: "candidate-note",
    pitch: "E4",
    now: "2026-07-24T06:00:01.000Z",
  });
  const candidateStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: candidateFactory,
  });
  await candidateStore.put(candidateBase, null);
  const firstCandidate = createLocalScoreProjectRecoveryCandidate({
    candidateId: "candidate-project-editor",
    baseProject: candidateBase,
    candidateSequence: 1,
    capturedAt: "2026-07-24T06:00:02.000Z",
    proposedProject: candidateProposal,
  });
  await assert.rejects(
    () => candidateStore.stageRecoveryCandidate!({
      ...firstCandidate,
      baseFingerprint: firstCandidate.baseFingerprint.endsWith("0")
        ? `${firstCandidate.baseFingerprint.slice(0, -1)}1`
        : `${firstCandidate.baseFingerprint.slice(0, -1)}0`,
    }),
    /基线身份或内容已变化/,
  );
  await assert.rejects(
    () => candidateStore.stageRecoveryCandidate!({
      ...firstCandidate,
      proposedProject: {
        ...firstCandidate.proposedProject,
        createdAt: "2026-07-24T05:59:59.000Z",
      },
    }),
    /基线身份或内容已变化/,
  );
  await candidateStore.stageRecoveryCandidate?.(firstCandidate);
  assert.deepEqual(
    await candidateStore.listRecoveryCandidates?.(candidateBase.projectId),
    [firstCandidate],
    "候选必须可按 projectId 索引读取",
  );
  const reopenedCandidateStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: candidateFactory,
  });
  assert.deepEqual(
    await reopenedCandidateStore.listRecoveryCandidates?.(
      candidateBase.projectId,
    ),
    [firstCandidate],
    "关闭并重开 store 后必须保留 staged candidate",
  );

  const differentIdCandidate = createLocalScoreProjectRecoveryCandidate({
    candidateId: "candidate-project-other-editor",
    baseProject: candidateBase,
    candidateSequence: 2,
    capturedAt: "2026-07-24T06:00:02.500Z",
    proposedProject: candidateProposal,
  });
  await assert.rejects(
    () => reopenedCandidateStore.stageRecoveryCandidate!(
      differentIdCandidate,
      1,
    ),
    /最多保留一个恢复候选|不同候选/,
  );
  const skippedSequenceCandidate = createLocalScoreProjectRecoveryCandidate({
    candidateId: firstCandidate.candidateId,
    baseProject: candidateBase,
    candidateSequence: 3,
    capturedAt: "2026-07-24T06:00:02.600Z",
    proposedProject: candidateProposal,
  });
  await assert.rejects(
    () => reopenedCandidateStore.stageRecoveryCandidate!(
      skippedSequenceCandidate,
      1,
    ),
    /严格连续/,
  );
  await assert.rejects(
    () => reopenedCandidateStore.stageRecoveryCandidate!(
      skippedSequenceCandidate,
    ),
    /严格连续/,
  );
  await assert.rejects(
    () => reopenedCandidateStore.stageRecoveryCandidate!({
      ...firstCandidate,
      candidateSequence: Number.MAX_SAFE_INTEGER,
    }),
    /结构无效|序号/,
  );

  const secondCandidate = createLocalScoreProjectRecoveryCandidate({
    candidateId: firstCandidate.candidateId,
    baseProject: candidateBase,
    candidateSequence: 2,
    capturedAt: "2026-07-24T06:00:03.000Z",
    proposedProject: candidateProposal,
  });
  await reopenedCandidateStore.stageRecoveryCandidate?.(secondCandidate, 1);
  await assert.rejects(
    () => reopenedCandidateStore.stageRecoveryCandidate!(firstCandidate),
    /较新的候选|序号/,
    "迟到 sequence 不得覆盖较新的候选",
  );
  assert.deepEqual(
    await reopenedCandidateStore.listRecoveryCandidates?.(
      candidateBase.projectId,
    ),
    [secondCandidate],
  );
  const promotedCandidate =
    await reopenedCandidateStore.promoteRecoveryCandidate?.(
      secondCandidate.candidateId,
      secondCandidate.candidateSequence,
    );
  assert.deepEqual(promotedCandidate, candidateProposal);
  assert.deepEqual(
    await reopenedCandidateStore.get(candidateBase.projectId),
    candidateProposal,
  );
  assert.deepEqual(
    await reopenedCandidateStore.listRecoveryCandidates?.(
      candidateBase.projectId,
    ),
    [],
    "promote 必须在同一事务删除候选",
  );

  const atomicFactory = new FakeIDBFactory();
  const atomicBase = createLocalScoreProject({
    projectId: "atomic-candidate-project",
    title: "原子恢复谱",
    now: "2026-07-24T06:10:00.000Z",
  });
  const atomicProposal = createEditedProject({
    project: atomicBase,
    eventId: "atomic-note",
    pitch: "F4",
    now: "2026-07-24T06:10:01.000Z",
  });
  const atomicCandidate = createLocalScoreProjectRecoveryCandidate({
    candidateId: "atomic-candidate",
    baseProject: atomicBase,
    candidateSequence: 1,
    capturedAt: "2026-07-24T06:10:02.000Z",
    proposedProject: atomicProposal,
  });
  const atomicSeedStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: atomicFactory,
  });
  await atomicSeedStore.put(atomicBase, null);
  await atomicSeedStore.stageRecoveryCandidate?.(atomicCandidate);
  const atomicFailureStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: atomicFactory,
    writeRequest: (store, project) => store.add(project),
  });
  await assert.rejects(
    () => atomicFailureStore.promoteRecoveryCandidate!(
      atomicCandidate.candidateId,
      atomicCandidate.candidateSequence,
    ),
  );
  assert.deepEqual(await atomicFailureStore.get(atomicBase.projectId), atomicBase);
  assert.deepEqual(
    await atomicFailureStore.listRecoveryCandidates?.(atomicBase.projectId),
    [atomicCandidate],
    "项目写失败时 candidate 删除也必须回滚",
  );

  const capacityPromotionStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: atomicFactory,
    limits: {
      maxProjects: 1,
      maxBytes: getLocalScoreProjectStorageBytes(atomicBase),
    },
  });
  await assert.rejects(
    () => capacityPromotionStore.promoteRecoveryCandidate!(
      atomicCandidate.candidateId,
      atomicCandidate.candidateSequence,
    ),
    /容量上限/,
  );
  assert.deepEqual(
    await capacityPromotionStore.get(atomicBase.projectId),
    atomicBase,
  );
  assert.deepEqual(
    await capacityPromotionStore.listRecoveryCandidates?.(
      atomicBase.projectId,
    ),
    [atomicCandidate],
    "容量检查失败时项目和候选必须同时保持不变",
  );

  await atomicSeedStore.discardRecoveryCandidate?.(
    atomicCandidate.candidateId,
    atomicCandidate.candidateSequence,
  );
  assert.deepEqual(
    await atomicSeedStore.listRecoveryCandidates?.(atomicBase.projectId),
    [],
  );

  const recoveryCapacityFactory = new FakeIDBFactory();
  const recoveryCapacityBaseA = createLocalScoreProject({
    projectId: "recovery-capacity-a",
    title: "恢复容量甲",
    now: "2026-07-24T06:15:00.000Z",
  });
  const recoveryCapacityBaseB = createLocalScoreProject({
    projectId: "recovery-capacity-b",
    title: "恢复容量乙",
    now: "2026-07-24T06:15:01.000Z",
  });
  const recoveryCapacityCandidateA =
    createLocalScoreProjectRecoveryCandidate({
      candidateId: "recovery-capacity-candidate-a",
      baseProject: recoveryCapacityBaseA,
      candidateSequence: 1,
      capturedAt: "2026-07-24T06:15:02.000Z",
      proposedProject: changeLocalScoreProjectTempo({
        project: recoveryCapacityBaseA,
        expectedRevision: recoveryCapacityBaseA.document.revision,
        tempoBpm: 91,
        now: "2026-07-24T06:15:02.000Z",
      }),
    });
  const recoveryCapacityCandidateB =
    createLocalScoreProjectRecoveryCandidate({
      candidateId: "recovery-capacity-candidate-b",
      baseProject: recoveryCapacityBaseB,
      candidateSequence: 1,
      capturedAt: "2026-07-24T06:15:03.000Z",
      proposedProject: changeLocalScoreProjectTempo({
        project: recoveryCapacityBaseB,
        expectedRevision: recoveryCapacityBaseB.document.revision,
        tempoBpm: 92,
        now: "2026-07-24T06:15:03.000Z",
      }),
    });
  const recoveryCapacityStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: recoveryCapacityFactory,
    recoveryCandidateMaxBytes: getLocalScoreProjectStorageBytes(
      recoveryCapacityCandidateA,
    ),
  });
  await recoveryCapacityStore.put(recoveryCapacityBaseA, null);
  await recoveryCapacityStore.put(recoveryCapacityBaseB, null);
  await recoveryCapacityStore.stageRecoveryCandidate?.(
    recoveryCapacityCandidateA,
  );
  const replacementCandidateA = createLocalScoreProjectRecoveryCandidate({
    candidateId: recoveryCapacityCandidateA.candidateId,
    baseProject: recoveryCapacityBaseA,
    candidateSequence: 2,
    capturedAt: "2026-07-24T06:15:04.000Z",
    proposedProject: recoveryCapacityCandidateA.proposedProject,
  });
  assert.equal(
    getLocalScoreProjectStorageBytes(replacementCandidateA),
    getLocalScoreProjectStorageBytes(recoveryCapacityCandidateA),
  );
  await recoveryCapacityStore.stageRecoveryCandidate?.(
    replacementCandidateA,
    1,
  );
  await assert.rejects(
    () => recoveryCapacityStore.stageRecoveryCandidate!(
      recoveryCapacityCandidateB,
    ),
    /恢复候选总容量上限/,
  );
  assert.deepEqual(
    await recoveryCapacityStore.get(recoveryCapacityBaseB.projectId),
    recoveryCapacityBaseB,
    "候选容量失败不得影响 canonical 项目",
  );
  assert.deepEqual(
    await recoveryCapacityStore.listRecoveryCandidates?.(),
    [replacementCandidateA],
    "候选容量按同 candidateId 替换语义计算",
  );

  const staleFactory = new FakeIDBFactory();
  const staleCandidateBase = createLocalScoreProject({
    projectId: "stale-candidate-project",
    title: "过期恢复谱",
    now: "2026-07-24T06:20:00.000Z",
  });
  const staleCandidateProposal = createEditedProject({
    project: staleCandidateBase,
    eventId: "stale-candidate-note",
    pitch: "C4",
    now: "2026-07-24T06:20:01.000Z",
  });
  const staleCandidate = createLocalScoreProjectRecoveryCandidate({
    candidateId: "stale-candidate",
    baseProject: staleCandidateBase,
    candidateSequence: 1,
    capturedAt: "2026-07-24T06:20:02.000Z",
    proposedProject: staleCandidateProposal,
  });
  const staleCandidateStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: staleFactory,
  });
  await staleCandidateStore.put(staleCandidateBase, null);
  await staleCandidateStore.stageRecoveryCandidate?.(staleCandidate);
  const competingProject = changeLocalScoreProjectTempo({
    project: staleCandidateBase,
    expectedRevision: staleCandidateBase.document.revision,
    tempoBpm: 72,
    now: "2026-07-24T06:20:03.000Z",
  });
  await staleCandidateStore.put(
    competingProject,
    staleCandidateBase.document.revision,
  );
  await assert.rejects(
    () => staleCandidateStore.promoteRecoveryCandidate!(
      staleCandidate.candidateId,
      staleCandidate.candidateSequence,
    ),
    /基线身份或内容已变化/,
  );
  assert.deepEqual(
    await staleCandidateStore.get(staleCandidateBase.projectId),
    competingProject,
  );
  assert.deepEqual(
    await staleCandidateStore.listRecoveryCandidates?.(
      staleCandidateBase.projectId,
    ),
    [staleCandidate],
    "stale promote 冲突时不得删除候选",
  );

  const recreatedFactory = new FakeIDBFactory();
  const recreatedBase = createLocalScoreProject({
    projectId: "recreated-project-id",
    title: "原始身份谱",
    now: "2026-07-24T06:25:00.000Z",
  });
  const recreatedProposal = changeLocalScoreProjectTempo({
    project: recreatedBase,
    expectedRevision: recreatedBase.document.revision,
    tempoBpm: 93,
    now: "2026-07-24T06:25:01.000Z",
  });
  const recreatedCandidate = createLocalScoreProjectRecoveryCandidate({
    candidateId: "recreated-project-candidate",
    baseProject: recreatedBase,
    candidateSequence: 1,
    capturedAt: "2026-07-24T06:25:02.000Z",
    proposedProject: recreatedProposal,
  });
  const recreatedStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: recreatedFactory,
  });
  await recreatedStore.put(recreatedBase, null);
  await recreatedStore.stageRecoveryCandidate?.(recreatedCandidate);
  const replacementWithSameIds = createLocalScoreProject({
    projectId: recreatedBase.projectId,
    title: "重建身份谱",
    now: "2026-07-24T06:26:00.000Z",
  });
  await putRawRecord({
    factory: recreatedFactory,
    value: replacementWithSameIds,
  });
  await assert.rejects(
    () => recreatedStore.promoteRecoveryCandidate!(
      recreatedCandidate.candidateId,
      recreatedCandidate.candidateSequence,
    ),
    /基线身份或内容已变化/,
  );
  assert.deepEqual(
    await recreatedStore.get(recreatedBase.projectId),
    replacementWithSameIds,
  );
  assert.deepEqual(
    await recreatedStore.listRecoveryCandidates?.(recreatedBase.projectId),
    [recreatedCandidate],
    "复用 projectId/documentId 的重建项目不得消费旧候选",
  );

  const cascadeFactory = new FakeIDBFactory();
  const cascadeBase = createLocalScoreProject({
    projectId: "cascade-candidate-project",
    title: "连带删除谱",
    now: "2026-07-24T06:30:00.000Z",
  });
  const cascadeProposal = createEditedProject({
    project: cascadeBase,
    eventId: "cascade-note",
    pitch: "D4",
    now: "2026-07-24T06:30:01.000Z",
  });
  const cascadeCandidate = createLocalScoreProjectRecoveryCandidate({
    candidateId: "cascade-candidate",
    baseProject: cascadeBase,
    candidateSequence: 1,
    capturedAt: "2026-07-24T06:30:02.000Z",
    proposedProject: cascadeProposal,
  });
  const cascadeStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: cascadeFactory,
  });
  await cascadeStore.put(cascadeBase, null);
  await cascadeStore.stageRecoveryCandidate?.(cascadeCandidate);
  await cascadeStore.delete(
    cascadeBase.projectId,
    cascadeBase.document.revision,
  );
  assert.equal(await cascadeStore.get(cascadeBase.projectId), null);
  assert.deepEqual(
    await cascadeStore.listRecoveryCandidates?.(cascadeBase.projectId),
    [],
    "删除项目必须在同一事务连带删除候选",
  );

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
