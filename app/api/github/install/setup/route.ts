import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const installationId = searchParams.get("installation_id");
  const state = searchParams.get("state") || "";

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin || "http://localhost:3000";

  if (!installationId) {
    return NextResponse.redirect(`${siteUrl}/?error=missing_installation_id`);
  }

  // Redirect directly to dashboard with installation details to complete sync in Convex
  const redirectUrl = `${siteUrl}/?installed=true&installation_id=${installationId}&state=${encodeURIComponent(
    state
  )}`;

  return NextResponse.redirect(redirectUrl);
}
