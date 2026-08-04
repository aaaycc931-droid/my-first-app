"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "../../lib/platform/supabaseBrowser";
import { loadSupabaseAccountDataExport } from "../../lib/platform/supabaseAccountDataExport";
import { browserFileDownloadPort } from "../../lib/platform/browserFileDownload";
import {
  createAccountDataExportPackage,
  getAccountDataExportFileName,
  serializeAccountDataExport,
} from "../../lib/account/accountDataExport";
import {
  getAuthUiError,
  getPasswordAuthUiError,
  getPasswordRecoveryRequestOutcome,
  getPasswordUpdateUiError,
  getMagicLinkCooldownRemaining,
  passwordRecoveryAcceptedMessage,
  type PasswordAuthMode,
  validatePasswordAuthInput,
  validatePasswordRecoveryEmail,
  validatePasswordUpdateInput,
} from "../../lib/platform/authUiPolicy";
import {
  AccountSessionWorkGuard,
  type AccountSessionWorkToken,
} from "../../lib/account/accountSessionWorkGuard";
import { AccountAuthAttemptGuard } from "../../lib/account/accountAuthAttemptGuard";
import { PrivatePracticeHistoryPanel } from "./PrivatePracticeHistoryPanel";

type Status = "idle" | "sending" | "sent" | "error";
type AuthMode = "magic-link" | "password-recovery" | PasswordAuthMode;
type PasswordStatus = "idle" | "submitting" | "success" | "error";
type PasswordRecoveryView =
  | "none"
  | "verifying"
  | "ready"
  | "updating"
  | "completed"
  | "invalid";
type ExportStatus = "idle" | "exporting" | "exported" | "error";
type Profile = {
  display_name: string | null;
  timezone: string;
  locale: string;
};

