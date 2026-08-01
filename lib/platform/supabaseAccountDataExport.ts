import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AccountDataExportDataset,
  AccountDataExportRows,
} from "../account/accountDataExport";

type ExportQuery = Readonly<{
  key: keyof AccountDataExportDataset;
  table: string;
  columns: string;
  ownerColumn: string | null;
}>;

const exportQueries: ReadonlyArray<ExportQuery> = [
  { key: "profiles", table: "profiles", columns: "id, display_name, timezone, locale, created_at, updated_at, deleted_at", ownerColumn: "id" },
  { key: "ownedExercises", table: "exercises", columns: "id, lesson_id, owner_id, kind, title, instructions, target, target_version, difficulty, is_published, created_at, updated_at", ownerColumn: "owner_id" },
  { key: "practiceSessions", table: "practice_sessions", columns: "id, user_id, started_at, ended_at, source", ownerColumn: "user_id" },
  { key: "practiceAttempts", table: "practice_attempts", columns: "id, user_id, session_id, exercise_id, state, target_version, client_summary, started_at, completed_at, created_at", ownerColumn: "user_id" },
  // Ownership is enforced by the evaluation_results policy through practice_attempts.
  { key: "evaluationResults", table: "evaluation_results", columns: "id, attempt_id, evaluator_version, feedback_kind, confidence, metrics, feedback, is_formal, created_at", ownerColumn: null },
  { key: "skillProgress", table: "skill_progress", columns: "user_id, skill_key, level, evidence_count, updated_at", ownerColumn: "user_id" },
  { key: "reviewQueue", table: "review_queue", columns: "id, user_id, exercise_id, due_at, reason, algorithm_version, created_at", ownerColumn: "user_id" },
  { key: "privateAssets", table: "private_assets", columns: "id, user_id, kind, state, storage_bucket, storage_path, original_filename, content_type, byte_size, retention_until, created_at, deleted_at", ownerColumn: "user_id" },
  { key: "analysisJobs", table: "analysis_jobs", columns: "id, user_id, asset_id, state, pipeline_version, requested_at, started_at, finished_at, error_code, result", ownerColumn: "user_id" },
  { key: "notationDrafts", table: "notation_drafts", columns: "id, user_id, asset_id, source_kind, draft, draft_version, reviewed_at, confirmed_at, created_at, updated_at", ownerColumn: "user_id" },
  { key: "consentRecords", table: "consent_records", columns: "id, user_id, consent_key, policy_version, granted, created_at", ownerColumn: "user_id" },
  { key: "deletionRequests", table: "deletion_requests", columns: "id, user_id, requested_at, completed_at, status, failure_reason", ownerColumn: "user_id" },
];

export class AccountDataExportError extends Error {
  constructor(readonly table: string) {
    super(`Unable to export owned rows from ${table}.`);
    this.name = "AccountDataExportError";
  }
}

export const loadSupabaseAccountDataExport = async (
  client: SupabaseClient,
  userId: string,
): Promise<AccountDataExportDataset> => {
  const entries = await Promise.all(exportQueries.map(async (query) => {
    const selection = client.from(query.table).select(query.columns);
    const result = query.ownerColumn
      ? await selection.eq(query.ownerColumn, userId)
      : await selection;
    if (result.error || !result.data) {
      throw new AccountDataExportError(query.table);
    }
    return [query.key, result.data as unknown as AccountDataExportRows[]] as const;
  }));

  return Object.fromEntries(entries) as unknown as AccountDataExportDataset;
};
