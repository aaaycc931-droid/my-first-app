import {
  cloneLocalScoreProject,
  parseLocalScoreProject,
  type LocalScoreProjectV1,
} from "./localScoreProject";

export const LOCAL_SCORE_PROJECT_RECOVERY_SCHEMA_VERSION =
  "local-score-project-recovery-v1" as const;

export type LocalScoreProjectRecoveryCandidateV1 = Readonly<{
  schemaVersion: typeof LOCAL_SCORE_PROJECT_RECOVERY_SCHEMA_VERSION;
  candidateId: string;
  projectId: string;
  documentId: string;
  baseRevision: number;
  baseFingerprint: string;
  candidateSequence: number;
  capturedAt: string;
  proposedProject: LocalScoreProjectV1;
}>;

const CANDIDATE_KEYS = [
  "baseFingerprint",
  "baseRevision",
  "candidateId",
  "candidateSequence",
  "capturedAt",
  "documentId",
  "projectId",
  "proposedProject",
  "schemaVersion",
] as const;

const MAX_CANDIDATE_ID_LENGTH = 128;
const UINT64_MASK = BigInt("0xffffffffffffffff");
const FNV_64_PRIME = BigInt("0x00000100000001b3");
const FNV_64_OFFSET_A = BigInt("0xcbf29ce484222325");
const FNV_64_OFFSET_B = BigInt("0x84222325cbf29ce4");
const BASE_FINGERPRINT_PATTERN =
  /^fnv1a64x2-u16le:[0-9a-f]{16}:[0-9a-f]{16}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasExactKeys = (
  value: Record<string, unknown>,
  keys: readonly string[],
) => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
};

const isValidCandidateId = (value: unknown): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= MAX_CANDIDATE_ID_LENGTH;

const isPositiveSafeInteger = (value: unknown): value is number =>
  Number.isSafeInteger(value)
  && (value as number) >= 1
  && value !== Number.MAX_SAFE_INTEGER;

const isValidIsoDate = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    && new Date(timestamp).toISOString() === value;
};

const fnv1a64Utf16Le = (value: string, offset: bigint) => {
  let hash = offset;
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    hash ^= BigInt(codeUnit & 0xff);
    hash = hash * FNV_64_PRIME & UINT64_MASK;
    hash ^= BigInt(codeUnit >>> 8);
    hash = hash * FNV_64_PRIME & UINT64_MASK;
  }
  return hash.toString(16).padStart(16, "0");
};

/**
 * 为恢复候选 CAS 生成确定性内容指纹。它不是密码学摘要，不能用于鉴权、防篡改证明
 * 或处理不可信攻击者输入。
 */
export const getLocalScoreProjectRecoveryBaseFingerprint = (
  project: LocalScoreProjectV1,
) => {
  const normalized = parseLocalScoreProject(project);
  if (!normalized) {
    throw new Error("乐谱项目基准无效，无法生成恢复指纹。");
  }
  const canonical = JSON.stringify(normalized);
  return `fnv1a64x2-u16le:${fnv1a64Utf16Le(canonical, FNV_64_OFFSET_A)}:${fnv1a64Utf16Le(canonical, FNV_64_OFFSET_B)}`;
};

const hasMatchingBaseProject = ({
  value,
  proposedProject,
  baseProject,
}: {
  value: Record<string, unknown>;
  proposedProject: LocalScoreProjectV1;
  baseProject: LocalScoreProjectV1;
}) => {
  const normalizedBase = parseLocalScoreProject(baseProject);
  return Boolean(
    normalizedBase
    && normalizedBase.projectId === value.projectId
    && normalizedBase.document.documentId === value.documentId
    && normalizedBase.document.revision === value.baseRevision
    && normalizedBase.createdAt === proposedProject.createdAt
    && value.baseFingerprint
      === getLocalScoreProjectRecoveryBaseFingerprint(normalizedBase),
  );
};

export const cloneLocalScoreProjectRecoveryCandidate = (
  candidate: LocalScoreProjectRecoveryCandidateV1,
): LocalScoreProjectRecoveryCandidateV1 => ({
  schemaVersion: LOCAL_SCORE_PROJECT_RECOVERY_SCHEMA_VERSION,
  candidateId: candidate.candidateId,
  projectId: candidate.projectId,
  documentId: candidate.documentId,
  baseRevision: candidate.baseRevision,
  baseFingerprint: candidate.baseFingerprint,
  candidateSequence: candidate.candidateSequence,
  capturedAt: candidate.capturedAt,
  proposedProject: cloneLocalScoreProject(candidate.proposedProject),
});