export function AccountPanel() {
  const [email, setEmail] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("magic-link");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<PasswordStatus>("idle");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordRecoveryView, setPasswordRecoveryView] =
    useState<PasswordRecoveryView>(() =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("flow") ===
        "password-recovery"
        ? "verifying"
        : "none",
    );
  const passwordRecoveryViewRef = useRef(passwordRecoveryView);
  const passwordRecoveryUserIdRef = useRef<string | null>(null);
  const [passwordRecoverySentAtMs, setPasswordRecoverySentAtMs] = useState<
    number | null
  >(null);
  const [passwordRecoveryCooldownSeconds, setPasswordRecoveryCooldownSeconds] =
    useState(0);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingSession, setIsLoadingSession] =
    useState(isSupabaseConfigured);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Shanghai");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [magicLinkSentAtMs, setMagicLinkSentAtMs] = useState<number | null>(
    null,
  );
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [exportMessage, setExportMessage] = useState("");
  const [sessionWorkGuard] = useState(() => new AccountSessionWorkGuard());
  const [authAttemptGuard] = useState(() => new AccountAuthAttemptGuard());

  const updatePasswordRecoveryView = useCallback(
    (nextView: PasswordRecoveryView) => {
      passwordRecoveryViewRef.current = nextView;
      setPasswordRecoveryView(nextView);
    },
    [],
  );

  const clearPasswordRecoveryMarker = useCallback(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("flow") !== "password-recovery") return;
    url.searchParams.delete("flow");
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, []);

  const loadProfile = useCallback(async (token: AccountSessionWorkToken) => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const { data, error } = await client.from("profiles").select("display_name, timezone, locale").eq("id", token.userId).maybeSingle();
    if (!sessionWorkGuard.isCurrent(token)) return;
    if (error) {
      setMessage("无法读取私人资料，请稍后重试。");
      return;
    }
    if (data) {
      const nextProfile = data as Profile;
      setProfile(nextProfile);
      setDisplayName(nextProfile.display_name ?? "");
      setTimezone(nextProfile.timezone);
    }
  }, [sessionWorkGuard]);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;

    let active = true;
    let authEventCount = 0;
    const applySession = (
      event: AuthChangeEvent,
      nextSession: Session | null,
    ) => {
      if (!active) return;
      const nextUserId = nextSession?.user.id ?? null;
      const recoveryUserId = passwordRecoveryUserIdRef.current;
      const recoveryView = passwordRecoveryViewRef.current;
      const isActiveRecovery =
        recoveryView === "ready" || recoveryView === "updating";
      const preservesActiveRecovery =
        isActiveRecovery &&
        recoveryUserId === nextUserId &&
        (event === "INITIAL_SESSION" ||
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED");
      const isRecoveryEntry =
        event === "PASSWORD_RECOVERY" && Boolean(nextUserId);
      const isInvalidRecoveryEntry =
        event === "PASSWORD_RECOVERY" && !nextUserId;
      const isVerifyingRecoveryIntent =
        recoveryView === "verifying" && event === "INITIAL_SESSION";

      if (!preservesActiveRecovery) authAttemptGuard.invalidate();
      sessionWorkGuard.setSession(nextUserId);
      setSession(nextSession);
      setProfile(null);
      setDisplayName("");
      setTimezone("Asia/Shanghai");
      setIsSavingProfile(false);
      setExportStatus("idle");
      setExportMessage("");
      setIsLoadingSession(false);

      if (isRecoveryEntry && nextUserId) {
        passwordRecoveryUserIdRef.current = nextUserId;
        setPassword("");
        setPasswordConfirmation("");
        setPasswordStatus("idle");
        setPasswordMessage("");
        updatePasswordRecoveryView("ready");
        setStatus("idle");
        setMessage("");
        return;
      }

      if (isInvalidRecoveryEntry) {
        passwordRecoveryUserIdRef.current = null;
        updatePasswordRecoveryView("invalid");
        setPasswordStatus("error");
        setPasswordMessage(
          "密码恢复链接没有建立有效会话。请重新发送恢复邮件。",
        );
        clearPasswordRecoveryMarker();
        return;
      }

      if (preservesActiveRecovery) return;

      setPassword("");
      setPasswordConfirmation("");
      setPasswordStatus("idle");
      setPasswordMessage("");
      if (!isVerifyingRecoveryIntent) {
        if (isActiveRecovery) clearPasswordRecoveryMarker();
        passwordRecoveryUserIdRef.current = null;
        updatePasswordRecoveryView("none");
      }

      if (nextSession && !isVerifyingRecoveryIntent) {
        const token = sessionWorkGuard.capture(nextSession.user.id);
        if (token) void loadProfile(token);
        setStatus("idle");
        setMessage("");
      }
    };
    void client.auth.getSession().then(({ data }) => {
      if (active && authEventCount === 0)
        applySession("INITIAL_SESSION", data.session);
    });
    const { data: subscription } = client.auth.onAuthStateChange(
      (event, nextSession) => {
        authEventCount += 1;
        applySession(event, nextSession);
      },
    );
    return () => {
      active = false;
      authAttemptGuard.invalidate();
      passwordRecoveryUserIdRef.current = null;
      subscription.subscription.unsubscribe();
    };
  }, [
    authAttemptGuard,
    clearPasswordRecoveryMarker,
    loadProfile,
    sessionWorkGuard,
    updatePasswordRecoveryView,
  ]);

  useEffect(() => {
    if (magicLinkSentAtMs === null) return;
    const updateRemaining = () => {
      const remaining = getMagicLinkCooldownRemaining(
        magicLinkSentAtMs,
        Date.now(),
      );
      setCooldownSeconds(remaining);
      if (remaining === 0) setMagicLinkSentAtMs(null);
    };
    updateRemaining();
    const timerId = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timerId);
  }, [magicLinkSentAtMs]);

  useEffect(() => {
    if (passwordRecoverySentAtMs === null) return;
    const updateRemaining = () => {
      const remaining = getMagicLinkCooldownRemaining(
        passwordRecoverySentAtMs,
        Date.now(),
      );
      setPasswordRecoveryCooldownSeconds(remaining);
      if (remaining === 0) setPasswordRecoverySentAtMs(null);
    };
    updateRemaining();
    const timerId = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timerId);
  }, [passwordRecoverySentAtMs]);

  useEffect(() => {
    if (passwordRecoveryView !== "verifying") return;
    const timerId = window.setTimeout(() => {
      if (passwordRecoveryViewRef.current !== "verifying") return;
      authAttemptGuard.invalidate();
      passwordRecoveryUserIdRef.current = null;
      updatePasswordRecoveryView("invalid");
      setPasswordStatus("error");
      setPasswordMessage(
        "密码恢复链接无效或已过期。请重新发送恢复邮件；已有登录会话不会被用于授权改密。",
      );
      clearPasswordRecoveryMarker();
    }, 5000);
    return () => window.clearTimeout(timerId);
  }, [
    authAttemptGuard,
    clearPasswordRecoveryMarker,
    passwordRecoveryView,
    updatePasswordRecoveryView,
  ]);

  const sendMagicLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const client = getSupabaseBrowserClient();
    if (!client || !email.trim() || status === "sending" || cooldownSeconds > 0) return;

    setStatus("sending");
    setMessage("");
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/account` },
    });
    if (error) {
      const authError = getAuthUiError(error);
      setStatus("error");
      setMessage(authError.message);
      return;
    }
    const sentAtMs = Date.now();
    setMagicLinkSentAtMs(sentAtMs);
    setCooldownSeconds(getMagicLinkCooldownRemaining(sentAtMs, sentAtMs));
    setStatus("sent");
    setMessage("登录链接已发送。请在准备登录的同一台设备上，用默认浏览器打开邮件中的链接；链接会回到这里并恢复会话。");
  };

  const sendPasswordRecovery = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const client = getSupabaseBrowserClient();
    if (
      !client ||
      authMode !== "password-recovery" ||
      passwordStatus === "submitting" ||
      passwordRecoveryCooldownSeconds > 0
    )
      return;
    const validation = validatePasswordRecoveryEmail(email);
    if (!validation.ok) {
      setPasswordStatus("error");
      setPasswordMessage(validation.message);
      return;
    }

    const token = authAttemptGuard.begin();
    setPasswordStatus("submitting");
    setPasswordMessage("");
    try {
      const { error } = await client.auth.resetPasswordForEmail(
        validation.email,
        {
          redirectTo: `${window.location.origin}/account?flow=password-recovery`,
        },
      );
      if (!authAttemptGuard.isCurrent(token)) return;
      if (error) {
        const outcome = getPasswordRecoveryRequestOutcome(error);
        setPasswordStatus(outcome.kind === "accepted" ? "success" : "error");
        setPasswordMessage(outcome.message);
        if (outcome.kind === "error") return;
      } else {
        setPasswordStatus("success");
        setPasswordMessage(passwordRecoveryAcceptedMessage);
      }
      const sentAtMs = Date.now();
      setPasswordRecoverySentAtMs(sentAtMs);
      setPasswordRecoveryCooldownSeconds(
        getMagicLinkCooldownRemaining(sentAtMs, sentAtMs),
      );
    } catch (caught) {
      if (!authAttemptGuard.isCurrent(token)) return;
      const outcome = getPasswordRecoveryRequestOutcome(
        caught instanceof Error ? caught : {},
      );
      setPasswordStatus(outcome.kind === "accepted" ? "success" : "error");
      setPasswordMessage(outcome.message);
      if (outcome.kind === "accepted") {
        const sentAtMs = Date.now();
        setPasswordRecoverySentAtMs(sentAtMs);
        setPasswordRecoveryCooldownSeconds(
          getMagicLinkCooldownRemaining(sentAtMs, sentAtMs),
        );
      }
    }
  };

  const submitPasswordAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const client = getSupabaseBrowserClient();
    if (!client || (authMode !== "sign-in" && authMode !== "sign-up") || passwordStatus === "submitting") return;
    const validation = validatePasswordAuthInput({
      email,
      password,
      confirmation: passwordConfirmation,
      mode: authMode,
    });
    if (!validation.ok) {
      setPasswordStatus("error");
      setPasswordMessage(validation.message);
      return;
    }

    const token = authAttemptGuard.begin();
    setPasswordStatus("submitting");
    setPasswordMessage("");
    try {
      const result = authMode === "sign-in"
        ? await client.auth.signInWithPassword({
          email: validation.email,
          password: validation.password,
        })
        : await client.auth.signUp({
          email: validation.email,
          password: validation.password,
          options: { emailRedirectTo: `${window.location.origin}/account` },
        });
      if (!authAttemptGuard.isCurrent(token)) return;
      if (result.error) {
        setPasswordStatus("error");
        setPasswordMessage(getPasswordAuthUiError(result.error, authMode));
        return;
      }

      setPassword("");
      setPasswordConfirmation("");
      setPasswordStatus("success");
      setPasswordMessage(authMode === "sign-in" || result.data.session
        ? "密码验证成功，正在恢复你的私人学习空间。"
        : "注册请求已提交。请打开确认邮件中的链接完成邮箱确认，再使用密码登录；如果账户服务无需确认，会直接恢复会话。");
    } catch (caught) {
      if (!authAttemptGuard.isCurrent(token)) return;
      setPasswordStatus("error");
      setPasswordMessage(getPasswordAuthUiError(caught instanceof Error ? caught : {}, authMode));
    }
  };

  const updateRecoveredPassword = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const client = getSupabaseBrowserClient();
    const recoveryUserId = passwordRecoveryUserIdRef.current;
    if (
      !client ||
      !session ||
      !recoveryUserId ||
      recoveryUserId !== session.user.id ||
      passwordRecoveryViewRef.current !== "ready" ||
      passwordStatus === "submitting"
    )
      return;
    const validation = validatePasswordUpdateInput({
      password,
      confirmation: passwordConfirmation,
    });
    if (!validation.ok) {
      setPasswordStatus("error");
      setPasswordMessage(validation.message);
      return;
    }

    const token = authAttemptGuard.begin();
    updatePasswordRecoveryView("updating");
    setPasswordStatus("submitting");
    setPasswordMessage("");
    try {
      const { error } = await client.auth.updateUser({
        password: validation.password,
      });
      if (!authAttemptGuard.isCurrent(token)) return;
      if (error) {
        updatePasswordRecoveryView("ready");
        setPasswordStatus("error");
        setPasswordMessage(getPasswordUpdateUiError(error));
        return;
      }

      passwordRecoveryUserIdRef.current = null;
      setPassword("");
      setPasswordConfirmation("");
      updatePasswordRecoveryView("completed");
      setPasswordStatus("success");
      setPasswordMessage(
        "密码已更新。你可以继续进入私人学习空间；新密码不会保存在此页面、日志或导出中。",
      );
      clearPasswordRecoveryMarker();
      const profileToken = sessionWorkGuard.capture(session.user.id);
      if (profileToken) void loadProfile(profileToken);
    } catch (caught) {
      if (!authAttemptGuard.isCurrent(token)) return;
      updatePasswordRecoveryView("ready");
      setPasswordStatus("error");
      setPasswordMessage(
        getPasswordUpdateUiError(caught instanceof Error ? caught : {}),
      );
    }
  };

  const selectAuthMode = (nextMode: AuthMode) => {
    authAttemptGuard.invalidate();
    passwordRecoveryUserIdRef.current = null;
    updatePasswordRecoveryView("none");
    clearPasswordRecoveryMarker();
    setAuthMode(nextMode);
    setStatus("idle");
    setMessage("");
    setPassword("");
    setPasswordConfirmation("");
    setPasswordStatus("idle");
    setPasswordMessage("");
  };

  const signOut = async () => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    authAttemptGuard.invalidate();
    passwordRecoveryUserIdRef.current = null;
    updatePasswordRecoveryView("none");
    clearPasswordRecoveryMarker();
    sessionWorkGuard.invalidate();
    setSession(null);
    setPassword("");
    setPasswordConfirmation("");
    setPasswordStatus("idle");
    setPasswordMessage("");
    await client.auth.signOut();
    setProfile(null);
    setDisplayName("");
    setIsSavingProfile(false);
    setExportStatus("idle");
    setExportMessage("");
  };

  const continueAfterPasswordRecovery = () => {
    updatePasswordRecoveryView("none");
    setPasswordStatus("idle");
    setPasswordMessage("");
    setMessage("密码已更新。当前私人账户会话已恢复。");
  };

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const client = getSupabaseBrowserClient();
    if (!client || !session) return;
    const token = sessionWorkGuard.capture(session.user.id);
    if (!token) return;
    setIsSavingProfile(true);
    setMessage("");
    const { data, error } = await client
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        timezone,
        locale: "zh-CN",
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.user.id)
      .select("display_name, timezone, locale")
      .maybeSingle();
    if (!sessionWorkGuard.isCurrent(token)) return;
    setIsSavingProfile(false);
    if (error || !data) {
      setMessage("保存私人资料失败，请稍后重试。");
      return;
    }
    setProfile({ display_name: displayName.trim() || null, timezone, locale: "zh-CN" });
    setMessage("私人资料已保存。它只会写入你的账户，不会公开显示。");
  };

  const exportAccountData = async () => {
    const client = getSupabaseBrowserClient();
    if (!client || !session || exportStatus === "exporting") return;
    const token = sessionWorkGuard.capture(session.user.id);
    if (!token) return;
    setExportStatus("exporting");
    setExportMessage("");
    try {
      const generatedAt = new Date();
      const data = await loadSupabaseAccountDataExport(client, session.user.id);
      if (!sessionWorkGuard.isCurrent(token)) return;
      const exportPackage = createAccountDataExportPackage({
        account: {
          id: session.user.id,
          email: session.user.email ?? null,
          createdAt: session.user.created_at ?? null,
        },
        data,
        generatedAt,
      });
      browserFileDownloadPort.download({
        data: serializeAccountDataExport(exportPackage),
        fileName: getAccountDataExportFileName(generatedAt),
        mimeType: "application/json;charset=utf-8",
      });
      setExportStatus("exported");
      setExportMessage("账户结构化数据和私有素材清单已导出。原始素材文件不包含在此 JSON 中。");
    } catch {
      if (!sessionWorkGuard.isCurrent(token)) return;
      setExportStatus("error");
      setExportMessage("数据导出失败，没有生成不完整文件。请稍后重试。");
    }
  };

  if (!isSupabaseConfigured) {
    return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm"><p className="text-sm font-semibold text-amber-800">账户服务尚未连接</p><h1 className="mt-2 text-3xl font-bold text-amber-950">暂时继续使用本地练习</h1><p className="mt-3 max-w-2xl leading-7 text-amber-950">正式账户、跨设备同步、私有素材和练习记录已具备数据库与权限契约，但当前部署尚未配置账户服务。此状态不会收集邮箱、不会上传你的练习数据，也不会把本地临时练习误称为已同步。</p></section>;
  }

  if (passwordRecoveryView === "verifying") {
    return (
      <section className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-indigo-700">
          正在验证密码恢复链接
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          确认链接后才能设置新密码
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-700">
          我们正在等待账户服务确认这是有效的密码恢复事件。当前已有会话不会被当作恢复授权，也不会先显示私人资料或导出入口。
        </p>
      </section>
    );
  }

  if (passwordRecoveryView === "invalid") {
    return (
      <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
        <p className="text-sm font-semibold text-rose-800">密码恢复未完成</p>
        <h1 className="mt-2 text-3xl font-bold text-rose-950">
          恢复链接无效或已过期
        </h1>
        <div aria-live="polite">
          <p className="mt-3 max-w-2xl leading-7 text-rose-900">
            {passwordMessage}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (session) {
              updatePasswordRecoveryView("none");
              setPasswordStatus("idle");
              setPasswordMessage("");
              setMessage("未使用无效的恢复链接；当前账户会话保持不变。");
            } else {
              selectAuthMode("password-recovery");
            }
          }}
          className="mt-5 rounded-xl bg-rose-800 px-5 py-3 font-semibold text-white"
        >
          {session ? "返回当前账户" : "重新发送恢复邮件"}
        </button>
      </section>
    );
  }

  if (isLoadingSession) return <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-slate-700">正在恢复你的账户会话…</p></section>;

  if (
    session &&
    (passwordRecoveryView === "ready" || passwordRecoveryView === "updating")
  ) {
    return (
      <section className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-indigo-700">
          密码恢复链接已验证
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          为当前账户设置新密码
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-700">
          当前恢复账户：{session.user.email ?? "已验证用户"}
          。完成更新前不会显示私人资料、数据导出或其他账户操作。
        </p>
        <form
          onSubmit={(event) => void updateRecoveredPassword(event)}
          className="mt-6 grid max-w-xl gap-3"
        >
          <label
            className="text-sm font-semibold text-slate-800"
            htmlFor="recovery-new-password"
          >
            新密码
            <input
              id="recovery-new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none ring-indigo-500 focus:ring-2"
            />
          </label>
          <label
            className="text-sm font-semibold text-slate-800"
            htmlFor="recovery-password-confirmation"
          >
            再次输入新密码
            <input
              id="recovery-password-confirmation"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none ring-indigo-500 focus:ring-2"
            />
          </label>
          <button
            type="submit"
            disabled={passwordStatus === "submitting"}
            className="min-h-12 rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            {passwordStatus === "submitting" ? "正在更新密码…" : "保存新密码"}
          </button>
        </form>
        <div aria-live="polite">
          {passwordMessage ? (
            <p
              className={`mt-4 max-w-xl rounded-xl p-3 leading-6 ${passwordStatus === "error" ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}
            >
              {passwordMessage}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          disabled={passwordStatus === "submitting"}
          className="mt-4 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
        >
          退出并取消恢复
        </button>
      </section>
    );
  }

  if (session && passwordRecoveryView === "completed") {
    return (
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-800">密码更新成功</p>
        <h1 className="mt-2 text-3xl font-bold text-emerald-950">
          新的登录密码已经生效
        </h1>
        <div aria-live="polite">
          <p className="mt-3 max-w-2xl leading-7 text-emerald-900">
            {passwordMessage}
          </p>
        </div>
        <button
          type="button"
          onClick={continueAfterPasswordRecovery}
          className="mt-5 rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white"
        >
          进入私人学习空间
        </button>
      </section>
    );
  }


  if (session) {
    return (
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-800">已登录</p>
        <h1 className="mt-2 text-3xl font-bold text-emerald-950">
          你的私有学习空间已准备好
        </h1>
        <p className="mt-3 leading-7 text-emerald-950">
          当前账户：{session.user.email ?? "已验证用户"}
        </p>
        <p className="mt-2 leading-7 text-emerald-950">
          课程、练习记录、私有素材和数据导出会按账户所有权保存；不会公开给其他用户。
        </p>
        <form
          onSubmit={(event) => void saveProfile(event)}
          className="mt-6 max-w-xl rounded-2xl border border-emerald-200 bg-white p-4"
        >
          <h2 className="text-lg font-bold text-emerald-950">私人资料</h2>
          <label
            className="mt-4 block text-sm font-semibold text-slate-800"
            htmlFor="display-name"
          >
            显示名称
            <input
              id="display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={80}
              placeholder="学习者"
              className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2 font-normal outline-none ring-emerald-500 focus:ring-2"
            />
          </label>
          <label
            className="mt-4 block text-sm font-semibold text-slate-800"
            htmlFor="timezone"
          >
            时区
            <select
              id="timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2 font-normal"
            >
              <option value="Asia/Shanghai">中国标准时间</option>
              <option value="Asia/Singapore">新加坡时间</option>
              <option value="Asia/Tokyo">日本时间</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={isSavingProfile}
            className="mt-4 rounded-full bg-emerald-700 px-4 py-2 font-semibold text-white disabled:bg-emerald-300"
          >
            {isSavingProfile ? "正在保存…" : "保存私人资料"}
          </button>
          {profile ? (
            <p className="mt-3 text-sm text-slate-600">
              当前同步状态：已读取你的私人资料。
            </p>
          ) : null}
        </form>
        {message ? (
          <p className="mt-4 rounded-xl bg-white p-3 text-sm leading-6 text-emerald-900">
            {message}
          </p>
        ) : null}
        <PrivatePracticeHistoryPanel
          userId={session.user.id}
          timeZone={timezone}
        />
        <div className="mt-5 max-w-xl rounded-2xl border border-emerald-200 bg-white p-4">
          <h2 className="text-lg font-bold text-emerald-950">导出账户数据</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            下载当前账户的结构化数据和私有素材清单。原始音频、图片、PDF 等素材文件不会包含在此 JSON 中。
          </p>
          <button
            type="button"
            onClick={() => void exportAccountData()}
            disabled={exportStatus === "exporting"}
            className="mt-4 rounded-full border border-emerald-300 bg-white px-4 py-2 font-semibold text-emerald-800 disabled:cursor-not-allowed disabled:text-emerald-300"
          >
            {exportStatus === "exporting" ? "正在准备导出…" : "下载账户数据"}
          </button>
          <div aria-live="polite">
            {exportMessage ? (
              <p
                className={`mt-3 text-sm leading-6 ${exportStatus === "error" ? "text-rose-700" : "text-emerald-800"}`}
              >
                {exportMessage}
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-5 rounded-full border border-emerald-300 bg-white px-4 py-2 font-semibold text-emerald-800"
        >
          退出登录
        </button>
      </section>
    );
  }

  if (authMode === "password-recovery") {
    return (
      <section className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-indigo-700">找回登录密码</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          发送密码恢复邮件
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-700">
          输入账户邮箱。无论该邮箱是否已注册，页面都会使用同一确认文案，避免暴露账户是否存在。
        </p>
        <form
          onSubmit={(event) => void sendPasswordRecovery(event)}
          className="mt-6 flex max-w-xl flex-col gap-3 sm:flex-row"
        >
          <label className="sr-only" htmlFor="password-recovery-email">
            邮箱地址
          </label>
          <input
            id="password-recovery-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none ring-indigo-500 focus:ring-2"
          />
          <button
            type="submit"
            disabled={
              passwordStatus === "submitting" ||
              passwordRecoveryCooldownSeconds > 0
            }
            className="rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            {passwordStatus === "submitting"
              ? "正在发送…"
              : passwordRecoveryCooldownSeconds > 0
                ? `${passwordRecoveryCooldownSeconds} 秒后可重新发送`
                : "发送恢复邮件"}
          </button>
        </form>
        <div aria-live="polite">
          {passwordMessage ? (
            <p
              className={`mt-4 max-w-xl rounded-xl p-3 leading-6 ${passwordStatus === "error" ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}
            >
              {passwordMessage}
            </p>
          ) : null}
        </div>
        <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500">
          收到邮件后，请在同一台设备的默认浏览器中打开链接。只有账户服务发出的真实
          PASSWORD_RECOVERY 事件才会授权设置新密码。
        </p>
        <button
          type="button"
          onClick={() => selectAuthMode("sign-in")}
          className="mt-4 rounded-xl border border-indigo-200 bg-white px-5 py-3 font-semibold text-indigo-800"
        >
          返回密码登录
        </button>
      </section>
    );
  }

  return <section className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-sm"><p className="text-sm font-semibold text-indigo-700">私人学习账户</p><h1 className="mt-2 text-3xl font-bold text-slate-950">登录后同步你的正式学习数据</h1><p className="mt-3 max-w-2xl leading-7 text-slate-700">可以使用邮箱登录链接，或使用邮箱和密码登录／注册。账户仅用于你的私有练习、素材、进度、导出与删除，不提供公开主页或社区功能。</p><div className="mt-6 grid max-w-xl grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="选择账户登录方式"><button type="button" aria-pressed={authMode === "magic-link"} onClick={() => selectAuthMode("magic-link")} className={`min-h-11 rounded-xl px-3 py-2 text-sm font-bold ${authMode === "magic-link" ? "bg-indigo-700 text-white" : "border border-indigo-200 bg-white text-indigo-900"}`}>邮箱登录链接</button><button type="button" aria-pressed={authMode === "sign-in"} onClick={() => selectAuthMode("sign-in")} className={`min-h-11 rounded-xl px-3 py-2 text-sm font-bold ${authMode === "sign-in" ? "bg-indigo-700 text-white" : "border border-indigo-200 bg-white text-indigo-900"}`}>密码登录</button><button type="button" aria-pressed={authMode === "sign-up"} onClick={() => selectAuthMode("sign-up")} className={`min-h-11 rounded-xl px-3 py-2 text-sm font-bold ${authMode === "sign-up" ? "bg-indigo-700 text-white" : "border border-indigo-200 bg-white text-indigo-900"}`}>密码注册</button><button type="button" aria-pressed={false} onClick={() => selectAuthMode("password-recovery")} className="min-h-11 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-bold text-indigo-900">找回密码</button></div>{authMode === "magic-link" ? <><form onSubmit={(event) => void sendMagicLink(event)} className="mt-4 flex max-w-xl flex-col gap-3 sm:flex-row"><label className="sr-only" htmlFor="account-email">邮箱地址</label><input id="account-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none ring-indigo-500 focus:ring-2"/><button type="submit" disabled={status === "sending" || cooldownSeconds > 0} className="rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-indigo-300">{status === "sending" ? "正在发送…" : cooldownSeconds > 0 ? `${cooldownSeconds} 秒后可重新发送` : "发送登录链接"}</button></form><div aria-live="polite">{message ? <p className={`mt-4 rounded-xl p-3 leading-6 ${status === "error" ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{message}</p> : null}</div><p className="mt-4 text-sm leading-6 text-slate-500">未收到时请先检查垃圾邮件。不要连续发送；如果你在手机上收信，请用手机默认浏览器打开登录链接。</p></> : <><form onSubmit={(event) => void submitPasswordAuth(event)} className="mt-4 grid max-w-xl gap-3"><label className="text-sm font-semibold text-slate-800" htmlFor="password-account-email">邮箱地址<input id="password-account-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none ring-indigo-500 focus:ring-2"/></label><label className="text-sm font-semibold text-slate-800" htmlFor="account-password">密码<input id="account-password" type="password" autoComplete={authMode === "sign-up" ? "new-password" : "current-password"} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none ring-indigo-500 focus:ring-2"/></label>{authMode === "sign-up" ? <label className="text-sm font-semibold text-slate-800" htmlFor="account-password-confirmation">再次输入密码<input id="account-password-confirmation" type="password" autoComplete="new-password" required minLength={8} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none ring-indigo-500 focus:ring-2"/></label> : null}<button type="submit" disabled={passwordStatus === "submitting"} className="min-h-12 rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-indigo-300">{passwordStatus === "submitting" ? authMode === "sign-up" ? "正在提交注册…" : "正在登录…" : authMode === "sign-up" ? "创建私人账户" : "使用密码登录"}</button></form><div aria-live="polite">{passwordMessage ? <p className={`mt-4 max-w-xl rounded-xl p-3 leading-6 ${passwordStatus === "error" ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{passwordMessage}</p> : null}</div><p className="mt-4 max-w-xl text-sm leading-6 text-slate-500">密码至少 8 个字符。密码由账户服务处理，不会保存到此页面、日志或仓库。注册后如收到确认邮件，请先完成邮箱确认。</p></>}</section>;
}
