"use server";

import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { users } from "@/drizzle/schema";
import { db } from "@/lib/db";

function isNextRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function authErrorParam(error: AuthError) {
  switch (error.type) {
    case "CredentialsSignin":
      return "invalid_credentials";
    case "CallbackRouteError":
      return "auth_callback";
    case "AccessDenied":
      return "access_denied";
    default:
      return "auth_failed";
  }
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=missing_fields");
  }

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      redirectTo: "/dashboard",
    });

    if (result?.error) {
      redirect("/login?error=invalid_credentials");
    }

    redirect(result?.url ?? "/dashboard");
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    if (error instanceof AuthError) {
      redirect(`/login?error=${authErrorParam(error)}`);
    }

    console.error("loginAction unexpected error", error);
    redirect("/login?error=server_error");
  }
}

export async function signupAction(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password || !fullName) {
    redirect("/signup?error=missing_fields");
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    redirect("/signup?error=email_exists");
  }

  const passwordHash = await hash(password, 12);

  await db.insert(users).values({
    email,
    fullName,
    passwordHash,
  });

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      redirectTo: "/dashboard",
    });

    if (result?.error) {
      redirect("/signup?error=signup_failed");
    }

    redirect(result?.url ?? "/dashboard");
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    if (error instanceof AuthError) {
      redirect(`/signup?error=${authErrorParam(error)}`);
    }

    console.error("signupAction unexpected error", error);
    redirect("/signup?error=server_error");
  }
}
