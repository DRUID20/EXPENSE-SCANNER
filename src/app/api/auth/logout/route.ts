import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const isSecure = req.headers.get("x-forwarded-proto") === "https" || req.nextUrl.protocol === "https:";
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
