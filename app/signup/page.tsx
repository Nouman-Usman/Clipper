import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { signupAction } from "@/app/actions/auth-actions";

type SignupPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const messages: Record<string, string> = {
  missing_fields: "Complete all required fields.",
  email_exists: "An account with this email already exists.",
  signup_failed: "Unable to complete signup. Please try again.",
  auth_callback: "Authentication callback failed. Please try again.",
  access_denied: "Access denied for this signup attempt.",
  auth_failed: "Authentication failed. Please try again.",
  server_error: "Something went wrong. Please try again in a moment.",
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const errorMessage = params.error ? messages[params.error] : null;

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="auth-kicker">Clipper</p>
        <h1>Create account</h1>
        <p className="auth-subtitle">Get access to the Phase 1 dashboard.</p>

        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

        <form action={signupAction} className="auth-form">
          <label>
            Full name
            <input name="fullName" type="text" required />
          </label>

          <label>
            Email
            <input name="email" type="email" required />
          </label>

          <label>
            Password
            <input name="password" type="password" minLength={8} required />
          </label>

          <button className="auth-submit" type="submit">
            Create account
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
