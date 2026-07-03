export const supportedMetronomeMeters = ["2/4", "3/4", "4/4"] as const;
export const supportedCountInBars = [0, 1, 2] as const;
export const supportedMetronomeSubdivisions = [
  "quarter",
  "eighth",
  "sixteenth",
] as const;

export type MetronomeMeter = (typeof supportedMetronomeMeters)[number];
export type CountInBars = (typeof supportedCountInBars)[number];
export type MetronomeSubdivision =
  (typeof supportedMetronomeSubdivisions)[number];

export type CountInConfig = {
  enabled: boolean;
  bars: CountInBars;
};

export type MetronomeConfig = {
  bpm: number;
  meter: MetronomeMeter;
  countIn?: Partial<CountInConfig>;
  subdivision?: MetronomeSubdivision;
};

export const defaultCountInConfig: CountInConfig = {
  enabled: false,
  bars: 0,
};

export const defaultMetronomeConfig: MetronomeConfig = {
  bpm: 72,
  meter: "4/4",
  countIn: defaultCountInConfig,
  subdivision: "quarter",
};

export const metronomeBpmRange = {
  min: 30,
  max: 240,
} as const;

export const isSupportedMetronomeMeter = (
  meter: string,
): meter is MetronomeMeter =>
  supportedMetronomeMeters.includes(meter as MetronomeMeter);

export const isSupportedCountInBars = (bars: number): bars is CountInBars =>
  supportedCountInBars.includes(bars as CountInBars);

export const isSupportedMetronomeSubdivision = (
  subdivision: string,
): subdivision is MetronomeSubdivision =>
  supportedMetronomeSubdivisions.includes(subdivision as MetronomeSubdivision);

export const sanitizeMetronomeBpm = (bpm: number): number => {
  if (!Number.isFinite(bpm)) {
    return defaultMetronomeConfig.bpm;
  }

  return Math.min(
    Math.max(Math.round(bpm), metronomeBpmRange.min),
    metronomeBpmRange.max,
  );
};

export const sanitizeMetronomeMeter = (meter: string): MetronomeMeter =>
  isSupportedMetronomeMeter(meter) ? meter : defaultMetronomeConfig.meter;

export const sanitizeCountInBars = (bars: number): CountInBars =>
  Number.isFinite(bars) && isSupportedCountInBars(Math.floor(bars))
    ? (Math.floor(bars) as CountInBars)
    : defaultCountInConfig.bars;

export const sanitizeCountInConfig = (
  config: Partial<CountInConfig> | undefined,
): CountInConfig => {
  const bars = sanitizeCountInBars(config?.bars ?? defaultCountInConfig.bars);
  const enabled = Boolean(config?.enabled) && bars > 0;

  return {
    enabled,
    bars: enabled ? bars : 0,
  };
};

export const sanitizeMetronomeSubdivision = (
  subdivision: string | undefined,
): MetronomeSubdivision =>
  subdivision && isSupportedMetronomeSubdivision(subdivision)
    ? subdivision
    : "quarter";

export const sanitizeMetronomeConfig = (
  config: Partial<MetronomeConfig>,
): MetronomeConfig => ({
  bpm: sanitizeMetronomeBpm(config.bpm ?? defaultMetronomeConfig.bpm),
  meter: sanitizeMetronomeMeter(config.meter ?? defaultMetronomeConfig.meter),
  countIn: sanitizeCountInConfig(config.countIn),
  subdivision: sanitizeMetronomeSubdivision(config.subdivision),
});

export const getBeatDurationSeconds = (bpm: number): number =>
  60 / sanitizeMetronomeBpm(bpm);
