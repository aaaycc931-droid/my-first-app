import { readFileSync } from "node:fs";

const migration = readFileSync(
  "supabase/migrations/0005_least_privilege_practice_writes.sql",
  "utf8",
);

const required = [
  "revoke insert, update, delete on table public.profiles from authenticated",
  "grant update (display_name, timezone, locale, updated_at) on table public.profiles to authenticated",
  "public.practice_sessions",
  "public.practice_attempts",
  "public.skill_progress",
  "public.review_queue",
  "public.private_assets",
  "public.analysis_jobs",
  "public.notation_drafts",
  "public.consent_records",
  "public.deletion_requests",
  "security definer",
  "set search_path = public, pg_temp",
  "current_user_id uuid := auth.uid()",
  "p_matches_answer <> (lower(p_selected_pitch_id) = lower(p_target_pitch_id))",
  "revoke all on function public.record_single_pitch_attempt",
  "to authenticated",
];

for (const value of required) {
  if (!migration.includes(value)) {
    throw new Error(`Least-privilege migration is missing: ${value}`);
  }
}

if (/grant execute[\s\S]*to anon/.test(migration)) {
  throw new Error("Anonymous users must not execute the practice-write RPC.");
}
if (/grant\s+(insert|update|delete)\s+on\s+table\s+public\.practice_attempts\s+to\s+authenticated/i.test(migration)) {
  throw new Error("Authenticated clients must not receive direct practice-attempt mutation grants.");
}

console.log("database least-privilege checks passed");
