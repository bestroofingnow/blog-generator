// pages/api/auth/[...nextauth].ts
// NextAuth.js configuration for Neon DB

import NextAuth, { NextAuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { db, users, accounts, eq, UserRole } from "../../../lib/db";
import bcrypt from "bcryptjs";
import { isSuperAdminEmail } from "../../../lib/super-admin";

// Extend the built-in types
declare module "next-auth" {
  interface User {
    id: string;
    role: UserRole;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: UserRole;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    role: UserRole;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Email/Password authentication
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        // Find user by email
        const result = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email))
          .limit(1);

        const user = result[0];

        if (!user || !user.password) {
          throw new Error("Invalid email or password");
        }

        // Verify password
        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        // Auto-promote super admin emails to superadmin role
        let role = (user.role as UserRole) || "user";
        if (isSuperAdminEmail(user.email) && role !== "superadmin") {
          await db
            .update(users)
            .set({ role: "superadmin" })
            .where(eq(users.id, user.id));
          role = "superadmin";
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role,
        };
      },
    }),
    // Google OAuth (optional - requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.email = user.email!;
        token.role = user.role || "user";
      }
      // Refresh role from database on session update
      if (trigger === "update" && token.id) {
        const dbUser = await db
          .select({ role: users.role })
          .from(users)
          .where(eq(users.id, token.id))
          .limit(1);
        if (dbUser[0]) {
          token.role = dbUser[0].role as UserRole;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.role = token.role;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        // Check if user exists
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.email, user.email!))
          .limit(1);

        if (existingUser.length === 0) {
          // Create new user - super admin emails get superadmin role
          const newRole = isSuperAdminEmail(user.email!) ? "superadmin" : "user";
          const newUser = await db
            .insert(users)
            .values({
              email: user.email!,
              name: user.name,
              image: user.image,
              emailVerified: new Date(),
              role: newRole,
            })
            .returning();

          // Set role on user object for JWT
          user.role = newRole;

          // Link account
          await db.insert(accounts).values({
            userId: newUser[0].id,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
          });
        } else {
          // Set role from existing user for JWT
          user.id = existingUser[0].id;
          let role = (existingUser[0].role as UserRole) || "user";

          // Auto-promote super admin emails to superadmin role
          if (isSuperAdminEmail(user.email!) && role !== "superadmin") {
            await db
              .update(users)
              .set({ role: "superadmin" })
              .where(eq(users.id, existingUser[0].id));
            role = "superadmin";
          }
          user.role = role;

          // Update existing user's OAuth account if needed
          const existingAccount = await db
            .select()
            .from(accounts)
            .where(eq(accounts.userId, existingUser[0].id))
            .limit(1);

          if (existingAccount.length === 0) {
            await db.insert(accounts).values({
              userId: existingUser[0].id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
            });
          }
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
