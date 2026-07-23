import assert from "node:assert/strict";

import {
  P119_REVIEW_DIMENSIONS,
  buildP119LocalContentInventory,
  evaluateP119ContentEducationEvidence,
  type P119ContentEducationEvidenceInput,
  type P119ContentInventoryGroup,
} from "../lib/release/p119ContentEducationEvidence";

const currentInventory = buildP119LocalContentInventory();
assert.equal(currentInventory.length, 30);
assert.equal(
  currentInventory.find((group) =>
    group.kind === "chord-inversion" && group.difficulty === "基础")?.variantCount,
  8,
);
assert.equal(
  currentInventory.find((group) =>
    group.kind === "harmony-progression" && group.difficulty === "基础")?.variantCount,
  8,
);

const sampleItemIds = ["pitch:c4", "interval:c4:major-third"];
const valid: P119ContentEducationEvidenceInput = {
  schemaVersion: 1,
  candidate: {
    sourceCommitSha: "a".repeat(40),
    catalogVersion: 9,
    reviewManifestSha256: "b".repeat(64),
  },
  automatedEvidence: {
    ciCommitSha: "a".repeat(40),
    ciRunId: 123,
    expandedCatalogPassed: true,
    localPracticeCustomizerPassed: true,
    legacyActivityAdaptersPassed: true,
    localCoursePathPassed: true,
  },
  reviewPlan: {
    status: "COMPLETE",
    approvedBeforeReview: true,
    inventorySha256: "b".repeat(64),
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

const completeInventory: P119ContentInventoryGroup[] = currentInventory.map((group) => ({
  ...group,
  variantCount: 40,
  meetsV1Minimum: true,
  meetsProfessionalTarget: true,
}));
const eligible = evaluateP119ContentEducationEvidence(valid, completeInventory);
assert.equal(eligible.inventoryReadyForHumanReview, true);
assert.equal(eligible.teacherReviewBatchApproved, true);
assert.ok(eligible.checks.every((check) => check.passed));

const realBaseline = evaluateP119ContentEducationEvidence(valid, currentInventory);
assert.equal(realBaseline.inventoryReadyForHumanReview, false);
assert.equal(realBaseline.teacherReviewBatchApproved, false);
assert.equal(
  realBaseline.checks.find((check) => check.id === "v1-content-minimum")?.passed,
  false,
);

const incomplete = structuredClone(valid);
incomplete.reviewPlan.status = "NOT_EXECUTED";
incomplete.reviewPlan.sampleItemIds = [];
incomplete.teacherReviews = [];
const blocked = evaluateP119ContentEducationEvidence(incomplete, completeInventory);
assert.equal(blocked.teacherReviewBatchApproved, false);
for (const id of ["review-plan", "teacher-reviews"]) {
  assert.equal(blocked.checks.find((check) => check.id === id)?.passed, false);
}

const duplicatedReviewer = structuredClone(valid);
duplicatedReviewer.teacherReviews[1].reviewerToken = "teacher-a";
assert.equal(
  evaluateP119ContentEducationEvidence(duplicatedReviewer, completeInventory)
    .teacherReviewBatchApproved,
  false,
);

const openFinding = structuredClone(valid);
openFinding.teacherReviews[0].openFindingCount = 1;
assert.equal(
  evaluateP119ContentEducationEvidence(openFinding, completeInventory)
    .teacherReviewBatchApproved,
  false,
);

const wrongProvenance = structuredClone(valid);
wrongProvenance.automatedEvidence.ciCommitSha = "c".repeat(40);
assert.equal(
  evaluateP119ContentEducationEvidence(wrongProvenance, completeInventory)
    .inventoryReadyForHumanReview,
  false,
);

const wrongSchema = structuredClone(valid);
wrongSchema.schemaVersion = 2 as 1;
assert.equal(
  evaluateP119ContentEducationEvidence(wrongSchema, completeInventory)
    .inventoryReadyForHumanReview,
  false,
);

console.log("P119 content and education evidence focused tests passed.");
