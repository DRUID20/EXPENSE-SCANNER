import { prisma } from "@/lib/db";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "APPROVE"
  | "REJECT"
  | "LOGIN"
  | "LOGOUT"
  | "ROLE_CHANGE"
  | "DEACTIVATE"
  | "ACTIVATE"
  | "ASSIGN_DEPARTMENT"
  | "POLICY_CREATE"
  | "POLICY_UPDATE"
  | "POLICY_DELETE"
  | "DEPT_CREATE"
  | "DEPT_UPDATE"
  | "DEPT_DELETE"
  | "BULK_APPROVE"
  | "BULK_REJECT"
  | "BULK_DELETE"
  | "EXPORT";

export type EntityType = "EXPENSE" | "USER" | "DEPARTMENT" | "POLICY";

export async function logAudit({
  action,
  entityType,
  entityId,
  details,
  userId,
  ipAddress,
}: {
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  details?: Record<string, unknown>;
  userId: string;
  ipAddress?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId: entityId || null,
        details: details ? JSON.stringify(details) : null,
        userId,
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    console.error("Audit log error:", error);
    // Don't throw - audit logging should never break the main flow
  }
}
