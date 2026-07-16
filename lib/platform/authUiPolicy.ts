export const magicLinkCooldownSeconds = 60;

type AuthErrorLike = {
  code?: string;
  message?: string;
  status?: number;
};

export type AuthUiErrorKind =
  | "rate-limited"
  | "invalid-email"
  | "email-service"
  | "unknown";

export const getMagicLinkCooldownRemaining = (
  sentAtMs: number | null,
  nowMs: number,
) => {
  if (sentAtMs === null) return 0;
  return Math.max(
    0,
    Math.ceil(magicLinkCooldownSeconds - (nowMs - sentAtMs) / 1000),
  );
};

export const getAuthUiError = (error: AuthErrorLike) => {
  const searchable = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  if (error.status === 429 || /rate|too many|over_email_send/.test(searchable)) {
    return {
      kind: "rate-limited" as AuthUiErrorKind,
      message: "发送请求过于频繁。请等待一分钟后再试，不要连续点击发送。",
    };
  }
  if (/invalid.*email|email.*invalid/.test(searchable)) {
    return {
      kind: "invalid-email" as AuthUiErrorKind,
      message: "邮箱格式无效，请检查是否有遗漏、空格或拼写错误。",
    };
  }
  if (/smtp|email.*send|sending.*email|mailer/.test(searchable)) {
    return {
      kind: "email-service" as AuthUiErrorKind,
      message: "登录邮件服务暂时不可用。请稍后重试；如果持续失败，需要检查 Supabase 邮件服务配置。",
    };
  }
  return {
    kind: "unknown" as AuthUiErrorKind,
    message: "发送登录链接失败。请检查网络和邮箱地址，稍后再试。",
  };
};
