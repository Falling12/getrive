"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { requireSession } from "@/lib/session";
import {
  createUser,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  UserServiceError,
} from "@/lib/services/user.service";
import {
  loginSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validation/auth";
import {
  assertNotRateLimited,
  checkRateLimit,
  RateLimitError,
  recordFailedAttempt,
} from "@/lib/rate-limit";
import { isLikelyBotSubmission } from "@/lib/bot-protection";

const LOGIN_RATE_LIMIT = { max: 5, windowMinutes: 15 };
const PASSWORD_RESET_RATE_LIMIT = { max: 3, windowMinutes: 15 };
const RESEND_VERIFICATION_RATE_LIMIT = { max: 3, windowMinutes: 15 };

// signupAction defaults to /onboarding (a fresh account has no project yet,
// so that's the only useful destination). loginAction and Google both
// default to /projects instead — it self-redirects to /onboarding for an
// account with no completed project, and straight into the dashboard for
// one that has one (see projects/page.tsx), so it's the right landing spot
// for a returning founder without loginAction needing to know which.
function safeCallbackUrl(formData: FormData, fallback: string) {
  const value = formData.get("callbackUrl");
  // Only allow same-origin relative paths to avoid open-redirects via a crafted callbackUrl.
  return typeof value === "string" && value.startsWith("/") ? value : fallback;
}

// signIn("google", ...) redirects to Google's consent screen itself (via a
// thrown NEXT_REDIRECT), so unlike loginAction there's no error branch to
// handle here — an actual OAuth failure lands back on /login?error=... via
// the pages.signIn config in auth.ts.
export async function signInWithGoogleAction(formData: FormData) {
  await signIn("google", { redirectTo: safeCallbackUrl(formData, "/projects") });
}

export async function loginAction(_prevState: string | undefined, formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Check your input and try again.";
  }

  const rateLimitKey = `login:${parsed.data.email}`;
  try {
    await assertNotRateLimited(rateLimitKey, LOGIN_RATE_LIMIT);
  } catch (error) {
    if (error instanceof RateLimitError) return error.message;
    throw error;
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeCallbackUrl(formData, "/projects"),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      await recordFailedAttempt(rateLimitKey);
      return "Invalid email or password.";
    }
    throw error;
  }
}

export async function signupAction(_prevState: string | undefined, formData: FormData) {
  // Fails soft — same generic message a real validation error would show —
  // so a scripted signup can't distinguish "detected as a bot" from
  // "form was wrong" and adapt. See lib/bot-protection.ts.
  if (isLikelyBotSubmission(formData)) {
    return "Check your input and try again.";
  }

  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Check your input and try again.";
  }

  let user;
  try {
    user = await createUser(parsed.data);
  } catch (error) {
    if (error instanceof UserServiceError) {
      return error.message;
    }
    throw error;
  }

  // Best-effort — a slow/failed email provider shouldn't block account
  // creation or first sign-in. The verify-email banner covers retrying.
  try {
    await sendVerificationEmail(user.id);
  } catch (error) {
    console.error("Failed to send verification email", error);
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeCallbackUrl(formData, "/onboarding"),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Account created, but sign-in failed. Try logging in.";
    }
    throw error;
  }
}

export type ResendVerificationState = { error: string | null; success?: boolean };

export async function resendVerificationAction(
  _prevState: ResendVerificationState
): Promise<ResendVerificationState> {
  const session = await requireSession();

  try {
    await checkRateLimit(`verify-resend:${session.user.id}`, RESEND_VERIFICATION_RATE_LIMIT);
  } catch (error) {
    if (error instanceof RateLimitError) return { error: error.message };
    throw error;
  }

  await sendVerificationEmail(session.user.id);
  return { error: null, success: true };
}

export type PasswordResetRequestState = { error: string | null; success?: boolean };

export async function requestPasswordResetAction(
  _prevState: PasswordResetRequestState,
  formData: FormData
): Promise<PasswordResetRequestState> {
  const parsed = requestPasswordResetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your input and try again." };
  }

  try {
    await checkRateLimit(`password-reset:${parsed.data.email}`, PASSWORD_RESET_RATE_LIMIT);
  } catch (error) {
    if (error instanceof RateLimitError) return { error: error.message };
    throw error;
  }

  await requestPasswordReset(parsed.data.email);
  // Same response whether or not the email has an account, so this can't be
  // used to enumerate registered addresses.
  return { error: null, success: true };
}

export type ResetPasswordState = { error: string | null; success?: boolean };

export async function resetPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your input and try again." };
  }

  try {
    await resetPassword(parsed.data.token, parsed.data.password);
  } catch (error) {
    if (error instanceof UserServiceError) {
      return { error: error.message };
    }
    throw error;
  }

  return { error: null, success: true };
}
