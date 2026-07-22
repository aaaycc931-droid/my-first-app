export type ActivityCheckedFactV1 = {
  schemaVersion: "activity-checked-fact-v1";
  lifecycle: "checked";
  assessmentMode: "non-scoring";
  activityId: string;
  activityVersion: string;
  contentVersion: string;
  targetId: string;
  attemptId: string;
  revision: number;
  evidenceState: "consistent" | "different" | "insufficient";
};
