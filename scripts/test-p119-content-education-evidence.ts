import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  P119_REVIEW_DIMENSIONS,
  buildP119LocalContentInventory,
  evaluateP119ContentEducationEvidence,
  type P119ContentEducationEvidenceInput,
} from "../lib/release/p119ContentEducationEvidence";
import {
  P119_CONTENT_REVIEW_SOURCE_COMMIT,
  calculateP119ContentReviewManifestSha256,
  serializeP119ContentReviewManifest,
  type P119ContentReviewManifest,
} from "../lib/release/p119ContentReviewManifest";

const currentInventory = buildP119LocalContentInventory();
assert.equal(currentInventory.length, 30);
assert.equal(
  currentInventory.find((group) =>
    group.kind === "chord-inversion" && group.difficulty === "基础")?.variantCount,
  20,
);
assert.equal(
  currentInventory.find((group) =>
    group.kind === "harmony-progression" && group.difficulty === "基础")?.variantCount,
  20,
);

const manifestFile = `review-manifest.${P119_CONTENT_REVIEW_SOURCE_COMMIT}.json`;
const manifestPath = `local-fixtures/p119-content-education/${manifestFile}`;
const serializedManifest = readFileSync(manifestPath, "utf8");
const manifest = JSON.parse(serializedManifest) as P119ContentReviewManifest;
const manifestSha256 = createHash("sha256")
  .update(serializedManifest, "utf8")
  .digest("hex");
const manifestProof = { manifest, serializedManifest, sha256: manifestSha256 };
const sampleItemIds = [
  "question:single-pitch:基础:pitch:c4",
  "course:00000000-0000-0000-0000-000000000001:00000000-0000-0000-0000-000000000101",
];
const valid: P119ContentEducationEvidenceInput = {
  schemaVersion: 2,
  candidate: {
    sourceCommitSha: P119_CONTENT_REVIEW_SOURCE_COMMIT,
    catalogVersion: 10,
    reviewManifestFile: manifestFile,
    reviewManifestSha256: manifestSha256,
  },
  automatedEvidence: {
    ciCommitSha: P119_CONTENT_REVIEW_SOURCE_COMMIT,
    ciRunId: 123,
    expandedCatalogPassed: true,
    localPracticeCustomizerPassed: true,
    legacyActivityAdaptersPassed: true,
    localCoursePathPassed: true,
  },
  reviewPlan: {
    status: "COMPLETE",
    approvedBeforeReview: true,
    inventorySha256: manifestSha256,
    sampleItemIds,
    dimensions: [...P119_REVIEW_DIMENSIONS],
  },
  teacherReviews: ["teacher-a", "teacher-b"].map((reviewerToken) => ({
    status: "COMPLETE" as const,
    reviewerToken,
    independent: true,
    qualificationVerifiedExternally: true,
    reviewedItemIds: sampleItemIds,
    approvedDimensions: [...P119_REVIEW_DIMENSIONS],
    openFindingCount: 0,
    signedEvidenceRef: `private-evidence://${reviewerToken}`,
  })),
};

const eligible = evaluateP119ContentEducationEvidence(
  valid,
  currentInventory,
  manifestProof,
);
assert.equal(eligible.inventoryReadyForHumanReview, true);
assert.equal(eligible.teacherReviewBatchApproved, true);
assert.ok(eligible.checks
  .filter((check) => check.id !== "professional-content-target")
  .every((check) => check.passed));
assert.equal(
  eligible.checks.find((check) => check.id === "professional-content-target")?.passed,
  false,
);

const currentInventoryWithoutTeacherEvidence = structuredClone(valid);
currentInventoryWithoutTeacherEvidence.reviewPlan.status = "NOT_EXECUTED";
currentInventoryWithoutTeacherEvidence.reviewPlan.approvedBeforeReview = false;
currentInventoryWithoutTeacherEvidence.teacherReviews = [];
const realBaseline = evaluateP119ContentEducationEvidence(
  currentInventoryWithoutTeacherEvidence,
  currentInventory,
  manifestProof,
);
assert.equal(realBaseline.inventoryReadyForHumanReview, true);
assert.equal(realBaseline.teacherReviewBatchApproved, false);
assert.equal(
  realBaseline.checks.find((check) => check.id === "v1-content-minimum")?.passed,
  true,
);
assert.equal(
  realBaseline.checks.find((check) => check.id === "professional-content-target")?.passed,
  false,
);

