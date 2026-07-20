import type { LocalPracticeDifficulty } from "./localPracticeCatalog";

export type ModulationDestinationId =
  | "stay-tonic"
  | "dominant"
  | "relative-minor"
  | "parallel-minor";

export type ModulationRouteId =
  | "diatonic-predominant"
  | "alternate-predominant";

export const LOCAL_MODULATION_TONIC_IDS = [
  "c3", "db3", "d3", "eb3", "e3", "f3",
  "gb3", "g3", "ab3", "a3", "bb3", "b3",
] as const;

export const LOCAL_MODULATION_ROUTE_IDS: readonly ModulationRouteId[] = [
  "diatonic-predominant",
  "alternate-predominant",
];

export const LOCAL_MODULATION_DESTINATIONS_BY_DIFFICULTY: Record<
  LocalPracticeDifficulty,
  readonly ModulationDestinationId[]
> = {
  基础: ["stay-tonic", "dominant"],
  进阶: ["stay-tonic", "dominant", "relative-minor"],
  挑战: ["stay-tonic", "dominant", "relative-minor", "parallel-minor"],
};

export const isLocalModulationVariantId = (
  difficulty: LocalPracticeDifficulty,
  variantId: string,
): boolean => {
  const [prefix, tonicId, destinationId, routeId, extra] = variantId.split(":");
  return extra === undefined
    && prefix === "modulation"
    && LOCAL_MODULATION_TONIC_IDS.includes(tonicId as (typeof LOCAL_MODULATION_TONIC_IDS)[number])
    && LOCAL_MODULATION_DESTINATIONS_BY_DIFFICULTY[difficulty].includes(
      destinationId as ModulationDestinationId,
    )
    && LOCAL_MODULATION_ROUTE_IDS.includes(routeId as ModulationRouteId);
};
