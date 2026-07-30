export type SupportedMusicXmlChordKind =
  | "major"
  | "minor"
  | "dominant"
  | "major-seventh"
  | "minor-seventh"
  | "augmented"
  | "diminished"
  | "diminished-seventh"
  | "half-diminished";

export type SupportedMusicXmlChordSymbol = Readonly<{
  canonical: string;
  rootStep: "A" | "B" | "C" | "D" | "E" | "F" | "G";
  rootAlter: -1 | 0 | 1;
  kind: SupportedMusicXmlChordKind;
}>;

const supportedRootSteps = new Set<SupportedMusicXmlChordSymbol["rootStep"]>([
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
]);

const suffixByKind: Readonly<Record<SupportedMusicXmlChordKind, string>> = {
  major: "",
  minor: "m",
  dominant: "7",
  "major-seventh": "maj7",
  "minor-seventh": "m7",
  augmented: "aug",
  diminished: "dim",
  "diminished-seventh": "dim7",
  "half-diminished": "m7b5",
};

export const parseSupportedCanonicalChordSymbol = (
  value: string,
): SupportedMusicXmlChordSymbol | null => {
  const match = value.match(
    /^([A-G])([#b]?)(m7b5|maj7|m7|dim7|aug|dim|m|7)?$/,
  );
  if (!match) return null;
  const rootStep = match[1] as SupportedMusicXmlChordSymbol["rootStep"];
  const rootAlter = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
  const suffix = match[3] ?? "";
  const kind = (Object.entries(suffixByKind) as readonly [
    SupportedMusicXmlChordKind,
    string,
  ][]).find((entry) => entry[1] === suffix)?.[0];
  return kind ? { canonical: value, rootStep, rootAlter, kind } : null;
};

export const createSupportedCanonicalChordSymbol = ({
  rootStep,
  rootAlter = 0,
  kind,
}: {
  rootStep: string;
  rootAlter?: number;
  kind: string;
}): SupportedMusicXmlChordSymbol | null => {
  if (
    !supportedRootSteps.has(
      rootStep as SupportedMusicXmlChordSymbol["rootStep"],
    )
    || (rootAlter !== -1 && rootAlter !== 0 && rootAlter !== 1)
    || !Object.hasOwn(suffixByKind, kind)
  ) {
    return null;
  }
  const supportedRootStep =
    rootStep as SupportedMusicXmlChordSymbol["rootStep"];
  const supportedRootAlter =
    rootAlter as SupportedMusicXmlChordSymbol["rootAlter"];
  const supportedKind = kind as SupportedMusicXmlChordKind;
  const accidental = supportedRootAlter === 1
    ? "#"
    : supportedRootAlter === -1
      ? "b"
      : "";
  return {
    canonical:
      `${supportedRootStep}${accidental}${suffixByKind[supportedKind]}`,
    rootStep: supportedRootStep,
    rootAlter: supportedRootAlter,
    kind: supportedKind,
  };
};
