import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 reset requests per 15 minutes per IP
    const ip = getClientIp(req);
    const limit = rateLimit(`forgot-password:${ip}`, 5, 15 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${limit.resetInSeconds} seconds.` },
        { status: 429 }
      );
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ message: "If an account with that email exists, a reset token has been generated." });
    }

    // Generate a secure reset token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Invalidate any existing tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Create new reset token
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Build the full reset URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.headers.get("origin") || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // Send the reset email
    const emailResult = await sendPasswordResetEmail(user.email, resetUrl, user.firstName);

    if (!emailResult.success) {
      console.warn("Email not sent:", emailResult.error);
      return NextResponse.json({
        message: "If an account with that email exists, a reset token has been generated.",
        emailSent: false,
        warning: "Email delivery failed. Please contact your administrator.",
      });
    }

    return NextResponse.json({
      message: "If an account with that email exists, a password reset link has been sent.",
      emailSent: true,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