export const parseLocalScoreProjectRecoveryCandidate = (
  value: unknown,
  baseProject?: LocalScoreProjectV1,
): LocalScoreProjectRecoveryCandidateV1 | null => {
  if (
    !isRecord(value)
    || !hasExactKeys(value, CANDIDATE_KEYS)
    || value.schemaVersion !== LOCAL_SCORE_PROJECT_RECOVERY_SCHEMA_VERSION
    || !isValidCandidateId(value.candidateId)
    || typeof value.projectId !== "string"
    || value.projectId.length === 0
    || typeof value.documentId !== "string"
    || value.documentId.length === 0
    || !isPositiveSafeInteger(value.baseRevision)
    || typeof value.baseFingerprint !== "string"
    || !BASE_FINGERPRINT_PATTERN.test(value.baseFingerprint)
    || !isPositiveSafeInteger(value.candidateSequence)
    || !isValidIsoDate(value.capturedAt)
  ) return null;

  const proposedProject = parseLocalScoreProject(value.proposedProject);
  if (
    !proposedProject
    || proposedProject.projectId !== value.projectId
    || proposedProject.document.documentId !== value.documentId
    || proposedProject.document.revision !== value.baseRevision + 1
    || (
      baseProject !== undefined
      && !hasMatchingBaseProject({ value, proposedProject, baseProject })
    )
  ) return null;

  return {
    schemaVersion: LOCAL_SCORE_PROJECT_RECOVERY_SCHEMA_VERSION,
    candidateId: value.candidateId,
    projectId: value.projectId,
    documentId: value.documentId,
    baseRevision: value.baseRevision,
    baseFingerprint: value.baseFingerprint,
    candidateSequence: value.candidateSequence,
    capturedAt: value.capturedAt,
    proposedProject,
  };
};

export const createLocalScoreProjectRecoveryCandidate = ({
  candidateId,
  candidateSequence,
  capturedAt,
  baseProject,
  proposedProject,
}: {
  candidateId: string;
  candidateSequence: number;
  capturedAt: string;
  baseProject: LocalScoreProjectV1;
  proposedProject: LocalScoreProjectV1;
}): LocalScoreProjectRecoveryCandidateV1 => {
  const normalizedBase = parseLocalScoreProject(baseProject);
  const normalizedProposal = parseLocalScoreProject(proposedProject);
  if (
    !normalizedBase
    || !normalizedProposal
    || normalizedBase.projectId !== normalizedProposal.projectId
    || normalizedBase.document.documentId
      !== normalizedProposal.document.documentId
    || normalizedBase.createdAt !== normalizedProposal.createdAt
    || normalizedProposal.document.revision
      !== normalizedBase.document.revision + 1
  ) {
    throw new Error("乐谱项目恢复候选无效，未创建恢复记录。");
  }
  const parsed = parseLocalScoreProjectRecoveryCandidate({
    schemaVersion: LOCAL_SCORE_PROJECT_RECOVERY_SCHEMA_VERSION,
    candidateId,
    projectId: normalizedProposal.projectId,
    documentId: normalizedProposal.document.documentId,
    baseRevision: normalizedBase.document.revision,
    baseFingerprint:
      getLocalScoreProjectRecoveryBaseFingerprint(normalizedBase),
    candidateSequence,
    capturedAt,
    proposedProject: normalizedProposal,
  }, normalizedBase);
  if (!parsed) {
    throw new Error("乐谱项目恢复候选无效，未创建恢复记录。");
  }
  return parsed;
};

export const serializeLocalScoreProjectRecoveryCandidate = (
  candidate: LocalScoreProjectRecoveryCandidateV1,
) => {
  const parsed = parseLocalScoreProjectRecoveryCandidate(candidate);
  if (!parsed) throw new Error("乐谱项目恢复候选无效，无法序列化。");
  return JSON.stringify(parsed);
};

export const deserializeLocalScoreProjectRecoveryCandidate = (
  serialized: string,
) => {
  try {
    return parseLocalScoreProjectRecoveryCandidate(JSON.parse(serialized));
  } catch {
    return null;
  }
};
