import assert from "node:assert/strict";

import {
  clearLocalVocalPracticeRecords,
  createLocalVocalPracticeRecord,
  deleteLocalVocalPracticeRecord,
  listLocalVocalPracticeRecords,
  saveLocalVocalPracticeRecord,
} from "../mobile/src/runtime/localVocalPracticeStorage.js";

const records = new Map<string, unknown>();
let abortNextWrite = false;

const requestWithResult = <T>(result: T) => {
  const request = { result, onsuccess: null as null | (() => void), onerror: null as null | (() => void) };
  queueMicrotask(() => request.onsuccess?.());
  return request as unknown as IDBRequest<T>;
};

const database = {
  objectStoreNames: { contains: () => true },
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
      queueMicrotask(() => {
        if (mode !== "readwrite") return;
        if (abortNextWrite) {
          abortNextWrite = false;
          transaction.onabort?.();
          return;
        }
        commit();
        transaction.oncomplete?.();
      });
      return {} as IDBRequest;
    };
    return transaction;
  },
};

Object.defineProperty(globalThis, "indexedDB", {
  configurable: true,
  value: {
    open: () => {
      const request = {
        result: database,
        onupgradeneeded: null as null | (() => void),
        onsuccess: null as null | (() => void),
        onerror: null as null | (() => void),
      };
      queueMicrotask(() => request.onsuccess?.());
      return request;
    },
  },
});

const point = { timestampMs: 100, midi: 69, state: "reliable" as const, confidence: 0.9 };
const record = createLocalVocalPracticeRecord({ note: "第一次", targetLabel: "单音长音", targetMidi: 69, curvePoints: [point], recording: new Blob(["voice"]), id: "id-1" });
const main = async () => {
  await saveLocalVocalPracticeRecord(record);
  assert.equal((await listLocalVocalPracticeRecords())[0]?.recording?.size, 5);

  abortNextWrite = true;
  const rejected = createLocalVocalPracticeRecord({ note: "不应提交", targetLabel: "自由练唱", targetMidi: 60, curvePoints: [point], recording: null, id: "id-abort" });
  await assert.rejects(saveLocalVocalPracticeRecord(rejected), /被取消/);
  assert.equal((await listLocalVocalPracticeRecords()).some((item) => item.id === "id-abort"), false);

  await deleteLocalVocalPracticeRecord(record.id);
  assert.equal((await listLocalVocalPracticeRecords()).length, 0);
  await saveLocalVocalPracticeRecord(record);
  await clearLocalVocalPracticeRecords();
  assert.equal((await listLocalVocalPracticeRecords()).length, 0);

  console.log("Local vocal practice IndexedDB transaction tests passed.");
};

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
