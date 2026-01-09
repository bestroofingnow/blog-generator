// lib/super-admin.ts
// Super admin configuration and utilities

// List of super admin emails with full, unlimited access
// These users bypass subscription checks and have unlimited credits
export const SUPER_ADMIN_EMAILS: string[] = [
  "james@bestroofingnow.com",
];

// Check if an email is a super admin
export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}
