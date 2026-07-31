import assert from "node:assert/strict";

import {
  createLocalVocalPracticeRecord,
  LOCAL_VOCAL_PRACTICE_MAX_RECORDS,
} from "../lib/practice/localVocalPracticeRecord.js";
import {
  createIndexedDbLocalVocalPracticeRecordRepository,
} from "../lib/platform/indexedDbLocalVocalPracticeRecordRepository.js";

const records = new Map<string, unknown>();
let abortNextWrite = false;
let holdNextWriteCompletion = false;
let releaseHeldWrite: (() => void) | null = null;
let storeExists = false;
let openedDatabaseName: string | undefined;
let openedDatabaseVersion: number | undefined;
let createdStore: { name: string; keyPath: string } | undefined;

const requestWithResult = <T>(result: T) => {
  const request = { result, onsuccess: null as null | (() => void), onerror: null as null | (() => void) };
  queueMicrotask(() => request.onsuccess?.());
  return request as unknown as IDBRequest<T>;
};

const database = {
  objectStoreNames: { contains: (name: string) => storeExists && name === "sessions" },
  createObjectStore: (name: string, options: { keyPath: string }) => {
    storeExists = true;
    createdStore = { name, keyPath: options.keyPath };
  },
  close: () => undefined,
  transaction: (_name: string, mode: IDBTransactionMode) => {
    const transaction = {
      oncomplete: null as null | (() => void),
      onabort: null as null | (() => void),
      onerror: null as null | (() => void),
      objectStore: () => ({
        getAll: () => requestWithResult(Array.from(records.values())),
        put: (record: { id: string }) => scheduleWrite(() => records.set(record.id, record)),
        delete: (id: string) => scheduleWrite(() => records.delete(id)),
        clear: () => scheduleWrite(() => records.clear()),
      }),
    };
    const scheduleWrite = (commit: () => unknown) => {
      const request = {
        onsuccess: null as null | (() => void),
        onerror: null as null | (() => void),
      };
      queueMicrotask(() => {
        if (mode !== "readwrite") return;
        if (abortNextWrite) {
          abortNextWrite = false;
          transaction.onabort?.();
          return;
        }
        commit();
        request.onsuccess?.();
        if (holdNextWriteCompletion) {
          holdNextWriteCompletion = false;
          releaseHeldWrite = () => transaction.oncomplete?.();
          return;
        }
        transaction.oncomplete?.();
      });
      return request as unknown as IDBRequest;
    };
    return transaction;
  },
};

Object.defineProperty(globalThis, "indexedDB", {
  configurable: true,
  value: {
    open: (name: string, version: number) => {
      openedDatabaseName = name;
      openedDatabaseVersion = version;
      const request = {
        result: database,
        onupgradeneeded: null as null | (() => void),
        onsuccess: null as null | (() => void),
        onerror: null as null | (() => void),
      };
      queueMicrotask(() => {
        if (!storeExists) request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    },
  },
});

const point = { timestampMs: 100, midi: 69, state: "reliable" as const, confidence: 0.9 };
const record = createLocalVocalPracticeRecord({ note: "第一次", targetLabel: "单音长音", targetMidi: 69, curvePoints: [point], recording: new Blob(["voice"]), id: "id-1" });
const main = async () => {
  const repository = createIndexedDbLocalVocalPracticeRecordRepository();
  await repository.save(record);
  assert.equal(openedDatabaseName, "solfeggio-local-vocal-practice");
  assert.equal(openedDatabaseVersion, 1);
  assert.deepEqual(createdStore, { name: "sessions", keyPath: "id" });
  assert.equal((await repository.list())[0]?.recording?.size, 5);
  records.set("damaged", { ...record, schemaVersion: 2, id: "damaged" });
  assert.deepEqual((await repository.list()).map((item) => item.id), ["id-1"]);
  records.delete("damaged");

  abortNextWrite = true;
  const rejected = createLocalVocalPracticeRecord({ note: "不应提交", targetLabel: "自由练唱", targetMidi: 60, curvePoints: [point], recording: null, id: "id-abort" });
  await assert.rejects(repository.save(rejected), /被取消/);
  assert.equal((await repository.list()).some((item) => item.id === "id-abort"), false);

  await repository.remove(record.id);
  assert.equal((await repository.list()).length, 0);

  const heldRecord = createLocalVocalPracticeRecord({
    note: "等待 transaction complete",
    targetLabel: "自由练唱",
    targetMidi: 60,
    curvePoints: [point],
    recording: null,
    id: "id-held",
  });
  holdNextWriteCompletion = true;
  let heldSaveResolved = false;
  const heldSave = repository.save(heldRecord).then(() => {
    heldSaveResolved = true;
  });
  for (let attempt = 0; attempt < 20 && !releaseHeldWrite; attempt += 1) {
    await Promise.resolve();
  }
  assert.ok(releaseHeldWrite, "write request should succeed before transaction completion");
  assert.equal(records.has(heldRecord.id), true);
  assert.equal(heldSaveResolved, false, "save must not resolve on request success");
  releaseHeldWrite();
  releaseHeldWrite = null;
  await heldSave;
  assert.equal(heldSaveResolved, true);
  await repository.remove(heldRecord.id);

  for (let index = 0; index < LOCAL_VOCAL_PRACTICE_MAX_RECORDS; index += 1) {
    await repository.save(createLocalVocalPracticeRecord({
      note: `记录 ${index}`,
      targetLabel: "自由练唱",
      targetMidi: 60,
      curvePoints: [point],
      recording: null,
      now: new Date(`2026-07-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`),
      id: `limit-${index}`,
    }));
  }
  assert.equal((await repository.list()).length, LOCAL_VOCAL_PRACTICE_MAX_RECORDS);
  assert.equal((await repository.list())[0]?.id, "limit-19");
  await repository.save(createLocalVocalPracticeRecord({
    note: "更新已有记录",
    targetLabel: "自由练唱",
    targetMidi: 60,
    curvePoints: [point],
    recording: null,
    id: "limit-0",
  }));
  await assert.rejects(repository.save(createLocalVocalPracticeRecord({
    note: "超出上限",
    targetLabel: "自由练唱",
    targetMidi: 60,
    curvePoints: [point],
    recording: null,
    id: "limit-overflow",
  })), /最多保存 20 条/);

  await repository.clear();
  assert.equal((await repository.list()).length, 0);

  console.log("Local vocal practice IndexedDB transaction tests passed.");
};

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
