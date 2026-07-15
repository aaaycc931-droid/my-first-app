"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { getSupabaseBrowserClient, isSupabaseConfigured } from "../../lib/platform/supabaseBrowser";

type Status = "idle" | "sending" | "sent" | "error";
type Profile = { display_name: string | null; timezone: string; locale: string };

export function AccountPanel() {
  const [email, setEmail] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(isSupabaseConfigured);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Shanghai");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const loadProfile = async (userId: string) => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const { data, error } = await client.from("profiles").select("display_name, timezone, locale").eq("id", userId).maybeSingle();
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
  };

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;

    let active = true;
    void client.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        if (data.session) void loadProfile(data.session.user.id);
        setIsLoadingSession(false);
      }
    });
    const { data: subscription } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoadingSession(false);
      if (nextSession) {
        void loadProfile(nextSession.user.id);
        setStatus("idle");
        setMessage("");
      }
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const sendMagicLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const client = getSupabaseBrowserClient();
    if (!client || !email.trim()) return;

    setStatus("sending");
    setMessage("");
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/account` },
    });
    if (error) {
      setStatus("error");
      setMessage("发送登录链接失败，请检查邮箱地址或稍后重试。");
      return;
    }
    setStatus("sent");
    setMessage("登录链接已发送到你的邮箱。打开链接后会回到这里并恢复会话。");
  };

  const signOut = async () => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    await client.auth.signOut();
    setProfile(null);
    setDisplayName("");
  };

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const client = getSupabaseBrowserClient();
    if (!client || !session) return;
    setIsSavingProfile(true);
    setMessage("");
    const { error } = await client.from("profiles").upsert({
      id: session.user.id,
      display_name: displayName.trim() || null,
      timezone,
      locale: "zh-CN",
      updated_at: new Date().toISOString(),
    });
    setIsSavingProfile(false);
    if (error) {
      setMessage("保存私人资料失败，请稍后重试。");
      return;
    }
    setProfile({ display_name: displayName.trim() || null, timezone, locale: "zh-CN" });
    setMessage("私人资料已保存。它只会写入你的账户，不会公开显示。");
  };

  if (!isSupabaseConfigured) {
    return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm"><p className="text-sm font-semibold text-amber-800">账户服务尚未连接</p><h1 className="mt-2 text-3xl font-bold text-amber-950">暂时继续使用本地练习</h1><p className="mt-3 max-w-2xl leading-7 text-amber-950">正式账户、跨设备同步、私有素材和练习记录已具备数据库与权限契约，但当前部署尚未配置账户服务。此状态不会收集邮箱、不会上传你的练习数据，也不会把本地临时练习误称为已同步。</p></section>;
  }

  if (isLoadingSession) return <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-slate-700">正在恢复你的账户会话…</p></section>;

  if (session) {
    return <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm"><p className="text-sm font-semibold text-emerald-800">已登录</p><h1 className="mt-2 text-3xl font-bold text-emerald-950">你的私有学习空间已准备好</h1><p className="mt-3 leading-7 text-emerald-950">当前账户：{session.user.email ?? "已验证用户"}</p><p className="mt-2 leading-7 text-emerald-950">课程、练习记录、私有素材和数据导出会按账户所有权保存；不会公开给其他用户。</p><form onSubmit={(event) => void saveProfile(event)} className="mt-6 max-w-xl rounded-2xl border border-emerald-200 bg-white p-4"><h2 className="text-lg font-bold text-emerald-950">私人资料</h2><label className="mt-4 block text-sm font-semibold text-slate-800" htmlFor="display-name">显示名称<input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={80} placeholder="学习者" className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2 font-normal outline-none ring-emerald-500 focus:ring-2" /></label><label className="mt-4 block text-sm font-semibold text-slate-800" htmlFor="timezone">时区<select id="timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2 font-normal"><option value="Asia/Shanghai">中国标准时间</option><option value="Asia/Singapore">新加坡时间</option><option value="Asia/Tokyo">日本时间</option></select></label><button type="submit" disabled={isSavingProfile} className="mt-4 rounded-full bg-emerald-700 px-4 py-2 font-semibold text-white disabled:bg-emerald-300">{isSavingProfile ? "正在保存…" : "保存私人资料"}</button>{profile ? <p className="mt-3 text-sm text-slate-600">当前同步状态：已读取你的私人资料。</p> : null}</form>{message ? <p className="mt-4 rounded-xl bg-white p-3 text-sm leading-6 text-emerald-900">{message}</p> : null}<button type="button" onClick={() => void signOut()} className="mt-5 rounded-full border border-emerald-300 bg-white px-4 py-2 font-semibold text-emerald-800">退出登录</button></section>;
  }

  return <section className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-sm"><p className="text-sm font-semibold text-indigo-700">私人学习账户</p><h1 className="mt-2 text-3xl font-bold text-slate-950">登录后同步你的正式学习数据</h1><p className="mt-3 max-w-2xl leading-7 text-slate-700">输入邮箱后，我们会发送一次性登录链接。账户仅用于你的私有练习、素材、进度、导出与删除，不提供公开主页或社区功能。</p><form onSubmit={(event) => void sendMagicLink(event)} className="mt-6 flex max-w-xl flex-col gap-3 sm:flex-row"><label className="sr-only" htmlFor="account-email">邮箱地址</label><input id="account-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none ring-indigo-500 focus:ring-2"/><button type="submit" disabled={status === "sending"} className="rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white disabled:bg-indigo-300">{status === "sending" ? "正在发送…" : "发送登录链接"}</button></form>{message ? <p className={`mt-4 rounded-xl p-3 leading-6 ${status === "error" ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{message}</p> : null}</section>;
}
