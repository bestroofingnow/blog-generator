// pages/api/auth/reset-password.ts
// API for password reset using security questions

import type { NextApiRequest, NextApiResponse } from "next";
import { db, users, securityQuestions, passwordResetAttempts, eq } from "../../../lib/db";
import bcrypt from "bcryptjs";

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

interface ResetPasswordResponse {
  success: boolean;
  message?: string;
  error?: string;
  questions?: string[];
  step?: "questions" | "verify" | "complete";
  attemptsRemaining?: number;
  lockedUntil?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResetPasswordResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  const { action, email, answer1, answer2, newPassword } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: "Email is required",
    });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Check for rate limiting
    const attempts = await db
      .select()
      .from(passwordResetAttempts)
      .where(eq(passwordResetAttempts.email, normalizedEmail))
      .limit(1);

    const attemptRecord = attempts[0];

    if (attemptRecord?.lockedUntil) {
      const lockoutEnd = new Date(attemptRecord.lockedUntil);
      if (lockoutEnd > new Date()) {
        return res.status(429).json({
          success: false,
          error: "Too many failed attempts. Please try again later.",
          lockedUntil: lockoutEnd.toISOString(),
        });
      }
      // Lockout expired, reset attempts
      await db
        .update(passwordResetAttempts)
        .set({ attemptCount: 0, lockedUntil: null })
        .where(eq(passwordResetAttempts.email, normalizedEmail));
    }

    // GET_QUESTIONS - Get security questions for an email
    if (action === "get_questions") {
      // Find user by email
      const userResult = await db
        .select({ id: users.id, password: users.password })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (userResult.length === 0) {
        // Don't reveal if email exists
        return res.status(200).json({
          success: false,
          error: "If this email exists and has security questions set up, they will be shown.",
        });
      }

      const user = userResult[0];

      // Check if user has password (credentials user, not OAuth)
      if (!user.password) {
        return res.status(200).json({
          success: false,
          error: "This account uses Google sign-in. Password reset is not available.",
        });
      }

      // Get security questions
      const questionsResult = await db
        .select({
          question1: securityQuestions.question1,
          question2: securityQuestions.question2,
        })
        .from(securityQuestions)
        .where(eq(securityQuestions.userId, user.id))
        .limit(1);

      if (questionsResult.length === 0) {
        return res.status(200).json({
          success: false,
          error: "No security questions set up for this account. Please contact support.",
        });
      }

      return res.status(200).json({
        success: true,
        step: "verify",
        questions: [questionsResult[0].question1, questionsResult[0].question2],
      });
    }

    // VERIFY_AND_RESET - Verify answers and reset password
    if (action === "verify_and_reset") {
      if (!answer1 || !answer2 || !newPassword) {
        return res.status(400).json({
          success: false,
          error: "All fields are required",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: "Password must be at least 6 characters",
        });
      }

      // Find user
      const userResult = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (userResult.length === 0) {
        return res.status(400).json({
          success: false,
          error: "User not found",
        });
      }

      const userId = userResult[0].id;

      // Get security questions with hashes
      const questionsResult = await db
        .select()
        .from(securityQuestions)
        .where(eq(securityQuestions.userId, userId))
        .limit(1);

      if (questionsResult.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Security questions not found",
        });
      }

      const sq = questionsResult[0];

      // Verify answers (case-insensitive)
      const answer1Valid = await bcrypt.compare(
        answer1.trim().toLowerCase(),
        sq.answer1Hash
      );
      const answer2Valid = await bcrypt.compare(
        answer2.trim().toLowerCase(),
        sq.answer2Hash
      );

      if (!answer1Valid || !answer2Valid) {
        // Track failed attempt
        const currentAttempts = (attemptRecord?.attemptCount || 0) + 1;

        if (attemptRecord) {
          const updateData: { attemptCount: number; lastAttempt: Date; lockedUntil?: Date } = {
            attemptCount: currentAttempts,
            lastAttempt: new Date(),
          };

          if (currentAttempts >= MAX_ATTEMPTS) {
            updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
          }

          await db
            .update(passwordResetAttempts)
            .set(updateData)
            .where(eq(passwordResetAttempts.email, normalizedEmail));
        } else {
          await db.insert(passwordResetAttempts).values({
            email: normalizedEmail,
            attemptCount: 1,
            lastAttempt: new Date(),
          });
        }

        const remaining = MAX_ATTEMPTS - currentAttempts;

        if (remaining <= 0) {
          return res.status(429).json({
            success: false,
            error: "Too many failed attempts. Account locked for 30 minutes.",
            attemptsRemaining: 0,
          });
        }

        return res.status(400).json({
          success: false,
          error: "One or more answers are incorrect",
          attemptsRemaining: remaining,
        });
      }

      // Answers correct - reset password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId));

      // Clear reset attempts
      if (attemptRecord) {
        await db
          .delete(passwordResetAttempts)
          .where(eq(passwordResetAttempts.email, normalizedEmail));
      }

      return res.status(200).json({
        success: true,
        step: "complete",
        message: "Password reset successfully! You can now sign in.",
      });
    }

    return res.status(400).json({
      success: false,
      error: "Invalid action",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred. Please try again.",
    });
  }
}
