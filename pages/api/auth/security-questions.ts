// pages/api/auth/security-questions.ts
// API for managing security questions

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./[...nextauth]";
import { db, users, securityQuestions, eq } from "../../../lib/db";
import bcrypt from "bcryptjs";

// Predefined security questions users can choose from
export const SECURITY_QUESTION_OPTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your elementary school?",
  "What was your childhood nickname?",
  "What is the name of your favorite childhood friend?",
  "What street did you grow up on?",
  "What was the make of your first car?",
  "What is your oldest sibling's middle name?",
  "In what city did your parents meet?",
];

interface SecurityQuestionsResponse {
  success: boolean;
  message?: string;
  error?: string;
  hasSecurityQuestions?: boolean;
  questions?: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SecurityQuestionsResponse>
) {
  // GET - Check if user has security questions set up
  if (req.method === "GET") {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated",
      });
    }

    try {
      const userId = (session.user as { id: string }).id;

      const result = await db
        .select({
          question1: securityQuestions.question1,
          question2: securityQuestions.question2,
        })
        .from(securityQuestions)
        .where(eq(securityQuestions.userId, userId))
        .limit(1);

      if (result.length === 0) {
        return res.status(200).json({
          success: true,
          hasSecurityQuestions: false,
        });
      }

      return res.status(200).json({
        success: true,
        hasSecurityQuestions: true,
        questions: [result[0].question1, result[0].question2],
      });
    } catch (error) {
      console.error("Error checking security questions:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to check security questions",
      });
    }
  }

  // POST - Save security questions
  if (req.method === "POST") {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated",
      });
    }

    const { question1, answer1, question2, answer2 } = req.body;

    // Validate inputs
    if (!question1 || !answer1 || !question2 || !answer2) {
      return res.status(400).json({
        success: false,
        error: "All questions and answers are required",
      });
    }

    if (question1 === question2) {
      return res.status(400).json({
        success: false,
        error: "Please select two different questions",
      });
    }

    if (answer1.trim().length < 2 || answer2.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: "Answers must be at least 2 characters",
      });
    }

    try {
      const userId = (session.user as { id: string }).id;

      // Hash the answers (case-insensitive by lowercasing)
      const answer1Hash = await bcrypt.hash(answer1.trim().toLowerCase(), 10);
      const answer2Hash = await bcrypt.hash(answer2.trim().toLowerCase(), 10);

      // Check if user already has security questions
      const existing = await db
        .select()
        .from(securityQuestions)
        .where(eq(securityQuestions.userId, userId))
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        await db
          .update(securityQuestions)
          .set({
            question1,
            answer1Hash,
            question2,
            answer2Hash,
            updatedAt: new Date(),
          })
          .where(eq(securityQuestions.userId, userId));
      } else {
        // Insert new
        await db.insert(securityQuestions).values({
          userId,
          question1,
          answer1Hash,
          question2,
          answer2Hash,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Security questions saved successfully",
      });
    } catch (error) {
      console.error("Error saving security questions:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to save security questions",
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: "Method not allowed",
  });
}
