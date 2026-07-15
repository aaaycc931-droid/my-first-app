-- First persisted system-course exercise and atomic, owner-bound practice attempt RPC.
insert into public.exercises (
  id,
  lesson_id,
  owner_id,
  kind,
  title,
  instructions,
  target,
  target_version,
  difficulty,
  is_published
)
values (
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000101',
  null,
  'single_pitch',
  '基础单音听辨',
  '播放一个单音，选择你听到的音名，再查看答案说明。',
  '{"difficulty":"基础","pitches":["C4","D4","E4","G4"],"feedback_kind":"answer_explanation"}'::jsonb,
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

create or replace function public.record_single_pitch_attempt(
  p_exercise_id uuid,
  p_target_version integer,
  p_difficulty text,
  p_sequence integer,
  p_selected_pitch_id text,
  p_target_pitch_id text,
  p_matches_answer boolean
)
returns uuid
language plpgsql
security invoker
set search_path = public
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
      and e.kind = 'single_pitch'
      and e.is_published = true
      and e.target_version = p_target_version
      and e.target ->> 'difficulty' = p_difficulty
      and exists (
        select 1
        from jsonb_array_elements_text(e.target -> 'pitches') as allowed_pitch(value)
        where lower(allowed_pitch.value) = lower(p_selected_pitch_id)
      )
      and exists (
        select 1
        from jsonb_array_elements_text(e.target -> 'pitches') as allowed_pitch(value)
        where lower(allowed_pitch.value) = lower(p_target_pitch_id)
      )
  ) then
    raise exception 'published single-pitch exercise not found';
  end if;

  if p_sequence < 0
    or p_matches_answer is null
    or p_difficulty not in ('基础', '进阶')
    or char_length(p_selected_pitch_id) not between 1 and 16
    or char_length(p_target_pitch_id) not between 1 and 16
    or p_matches_answer <> (lower(p_selected_pitch_id) = lower(p_target_pitch_id))
  then
    raise exception 'invalid single-pitch attempt payload';
  end if;

  insert into public.practice_sessions (user_id, started_at, ended_at, source)
  values (current_user_id, now(), now(), 'system_course')
  returning id into new_session_id;

  insert into public.practice_attempts (
    user_id,
    session_id,
    exercise_id,
    state,
    target_version,
    client_summary,
    started_at,
    completed_at
  )
  values (
    current_user_id,
    new_session_id,
    p_exercise_id,
    'completed',
    p_target_version,
    jsonb_build_object(
      'exercise_kind', 'single_pitch',
      'difficulty', p_difficulty,
      'sequence', p_sequence,
      'selected_pitch_id', p_selected_pitch_id,
      'target_pitch_id', p_target_pitch_id,
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

revoke all on function public.record_single_pitch_attempt(uuid, integer, text, integer, text, text, boolean) from public, anon;
grant execute on function public.record_single_pitch_attempt(uuid, integer, text, integer, text, text, boolean) to authenticated;
