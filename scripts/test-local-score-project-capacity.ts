import assert from "node:assert/strict";

import {
  IDBDatabase as FakeIDBDatabase,
  IDBFactory as FakeIDBFactory,
} from "fake-indexeddb";

import {
  addLocalScoreProjectEvent,
  createLocalScoreProject,
} from "../lib/music/localScoreProject";
import {
  createIndexedDbLocalScoreProjectStore,
  getLocalScoreProjectStorageBytes,
  getLocalScoreProjectWriteError,
  loadLocalScoreProject,
  persistLocalScoreProjectChange,
  persistNewLocalScoreProject,
} from "../mobile/src/runtime/localScoreProjectStorage";

const largeLimit = 1024 * 1024;

const createProject = (projectId: string, title = "容量测试谱") =>
  createLocalScoreProject({
    projectId,
    title,
    now: "2026-07-24T10:00:00.000Z",
  });

const addNote = (project: ReturnType<typeof createProject>) =>
  addLocalScoreProjectEvent({
    project,
    expectedRevision: project.document.revision,
    location: {
      partId: "part-1",
      staffId: "staff-1",
      voiceId: "voice-1",
      measureNumber: 1,
    },
    eventId: "capacity-note",
    input: { type: "note", pitch: "C4", duration: "quarter" },
    now: "2026-07-24T10:00:01.000Z",
  });

const asQuotaRequest = (
  request: IDBRequest<IDBValidKey>,
): IDBRequest<IDBValidKey> =>
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

