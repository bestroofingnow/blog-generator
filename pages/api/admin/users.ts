// pages/api/admin/users.ts
// Admin API for user management

import type { NextApiRequest, NextApiResponse } from "next";
import { db, users, eq, desc } from "../../../lib/db";
import { requireAdmin } from "../../../lib/admin-guard";
import type { UserRole } from "../../../lib/db";

interface UserData {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  createdAt: Date | null;
  image: string | null;
}

interface UsersResponse {
  success: boolean;
  users?: UserData[];
  user?: UserData;
  error?: string;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UsersResponse>
) {
  // Admin check
  const { authorized, session } = await requireAdmin(req, res);
  if (!authorized || !session) return;

  const currentUserId = session.user.id;

  switch (req.method) {
    case "GET":
      return handleGetUsers(res);
    case "PATCH":
      return handleUpdateUser(req, res, currentUserId);
    case "DELETE":
      return handleDeleteUser(req, res, currentUserId);
    default:
      return res.status(405).json({ success: false, error: "Method not allowed" });
  }
}

// List all users
async function handleGetUsers(res: NextApiResponse<UsersResponse>) {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        image: users.image,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return res.status(200).json({
      success: true,
      users: allUsers.map((u) => ({
        ...u,
        role: (u.role as UserRole) || "user",
      })),
    });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch users",
    });
  }
}

// Update user (role change)
async function handleUpdateUser(
  req: NextApiRequest,
  res: NextApiResponse<UsersResponse>,
  currentUserId: string
) {
  const { userId, role } = req.body;

  if (!userId || !role) {
    return res.status(400).json({
      success: false,
      error: "userId and role are required",
    });
  }

  // Validate role
  if (role !== "admin" && role !== "user") {
    return res.status(400).json({
      success: false,
      error: "Invalid role. Must be 'admin' or 'user'",
    });
  }

  // Prevent demoting yourself
  if (userId === currentUserId && role === "user") {
    return res.status(400).json({
      success: false,
      error: "You cannot demote yourself from admin",
    });
  }

  try {
    const updated = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        image: users.image,
      });

    if (updated.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        ...updated[0],
        role: (updated[0].role as UserRole) || "user",
      },
      message: `User role updated to ${role}`,
    });
  } catch (error) {
    console.error("Failed to update user:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update user",
    });
  }
}

// Delete user
async function handleDeleteUser(
  req: NextApiRequest,
  res: NextApiResponse<UsersResponse>,
  currentUserId: string
) {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: "userId is required",
    });
  }

  // Prevent deleting yourself
  if (userId === currentUserId) {
    return res.status(400).json({
      success: false,
      error: "You cannot delete your own account",
    });
  }

  try {
    const deleted = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    if (deleted.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete user",
    });
  }
}