const incomplete = structuredClone(valid);
incomplete.reviewPlan.status = "NOT_EXECUTED";
incomplete.reviewPlan.sampleItemIds = [];
incomplete.teacherReviews = [];
const blocked = evaluateP119ContentEducationEvidence(
  incomplete,
  currentInventory,
  manifestProof,
);
assert.equal(blocked.teacherReviewBatchApproved, false);
for (const id of ["review-plan", "teacher-reviews"]) {
  assert.equal(blocked.checks.find((check) => check.id === id)?.passed, false);
}

const duplicatedReviewer = structuredClone(valid);
duplicatedReviewer.teacherReviews[1].reviewerToken = "teacher-a";
assert.equal(
  evaluateP119ContentEducationEvidence(
    duplicatedReviewer,
    currentInventory,
    manifestProof,
  )
    .teacherReviewBatchApproved,
  false,
);

const openFinding = structuredClone(valid);
openFinding.teacherReviews[0].openFindingCount = 1;
assert.equal(
  evaluateP119ContentEducationEvidence(openFinding, currentInventory, manifestProof)
    .teacherReviewBatchApproved,
  false,
);

const wrongProvenance = structuredClone(valid);
wrongProvenance.automatedEvidence.ciCommitSha = "c".repeat(40);
assert.equal(
  evaluateP119ContentEducationEvidence(
    wrongProvenance,
    currentInventory,
    manifestProof,
  )
    .inventoryReadyForHumanReview,
  false,
);

const wrongSchema = structuredClone(valid);
wrongSchema.schemaVersion = 1 as 2;
assert.equal(
  evaluateP119ContentEducationEvidence(wrongSchema, currentInventory, manifestProof)
    .inventoryReadyForHumanReview,
  false,
);

assert.equal(
  evaluateP119ContentEducationEvidence(valid, currentInventory)
    .inventoryReadyForHumanReview,
  false,
  "a formatted digest without the actual manifest must fail closed",
);

const unknownSample = structuredClone(valid);
unknownSample.reviewPlan.sampleItemIds = ["question:missing:基础:not-real"];
assert.equal(
  evaluateP119ContentEducationEvidence(
    unknownSample,
    currentInventory,
    manifestProof,
  ).teacherReviewBatchApproved,
  false,
);

const staleDigest = structuredClone(valid);
staleDigest.candidate.reviewManifestSha256 = "f".repeat(64);
staleDigest.reviewPlan.inventorySha256 = "f".repeat(64);
assert.equal(
  evaluateP119ContentEducationEvidence(
    staleDigest,
    currentInventory,
    manifestProof,
  ).inventoryReadyForHumanReview,
  false,
);

const forgedManifest = structuredClone(manifest);
const forgedActivity = forgedManifest.items[0].representations[0]
  .activityDefinition as { target: { label: string } };
forgedActivity.target.label = "伪造目标";
const forgedSerialized = serializeP119ContentReviewManifest(forgedManifest);
const forgedSha256 = calculateP119ContentReviewManifestSha256(forgedManifest);
const forgedEvidence = structuredClone(valid);
forgedEvidence.candidate.reviewManifestSha256 = forgedSha256;
forgedEvidence.reviewPlan.inventorySha256 = forgedSha256;
assert.equal(
  evaluateP119ContentEducationEvidence(
    forgedEvidence,
    currentInventory,
    {
      manifest: forgedManifest,
      serializedManifest: forgedSerialized,
      sha256: forgedSha256,
    },
  ).inventoryReadyForHumanReview,
  false,
  "a self-consistent digest must not make a modified answer manifest valid",
);

console.log("P119 content and education evidence focused tests passed.");
