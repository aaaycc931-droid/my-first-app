import { readFileSync } from "node:fs";

const schema = readFileSync("supabase/migrations/0001_final_learning_platform.sql", "utf8");
const coursePractice = readFileSync(
  "supabase/migrations/0004_course_single_pitch_practice.sql",
  "utf8",
);
const required = [
  "create table public.profiles",
  "create table public.practice_attempts",
  "create table public.evaluation_results",
  "create table public.private_assets",
  "create table public.analysis_jobs",
  "create table public.notation_drafts",
  "alter table public.exercises enable row level security",
  "alter table public.evaluation_results enable row level security",
  "alter table public.private_assets enable row level security",
  "create policy \"assets are private\"",
  "create trigger on_auth_user_created",
];

for (const value of required) {
  if (!schema.includes(value)) throw new Error(`Final platform schema is missing: ${value}`);
}

if (schema.includes("using (true)")) throw new Error("Final platform schema must not introduce unrestricted RLS access.");

const coursePracticeRequired = [
  "'00000000-0000-4000-8000-000000000201'",
  "create or replace function public.record_single_pitch_attempt",
  "current_user_id uuid := auth.uid()",
  "security invoker",
  "jsonb_array_elements_text",
  "p_matches_answer <> (lower(p_selected_pitch_id) = lower(p_target_pitch_id))",
  "'formal_evaluation', false",
  "grant execute on function public.record_single_pitch_attempt",
  "to authenticated",
];

for (const value of coursePracticeRequired) {
  if (!coursePractice.includes(value)) {
    throw new Error(`Course practice migration is missing: ${value}`);
  }
}

if (coursePractice.includes("security definer")) {
  throw new Error("Course practice RPC must keep caller RLS ownership checks.");
}
if (/grant execute[\s\S]*to anon/.test(coursePractice)) {
  throw new Error("Anonymous users must not persist course attempts.");
}

console.log("final platform schema contract checks passed");
