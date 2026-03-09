import { NextResponse } from "next/server";

// Public registration is disabled - this endpoint is no longer needed
export async function GET() {
  return NextResponse.json({ branches: [] });
}
