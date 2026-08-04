import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createPrivatePracticeHistoryResult,
  PRIVATE_PRACTICE_HISTORY_QUERY_LIMIT,
  type PrivatePracticeHistoryResult,
} from "../account/privatePracticeHistory";

export async function loadSupabasePrivatePracticeHistory(
  client: SupabaseClient,
  userId: string,
): Promise<PrivatePracticeHistoryResult> {
  const { data, error } = await client
    .from("practice_attempts")
    .select(
      "id, state, target_version, client_summary, completed_at, session:practice_sessions!inner(source), exercise:exercises!inner(id, kind, title, is_published, lesson:lessons!inner(id, title, course:courses!inner(id, title)))",
    )
    .eq("user_id", userId)
    .eq("state", "completed")
    .eq("session.source", "system_course")
    .eq("exercise.is_published", true)
    .order("completed_at", { ascending: false })
    .limit(PRIVATE_PRACTICE_HISTORY_QUERY_LIMIT);

  if (error) throw error;
  return createPrivatePracticeHistoryResult(data ?? []);
}