const run = async () => {
  const boundaryProject = createProject("boundary");
  const boundaryBytes = getLocalScoreProjectStorageBytes(boundaryProject);

  const belowStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: new FakeIDBFactory(),
    limits: { maxProjects: 1, maxBytes: boundaryBytes + 1 },
  });
  assert.equal((await persistNewLocalScoreProject({
    store: belowStore,
    project: boundaryProject,
  })).status, "saved", "低于容量限制必须允许保存");

  const exactStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: new FakeIDBFactory(),
    limits: { maxProjects: 1, maxBytes: boundaryBytes },
  });
  assert.equal((await persistNewLocalScoreProject({
    store: exactStore,
    project: boundaryProject,
  })).status, "saved", "正好达到容量限制必须允许保存");

  const overFactory = new FakeIDBFactory();
  const overStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: overFactory,
    limits: { maxProjects: 1, maxBytes: boundaryBytes - 1 },
  });
  const over = await persistNewLocalScoreProject({
    store: overStore,
    project: boundaryProject,
  });
  assert.equal(over.status, "capacity");
  assert.match(over.notice ?? "", /应用设定.*容量上限/);
  assert.equal((await loadLocalScoreProject({
    store: overStore,
    projectId: boundaryProject.projectId,
  })).status, "not-found", "超限新项目不得留下部分记录");

  const countFactory = new FakeIDBFactory();
  const countStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: countFactory,
    limits: { maxProjects: 1, maxBytes: largeLimit },
  });
  const first = createProject("first");
  const second = createProject("second");
  assert.equal((await persistNewLocalScoreProject({
    store: countStore,
    project: first,
  })).status, "saved");
  const rejectedSecond = await persistNewLocalScoreProject({
    store: countStore,
    project: second,
  });
  assert.equal(rejectedSecond.status, "capacity");
  assert.match(rejectedSecond.notice ?? "", /数量上限（1 个）/);
  assert.deepEqual((await loadLocalScoreProject({
    store: countStore,
    projectId: first.projectId,
  })).project, first, "拒绝新建后已有项目必须完整");
  assert.equal((await loadLocalScoreProject({
    store: countStore,
    projectId: second.projectId,
  })).status, "not-found");

  const concurrentFactory = new FakeIDBFactory();
  const concurrentStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: concurrentFactory,
    limits: { maxProjects: 1, maxBytes: largeLimit },
  });
  const concurrentResults = await Promise.all([
    persistNewLocalScoreProject({
      store: concurrentStore,
      project: createProject("concurrent-a"),
    }),
    persistNewLocalScoreProject({
      store: concurrentStore,
      project: createProject("concurrent-b"),
    }),
  ]);
  assert.deepEqual(
    concurrentResults.map(({ status }) => status).sort(),
    ["capacity", "saved"],
    "并发争用最后一个项目名额时只能保存一个项目",
  );
  assert.equal(
    (await concurrentStore.list()).length,
    1,
    "并发容量检查与写入必须保持在同一原子事务内",
  );

  const editFactory = new FakeIDBFactory();
  const editInitial = createProject("edit-capacity");
  const editProposal = addNote(editInitial);
  const editStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: editFactory,
    limits: {
      maxProjects: 1,
      maxBytes: getLocalScoreProjectStorageBytes(editInitial),
    },
  });
  assert.equal((await persistNewLocalScoreProject({
    store: editStore,
    project: editInitial,
  })).status, "saved");
  const rejectedEdit = await persistLocalScoreProjectChange({
    store: editStore,
    currentProject: editInitial,
    proposedProject: editProposal,
  });
  assert.equal(rejectedEdit.status, "capacity");
  assert.equal(rejectedEdit.project, editInitial);
  assert.deepEqual((await loadLocalScoreProject({
    store: editStore,
    projectId: editInitial.projectId,
  })).project, editInitial, "编辑超限后已保存数据必须保持不变");

  const recoveredStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: editFactory,
    limits: {
      maxProjects: 1,
      maxBytes: getLocalScoreProjectStorageBytes(editProposal),
    },
  });
  const retried = await persistLocalScoreProjectChange({
    store: recoveredStore,
    currentProject: editInitial,
    proposedProject: editProposal,
  });
  assert.equal(retried.status, "saved", "恢复容量条件后同一修改必须可重试");
  assert.deepEqual((await loadLocalScoreProject({
    store: recoveredStore,
    projectId: editInitial.projectId,
  })).project, editProposal);

  const quota = getLocalScoreProjectWriteError(
    new DOMException("quota", "QuotaExceededError"),
  );
  assert.equal(quota.code, "quota");
  assert.match(quota.message, /浏览器或 Android WebView.*IndexedDB/);
  const ordinaryWrite = getLocalScoreProjectWriteError(
    new DOMException("write", "UnknownError"),
  );
  assert.equal(ordinaryWrite.code, "write-failed");
  assert.match(ordinaryWrite.message, /本机存储写入失败/);

  const requestFailureFactory = new FakeIDBFactory();
  const requestFailureInitial = createProject("request-failure");
  const requestFailureProposal = addNote(requestFailureInitial);
  const healthyRequestStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: requestFailureFactory,
    limits: { maxProjects: 2, maxBytes: largeLimit },
  });
  assert.equal((await persistNewLocalScoreProject({
    store: healthyRequestStore,
    project: requestFailureInitial,
  })).status, "saved");

  const quotaRequestStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: requestFailureFactory,
    limits: { maxProjects: 2, maxBytes: largeLimit },
    writeRequest: (store, project) =>
      asQuotaRequest(store.add(project)),
  });
  const quotaRequestResult = await persistLocalScoreProjectChange({
    store: quotaRequestStore,
    currentProject: requestFailureInitial,
    proposedProject: requestFailureProposal,
  });
  assert.equal(quotaRequestResult.status, "quota");
  assert.deepEqual((await loadLocalScoreProject({
    store: healthyRequestStore,
    projectId: requestFailureInitial.projectId,
  })).project, requestFailureInitial);

  const ordinaryRequestStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: requestFailureFactory,
    limits: { maxProjects: 2, maxBytes: largeLimit },
    writeRequest: (store, project) => store.add(project),
  });
  const ordinaryRequestResult = await persistLocalScoreProjectChange({
    store: ordinaryRequestStore,
    currentProject: requestFailureInitial,
    proposedProject: requestFailureProposal,
  });
  assert.equal(ordinaryRequestResult.status, "write-failed");
  assert.deepEqual((await loadLocalScoreProject({
    store: healthyRequestStore,
    projectId: requestFailureInitial.projectId,
  })).project, requestFailureInitial);

  const recoveredRequestResult = await persistLocalScoreProjectChange({
    store: healthyRequestStore,
    currentProject: requestFailureInitial,
    proposedProject: requestFailureProposal,
  });
  assert.equal(recoveredRequestResult.status, "saved");
  assert.deepEqual((await loadLocalScoreProject({
    store: healthyRequestStore,
    projectId: requestFailureInitial.projectId,
  })).project, requestFailureProposal);

  const abortFactory = new FakeIDBFactory();
  const abortProject = createProject("abort");
  const abortStore = createIndexedDbLocalScoreProjectStore({
    indexedDbFactory: abortFactory,
    limits: { maxProjects: 2, maxBytes: largeLimit },
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
    const aborted = await persistNewLocalScoreProject({
      store: abortStore,
      project: abortProject,
    });
    assert.equal(aborted.status, "transaction-failed");
    assert.match(aborted.notice ?? "", /IndexedDB 事务被中止/);
    assert.equal((await loadLocalScoreProject({
      store: abortStore,
      projectId: abortProject.projectId,
    })).status, "not-found");
  } finally {
    FakeIDBDatabase.prototype.transaction = originalTransaction;
  }
  assert.equal((await persistNewLocalScoreProject({
    store: abortStore,
    project: abortProject,
  })).status, "saved", "事务恢复后必须可以重试");

  console.log("Local score project capacity guard checks passed.");
};

void run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
