-- Add the first persisted system-course interval exercise and a narrow,
-- owner-bound RPC. Browser clients cannot write practice tables directly.
insert into public.exercises (
  id, lesson_id, owner_id, kind, title, instructions,
  target, target_version, difficulty, is_published
)
values (
  '00000000-0000-4000-8000-000000000202',
  '00000000-0000-4000-8000-000000000102',
  null,
  'interval',
  '基础音程听辨',
  '播放一组上行或下行的两个音，选择你听到的音程，再查看答案说明。',
  '{"difficulty":"基础","intervals":["major-third","perfect-fourth","perfect-fifth"],"directions":["上行","下行"],"feedback_kind":"answer_explanation"}'::jsonb,
  1,
  1,
  true
)
on conflict (id) do update set
  lesson_id = excluded.lesson_id,
  owner_id = excluded.owner_id,
  kind = excluded.kind,
  title = excluded.title,
  instructions = excluded.instructions,
  target = excluded.target,
  target_version = excluded.target_version,
  difficulty = excluded.difficulty,
  is_published = excluded.is_published,
  updated_at = now();

create or replace function public.record_interval_attempt(
  p_exercise_id uuid,
  p_target_version integer,
  p_difficulty text,
  p_direction text,
  p_sequence integer,
  p_selected_interval_id text,
  p_target_interval_id text,
  p_matches_answer boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  new_session_id uuid;
  new_attempt_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1
    from public.exercises e
    where e.id = p_exercise_id
      and e.kind = 'interval'
      and e.is_published = true
      and e.target_version = p_target_version
      and e.target ->> 'difficulty' = p_difficulty
      and e.target -> 'directions' ? p_direction
      and e.target -> 'intervals' ? p_selected_interval_id
      and e.target -> 'intervals' ? p_target_interval_id
  ) then
    raise exception 'published interval exercise not found';
  end if;

  if p_sequence < 0
    or p_matches_answer is null
    or p_difficulty <> '基础'
    or p_direction not in ('上行', '下行')
    or char_length(p_selected_interval_id) not between 1 and 32
    or char_length(p_target_interval_id) not between 1 and 32
    or p_matches_answer <> (p_selected_interval_id = p_target_interval_id)
  then
    raise exception 'invalid interval attempt payload';
  end if;

  insert into public.practice_sessions (user_id, started_at, ended_at, source)
  values (current_user_id, now(), now(), 'system_course')
  returning id into new_session_id;

  insert into public.practice_attempts (
    user_id, session_id, exercise_id, state, target_version,
    client_summary, started_at, completed_at
  )
  values (
    current_user_id,
    new_session_id,
    p_exercise_id,
    'completed',
    p_target_version,
    jsonb_build_object(
      'exercise_kind', 'interval',
      'difficulty', p_difficulty,
      'direction', p_direction,
      'sequence', p_sequence,
      'selected_interval_id', p_selected_interval_id,
      'target_interval_id', p_target_interval_id,
      'matches_answer', p_matches_answer,
      'feedback_kind', 'answer_explanation',
      'formal_evaluation', false
    ),
    now(),
    now()
  )
  returning id into new_attempt_id;

  return new_attempt_id;
end;
$$;

revoke all on function public.record_interval_attempt(uuid, integer, text, text, integer, text, text, boolean) from public, anon;
grant execute on function public.record_interval_attempt(uuid, integer, text, text, integer, text, text, boolean) to authenticated;
