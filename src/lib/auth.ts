import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
const TOKEN_NAME = "expense-tracker-token";

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  branchId?: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Build the expense where clause based on user role, without extra DB queries.
 * EMPLOYEE: only their expenses. MANAGER: their branch. ADMIN: all.
 */
export function buildExpenseWhere(session: JWTPayload): Record<string, unknown> {
  if (session.role === "EMPLOYEE") {
    return { userId: session.userId };
  }
  if (session.role === "MANAGER" && session.branchId) {
    return { user: { branchId: session.branchId } };
  }
  return {};
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      avatar: true,
      department: true,
      isActive: true,
      branchId: true,
      createdAt: true,
      branch: { select: { id: true, name: true, code: true } },
    },
  });

  return user;
}
