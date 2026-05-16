import Link from "next/link";
import { redirect } from "next/navigation";

import { createPromptProfileAction, markManualAccountReadyAction } from "@/app/actions/profile-actions";
import { auth } from "@/auth";
import { listSocialAccountStatuses } from "@/lib/phase4/accounts";
import { ensureDefaultPromptProfile, listPromptProfiles } from "@/lib/phase4/profiles";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  await ensureDefaultPromptProfile(session.user.id);
  const [accounts, profiles] = await Promise.all([
    listSocialAccountStatuses(session.user.id),
    listPromptProfiles(session.user.id),
  ]);

  return (
    <main className="dashboard-shell">
      <div className="dashboard-header">
        <div>
          <p className="dashboard-kicker">Settings</p>
          <h1>Publishing and prompt profiles</h1>
          <p>Configure manual publishing readiness and niche-specific prompt variants for future runs.</p>
        </div>
        <Link className="secondary-button" href="/dashboard">Dashboard</Link>
      </div>

      <section className="settings-grid">
        <div className="settings-panel">
          <p className="dashboard-kicker">Accounts</p>
          <h2>Publishing destinations</h2>
          <div className="settings-list">
            {accounts.map((account) => (
              <article key={account.key}>
                <div>
                  <strong>{account.label}</strong>
                  <span>{account.status}</span>
                </div>
                <form action={markManualAccountReadyAction}>
                  <input name="platform" type="hidden" value={account.key} />
                  <input name="externalAccountId" placeholder="Handle or account ID" />
                  <button type="submit">Mark manual-ready</button>
                </form>
              </article>
            ))}
          </div>
        </div>

        <div className="settings-panel">
          <p className="dashboard-kicker">Profiles</p>
          <h2>Niche prompts</h2>
          <form action={createPromptProfileAction} className="settings-form">
            <input name="name" placeholder="Profile name" required />
            <input name="niche" placeholder="podcasters, coaches, founders..." required />
            <textarea name="instructions" placeholder="Selection and caption guidance" required rows={5} />
            <button type="submit">Create profile</button>
          </form>

          <div className="settings-list">
            {profiles.map((profile) => (
              <article key={profile.id}>
                <div>
                  <strong>{profile.name}</strong>
                  <span>{profile.niche}</span>
                </div>
                <p>{profile.instructions}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
