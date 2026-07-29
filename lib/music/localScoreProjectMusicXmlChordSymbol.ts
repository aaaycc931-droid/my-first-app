export type SupportedMusicXmlChordKind =
  | "major"
  | "minor"
  | "dominant"
  | "major-seventh"
  | "minor-seventh";

export type SupportedMusicXmlChordSymbol = Readonly<{
  canonical: string;
  rootStep: "A" | "B" | "C" | "D" | "E" | "F" | "G";
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
};

export const parseSupportedCanonicalChordSymbol = (
  value: string,
): SupportedMusicXmlChordSymbol | null => {
  const match = value.match(/^([A-G])(maj7|m7|m|7)?$/);
  if (!match) return null;
  const rootStep = match[1] as SupportedMusicXmlChordSymbol["rootStep"];
  const suffix = match[2] ?? "";
  const kind = (Object.entries(suffixByKind) as readonly [
    SupportedMusicXmlChordKind,
    string,
  ][]).find((entry) => entry[1] === suffix)?.[0];
  return kind ? { canonical: value, rootStep, kind } : null;
};

export const createSupportedCanonicalChordSymbol = ({
  rootStep,
  kind,
}: {
  rootStep: string;
  kind: string;
}): SupportedMusicXmlChordSymbol | null => {
  if (
    !supportedRootSteps.has(
      rootStep as SupportedMusicXmlChordSymbol["rootStep"],
    )
    || !Object.hasOwn(suffixByKind, kind)
  ) {
    return null;
  }
  const supportedRootStep =
    rootStep as SupportedMusicXmlChordSymbol["rootStep"];
  const supportedKind = kind as SupportedMusicXmlChordKind;
  return {
    canonical: `${supportedRootStep}${suffixByKind[supportedKind]}`,
    rootStep: supportedRootStep,
    kind: supportedKind,
  };
};
