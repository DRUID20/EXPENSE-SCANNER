import { NextRequest, NextResponse } from "next/server";
import { blacklistToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const isSecure = req.headers.get("x-forwarded-proto") === "https" || req.nextUrl.protocol === "https:";

  // Blacklist the current token so it can't be reused
  const token = req.cookies.get("expense-tracker-token")?.value;
  if (token) {
    await blacklistToken(token);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("expense-tracker-token", "", {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
