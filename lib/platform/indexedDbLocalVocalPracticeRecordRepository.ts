import {
  isLocalVocalPracticeRecord,
  LOCAL_VOCAL_PRACTICE_MAX_RECORDS,
  type LocalVocalPracticeRecord,
  type LocalVocalPracticeRecordRepository,
} from "../practice/localVocalPracticeRecord";

const DB_NAME = "solfeggio-local-vocal-practice";
const DB_VERSION = 1;
const STORE_NAME = "sessions";
const STORE_KEY_PATH = "id";

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  if (typeof indexedDB === "undefined") {
    reject(new Error("本机记录存储不可用"));
    return;
  }
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(STORE_NAME)) {
      request.result.createObjectStore(STORE_NAME, { keyPath: STORE_KEY_PATH });
    }
  };
  request.onsuccess = () => {
    request.result.onversionchange = () => request.result.close();
    resolve(request.result);
  };
  request.onerror = () => reject(new Error("无法打开本机记录存储"));
  request.onblocked = () => reject(new Error("本机记录存储正在被其他页面占用，请关闭其他页面后重试"));
});

const requestResult = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(new Error("本机记录操作失败"));
});

const writeTransaction = async (operation: (store: IDBObjectStore) => IDBRequest) => {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(new Error("本机记录操作被取消"));
      transaction.onerror = () => reject(new Error("本机记录操作失败"));
      operation(transaction.objectStore(STORE_NAME));
    });
  } finally {
    database.close();
  }
};

const listRecords = async () => {
  const database = await openDatabase();
  try {
    const records = await requestResult(
      database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll(),
    ) as unknown[];
    return records
      .filter(isLocalVocalPracticeRecord)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } finally {
    database.close();
  }
};

export const createIndexedDbLocalVocalPracticeRecordRepository = (): LocalVocalPracticeRecordRepository => ({
  list: listRecords,
  save: async (record: LocalVocalPracticeRecord) => {
    const existing = await listRecords();
    if (
      existing.length >= LOCAL_VOCAL_PRACTICE_MAX_RECORDS
      && !existing.some((item) => item.id === record.id)
    ) {
      throw new Error("本机最多保存 20 条练声记录，请先删除旧记录");
    }
    await writeTransaction((store) => store.put(record));
  },
  remove: async (id: string) => {
    await writeTransaction((store) => store.delete(id));
  },
  clear: async () => {
    await writeTransaction((store) => store.clear());
  },
});

export const indexedDbLocalVocalPracticeRecordRepository =
  createIndexedDbLocalVocalPracticeRecordRepository();
