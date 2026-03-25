import { NextRequest, NextResponse } from "next/server";
import {
  exchangeGoogleCode,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    // User denied consent or something went wrong — redirect to home
    return NextResponse.redirect(origin);
  }

  try {
    const redirectUri = `${origin}/api/auth/callback`;
    const user = await exchangeGoogleCode(code, redirectUri);
    const token = await createSessionToken(user);
    await setSessionCookie(token);
    return NextResponse.redirect(origin);
  } catch (err) {
    console.error("Auth callback error:", err);
    return NextResponse.redirect(origin);
  }
}
