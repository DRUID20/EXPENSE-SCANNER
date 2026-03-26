import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./db";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return secret;
}
const JWT_SECRET = getJwtSecret();
const TOKEN_NAME = "expense-tracker-token";

// In-memory blacklist cache (cleared on server restart, backed by DB)
const blacklistCache = new Set<string>();

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

export function generateToken(payload: JWTPayload, rememberMe = true): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: rememberMe ? "30d" : "1d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/** Blacklist a token so it can no longer be used */
export async function blacklistToken(token: string): Promise<void> {
  const payload = verifyToken(token);
  if (!payload) return;

  // Get expiration from JWT
  const decoded = jwt.decode(token) as { exp?: number } | null;
  const expiresAt = decoded?.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Add to in-memory cache
  blacklistCache.add(token);

  // Persist to DB
  try {
    await prisma.tokenBlacklist.create({
      data: { token, expiresAt },
    });
  } catch {
    // Ignore duplicate token errors
  }
}

/** Check if a token has been blacklisted */
async function isTokenBlacklisted(token: string): Promise<boolean> {
  // Fast path: check in-memory cache
  if (blacklistCache.has(token)) return true;

  // Check DB
  const entry = await prisma.tokenBlacklist.findUnique({
    where: { token },
  });

  if (entry) {
    blacklistCache.add(token);
    return true;
  }

  return false;
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  if (!token) return null;

  // Check blacklist before verifying
  if (await isTokenBlacklisted(token)) return null;

  return verifyToken(token);
}

/**
 * Build the expense where clause based on user role, without extra DB queries.
 * EMPLOYEE: only their expenses. ADMIN: all.
 */
export function buildExpenseWhere(session: JWTPayload): Record<string, unknown> {
  if (session.role === "ADMIN") {
    return {};
  }
  return { userId: session.userId };
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
      isActive: true,
      branchId: true,
      createdAt: true,
      branch: { select: { id: true, name: true, code: true } },
    },
  });

  return user;
}
