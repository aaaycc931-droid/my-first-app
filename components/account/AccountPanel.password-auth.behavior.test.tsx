import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

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
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

async function renderAccountPanel({
  signInWithPassword = vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
  signUp = vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}: {
  signInWithPassword?: ReturnType<typeof vi.fn>;
  signUp?: ReturnType<typeof vi.fn>;
} = {}) {
  let authStateChange: ((event: string, session: null) => void) | null = null;
  const client = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn((callback: (event: string, session: null) => void) => {
        authStateChange = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      signInWithOtp: vi.fn(),
      signInWithPassword,
      signUp,
      signOut: vi.fn(),
    },
    from: vi.fn(),
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
  const match = Array.from(container.querySelectorAll("button"))
    .find((item) => item.textContent === label);
  if (!match) throw new Error(`missing button: ${label}`);
  return match;
}

function setInput(container: HTMLElement, id: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(`#${id}`);
  if (!input) throw new Error(`missing input: ${id}`);
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  document.body.replaceChildren();
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
    const { container, getAuthStateChange } = await renderAccountPanel({ signInWithPassword });

    await act(async () => button(container, "密码登录").click());
    await act(async () => {
      setInput(container, "password-account-email", "learner@example.com");
      setInput(container, "account-password", "secure-pass");
    });
    await act(async () => button(container, "使用密码登录").click());
    expect(container.textContent).toContain("正在登录…");

    await act(async () => getAuthStateChange()?.("SIGNED_OUT", null));
    await act(async () => pending.resolve({ data: { session: null }, error: null }));

    expect(container.textContent).not.toContain("密码验证成功");
    expect(container.textContent).not.toContain("正在登录…");
  });
});
