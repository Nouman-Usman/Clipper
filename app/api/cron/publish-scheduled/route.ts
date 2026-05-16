import { NextResponse } from "next/server";

import { processDueScheduledPosts } from "@/lib/phase3/review";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (secret) {
    const provided = new URL(request.url).searchParams.get("secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await processDueScheduledPosts();
  return NextResponse.json(result);
}
