import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { getDashboardSummary } from "@/lib/dashboard-summary";
import { redis } from "@/lib/redis";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.sid) {
    const sessionKey = `session:${session.user.sid}`;
    await redis.set(sessionKey, session.user.id, { ex: 24 * 60 * 60 });
  }

  const summary = await getDashboardSummary(Number(session.user.id));

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">Authenticated Phase 1 surface.</p>
        </div>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="rounded-md border border-gray-300 px-3 py-2 text-sm" type="submit">
            Sign out
          </button>
        </form>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <article className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">User ID</p>
          <p className="mt-2 text-lg font-medium">{summary.userId}</p>
        </article>
        <article className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Email</p>
          <p className="mt-2 text-lg font-medium">{summary.email}</p>
        </article>
        <article className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Cache Generated</p>
          <p className="mt-2 text-lg font-medium">{new Date(summary.generatedAt).toLocaleString()}</p>
        </article>
      </section>
    </main>
  );
}
