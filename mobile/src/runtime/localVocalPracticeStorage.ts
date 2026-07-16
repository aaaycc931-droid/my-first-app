import type { RealtimePitchCurvePoint } from "../../../lib/practice/realtimePitchCurve";

export type LocalVocalPracticeRecord = {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  note: string;
  targetLabel: string;
  targetMidi: number;
  curvePoints: RealtimePitchCurvePoint[];
  recording: Blob | null;
  algorithmVersion: "autocorrelation-realtime-v1";
};

const DB_NAME = "solfeggio-local-vocal-practice";
const STORE_NAME = "sessions";
export const LOCAL_VOCAL_RECORDING_MAX_BYTES = 5 * 1024 * 1024;
export const LOCAL_VOCAL_PRACTICE_MAX_RECORDS = 20;

const createRecordId = () => typeof globalThis.crypto?.randomUUID === "function"
  ? globalThis.crypto.randomUUID()
  : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const createLocalVocalPracticeRecord = ({
  note,
  targetLabel,
  targetMidi,
  curvePoints,
  recording,
  now = new Date(),
  id = createRecordId(),
}: {
  note: string;
  targetLabel: string;
  targetMidi: number;
  curvePoints: RealtimePitchCurvePoint[];
  recording: Blob | null;
  now?: Date;
  id?: string;
}): LocalVocalPracticeRecord => {
  const trimmedNote = note.trim().slice(0, 200);
  if (curvePoints.length === 0 && !recording) throw new Error("没有可保存的曲线或录音");
  if (!Number.isFinite(targetMidi) || targetMidi < 48 || targetMidi > 84) throw new Error("目标参考音超出 C3–C6 范围");
  if (recording && recording.size > LOCAL_VOCAL_RECORDING_MAX_BYTES) throw new Error("本次录音超过 5 MB，请丢弃后缩短录音再保存");
  return {
    schemaVersion: 1,
    id,
    createdAt: now.toISOString(),
    note: trimmedNote,
    targetLabel: targetLabel.slice(0, 80),
    targetMidi,
    curvePoints: curvePoints.slice(-600).map((point) => ({ ...point })),
    recording,
    algorithmVersion: "autocorrelation-realtime-v1",
  };
};

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  if (typeof indexedDB === "undefined") { reject(new Error("本机记录存储不可用")); return; }
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
  };
  request.onsuccess = () => {
    request.result.onversionchange = () => request.result.close();
    resolve(request.result);
  };
  request.onerror = () => reject(new Error("无法打开本机记录存储"));
  request.onblocked = () => reject(new Error("本机记录存储正在被其他页面占用，请关闭其他页面后重试"));
});

const isLocalVocalPracticeRecord = (value: unknown): value is LocalVocalPracticeRecord => {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<LocalVocalPracticeRecord>;
  return record.schemaVersion === 1
    && typeof record.id === "string"
    && typeof record.createdAt === "string"
    && Number.isFinite(Date.parse(record.createdAt))
    && typeof record.note === "string"
    && typeof record.targetLabel === "string"
    && typeof record.targetMidi === "number"
    && record.targetMidi >= 48
    && record.targetMidi <= 84
    && Array.isArray(record.curvePoints)
    && record.curvePoints.length <= 600
    && (record.recording === null || record.recording instanceof Blob)
    && (record.recording?.size ?? 0) <= LOCAL_VOCAL_RECORDING_MAX_BYTES
    && record.algorithmVersion === "autocorrelation-realtime-v1";
};

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
  } finally { database.close(); }
};

export const listLocalVocalPracticeRecords = async () => {
  const database = await openDatabase();
  try {
    const records = await requestResult(database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll()) as unknown[];
    return records.filter(isLocalVocalPracticeRecord).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } finally { database.close(); }
};

export const saveLocalVocalPracticeRecord = async (record: LocalVocalPracticeRecord) => {
  const existing = await listLocalVocalPracticeRecords();
  if (existing.length >= LOCAL_VOCAL_PRACTICE_MAX_RECORDS && !existing.some((item) => item.id === record.id)) {
    throw new Error("本机最多保存 20 条练声记录，请先删除旧记录");
  }
  await writeTransaction((store) => store.put(record));
};

export const deleteLocalVocalPracticeRecord = async (id: string) => {
  await writeTransaction((store) => store.delete(id));
};

export const clearLocalVocalPracticeRecords = async () => {
  await writeTransaction((store) => store.clear());
};

export const serializeLocalVocalPracticeRecord = (record: LocalVocalPracticeRecord) => JSON.stringify({
  ...record,
  recording: undefined,
  recordingIncluded: record.recording !== null,
}, null, 2);
