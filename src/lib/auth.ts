import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// ─── AppUser: provider-agnostic user type ──────────────────────────────────
export interface AppUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

// ─── Config ────────────────────────────────────────────────────────────────
const SESSION_COOKIE = "rurana-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSecret() {
  const raw = process.env.AUTH_SECRET;
  if (!raw) throw new Error("AUTH_SECRET env var is required");
  return new TextEncoder().encode(raw);
}

function getSupabaseJwtSecret() {
  const raw = process.env.SUPABASE_JWT_SECRET;
  if (!raw) throw new Error("SUPABASE_JWT_SECRET env var is required");
  return new TextEncoder().encode(raw);
}

export function getGoogleClientId() {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) throw new Error("GOOGLE_CLIENT_ID env var is required");
  return id;
}

export function getGoogleClientSecret() {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error("GOOGLE_CLIENT_SECRET env var is required");
  return secret;
}

// ─── JWT helpers ───────────────────────────────────────────────────────────
export async function createSessionToken(user: AppUser): Promise<string> {
  return new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<AppUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return (payload as { user: AppUser }).user;
  } catch {
    return null;
  }
}

// ─── Cookie helpers ────────────────────────────────────────────────────────
export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function getSessionFromCookie(): Promise<AppUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

// ─── Supabase-compatible JWT ───────────────────────────────────────────────
export async function googleSubToUUID(sub: string): Promise<string> {
  const data = new TextEncoder().encode(`google:${sub}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(buf);
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  const hex = Array.from(bytes.slice(0, 16))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export async function createSupabaseToken(user: AppUser): Promise<string> {
  return new SignJWT({
    sub: user.id,
    role: "authenticated",
    email: user.email,
    iss: "supabase",
    aud: "authenticated",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSupabaseJwtSecret());
}

// ─── Google OAuth URL builder ──────────────────────────────────────────────
export function buildGoogleAuthUrl(redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id: getGoogleClientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    state,
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// ─── Google token exchange ─────────────────────────────────────────────────
interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

export async function exchangeGoogleCode(
  code: string,
  redirectUri: string,
): Promise<AppUser> {
  // Exchange authorization code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getGoogleClientId(),
      client_secret: getGoogleClientSecret(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    throw new Error(`Google token exchange failed: ${body}`);
  }

  const tokens: GoogleTokenResponse = await tokenRes.json();

  // Fetch user info
  const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userRes.ok) {
    throw new Error("Failed to fetch Google user info");
  }

  const info: GoogleUserInfo = await userRes.json();

  return {
    id: await googleSubToUUID(info.sub),
    email: info.email,
    fullName: info.name ?? null,
    avatarUrl: info.picture ?? null,
  };
}
