export const supportedMetronomeMeters = ["2/4", "3/4", "4/4"] as const;

export type MetronomeMeter = (typeof supportedMetronomeMeters)[number];

export type MetronomeConfig = {
  bpm: number;
  meter: MetronomeMeter;
};

export const defaultMetronomeConfig: MetronomeConfig = {
  bpm: 72,
  meter: "4/4",
};

export const metronomeBpmRange = {
  min: 30,
  max: 240,
} as const;

export const isSupportedMetronomeMeter = (
  meter: string,
): meter is MetronomeMeter =>
  supportedMetronomeMeters.includes(meter as MetronomeMeter);

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

export const sanitizeMetronomeConfig = (
  config: Partial<MetronomeConfig>,
): MetronomeConfig => ({
  bpm: sanitizeMetronomeBpm(config.bpm ?? defaultMetronomeConfig.bpm),
  meter: sanitizeMetronomeMeter(config.meter ?? defaultMetronomeConfig.meter),
});

export const getBeatDurationSeconds = (bpm: number): number =>
  60 / sanitizeMetronomeBpm(bpm);
