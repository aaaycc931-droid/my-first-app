export const DIAGNOSTIC_MIN_FREQUENCY_HZ = 50;
export const DIAGNOSTIC_MAX_FREQUENCY_HZ = 1200;

export type DiagnosticFrequencySummary = {
  frequencyMinHz: number | null;
  frequencyMedianHz: number | null;
  frequencyMaxHz: number | null;
};

export function isValidDiagnosticFrequencyEstimate(frequency: number) {
  return (
    Number.isFinite(frequency) &&
    frequency > 0 &&
    frequency >= DIAGNOSTIC_MIN_FREQUENCY_HZ &&
    frequency <= DIAGNOSTIC_MAX_FREQUENCY_HZ
  );
}

export function filterValidDiagnosticFrequencies(frequencies: number[]) {
  return frequencies.filter(isValidDiagnosticFrequencyEstimate);
}

export function summarizeDiagnosticFrequencies(
  frequencies: number[],
): DiagnosticFrequencySummary {
  const validFrequencies = filterValidDiagnosticFrequencies(frequencies);

  if (validFrequencies.length === 0) {
    return {
      frequencyMinHz: null,
      frequencyMedianHz: null,
      frequencyMaxHz: null,
    };
  }

  const sortedFrequencies = [...validFrequencies].sort((a, b) => a - b);
  const middleIndex = Math.floor(sortedFrequencies.length / 2);
  const frequencyMedianHz =
    sortedFrequencies.length % 2 === 0
      ? (sortedFrequencies[middleIndex - 1] + sortedFrequencies[middleIndex]) /
        2
      : sortedFrequencies[middleIndex];

  return {
    frequencyMinHz: sortedFrequencies[0],
    frequencyMedianHz,
    frequencyMaxHz: sortedFrequencies[sortedFrequencies.length - 1],
  };
}
