import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const state =
    request.nextUrl.searchParams.get("state") ||
    crypto.randomUUID().replace(/-/g, "");
  const appSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG || "publicadev";
  const githubInstallUrl = `https://github.com/apps/${appSlug}/installations/new?state=${encodeURIComponent(state)}`;
  return NextResponse.redirect(githubInstallUrl);
}
