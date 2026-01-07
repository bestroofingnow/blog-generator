// pages/settings/team.tsx
// Team management page for inviting and managing team members

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  role: string;
  memberRole: string | null;
  status: string;
  joinedAt: string | null;
  isOwner: boolean;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  sentAt: string | null;
  expiresAt: string;
}

interface TeamLimits {
  current: number;
  max: number;
  isUnlimited: boolean;
}

export default function TeamPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [limits, setLimits] = useState<TeamLimits | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  // Action states
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchTeamData = useCallback(async () => {
    try {
      const res = await fetch("/api/team/members");
      const data = await res.json();
      if (data.success) {
        setMembers(data.data.members);
        setPendingInvites(data.data.pendingInvites);
        setLimits(data.data.limits);
        // Check if current user is owner
        const currentUser = data.data.members.find(
          (m: TeamMember) => m.id === session?.user?.id
        );
        setIsOwner(currentUser?.isOwner || false);
      }
    } catch (error) {
      console.error("Failed to fetch team data:", error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchTeamData();
    }
  }, [status, router, fetchTeamData]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");
    setInviting(true);

    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();

      if (data.success) {
        setInviteSuccess(`Invitation sent to ${inviteEmail}`);
        setInviteEmail("");
        fetchTeamData(); // Refresh the list
      } else {
        setInviteError(data.error || "Failed to send invitation");
      }
    } catch (error) {
      console.error("Invite error:", error);
      setInviteError("Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this team member?")) return;

    setRemovingId(memberId);
    try {
      const res = await fetch("/api/team/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      const data = await res.json();

      if (data.success) {
        fetchTeamData();
      } else {
        alert(data.error || "Failed to remove member");
      }
    } catch (error) {
      console.error("Remove error:", error);
      alert("Failed to remove member");
    } finally {
      setRemovingId(null);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm("Are you sure you want to revoke this invitation?")) return;

    setRevokingId(inviteId);
    try {
      const res = await fetch("/api/team/revoke-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId }),
      });
      const data = await res.json();

      if (data.success) {
        fetchTeamData();
      } else {
        alert(data.error || "Failed to revoke invitation");
      }
    } catch (error) {
      console.error("Revoke error:", error);
      alert("Failed to revoke invitation");
    } finally {
      setRevokingId(null);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const canInvite =
    isOwner && limits && (limits.isUnlimited || limits.current < limits.max);

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Team Management | Settings</title>
      </Head>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/settings"
            className="text-indigo-600 hover:text-indigo-500 text-sm mb-2 inline-block"
          >
            &larr; Back to Settings
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600 mt-1">
            Invite team members and manage access to your organization
          </p>
        </div>

        {/* Team Limits */}
        {limits && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Team Members</p>
                <p className="text-2xl font-bold text-gray-900">
                  {limits.current}{" "}
                  {limits.isUnlimited ? (
                    <span className="text-sm font-normal text-gray-500">
                      / Unlimited
                    </span>
                  ) : (
                    <span className="text-sm font-normal text-gray-500">
                      / {limits.max}
                    </span>
                  )}
                </p>
              </div>
              {!limits.isUnlimited && limits.current >= limits.max && (
                <Link
                  href="/settings/billing"
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  Upgrade for more seats &rarr;
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Invite Form - Only for owners */}
        {isOwner && (
          <div className="mb-8 bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Invite Team Member
            </h2>

            {!canInvite && limits && !limits.isUnlimited && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">
                  You&apos;ve reached your team member limit. Upgrade your plan
                  to invite more members.
                </p>
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    disabled={!canInvite || inviting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="role"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Role
                  </label>
                  <select
                    id="role"
                    value={inviteRole}
                    onChange={(e) =>
                      setInviteRole(e.target.value as "editor" | "viewer")
                    }
                    disabled={!canInvite || inviting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  {inviteError && (
                    <p className="text-red-600 text-sm">{inviteError}</p>
                  )}
                  {inviteSuccess && (
                    <p className="text-green-600 text-sm">{inviteSuccess}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!canInvite || inviting || !inviteEmail}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inviting ? "Sending..." : "Send Invitation"}
                </button>
              </div>
            </form>

            <div className="mt-4 text-sm text-gray-500">
              <p>
                <strong>Editor:</strong> Can create and edit blog posts
              </p>
              <p>
                <strong>Viewer:</strong> Can only view blog posts
              </p>
            </div>
          </div>
        )}

        {/* Current Members */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Team Members
          </h2>

          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-indigo-600 font-medium">
                      {(member.name || member.email).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900">
                        {member.name || member.email}
                      </p>
                      {member.isOwner && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                          Owner
                        </span>
                      )}
                      {member.status !== "active" && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded capitalize">
                          {member.status}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500 capitalize">
                    {member.memberRole || "member"}
                  </span>
                  {isOwner && !member.isOwner && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={removingId === member.id}
                      className="text-sm text-red-600 hover:text-red-500 disabled:opacity-50"
                    >
                      {removingId === member.id ? "..." : "Remove"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Invitations - Only for owners */}
        {isOwner && pendingInvites.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Pending Invitations
            </h2>

            <div className="space-y-3">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50 border-yellow-200"
                >
                  <div>
                    <p className="font-medium text-gray-900">{invite.email}</p>
                    <p className="text-sm text-gray-500">
                      Role: <span className="capitalize">{invite.role}</span> |
                      Expires:{" "}
                      {new Date(invite.expiresAt).toLocaleDateString()}
                    </p>
                  </div>

                  <button
                    onClick={() => handleRevokeInvite(invite.id)}
                    disabled={revokingId === invite.id}
                    className="text-sm text-red-600 hover:text-red-500 disabled:opacity-50"
                  >
                    {revokingId === invite.id ? "..." : "Revoke"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
