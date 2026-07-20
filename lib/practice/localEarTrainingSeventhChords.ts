import type { LocalPracticeDifficulty } from "./localPracticeCatalog";

export type SeventhChordQualityId = "major-seventh" | "dominant-seventh" | "minor-seventh" | "half-diminished-seventh";
export type SeventhChordInversionId = "root" | "first" | "second" | "third";
export type LocalSeventhChordAnswerOption = { id: string; label: string; qualityId: SeventhChordQualityId; inversionId: SeventhChordInversionId };
type Quality = { id: SeventhChordQualityId; label: string; intervals: readonly [number, number, number, number]; structure: string };
type Root = { id: string; label: string; frequencyHz: number };

const qualities: Record<SeventhChordQualityId, Quality> = {
  "major-seventh": { id: "major-seventh", label: "大七和弦", intervals: [0, 4, 7, 11], structure: "大三和弦上叠加大七度" },
  "dominant-seventh": { id: "dominant-seventh", label: "属七和弦", intervals: [0, 4, 7, 10], structure: "大三和弦上叠加小七度" },
  "minor-seventh": { id: "minor-seventh", label: "小七和弦", intervals: [0, 3, 7, 10], structure: "小三和弦上叠加小七度" },
  "half-diminished-seventh": { id: "half-diminished-seventh", label: "半减七和弦", intervals: [0, 3, 6, 10], structure: "减三和弦上叠加小七度" },
};
const inversions: Record<SeventhChordInversionId, { label: string; bassRole: string }> = {
  root: { label: "原位", bassRole: "根音在最低声部" }, first: { label: "第一转位", bassRole: "三音在最低声部" },
  second: { label: "第二转位", bassRole: "五音在最低声部" }, third: { label: "第三转位", bassRole: "七音在最低声部" },
};
const roots: Root[] = [
  { id: "c3", label: "C3", frequencyHz: 130.81 }, { id: "d3", label: "D3", frequencyHz: 146.83 },
  { id: "e3", label: "E3", frequencyHz: 164.81 }, { id: "f3", label: "F3", frequencyHz: 174.61 },
  { id: "g3", label: "G3", frequencyHz: 196 }, { id: "a3", label: "A3", frequencyHz: 220 },
  { id: "b3", label: "B3", frequencyHz: 246.94 }, { id: "db3", label: "D♭3", frequencyHz: 138.59 },
  { id: "eb3", label: "E♭3", frequencyHz: 155.56 }, { id: "gb3", label: "G♭3", frequencyHz: 185 },
  { id: "ab3", label: "A♭3", frequencyHz: 207.65 }, { id: "bb3", label: "B♭3", frequencyHz: 233.08 },
];
const options: Record<LocalPracticeDifficulty, Array<[SeventhChordQualityId, SeventhChordInversionId]>> = {
  基础: [["major-seventh", "root"], ["dominant-seventh", "root"], ["minor-seventh", "root"], ["half-diminished-seventh", "root"]],
  进阶: (["major-seventh", "dominant-seventh", "minor-seventh", "half-diminished-seventh"] as SeventhChordQualityId[]).flatMap((id) =>
    (["root", "first"] as SeventhChordInversionId[]).map((inversion): [SeventhChordQualityId, SeventhChordInversionId] => [id, inversion]),
  ),
  挑战: (Object.keys(qualities) as SeventhChordQualityId[]).flatMap((id) => (Object.keys(inversions) as SeventhChordInversionId[]).map((inversion): [SeventhChordQualityId, SeventhChordInversionId] => [id, inversion])),
};
const answerId = (qualityId: SeventhChordQualityId, inversionId: SeventhChordInversionId) => `${qualityId}-${inversionId}`;
const variants = (difficulty: LocalPracticeDifficulty) => roots.flatMap((root) => options[difficulty].map(([qualityId, inversionId]) => ({ root, qualityId, inversionId, variantId: `seventh-chord:${root.id}:${qualityId}:${inversionId}` })));
const voicing = (intervals: readonly [number, number, number, number], inversion: SeventhChordInversionId): [number, number, number, number] => {
  const position = ["root", "first", "second", "third"].indexOf(inversion);
  return intervals.map((interval, index) => interval + (index < position ? 12 : 0)).sort((a, b) => a - b) as [number, number, number, number];
};
export const getLocalSeventhChordAnswerOptions = (difficulty: LocalPracticeDifficulty): LocalSeventhChordAnswerOption[] => options[difficulty].map(([qualityId, inversionId]) => ({ id: answerId(qualityId, inversionId), label: `${qualities[qualityId].label} · ${inversions[inversionId].label}`, qualityId, inversionId }));
export const getLocalSeventhChordVariantCount = (difficulty: LocalPracticeDifficulty) => variants(difficulty).length;
export const isLocalSeventhChordVariantId = (difficulty: LocalPracticeDifficulty, variantId: string) => variants(difficulty).some((item) => item.variantId === variantId);
export type LocalEarTrainingSeventhChordQuestion = { id: string; variantId: string; difficulty: LocalPracticeDifficulty; root: Root; quality: Quality; inversionId: SeventhChordInversionId; inversionLabel: string; answerOptionId: string; frequenciesHz: [number, number, number, number]; explanation: string };
export const createLocalSeventhChordQuestion = ({ difficulty, sequence, questionIndex, variantId }: { difficulty: LocalPracticeDifficulty; sequence: number; questionIndex?: number; variantId?: string }): LocalEarTrainingSeventhChordQuestion => {
  const safeSequence = Number.isFinite(sequence) ? Math.max(0, Math.floor(sequence)) : 0;
  const found = variantId ? variants(difficulty).find((item) => item.variantId === variantId) : variants(difficulty)[(Number.isFinite(questionIndex) ? Math.max(0, Math.floor(questionIndex!)) : safeSequence) % variants(difficulty).length];
  if (!found) throw new Error("Invalid local seventh chord variant id.");
  const quality = qualities[found.qualityId]; const inversion = inversions[found.inversionId];
  return { id: `${difficulty}-${safeSequence}-${found.root.id}-${found.qualityId}-${found.inversionId}`, variantId: found.variantId, difficulty, root: found.root, quality, inversionId: found.inversionId, inversionLabel: inversion.label, answerOptionId: answerId(found.qualityId, found.inversionId), frequenciesHz: voicing(quality.intervals, found.inversionId).map((semitones) => found.root.frequencyHz * 2 ** (semitones / 12)) as [number, number, number, number], explanation: `${quality.label}由${quality.structure}构成；本题为${inversion.label}，${inversion.bassRole}。` };
};
export const getLocalSeventhChordAnswer = ({ question, selectedOptionId }: { question: LocalEarTrainingSeventhChordQuestion; selectedOptionId: string | null }) => ({ selectedOptionId, hasSelection: selectedOptionId !== null, matchesAnswer: selectedOptionId === question.answerOptionId, answerLabel: `${question.quality.label} · ${question.inversionLabel}`, explanation: question.explanation });
