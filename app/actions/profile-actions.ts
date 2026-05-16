"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isPlatformKey } from "@/lib/platforms";
import { upsertManualSocialAccount } from "@/lib/phase4/accounts";
import { createPromptProfile } from "@/lib/phase4/profiles";

function required(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) {
    throw new Error(`${key} is required.`);
  }
  return value;
}

export async function createPromptProfileAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  await createPromptProfile({
    userId: session.user.id,
    name: required(formData, "name"),
    niche: required(formData, "niche"),
    instructions: required(formData, "instructions"),
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}

export async function markManualAccountReadyAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const platform = required(formData, "platform");
  if (!isPlatformKey(platform)) {
    throw new Error("Unsupported platform.");
  }

  await upsertManualSocialAccount({
    userId: session.user.id,
    platform,
    externalAccountId: String(formData.get("externalAccountId") ?? ""),
  });

  revalidatePath("/dashboard/settings");
}
