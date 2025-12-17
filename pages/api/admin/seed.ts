// pages/api/admin/seed.ts
// One-time seed endpoint to create admin account
// DELETE THIS FILE AFTER USE for security

import { NextApiRequest, NextApiResponse } from "next";
import { db, users, eq } from "../../../lib/db";
import bcrypt from "bcryptjs";

// Security: Only allow with secret key
const SEED_SECRET = process.env.ADMIN_SEED_SECRET || "SEED_ADMIN_2024";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check secret key
  const { secret } = req.body;
  if (secret !== SEED_SECRET) {
    return res.status(403).json({ error: "Invalid secret" });
  }

  try {
    const adminEmail = "james@bestroofingnow.com";
    const adminName = "JTBRN";
    const adminPassword = "AdminPass2024!"; // Change this after first login!

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(200).json({
        message: "Admin user already exists",
        email: adminEmail
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Create admin user
    const newUser = await db
      .insert(users)
      .values({
        email: adminEmail,
        password: hashedPassword,
        name: adminName,
      })
      .returning();

    return res.status(201).json({
      message: "Admin account created successfully!",
      user: {
        id: newUser[0].id,
        email: newUser[0].email,
        name: newUser[0].name,
      },
      note: "Default password is: AdminPass2024! - CHANGE IT IMMEDIATELY after login",
    });
  } catch (error) {
    console.error("Seed error:", error);
    return res.status(500).json({ error: "Failed to create admin account" });
  }
}
