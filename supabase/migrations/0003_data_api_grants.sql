-- Explicit Data API grants. RLS policies remain the final authorization boundary.
grant usage on schema public to anon, authenticated;

grant select on table
  public.courses,
  public.lessons,
  public.exercises
to anon;

grant select on table
  public.courses,
  public.lessons
to authenticated;

grant select, insert, update, delete on table
  public.profiles,
  public.exercises,
  public.practice_sessions,
  public.practice_attempts,
  public.skill_progress,
  public.review_queue,
  public.private_assets,
  public.analysis_jobs,
  public.notation_drafts,
  public.consent_records,
  public.deletion_requests
to authenticated;

grant select on table public.evaluation_results to authenticated;

create policy "owned exercises writable"
on public.exercises
for all
to authenticated
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and lesson_id is null
  and is_published = false
);
