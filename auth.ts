import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { checkLoginRateLimit, clearLoginRateLimit } from "@/lib/rate-limit";
import { redis } from "@/lib/redis";

const SESSION_TTL_SECONDS = 24 * 60 * 60;

function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: SESSION_TTL_SECONDS,
  },
  providers: [
    Credentials({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials, request) => {
        const email = typeof credentials?.email === "string" ? credentials.email : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) {
          return null;
        }

        const ip = getRequestIp(request);
        const rateLimit = await checkLoginRateLimit(ip);

        if (!rateLimit.allowed) {
          throw new Error("Too many login attempts. Try again later.");
        }

        const [user] = await db
          .select({
            id: users.id,
            email: users.email,
            fullName: users.fullName,
            passwordHash: users.passwordHash,
          })
          .from(users)
          .where(eq(users.email, email.toLowerCase().trim()))
          .limit(1);

        if (!user?.passwordHash) {
          return null;
        }

        const isPasswordValid = await compare(password, user.passwordHash);

        if (!isPasswordValid) {
          return null;
        }

        await clearLoginRateLimit(ip);

        return {
          id: String(user.id),
          email: user.email,
          name: user.fullName,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user?.id) {
        token.sub = user.id;
      }

      if (typeof token.sid !== "string") {
        token.sid = globalThis.crypto.randomUUID();
      }

      if (token.sub && token.sid) {
        await redis.set(`session:${token.sid}`, String(token.sub), { ex: SESSION_TTL_SECONDS });
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.sid = typeof token.sid === "string" ? token.sid : undefined;
      }

      return session;
    },
  },
});
