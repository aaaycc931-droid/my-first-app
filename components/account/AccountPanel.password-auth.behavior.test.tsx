import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

const supabaseBrowser = vi.hoisted(() => ({
  getSupabaseBrowserClient: vi.fn(),
}));

vi.mock("../../lib/platform/supabaseBrowser", () => ({
  getSupabaseBrowserClient: supabaseBrowser.getSupabaseBrowserClient,
  isSupabaseConfigured: true,
}));

import { AccountPanel } from "./AccountPanel";

let root: Root | null = null;

Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
  configurable: true,
  value: true,
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

async function renderAccountPanel({
  signInWithPassword = vi
    .fn()
    .mockResolvedValue({ data: { session: null }, error: null }),
  signUp = vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
  resetPasswordForEmail = vi.fn().mockResolvedValue({ data: {}, error: null }),
  updateUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
  initialSession = null,
}: {
  signInWithPassword?: ReturnType<typeof vi.fn>;
  signUp?: ReturnType<typeof vi.fn>;
  resetPasswordForEmail?: ReturnType<typeof vi.fn>;
  updateUser?: ReturnType<typeof vi.fn>;
  initialSession?: Session | null;
} = {}) {
  let authStateChange:
    | ((event: AuthChangeEvent, session: Session | null) => void)
    | null = null;
  const profileQuery = {
    select: vi.fn(() => profileQuery),
    eq: vi.fn(() => profileQuery),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  const client = {
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: initialSession } }),
      onAuthStateChange: vi.fn(
        (
          callback: (event: AuthChangeEvent, session: Session | null) => void,
        ) => {
          authStateChange = callback;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        },
      ),
      signInWithOtp: vi.fn(),
      signInWithPassword,
      signUp,
      resetPasswordForEmail,
      updateUser,
      signOut: vi.fn(),
    },
    from: vi.fn(() => profileQuery),
  };
  supabaseBrowser.getSupabaseBrowserClient.mockReturnValue(client);
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<AccountPanel />);
    await Promise.resolve();
  });
  return { container, client, getAuthStateChange: () => authStateChange };
}

function button(container: HTMLElement, label: string) {
  const match = Array.from(container.querySelectorAll("button")).find(
    (item) => item.textContent === label,
  );
  if (!match) throw new Error(`missing button: ${label}`);
  return match;
}

function setInput(container: HTMLElement, id: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(`#${id}`);
  if (!input) throw new Error(`missing input: ${id}`);
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

const recoverySession = {
  access_token: "recovery-access-token",
  refresh_token: "recovery-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: {
    id: "recovery-user-id",
    email: "learner@example.com",
    created_at: "2026-08-03T00:00:00.000Z",
  },
} as unknown as Session;

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  document.body.replaceChildren();
  window.history.replaceState({}, "", "/");
  vi.restoreAllMocks();
});

