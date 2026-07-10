import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import type { SignupInput } from "@/lib/validation/auth";
import { sendEmail } from "@/lib/email";
import { passwordResetEmailTemplate, verificationEmailTemplate } from "@/lib/email-templates";
import { appUrl } from "@/lib/config";

const PASSWORD_SALT_ROUNDS = 12;
const VERIFY_TOKEN_TTL_HOURS = 24;
const RESET_TOKEN_TTL_HOURS = 1;

// VerificationToken.token is globally unique, so a single table serves both
// email verification and password reset — the identifier prefix keeps the
// two purposes from colliding and lets a lookup tell them apart.
const VERIFY_PREFIX = "verify:";
const RESET_PREFIX = "reset:";

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export class UserServiceError extends Error {}

export async function createUser({ email, password }: Omit<SignupInput, "confirmPassword">) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new UserServiceError("An account with that email already exists.");
  }

  const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);

  return prisma.user.create({
    data: { email, passwordHash },
    select: { id: true, email: true },
  });
}

export async function sendVerificationEmail(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, emailVerified: true },
  });
  if (user.emailVerified) return;

  const token = generateToken();
  await prisma.verificationToken.create({
    data: {
      identifier: `${VERIFY_PREFIX}${user.email}`,
      token,
      expires: new Date(Date.now() + VERIFY_TOKEN_TTL_HOURS * 60 * 60_000),
    },
  });

  const { subject, html } = verificationEmailTemplate({
    verifyUrl: `${appUrl}/verify-email?token=${token}`,
  });
  await sendEmail({ to: user.email, subject, html });
}

// Single-use: the token row is deleted before acting on it, so a token that
// gets used twice concurrently only succeeds once.
export async function verifyEmailToken(token: string): Promise<{ success: boolean }> {
  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || !record.identifier.startsWith(VERIFY_PREFIX) || record.expires < new Date()) {
    return { success: false };
  }

  const deleted = await prisma.verificationToken.deleteMany({ where: { token } });
  if (deleted.count === 0) return { success: false };

  const email = record.identifier.slice(VERIFY_PREFIX.length);
  await prisma.user.update({ where: { email }, data: { emailVerified: new Date() } });
  return { success: true };
}

// Deliberately doesn't reveal whether the email has an account — callers
// should show the same "if that email exists, we sent a link" message
// either way, to avoid leaking account existence.
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  const token = generateToken();
  await prisma.verificationToken.create({
    data: {
      identifier: `${RESET_PREFIX}${email}`,
      token,
      expires: new Date(Date.now() + RESET_TOKEN_TTL_HOURS * 60 * 60_000),
    },
  });

  const { subject, html } = passwordResetEmailTemplate({
    resetUrl: `${appUrl}/reset-password?token=${token}`,
  });
  await sendEmail({ to: email, subject, html });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || !record.identifier.startsWith(RESET_PREFIX) || record.expires < new Date()) {
    throw new UserServiceError("This reset link is invalid or has expired.");
  }

  const deleted = await prisma.verificationToken.deleteMany({ where: { token } });
  if (deleted.count === 0) {
    throw new UserServiceError("This reset link has already been used.");
  }

  const email = record.identifier.slice(RESET_PREFIX.length);
  const passwordHash = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
  await prisma.user.update({ where: { email }, data: { passwordHash } });
}

export async function verifyUserCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) return null;

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return null;

  return { id: user.id, email: user.email };
}
