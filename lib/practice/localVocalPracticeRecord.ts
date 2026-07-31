import type { RealtimePitchCurvePoint } from "./realtimePitchCurve";

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

export type LocalVocalPracticeRecordRepository = {
  list: () => Promise<LocalVocalPracticeRecord[]>;
  save: (record: LocalVocalPracticeRecord) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
};

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

export const isLocalVocalPracticeRecord = (value: unknown): value is LocalVocalPracticeRecord => {
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

export const serializeLocalVocalPracticeRecord = (record: LocalVocalPracticeRecord) => JSON.stringify({
  ...record,
  recording: undefined,
  recordingIncluded: record.recording !== null,
}, null, 2);
