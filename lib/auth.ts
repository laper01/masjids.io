import type { NextAuthOptions, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google"; // ← TAMBAH INI

/* ─── Extended types ─────────────────────────────────────────────── */
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
  interface User {
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    id?: string;
  }
}

/* ─── Auth Options ───────────────────────────────────────────────── */
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  providers: [
    // ✅ TAMBAH GoogleProvider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}auth/login`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
              }),
            }
          );

          const text = await res.text();
          if (!res.ok) return null;

          const json = JSON.parse(text);
          const payload = json?.data;

          if (!payload?.access_token || !payload?.user_id) return null;

          return {
            id: String(payload.user_id),
            name: payload.name ?? payload.full_name ?? null,
            email: payload.email ?? null,
            image: payload.avatar ?? null,
            accessToken: payload.access_token,
          } satisfies User;

        } catch (err) {
          console.error("NextAuth authorize error:", err);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      // Credentials login
      if (user) {
        token.accessToken = user.accessToken;
        token.id = user.id;
      }

      // ✅ Google login → kirim ke Go backend untuk tukar token
      if (account?.provider === "google") {
        try {
          // ← GANTI SELURUH BLOK INI
          console.log("[auth] sending to backend:", {
            url: `${process.env.NEXT_PUBLIC_API_URL}auth/google`,
            access_token: account.access_token?.slice(0, 20) + "...",
            id_token: account.id_token?.slice(0, 20) + "...",
          });

          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}auth/google`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                access_token: account.access_token,
                id_token: account.id_token,
              }),
            }
          );

          console.log("[auth] google exchange status:", res.status);
          const responseText = await res.text();
          console.log("[auth] google exchange response:", responseText);

          if (res.ok) {
            const json = JSON.parse(responseText);
            const payload = json?.data;
            token.accessToken = payload?.access_token;
            token.id = String(payload?.user_id);
          }
        } catch (err) {
          console.error("Google JWT callback error:", err);
        }
      }
      return token;
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.user.id = token.id ?? "";
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};