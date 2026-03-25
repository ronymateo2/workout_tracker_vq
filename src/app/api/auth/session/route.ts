import { NextResponse } from "next/server";
import { getSessionFromCookie, createSupabaseToken } from "@/lib/auth";

export async function GET() {
  const user = await getSessionFromCookie();

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const supabaseToken = await createSupabaseToken(user);
  return NextResponse.json({ user, supabaseToken });
}
