// pages/admin/users.tsx
// Admin user management page

import React, { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import styles from "../../styles/Admin.module.css";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: "superadmin" | "admin" | "user";
  createdAt: string | null;
  image: string | null;
}

interface Toast {
  message: string;
  type: "success" | "error";
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // Check admin access (superadmin or admin can access)
  const userRole = (session?.user as { role?: string })?.role;
  const hasAdminAccess = userRole === "superadmin" || userRole === "admin";
  const isSuperAdmin = userRole === "superadmin";

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/login");
      return;
    }
    if (!hasAdminAccess) {
      router.push("/?error=admin_required");
      return;
    }
  }, [session, status, router, hasAdminAccess]);

  // Load users
  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        if (response.status === 403) {
          router.push("/?error=admin_required");
          return;
        }
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
      showToast("Failed to load users", "error");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (session?.user && hasAdminAccess) {
      loadUsers();
    }
  }, [session, loadUsers, hasAdminAccess]);

  // Show toast notification
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Update user role
  const updateRole = async (userId: string, newRole: "superadmin" | "admin" | "user") => {
    // Only superadmin can promote to superadmin
    if (newRole === "superadmin" && !isSuperAdmin) {
      showToast("Only superadmins can promote to superadmin", "error");
      return;
    }
    setActionInProgress(userId);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await response.json();
      if (data.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
        showToast(data.message || "Role updated", "success");
      } else {
        showToast(data.error || "Failed to update role", "error");
      }
    } catch (error) {
      console.error("Failed to update role:", error);
      showToast("Failed to update role", "error");
    } finally {
      setActionInProgress(null);
    }
  };

  // Delete user
  const deleteUser = async (userId: string) => {
    setActionInProgress(userId);
    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();
      if (data.success) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        showToast("User deleted", "success");
      } else {
        showToast(data.error || "Failed to delete user", "error");
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
      showToast("Failed to delete user", "error");
    } finally {
      setActionInProgress(null);
      setConfirmDelete(null);
    }
  };

  // Reset user password (superadmin only)
  const resetPassword = async (userId: string) => {
    if (!newPassword || newPassword.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }

    setActionInProgress(userId);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newPassword }),
      });
      const data = await response.json();
      if (data.success) {
        showToast(data.message || "Password reset successfully", "success");
        setResetPasswordUser(null);
        setNewPassword("");
      } else {
        showToast(data.error || "Failed to reset password", "error");
      }
    } catch (error) {
      console.error("Failed to reset password:", error);
      showToast("Failed to reset password", "error");
    } finally {
      setActionInProgress(null);
    }
  };

  // Filter users by search
  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Stats
  const superadminCount = users.filter((u) => u.role === "superadmin").length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const userCount = users.filter((u) => u.role === "user").length;

  // Get initials for avatar
  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Check if current user
  const isCurrentUser = (userId: string) => {
    return (session?.user as { id?: string })?.id === userId;
  };

  if (status === "loading" || isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>User Management | Admin</title>
      </Head>

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            <svg
              className={styles.titleIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            User Management
          </h1>
          <Link href="/" className={styles.backLink}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Users</div>
            <div className={styles.statValue}>{users.length}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Super Admins</div>
            <div className={styles.statValue}>
              {superadminCount}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Admins</div>
            <div className={styles.statValue}>
              {adminCount}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Regular Users</div>
            <div className={styles.statValue}>
              {userCount}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className={styles.tableContainer}>
          <div className={styles.tableHeader}>
            <h2 className={styles.tableTitle}>All Users</h2>
            <input
              type="text"
              placeholder="Search users..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {filteredUsers.length === 0 ? (
            <div className={styles.emptyState}>
              {searchQuery ? "No users match your search" : "No users found"}
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className={styles.userCell}>
                        {user.image ? (
                          <img
                            src={user.image}
                            alt={user.name || user.email}
                            className={styles.avatarImage}
                          />
                        ) : (
                          <div className={styles.avatar}>
                            {getInitials(user.name, user.email)}
                          </div>
                        )}
                        <div className={styles.userInfo}>
                          <span className={styles.userName}>
                            {user.name || "No name"}
                            {isCurrentUser(user.id) && (
                              <span className={styles.currentUser}>(you)</span>
                            )}
                          </span>
                          <span className={styles.userEmail}>{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`${styles.roleBadge} ${
                          user.role === "superadmin"
                            ? styles.roleSuperAdmin
                            : user.role === "admin"
                            ? styles.roleAdmin
                            : styles.roleUser
                        }`}
                      >
                        {user.role === "superadmin" ? "Super Admin" : user.role}
                      </span>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <div className={styles.actions}>
                        {user.role === "user" && (
                          <button
                            className={`${styles.actionButton} ${styles.promoteBtn}`}
                            onClick={() => updateRole(user.id, "admin")}
                            disabled={actionInProgress === user.id}
                          >
                            Make Admin
                          </button>
                        )}
                        {user.role === "admin" && (
                          <>
                            <button
                              className={`${styles.actionButton} ${styles.demoteBtn}`}
                              onClick={() => updateRole(user.id, "user")}
                              disabled={
                                actionInProgress === user.id ||
                                isCurrentUser(user.id)
                              }
                              title={
                                isCurrentUser(user.id)
                                  ? "You cannot demote yourself"
                                  : ""
                              }
                            >
                              Remove Admin
                            </button>
                            {isSuperAdmin && (
                              <button
                                className={`${styles.actionButton} ${styles.promoteBtn}`}
                                onClick={() => updateRole(user.id, "superadmin")}
                                disabled={actionInProgress === user.id}
                              >
                                Make Super Admin
                              </button>
                            )}
                          </>
                        )}
                        {user.role === "superadmin" && isSuperAdmin && !isCurrentUser(user.id) && (
                          <button
                            className={`${styles.actionButton} ${styles.demoteBtn}`}
                            onClick={() => updateRole(user.id, "admin")}
                            disabled={actionInProgress === user.id}
                          >
                            Demote to Admin
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button
                            className={`${styles.actionButton} ${styles.resetBtn}`}
                            onClick={() => setResetPasswordUser(user)}
                            disabled={actionInProgress === user.id}
                            title="Reset user password"
                          >
                            Reset Password
                          </button>
                        )}
                        <button
                          className={`${styles.actionButton} ${styles.deleteBtn}`}
                          onClick={() => setConfirmDelete(user)}
                          disabled={
                            actionInProgress === user.id ||
                            isCurrentUser(user.id) ||
                            (user.role === "superadmin" && !isSuperAdmin)
                          }
                          title={
                            isCurrentUser(user.id)
                              ? "You cannot delete yourself"
                              : user.role === "superadmin" && !isSuperAdmin
                              ? "Only superadmins can delete superadmins"
                              : ""
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`${styles.toast} ${
            toast.type === "success" ? styles.toastSuccess : styles.toastError
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <div className={styles.confirmDialog}>
          <div className={styles.confirmContent}>
            <h3 className={styles.confirmTitle}>Delete User</h3>
            <p className={styles.confirmText}>
              Are you sure you want to delete{" "}
              <strong>{confirmDelete.name || confirmDelete.email}</strong>? This
              action cannot be undone and will remove all their data.
            </p>
            <div className={styles.confirmActions}>
              <button
                className={styles.confirmCancel}
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button
                className={styles.confirmDelete}
                onClick={() => deleteUser(confirmDelete.id)}
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Dialog */}
      {resetPasswordUser && (
        <div className={styles.confirmDialog}>
          <div className={styles.confirmContent}>
            <h3 className={styles.confirmTitle}>Reset Password</h3>
            <p className={styles.confirmText}>
              Enter a new password for{" "}
              <strong>{resetPasswordUser.name || resetPasswordUser.email}</strong>
            </p>
            <div className={styles.formGroup}>
              <input
                type="password"
                placeholder="New password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={styles.passwordInput}
                autoFocus
              />
            </div>
            <div className={styles.confirmActions}>
              <button
                className={styles.confirmCancel}
                onClick={() => {
                  setResetPasswordUser(null);
                  setNewPassword("");
                }}
              >
                Cancel
              </button>
              <button
                className={styles.confirmReset}
                onClick={() => resetPassword(resetPasswordUser.id)}
                disabled={!newPassword || newPassword.length < 6 || actionInProgress === resetPasswordUser.id}
              >
                {actionInProgress === resetPasswordUser.id ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
