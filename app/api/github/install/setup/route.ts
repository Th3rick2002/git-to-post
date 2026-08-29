import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const installationId = searchParams.get("installation_id");
  const state = searchParams.get("state") || "";

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const clientId = process.env.GITHUB_APP_CLIENT_ID || process.env.GITHUB_CLIENT_ID;

  if (clientId) {
    // Initiate OAuth flow with explicit redirect to callback
    const redirectUri = `${siteUrl}/api/github/install/callback?installation_id=${installationId}&state=${state}`;
    const oauthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${encodeURIComponent(state)}`;
    return NextResponse.redirect(oauthUrl);
  }

  // Fallback direct redirect to callback
  const callbackUrl = `${siteUrl}/api/github/install/callback?installation_id=${installationId}&state=${state}`;
  return NextResponse.redirect(callbackUrl);
}
