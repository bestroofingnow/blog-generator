// pages/api/admin/audit-logs.ts
// Super Admin API for viewing audit logs

import type { NextApiRequest, NextApiResponse } from "next";
import { db, auditLogs, desc } from "../../../lib/db";
import { requireSuperAdmin } from "../../../lib/admin-guard";

interface AuditLogEntry {
  id: string;
  actorEmail: string | null;
  actorRole: string | null;
  targetType: string;
  targetEmail: string | null;
  action: string;
  details: unknown;
  ipAddress: string | null;
  createdAt: Date | null;
}

interface AuditLogsResponse {
  success: boolean;
  logs?: AuditLogEntry[];
  total?: number;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AuditLogsResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Superadmin check
  const { authorized } = await requireSuperAdmin(req, res);
  if (!authorized) return;

  try {
    const { action, targetType, limit = "100", offset = "0" } = req.query;

    let query = db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    const logs = await query;

    // Apply filters in memory (for simplicity - could optimize with SQL)
    let filtered = logs;

    if (action && typeof action === "string") {
      filtered = filtered.filter((log) => log.action === action);
    }

    if (targetType && typeof targetType === "string") {
      filtered = filtered.filter((log) => log.targetType === targetType);
    }

    return res.status(200).json({
      success: true,
      logs: filtered.map((log) => ({
        id: log.id,
        actorEmail: log.actorEmail,
        actorRole: log.actorRole,
        targetType: log.targetType,
        targetEmail: log.targetEmail,
        action: log.action,
        details: log.details,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt,
      })),
      total: filtered.length,
    });
  } catch (error) {
    console.error("[Admin Audit Logs] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch audit logs",
    });
  }
}