describe("AccountPanel password authentication", () => {
  it("keeps magic-link login and submits a normalized password login", async () => {
    const { container, client } = await renderAccountPanel();

    expect(container.textContent).toContain("邮箱登录链接");
    await act(async () => button(container, "密码登录").click());
    await act(async () => {
      setInput(container, "password-account-email", " learner@example.com ");
      setInput(container, "account-password", "secure-pass");
    });
    await act(async () => button(container, "使用密码登录").click());

    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "learner@example.com",
      password: "secure-pass",
    });
    expect(container.textContent).toContain("密码验证成功");
  });

  it("blocks mismatched registration confirmation before calling Supabase", async () => {
    const { container, client } = await renderAccountPanel();

    await act(async () => button(container, "密码注册").click());
    await act(async () => {
      setInput(container, "password-account-email", "learner@example.com");
      setInput(container, "account-password", "secure-pass");
      setInput(container, "account-password-confirmation", "different-pass");
    });
    await act(async () => button(container, "创建私人账户").click());

    expect(client.auth.signUp).not.toHaveBeenCalled();
    expect(container.textContent).toContain("两次输入的密码不一致");
  });

  it("gives a non-enumerating confirmation path after registration", async () => {
    const { container, client } = await renderAccountPanel();

    await act(async () => button(container, "密码注册").click());
    await act(async () => {
      setInput(container, "password-account-email", "learner@example.com");
      setInput(container, "account-password", "secure-pass");
      setInput(container, "account-password-confirmation", "secure-pass");
    });
    await act(async () => button(container, "创建私人账户").click());

    expect(client.auth.signUp).toHaveBeenCalledWith({
      email: "learner@example.com",
      password: "secure-pass",
      options: { emailRedirectTo: `${window.location.origin}/account` },
    });
    expect(container.textContent).toContain("注册请求已提交");
    expect(container.textContent).toContain("确认邮件");
  });

  it("ignores a late password response after a newer auth event", async () => {
    const pending = deferred<{ data: { session: null }; error: null }>();
    const signInWithPassword = vi.fn(() => pending.promise);
    const { container, getAuthStateChange } = await renderAccountPanel({
      signInWithPassword,
    });

    await act(async () => button(container, "密码登录").click());
    await act(async () => {
      setInput(container, "password-account-email", "learner@example.com");
      setInput(container, "account-password", "secure-pass");
    });
    await act(async () => button(container, "使用密码登录").click());
    expect(container.textContent).toContain("正在登录…");

    await act(async () => getAuthStateChange()?.("SIGNED_OUT", null));
    await act(async () =>
      pending.resolve({ data: { session: null }, error: null }),
    );

    expect(container.textContent).not.toContain("密码验证成功");
    expect(container.textContent).not.toContain("正在登录…");
  });

  it("requests password recovery with normalized email and non-enumerating copy", async () => {
    const { container, client } = await renderAccountPanel();

    await act(async () => button(container, "找回密码").click());
    await act(async () =>
      setInput(container, "password-recovery-email", " learner@example.com "),
    );
    await act(async () => button(container, "发送恢复邮件").click());

    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "learner@example.com",
      {
        redirectTo: `${window.location.origin}/account?flow=password-recovery`,
      },
    );
    expect(container.textContent).toContain("如果该邮箱关联了账户");
    expect(
      (button(container, "60 秒后可重新发送") as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("rejects an invalid recovery email before calling Supabase", async () => {
    const { container, client } = await renderAccountPanel();

    await act(async () => button(container, "找回密码").click());
    await act(async () =>
      setInput(container, "password-recovery-email", "invalid@example"),
    );
    await act(async () => button(container, "发送恢复邮件").click());

    expect(client.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(container.textContent).toContain("邮箱格式无效");
  });

  it("requires a trusted recovery event and matching new passwords", async () => {
    window.history.replaceState({}, "", "/account?flow=password-recovery");
    const { container, client, getAuthStateChange } = await renderAccountPanel({
      initialSession: recoverySession,
    });

    expect(container.textContent).toContain("正在验证密码恢复链接");
    expect(container.querySelector("#display-name")).toBeNull();
    await act(async () =>
      getAuthStateChange()?.("PASSWORD_RECOVERY", recoverySession),
    );
    expect(container.textContent).toContain("密码恢复链接已验证");
    expect(container.textContent).not.toContain("导出账户数据");

    await act(async () => {
      setInput(container, "recovery-new-password", "secure-pass");
      setInput(container, "recovery-password-confirmation", "different-pass");
    });
    await act(async () => button(container, "保存新密码").click());

    expect(client.auth.updateUser).not.toHaveBeenCalled();
    expect(container.textContent).toContain("两次输入的新密码不一致");
  });

  it("does not treat USER_UPDATED before the update promise as stale", async () => {
    const { container, client, getAuthStateChange } =
      await renderAccountPanel();
    await act(async () =>
      getAuthStateChange()?.("PASSWORD_RECOVERY", recoverySession),
    );
    client.auth.updateUser.mockImplementation(async () => {
      getAuthStateChange()?.("USER_UPDATED", recoverySession);
      return { data: { user: recoverySession.user }, error: null };
    });

    await act(async () => {
      setInput(container, "recovery-new-password", "secure-pass");
      setInput(container, "recovery-password-confirmation", "secure-pass");
    });
    await act(async () => button(container, "保存新密码").click());

    expect(client.auth.updateUser).toHaveBeenCalledWith({
      password: "secure-pass",
    });
    expect(container.textContent).toContain("新的登录密码已经生效");
    expect(container.textContent).not.toContain("secure-pass");
    expect(window.location.search).toBe("");
  });

  it("ignores a late password update after sign-out", async () => {
    const pending = deferred<{
      data: { user: Session["user"] };
      error: null;
    }>();
    const updateUser = vi.fn(() => pending.promise);
    const { container, getAuthStateChange } = await renderAccountPanel({
      updateUser,
    });
    await act(async () =>
      getAuthStateChange()?.("PASSWORD_RECOVERY", recoverySession),
    );
    await act(async () => {
      setInput(container, "recovery-new-password", "secure-pass");
      setInput(container, "recovery-password-confirmation", "secure-pass");
    });
    await act(async () => button(container, "保存新密码").click());

    await act(async () => getAuthStateChange()?.("SIGNED_OUT", null));
    await act(async () =>
      pending.resolve({ data: { user: recoverySession.user }, error: null }),
    );

    expect(container.textContent).not.toContain("新的登录密码已经生效");
    expect(container.textContent).toContain("私人学习账户");
  });

  it("ignores a late recovery-email result after switching back to login", async () => {
    const pending = deferred<{ data: {}; error: null }>();
    const resetPasswordForEmail = vi.fn(() => pending.promise);
    const { container } = await renderAccountPanel({ resetPasswordForEmail });

    await act(async () => button(container, "找回密码").click());
    await act(async () =>
      setInput(container, "password-recovery-email", "learner@example.com"),
    );
    await act(async () => button(container, "发送恢复邮件").click());
    await act(async () => button(container, "返回密码登录").click());
    await act(async () => pending.resolve({ data: {}, error: null }));

    expect(container.textContent).toContain("使用密码登录");
    expect(container.textContent).not.toContain("如果该邮箱关联了账户");
  });
});
