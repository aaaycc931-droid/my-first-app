import type { ActivitySessionV1 } from "../../lib/activity/activitySession";

export function ActivityProtocolState({ session }: { session: ActivitySessionV1 }) {
  const state = session.lifecycle === "ready"
    ? "题目已确认"
    : session.lifecycle === "answering"
      ? "已作答，等待检查"
      : session.lifecycle === "checked"
        ? "答案已检查"
        : "正在检查题目";
  return (
    <p className="mt-3 text-xs leading-5 text-slate-500" data-testid="activity-protocol-state">
      统一活动协议：{state}；第 {session.attemptNumber} 次尝试。本活动只提供非评分证据。
    </p>
  );
}
