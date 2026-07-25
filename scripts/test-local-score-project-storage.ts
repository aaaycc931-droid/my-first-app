import assert from "node:assert/strict";

import {
  LocalScoreProjectConflictError,
  applyLocalScoreProjectContent,
  cloneLocalScoreProject,
  createLocalScoreProject,
  getLocalScoreProjectContent,
  type LocalScoreProjectV1,
} from "../lib/music/localScoreProject";
import {
  deleteLocalScoreProject,
  loadLocalScoreProject,
  persistLocalScoreProjectChange,
  persistNewLocalScoreProject,
  type LocalScoreProjectStore,
} from "../mobile/src/runtime/localScoreProjectStorage";

class MemoryProjectStore implements LocalScoreProjectStore {
  readonly values = new Map<string, LocalScoreProjectV1>();
  readonly calls: string[] = [];
  failNextPut = false;

  async get(projectId: string) {
    const value = this.values.get(projectId);
    return value ? cloneLocalScoreProject(value) : null;
  }

  async list() {
    return Array.from(this.values.values()).map(cloneLocalScoreProject);
  }

  async put(project: LocalScoreProjectV1, expectedRevision: number | null) {
    this.calls.push(`put:${project.document.revision}`);
    if (this.failNextPut) {
      this.failNextPut = false;
      throw new Error("quota");
    }
    const current = this.values.get(project.projectId);
    if (
      (expectedRevision === null && current)
      || (
        expectedRevision !== null
        && current?.document.revision !== expectedRevision
      )
    ) throw new LocalScoreProjectConflictError();
    this.values.set(project.projectId, cloneLocalScoreProject(project));
  }

  async delete(projectId: string, expectedRevision: number) {
    const current = this.values.get(projectId);
    if (current?.document.revision !== expectedRevision) {
      throw new LocalScoreProjectConflictError();
    }
    this.values.delete(projectId);
  }
}

const run = async () => {
const store = new MemoryProjectStore();
const initial = createLocalScoreProject({
  projectId: "storage-project",
  title: "保存测试",
  now: "2026-07-24T01:00:00.000Z",
});
const created = await persistNewLocalScoreProject({ store, project: initial });
assert.equal(created.saved, true);
assert.equal(created.notice, null);

const loaded = await loadLocalScoreProject({
  store,
  projectId: initial.projectId,
});
assert.deepEqual(loaded, {
  project: initial,
  notice: null,
  sourceStatus: "available",
});

const content = getLocalScoreProjectContent(initial);
const proposed = applyLocalScoreProjectContent({
  project: initial,
  expectedRevision: initial.document.revision,
  content: { ...content, meter: "3/4" },
  now: "2026-07-24T01:00:01.000Z",
});
const saved = await persistLocalScoreProjectChange({
  store,
  currentProject: initial,
  proposedProject: proposed,
});
assert.equal(saved.saved, true);
assert.equal(saved.project.document.revision, 2);
assert.deepEqual((await store.get(initial.projectId)), proposed);

store.failNextPut = true;
const failedProposal = applyLocalScoreProjectContent({
  project: saved.project,
  expectedRevision: saved.project.document.revision,
  content: { ...getLocalScoreProjectContent(saved.project), meter: "2/4" },
  now: "2026-07-24T01:00:02.000Z",
});
const failedSave = await persistLocalScoreProjectChange({
  store,
  currentProject: saved.project,
  proposedProject: failedProposal,
});
assert.equal(failedSave.saved, false);
assert.equal(failedSave.project, saved.project);
assert.equal(failedSave.project.document.revision, 2);
assert.match(failedSave.notice ?? "", /已保存版本保持不变/);
assert.equal((await store.get(initial.projectId))?.document.revision, 2);

const staleWriter = applyLocalScoreProjectContent({
  project: initial,
  expectedRevision: 1,
  content: { ...getLocalScoreProjectContent(initial), meter: "2/4" },
  now: "2026-07-24T01:00:03.000Z",
});
const conflict = await persistLocalScoreProjectChange({
  store,
  currentProject: initial,
  proposedProject: staleWriter,
});
assert.equal(conflict.saved, false);
assert.equal(conflict.project, initial);
assert.match(conflict.notice ?? "", /其他页面更新/);
assert.equal((await store.get(initial.projectId))?.document.meter, "3/4");

const wrongIdentity = await persistLocalScoreProjectChange({
  store,
  currentProject: saved.project,
  proposedProject: {
    ...failedProposal,
    projectId: "other",
  },
});
assert.equal(wrongIdentity.saved, false);
assert.match(wrongIdentity.notice ?? "", /身份不一致/);

const failedStore: LocalScoreProjectStore = {
  get: async () => { throw new Error("corrupt"); },
  list: async () => { throw new Error("corrupt"); },
  put: async () => { throw new Error("write"); },
  delete: async () => { throw new Error("delete"); },
};
const unavailable = await loadLocalScoreProject({
  store: failedStore,
  projectId: initial.projectId,
});
assert.equal(unavailable.project, null);
assert.equal(unavailable.sourceStatus, "unavailable");
assert.match(unavailable.notice ?? "", /未被覆盖或清除/);

const failedDelete = await deleteLocalScoreProject({
  store: failedStore,
  project: saved.project,
});
assert.equal(failedDelete.deleted, false);
assert.match(failedDelete.notice ?? "", /仍被保留/);

const deleted = await deleteLocalScoreProject({
  store,
  project: saved.project,
});
assert.equal(deleted.deleted, true);
assert.equal(await store.get(initial.projectId), null);

assert.deepEqual(
  store.calls,
  ["put:1", "put:2", "put:3", "put:2"],
  "每次 proposal 都必须先尝试持久化；冲突不能覆盖已保存修订",
);

console.log("Local score project storage tests passed.");
};

void run();
