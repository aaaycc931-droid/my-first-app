import { noteNameToMidi } from "../audio/noteFrequency";
import { parseMusicXML } from "../musicxml/musicxmlParser";
import type { MusicXMLNoteDuration } from "../musicxml/musicxmlTypes";

export const PIANO_LEARNING_SCORE_VERSION = "piano-learning-score-v1" as const;
export const MAX_PIANO_LEARNING_NOTES = 256;
export const MAX_PIANO_MUSICXML_BYTES = 2 * 1024 * 1024;

export type PianoLearningNote = {
  id: string;
  pitch: string;
  midi: number;
  measure: number;
  startBeat: number;
  durationBeats: number;
};

export type PianoLearningScore = {
  version: typeof PIANO_LEARNING_SCORE_VERSION;
  id: string;
  name: string;
  source: "project-original" | "local-musicxml";
  sourceLabel: string;
  reviewState: "needs-review" | "confirmed";
  notes: readonly PianoLearningNote[];
  warnings: readonly string[];
};

export type ScheduledPianoLearningEvent = {
  type: "note-on" | "note-off" | "all-notes-off";
  keyId?: string;
  pointerId?: string;
  midi?: number;
  delayMs: number;
};

const durationBeats: Record<MusicXMLNoteDuration, number> = {
  eighth: 0.5,
  quarter: 1,
  half: 2,
  whole: 4,
};

const keyIdFromMidi = (midi: number) => {
  const names = ["c", "c-sharp-", "d", "d-sharp-", "e", "f", "f-sharp-", "g", "g-sharp-", "a", "a-sharp-", "b"];
  return `${names[midi % 12]}${Math.floor(midi / 12) - 1}`;
};

const originalPitches = ["C4", "D4", "E4", "G4", "E4", "D4", "C4", "C4"] as const;

export const P110_ORIGINAL_PIANO_EXERCISE: PianoLearningScore = {
  version: PIANO_LEARNING_SCORE_VERSION,
  id: "p110-original-step-and-leap",
  name: "原创练习：级进与小跳",
  source: "project-original",
  sourceLabel: "项目原创、可随 APK 离线使用",
  reviewState: "confirmed",
  notes: originalPitches.map((pitch, index) => ({
    id: `original-${index + 1}`,
    pitch,
    midi: noteNameToMidi(pitch) as number,
    measure: index < 4 ? 1 : 2,
    startBeat: index,
    durationBeats: 1,
  })),
  warnings: ["这是项目原创的单声部 4/4 入门片段，不属于公开曲库或竞品课程。"],
};

export const createPianoLearningDraftFromMusicXML = ({
  xml,
  fileName,
}: {
  xml: string;
  fileName: string;
}): PianoLearningScore => {
  if (!xml.trim()) throw new Error("MusicXML 文件为空。");
  if (new TextEncoder().encode(xml).byteLength > MAX_PIANO_MUSICXML_BYTES) {
    throw new Error("MusicXML 文件超过 2 MB 本机处理上限。");
  }
  if (!/<score-partwise\b/i.test(xml)) {
    throw new Error("当前只支持 score-partwise MusicXML 草稿。");
  }
  const parsed = parseMusicXML(xml);
  const warnings = [
    "当前解析器只覆盖简单单声部音符与常用时值；请逐音检查后再确认。",
    "本机文件不会上传或保存；替换或清除后草稿立即失效。",
  ];
  const notes = parsed.notes.slice(0, MAX_PIANO_LEARNING_NOTES).flatMap((note, index) => {
    const midi = noteNameToMidi(note.pitch);
    if (midi === null || midi < 21 || midi > 108) return [];
    return [{
      id: `musicxml-${index + 1}`,
      pitch: note.pitch,
      midi,
      measure: note.measure,
      startBeat: Math.max(0, (note.measure - 1) * 4 + (note.beat - 1)),
      durationBeats: durationBeats[note.duration],
    }];
  });
  if (parsed.notes.length > MAX_PIANO_LEARNING_NOTES) {
    warnings.push(`只保留前 ${MAX_PIANO_LEARNING_NOTES} 个音符。`);
  }
  if (notes.length < parsed.notes.length) {
    warnings.push("已忽略超出 A0–C8 或无法解析的音高。");
  }
  if (notes.length === 0) throw new Error("没有解析到可用于本地钢琴的 A0–C8 音符。");
  return {
    version: PIANO_LEARNING_SCORE_VERSION,
    id: `musicxml-${Date.now()}`,
    name: fileName.trim().slice(0, 80) || "本机 MusicXML 草稿",
    source: "local-musicxml",
    sourceLabel: "用户本机选择的 MusicXML；仅当前页面会话",
    reviewState: "needs-review",
    notes,
    warnings,
  };
};

export const removePianoLearningDraftNote = (
  score: PianoLearningScore,
  noteId: string,
): PianoLearningScore => ({
  ...score,
  reviewState: "needs-review",
  notes: score.notes.filter((note) => note.id !== noteId),
  warnings: [...score.warnings, "草稿已修改，需要重新检查并确认。"],
});

export const confirmPianoLearningDraft = (
  score: PianoLearningScore,
): PianoLearningScore => {
  if (score.notes.length === 0) throw new Error("草稿没有音符，不能确认。");
  return { ...score, reviewState: "confirmed" };
};

export const createPianoLearningSchedule = (
  score: PianoLearningScore,
  bpm: number,
): ScheduledPianoLearningEvent[] => {
  if (score.reviewState !== "confirmed") return [];
  const safeBpm = Math.max(30, Math.min(240, Math.round(bpm)));
  const beatMs = 60_000 / safeBpm;
  const events = score.notes.flatMap((note) => [
    { type: "note-on" as const, keyId: keyIdFromMidi(note.midi), pointerId: `score-${note.id}`, midi: note.midi, delayMs: note.startBeat * beatMs },
    { type: "note-off" as const, keyId: keyIdFromMidi(note.midi), pointerId: `score-${note.id}`, midi: note.midi, delayMs: (note.startBeat + note.durationBeats * 0.88) * beatMs },
  ]).sort((a, b) => a.delayMs - b.delayMs || (a.type === "note-off" ? -1 : 1));
  const endMs = Math.max(...score.notes.map((note) => (note.startBeat + note.durationBeats) * beatMs));
  return [...events, { type: "all-notes-off", delayMs: endMs }];
};

export const createPianoWaterfallNotes = (score: PianoLearningScore) => {
  if (score.notes.length === 0) return [];
  const minMidi = Math.min(...score.notes.map((note) => note.midi));
  const maxMidi = Math.max(...score.notes.map((note) => note.midi));
  const totalBeats = Math.max(...score.notes.map((note) => note.startBeat + note.durationBeats));
  return score.notes.map((note) => ({
    ...note,
    leftPercent: maxMidi === minMidi ? 50 : ((note.midi - minMidi) / (maxMidi - minMidi)) * 86 + 7,
    topPercent: totalBeats === 0 ? 0 : (note.startBeat / totalBeats) * 88,
    heightPercent: totalBeats === 0 ? 8 : Math.max(4, (note.durationBeats / totalBeats) * 88),
  }));
};
