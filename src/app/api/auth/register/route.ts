import { NextResponse } from "next/server";

// Public registration is disabled. Only admins can create accounts via /api/users.
export async function POST() {
  return NextResponse.json(
    { error: "Registration is disabled. Please contact your administrator to get an account." },
    { status: 403 }
  );
}
