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

export type PasswordAuthMode = "sign-in" | "sign-up";

export type PasswordAuthValidation =
  | { ok: true; email: string; password: string }
  | { ok: false; message: string };

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

export const validatePasswordAuthInput = ({
  email,
  password,
  confirmation,
  mode,
}: {
  email: string;
  password: string;
  confirmation: string;
  mode: PasswordAuthMode;
}): PasswordAuthValidation => {
  const normalizedEmail = email.trim();
  if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    return { ok: false, message: "邮箱格式无效，请检查是否有遗漏、空格或拼写错误。" };
  }
  if (password.length < 8) {
    return { ok: false, message: "密码至少需要 8 个字符。请使用只有你知道的密码。" };
  }
  if (mode === "sign-up" && password !== confirmation) {
    return { ok: false, message: "两次输入的密码不一致，请重新确认。" };
  }
  return { ok: true, email: normalizedEmail, password };
};

export const getPasswordAuthUiError = (error: AuthErrorLike, mode: PasswordAuthMode) => {
  const searchable = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  if (error.status === 429 || /rate|too many|over_request/.test(searchable)) {
    return "请求过于频繁。请稍后再试，不要连续提交。";
  }
  if (/invalid.*email|email.*invalid/.test(searchable)) {
    return "邮箱格式无效，请检查是否有遗漏、空格或拼写错误。";
  }
  if (/email.*not.*confirmed|not.*confirmed/.test(searchable)) {
    return "邮箱尚未确认。请先打开确认邮件中的链接，再使用密码登录。";
  }
  if (/invalid.*credential|invalid.*login|wrong.*password/.test(searchable)) {
    return "邮箱或密码不正确。请检查后重试，也可以改用邮箱登录链接。";
  }
  if (/weak.*password|password.*short|password.*characters/.test(searchable)) {
    return "密码未满足账户服务的安全要求。请使用更长且不易猜测的密码。";
  }
  if (/user.*already|already.*registered|already.*exists/.test(searchable)) {
    return "无法完成注册。请检查邮箱后重试，或切换到密码登录／邮箱登录链接。";
  }
  if (/network|fetch|offline|timeout/.test(searchable)) {
    return "暂时无法连接账户服务。请检查网络后重试。";
  }
  return mode === "sign-up"
    ? "无法完成注册。请稍后重试，或改用邮箱登录链接。"
    : "密码登录失败。请稍后重试，或改用邮箱登录链接。";
};
