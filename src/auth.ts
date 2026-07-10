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
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id;
      }
      // account/profile are only present on the initial sign-in call. When
      // Google links to an existing (e.g. credentials-created) user, `user`
      // here is the pre-link DB row the adapter fetched before the events.linkAccount
      // update below ran — it won't have the image yet. Reading straight
      // from the raw Google profile instead means this exact sign-in's
      // session is correct immediately, not just from the next login on.
      if (account?.provider === "google" && profile) {
        const googleProfile = profile as GoogleProfile;
        if (googleProfile.picture) token.picture = googleProfile.picture;
        if (googleProfile.name) token.name = googleProfile.name;
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
  events: {
    // The Google provider's profile() above only runs when the adapter
    // *creates* a new user — when allowDangerousEmailAccountLinking links
    // Google to an EXISTING credentials-only user (matched by email),
    // Auth.js just inserts the linking Account row and leaves the existing
    // User row untouched, so its image/name/emailVerified never get
    // backfilled from Google. linkAccount fires exactly once, right when
    // that link is created — for both a brand-new Google user (redundant
    // with profile() there, harmless) and this existing-user case (the
    // actual gap) — so it's the one place that reliably catches both.
    async linkAccount({ user, account, profile }) {
      if (account.provider !== "google" || !user.id) return;
      const googleProfile = profile as GoogleProfile | undefined;
      if (!googleProfile) return;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          image: googleProfile.picture ?? undefined,
          name: user.name ?? googleProfile.name ?? undefined,
          emailVerified: googleProfile.email_verified ? new Date() : undefined,
        },
      });
    },
  },
});
