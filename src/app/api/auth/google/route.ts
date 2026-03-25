import { NextRequest, NextResponse } from "next/server";
import { buildGoogleAuthUrl } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/callback`;

  // Use a random state to prevent CSRF
  const state = crypto.randomUUID();

  const url = buildGoogleAuthUrl(redirectUri, state);
  return NextResponse.redirect(url);
}
