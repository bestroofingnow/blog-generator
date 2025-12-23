// pages/api/health/db-tables.ts
// Simple endpoint to check if database tables exist
// Protected: requires authentication to prevent schema enumeration
import type { NextApiRequest, NextApiResponse } from "next";
import { neon } from "@neondatabase/serverless";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Require authentication to prevent database schema enumeration
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);

    // Check which tables exist
    const result = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    const tableNames = result.map((r) => r.table_name);

    // Check specifically for knowledge base tables
    const hasKnowledgeBase = tableNames.includes("knowledge_base");
    const hasKnowledgeBaseHistory = tableNames.includes("knowledge_base_history");

    return res.status(200).json({
      success: true,
      tables: tableNames,
      knowledgeBase: {
        knowledge_base: hasKnowledgeBase ? "EXISTS" : "MISSING",
        knowledge_base_history: hasKnowledgeBaseHistory ? "EXISTS" : "MISSING",
      },
      message:
        hasKnowledgeBase && hasKnowledgeBaseHistory
          ? "Knowledge Base tables are ready!"
          : "Some Knowledge Base tables are missing. Run the migration.",
    });
  } catch (error) {
    console.error("DB health check error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Database connection failed",
    });
  }
}
