import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  P119_TEACHER_REVIEW_CANDIDATE_FILE,
  P119_TEACHER_REVIEW_CANDIDATE_STATUS,
  P119_TEACHER_REVIEW_ITEMS_PER_STRATUM,
  P119_TEACHER_REVIEW_MANIFEST_FILE,
  P119_TEACHER_REVIEW_WORKSHEET_FILE,
  buildP119TeacherReviewCandidate,
  serializeP119TeacherReviewCandidate,
  serializeP119TeacherReviewWorksheet,
} from "./generate-p119-teacher-review-candidate";

const fixtureDirectory = "local-fixtures/p119-content-education";
const serializedManifest = readFileSync(
  `${fixtureDirectory}/${P119_TEACHER_REVIEW_MANIFEST_FILE}`,
  "utf8",
);
const manifest = JSON.parse(serializedManifest);
const committedCandidate = readFileSync(
  `${fixtureDirectory}/${P119_TEACHER_REVIEW_CANDIDATE_FILE}`,
  "utf8",
);
const approvedPlan = JSON.parse(
  readFileSync(`${fixtureDirectory}/approved-review-plan.v1.json`, "utf8"),
) as {
  status: string;
  approvedBeforeReview: boolean;
  binding: {
    candidateFile: string;
    candidateFileSha256: string;
    candidateSeedSha256: string;
    reviewManifestSha256: string;
  };
  approvedScope: {
    totalItemCount: number;
    sampleItemIds: string;
  };
  humanAttestation: {
    independentTeacherCount: number;
    qualificationsVerifiedExternally: boolean;
    separateSignaturesHeldPrivately: boolean;
  };
  evidenceBoundary: {
    teacherItemReview: string;
    educationValidity: string;
    formalEvaluation: string;
  };
};
const committedWorksheet = readFileSync(
  `${fixtureDirectory}/${P119_TEACHER_REVIEW_WORKSHEET_FILE}`,
  "utf8",
);
const rebuiltCandidate = buildP119TeacherReviewCandidate(
  manifest,
  serializedManifest,
);

assert.equal(
  committedCandidate,
  serializeP119TeacherReviewCandidate(rebuiltCandidate),
  "committed candidate must be a byte-identical deterministic rebuild",
);
assert.equal(rebuiltCandidate.status, P119_TEACHER_REVIEW_CANDIDATE_STATUS);
assert.equal(rebuiltCandidate.approval.approvedBeforeReview, false);
assert.equal(rebuiltCandidate.approval.approvedByTeachers, false);
assert.equal(rebuiltCandidate.strata.length, 30);
assert.ok(
  rebuiltCandidate.strata.every(
    (stratum) =>
      stratum.candidateItemIds.length
        === P119_TEACHER_REVIEW_ITEMS_PER_STRATUM,
  ),
);
assert.equal(rebuiltCandidate.summary.questionCandidateCount, 150);
assert.equal(rebuiltCandidate.summary.courseCandidateCount, 3);
assert.equal(rebuiltCandidate.summary.totalCandidateCount, 153);
assert.equal(
  new Set(rebuiltCandidate.sampleItemIds).size,
  rebuiltCandidate.sampleItemIds.length,
);
assert.equal(rebuiltCandidate.checks.duplicateCandidateItemIdCount, 0);
assert.equal(rebuiltCandidate.checks.missingCandidateItemIdCount, 0);
assert.equal(rebuiltCandidate.checks.strataWithUnexpectedCandidateCount, 0);
assert.equal(
  rebuiltCandidate.checks.crossStratumVariantIdOverlapCount,
  rebuiltCandidate.checks.crossStratumVariantIdOverlaps.reduce(
    (sum, overlap) => sum + overlap.itemIds.length - 1,
    0,
  ),
);
assert.equal(rebuiltCandidate.courseCandidateItemIds.length, 3);
assert.equal(
  committedWorksheet,
  serializeP119TeacherReviewWorksheet(rebuiltCandidate),
);
assert.equal(committedWorksheet.trimEnd().split("\n").length, 154);
assert.ok(
  rebuiltCandidate.sampleItemIds.every((itemId) =>
    committedWorksheet.includes(`"${itemId}"`)),
);
assert.equal(approvedPlan.status, "APPROVED_FOR_DUAL_TEACHER_REVIEW");
assert.equal(approvedPlan.approvedBeforeReview, true);
assert.equal(
  approvedPlan.binding.candidateFile,
  P119_TEACHER_REVIEW_CANDIDATE_FILE,
);
assert.equal(
  approvedPlan.binding.candidateFileSha256,
  createHash("sha256").update(committedCandidate, "utf8").digest("hex"),
);
assert.equal(
  approvedPlan.binding.candidateSeedSha256,
  rebuiltCandidate.selection.seedSha256,
);
assert.equal(
  approvedPlan.binding.reviewManifestSha256,
  rebuiltCandidate.source.reviewManifestSha256,
);
assert.equal(
  approvedPlan.approvedScope.totalItemCount,
  rebuiltCandidate.sampleItemIds.length,
);
assert.equal(
  approvedPlan.approvedScope.sampleItemIds,
  "all sampleItemIds from the bound candidate file",
);
assert.equal(approvedPlan.humanAttestation.independentTeacherCount, 2);
assert.equal(approvedPlan.humanAttestation.qualificationsVerifiedExternally, true);
assert.equal(approvedPlan.humanAttestation.separateSignaturesHeldPrivately, true);
assert.equal(approvedPlan.evidenceBoundary.teacherItemReview, "NOT_EXECUTED");
assert.equal(approvedPlan.evidenceBoundary.educationValidity, "NOT_EXECUTED");
assert.equal(approvedPlan.evidenceBoundary.formalEvaluation, "BLOCKED");

console.log("P119 dual-teacher review candidate focused tests passed.");
