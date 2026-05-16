import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { loginAction } from "@/app/actions/auth-actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const messages: Record<string, string> = {
  missing_fields: "Enter both email and password.",
  invalid_credentials: "Invalid email or password.",
  auth_callback: "Authentication callback failed. Please try again.",
  access_denied: "Access denied for this sign-in attempt.",
  auth_failed: "Authentication failed. Please try again.",
  server_error: "Something went wrong. Please try again in a moment.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
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
        <h1>Sign in</h1>
        <p className="auth-subtitle">Use your Clipper account credentials.</p>

        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

        <form action={loginAction} className="auth-form">
          <label>
            Email
            <input name="email" type="email" required />
          </label>

          <label>
            Password
            <input name="password" type="password" minLength={8} required />
          </label>

          <button className="auth-submit" type="submit">
            Sign in
          </button>
        </form>

        <p className="auth-switch">
          New here? <Link href="/signup">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
