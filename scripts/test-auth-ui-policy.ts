import {
  getAuthUiError,
  getPasswordAuthUiError,
  getPasswordRecoveryRequestOutcome,
  getPasswordUpdateUiError,
  getMagicLinkCooldownRemaining,
  magicLinkCooldownSeconds,
  passwordRecoveryAcceptedMessage,
  validatePasswordAuthInput,
  validatePasswordRecoveryEmail,
  validatePasswordUpdateInput,
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
assert(validatePasswordAuthInput({ email: " learner@example.com ", password: "secure-pass", confirmation: "", mode: "sign-in" }).ok, "valid password login input should pass");
assert(!validatePasswordAuthInput({ email: "invalid", password: "secure-pass", confirmation: "", mode: "sign-in" }).ok, "invalid password-login email should fail locally");
assert(!validatePasswordAuthInput({ email: "learner@example.com", password: "short", confirmation: "short", mode: "sign-up" }).ok, "short registration password should fail locally");
assert(!validatePasswordAuthInput({ email: "learner@example.com", password: "secure-pass", confirmation: "different-pass", mode: "sign-up" }).ok, "mismatched registration confirmation should fail locally");
assert(getPasswordAuthUiError({ message: "Invalid login credentials" }, "sign-in").includes("邮箱或密码"), "invalid credentials should not expose backend copy");
assert(getPasswordAuthUiError({ message: "Email not confirmed" }, "sign-in").includes("尚未确认"), "unconfirmed email should have a recovery action");
assert(getPasswordAuthUiError({ status: 429 }, "sign-up").includes("频繁"), "password auth rate limits should be localized");
assert(getPasswordAuthUiError({ message: "unexpected" }, "sign-up").includes("无法完成注册"), "unknown registration errors should fail safely");
assert(validatePasswordRecoveryEmail(" learner@example.com ").ok, "password recovery should normalize a valid email");
assert(!validatePasswordRecoveryEmail("invalid").ok, "password recovery should reject an invalid email locally");
assert(!validatePasswordUpdateInput({ password: "short", confirmation: "short" }).ok, "password updates should reject short passwords locally");
assert(!validatePasswordUpdateInput({ password: "secure-pass", confirmation: "different-pass" }).ok, "password updates should reject mismatched confirmation locally");
assert(validatePasswordUpdateInput({ password: "secure-pass", confirmation: "secure-pass" }).ok, "valid password updates should pass");
assert(getPasswordRecoveryRequestOutcome({ message: "User not found" }).kind === "accepted", "unknown recovery accounts must not be enumerated");
assert(getPasswordRecoveryRequestOutcome({ message: "User not found" }).message === passwordRecoveryAcceptedMessage, "unknown recovery accounts should use the generic accepted copy");
assert(getPasswordRecoveryRequestOutcome({ status: 429 }).message.includes("频繁"), "recovery rate limits should be localized");
assert(getPasswordRecoveryRequestOutcome({ message: "SMTP failure" }).message.includes("邮件服务"), "recovery email failures should be localized");
assert(getPasswordRecoveryRequestOutcome({ message: "network timeout" }).message.includes("网络"), "recovery network failures should provide a recovery action");
assert(getPasswordUpdateUiError({ message: "Auth session missing" }).includes("无效或已过期"), "expired recovery sessions should tell the user to resend");
assert(getPasswordUpdateUiError({ message: "Weak password" }).includes("安全要求"), "weak recovered passwords should be localized");

console.log("auth UI policy tests passed");
