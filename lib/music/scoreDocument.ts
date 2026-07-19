import type {
  NotationDraftEvent,
  NotationTimeSignature,
} from "../practice/localNotationFragmentDraft";
import type { NotationTemporaryPracticeTarget } from "../practice/localNotationDraftPracticeTarget";

export type ScoreDocumentEventV1 = Readonly<NotationDraftEvent>;

export type ScoreDocumentV1 = Readonly<{
  schemaVersion: "score-document-v1";
  documentId: string;
  revision: number;
  reviewState: "confirmed";
  localOnly: true;
  sessionOnly: true;
  source: {
    kind: "confirmed-notation-practice-target";
    draftFingerprint: string;
  };
  meter: NotationTimeSignature;
  parts: readonly [
    Readonly<{
      partId: "part-1";
      staves: readonly [
        Readonly<{
          staffId: "staff-1";
          clef: "treble";
          voices: readonly [
            Readonly<{
              voiceId: "voice-1";
              measures: readonly Readonly<{
                measureNumber: number;
                events: readonly ScoreDocumentEventV1[];
              }>[];
            }>,
          ];
        }>,
      ];
    }>,
  ];
}>;

const cloneEvent = (event: NotationDraftEvent): ScoreDocumentEventV1 => ({
  ...event,
});

export function createScoreDocumentFromNotationTarget(
  target: NotationTemporaryPracticeTarget,
): ScoreDocumentV1 {
  if (target.status !== "active" || target.events.length === 0) {
    throw new Error("只有已确认且仍有效的临时乐谱目标才能冻结为谱面文档。");
  }

  const measureNumbers = Array.from(
    new Set(target.events.map((event) => event.measure)),
  ).sort(
    (left, right) => left - right,
  );
  const measures = measureNumbers.map((measureNumber) => ({
    measureNumber,
    events: target.events
      .filter((event) => event.measure === measureNumber)
      .map(cloneEvent),
  }));

  return {
    schemaVersion: "score-document-v1",
    documentId: `local.score-document.${target.draftFingerprint}`,
    revision: 1,
    reviewState: "confirmed",
    localOnly: true,
    sessionOnly: true,
    source: {
      kind: "confirmed-notation-practice-target",
      draftFingerprint: target.draftFingerprint,
    },
    meter: target.timeSignature,
    parts: [
      {
        partId: "part-1",
        staves: [
          {
            staffId: "staff-1",
            clef: "treble",
            voices: [
              {
                voiceId: "voice-1",
                measures,
              },
            ],
          },
        ],
      },
    ],
  };
}

const numberedPitchLabels: Record<NonNullable<NotationDraftEvent["pitch"]>, string> = {
  C4: "1",
  D4: "2",
  E4: "3",
  F4: "4",
  G4: "5",
  A4: "6",
  B4: "7",
  C5: "1·",
};

const durationSuffixes: Record<NotationDraftEvent["duration"], string> = {
  half: " —",
  quarter: "",
  eighth: "_",
};

export function getScoreDocumentPresentation(
  document: ScoreDocumentV1,
  mode: "staff-notation" | "numbered-notation",
) {
  const measures = document.parts[0].staves[0].voices[0].measures;
  return measures.map((measure) => ({
    measureNumber: measure.measureNumber,
    tokens: measure.events.map((event) => {
      const base =
        event.type === "rest"
          ? mode === "staff-notation"
            ? "四分休止符"
            : "0"
          : mode === "staff-notation"
            ? event.pitch ?? "未知音高"
            : numberedPitchLabels[event.pitch!];
      return `${base}${durationSuffixes[event.duration]}`;
    }),
  }));
}
