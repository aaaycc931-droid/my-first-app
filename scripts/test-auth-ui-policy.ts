import {
  getAuthUiError,
  getMagicLinkCooldownRemaining,
  magicLinkCooldownSeconds,
} from "../lib/platform/authUiPolicy.js";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

assert(getMagicLinkCooldownRemaining(null, 10_000) === 0, "no send should have no cooldown");
assert(getMagicLinkCooldownRemaining(10_000, 10_000) === magicLinkCooldownSeconds, "a successful send should start the full cooldown");
assert(getMagicLinkCooldownRemaining(10_000, 70_000) === 0, "the cooldown should expire");
assert(getAuthUiError({ status: 429 }).kind === "rate-limited", "HTTP 429 should be localized as a rate limit");
assert(getAuthUiError({ message: "Invalid email" }).kind === "invalid-email", "invalid email should have a specific message");
assert(getAuthUiError({ message: "SMTP failure" }).kind === "email-service", "SMTP errors should identify email service configuration");
assert(getAuthUiError({ message: "unexpected" }).kind === "unknown", "unknown errors should fail safely");

console.log("auth UI policy tests passed");
