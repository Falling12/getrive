import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google, { type GoogleProfile } from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation/auth";
import { verifyUserCredentials } from "@/lib/services/user.service";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        return verifyUserCredentials(parsed.data.email, parsed.data.password);
      },
    }),
    Google({
      // Only present if the founder set GOOGLE_CLIENT_ID/SECRET — see .env.example.
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Auth.js's default OIDC profile mapping doesn't carry `emailVerified`
      // through to the User row — without this override, a Google sign-in
      // creates an unverified account even though Google already verified
      // the address. Safe here specifically because Google's `email_verified`
      // claim is itself the verification, unlike a provider that doesn't
      // verify email ownership.
      profile: (profile: GoogleProfile) => ({
        id: profile.sub,
        name: profile.name,
        email: profile.email,
        image: profile.picture,
        emailVerified: profile.email_verified ? new Date() : null,
      }),
      // Existing credentials accounts share the same email-uniqueness
      // invariant this app already enforces (User.email @unique) — linking
      // a Google sign-in to a matching email is safe specifically because
      // Google verifies email ownership, unlike providers that don't.
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
