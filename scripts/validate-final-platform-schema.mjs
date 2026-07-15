import { readFileSync } from "node:fs";

const schema = readFileSync("supabase/migrations/0001_final_learning_platform.sql", "utf8");
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

console.log("final platform schema contract checks passed");
