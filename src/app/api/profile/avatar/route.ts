import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("avatar") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, and WebP images are allowed" }, { status: 400 });
    }

    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const filename = `${session.userId}-${randomUUID().slice(0, 8)}.${ext}`;

    const avatarDir = path.join(process.cwd(), "public", "avatars");
    await mkdir(avatarDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(avatarDir, filename), buffer);

    const avatarUrl = `/avatars/${filename}`;

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: { avatar: avatarUrl },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        isActive: true,
        branchId: true,
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({ user: updated, avatarUrl });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { avatar: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Avatar delete error:", error);
    return NextResponse.json({ error: "Failed to remove avatar" }, { status: 500 });
  }
}
