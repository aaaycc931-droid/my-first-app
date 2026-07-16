export type LocalQuestionSchedule = { seed: number; order: number[] };

const normalizeSeed = (seed: number) =>
  Number.isFinite(seed) ? (Math.floor(seed) >>> 0) : 0;

const nextRandom = (state: number) => {
  const next = (state + 0x6d2b79f5) >>> 0;
  let value = next;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return { state: next, value: ((value ^ (value >>> 14)) >>> 0) / 4294967296 };
};

export const createLocalQuestionSchedule = (itemCount: number, seed: number): LocalQuestionSchedule => {
  const safeItemCount = Number.isFinite(itemCount)
    ? Math.min(10_000, Math.max(0, Math.floor(itemCount)))
    : 0;
  const order = Array.from({ length: safeItemCount }, (_, index) => index);
  let state = normalizeSeed(seed);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const random = nextRandom(state);
    state = random.state;
    const swapIndex = Math.floor(random.value * (index + 1));
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }
  return { seed: normalizeSeed(seed), order };
};

export const getScheduledQuestionIndex = (schedule: LocalQuestionSchedule, sequence: number): number | null => {
  if (schedule.order.length === 0 || !Number.isFinite(sequence)) return null;
  return schedule.order[Math.max(0, Math.floor(sequence)) % schedule.order.length] ?? null;
};

export const createLocalQuestionSeed = (): number => {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
  }
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
};
