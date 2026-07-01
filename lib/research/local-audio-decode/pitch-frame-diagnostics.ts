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

function getMedianFrequency(frequencies: number[]) {
  const sortedFrequencies = [...frequencies].sort((a, b) => a - b);
  const middleIndex = Math.floor(sortedFrequencies.length / 2);

  return sortedFrequencies.length % 2 === 0
    ? (sortedFrequencies[middleIndex - 1] + sortedFrequencies[middleIndex]) / 2
    : sortedFrequencies[middleIndex];
}

export function smoothDiagnosticFrequencies(
  frequencies: Array<number | null>,
) {
  return frequencies.map((frequency, index) => {
    if (
      frequency === null ||
      !isValidDiagnosticFrequencyEstimate(frequency)
    ) {
      return null;
    }

    const previousFrequency = frequencies[index - 1];
    const nextFrequency = frequencies[index + 1];

    if (
      typeof previousFrequency !== "number" ||
      typeof nextFrequency !== "number" ||
      !isValidDiagnosticFrequencyEstimate(previousFrequency) ||
      !isValidDiagnosticFrequencyEstimate(nextFrequency)
    ) {
      return frequency;
    }

    const windowFrequencies = [previousFrequency, frequency, nextFrequency];

    return getMedianFrequency(windowFrequencies);
  });
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
  const frequencyMedianHz = getMedianFrequency(sortedFrequencies);

  return {
    frequencyMinHz: sortedFrequencies[0],
    frequencyMedianHz,
    frequencyMaxHz: sortedFrequencies[sortedFrequencies.length - 1],
  };
}
