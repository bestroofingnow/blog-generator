// pages/login.tsx
// Login, signup, and password reset page

import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../lib/auth-context";
import styles from "../styles/Login.module.css";

type AuthMode = "login" | "signup" | "forgot";
type ResetStep = "email" | "questions" | "complete";

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading, signInWithCredentials, signUp, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password reset states
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [securityQuestions, setSecurityQuestions] = useState<string[]>([]);
  const [answer1, setAnswer1] = useState("");
  const [answer2, setAnswer2] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  // Redirect if already logged in - go directly to app
  useEffect(() => {
    if (user && !isLoading) {
      router.push("/app");
    }
  }, [user, isLoading, router]);

  const resetForgotState = () => {
    setResetStep("email");
    setSecurityQuestions([]);
    setAnswer1("");
    setAnswer2("");
    setNewPassword("");
    setConfirmNewPassword("");
    setAttemptsRemaining(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        const { error } = await signInWithCredentials(email, password);
        if (error) {
          setError(error.message);
        } else {
          router.push("/app");
        }
      } else if (mode === "signup") {
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setIsSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters");
          setIsSubmitting(false);
          return;
        }
        const { error } = await signUp(email, password, name);
        if (error) {
          setError(error.message);
        } else {
          router.push("/app");
        }
      } else if (mode === "forgot") {
        await handleForgotPassword();
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (resetStep === "email") {
      // Step 1: Get security questions
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_questions", email }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to get security questions");
        return;
      }

      if (data.questions) {
        setSecurityQuestions(data.questions);
        setResetStep("questions");
      }
    } else if (resetStep === "questions") {
      // Step 2: Verify answers and reset password
      if (!answer1.trim() || !answer2.trim()) {
        setError("Please answer both security questions");
        return;
      }

      if (!newPassword || !confirmNewPassword) {
        setError("Please enter your new password");
        return;
      }

      if (newPassword !== confirmNewPassword) {
        setError("Passwords do not match");
        return;
      }

      if (newPassword.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }

      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_and_reset",
          email,
          answer1,
          answer2,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to reset password");
        if (data.attemptsRemaining !== undefined) {
          setAttemptsRemaining(data.attemptsRemaining);
        }
        return;
      }

      setResetStep("complete");
      setMessage(data.message || "Password reset successfully!");
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    await signInWithGoogle();
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>AI</span>
          <span className={styles.logoText}>Blog Generator</span>
        </div>

        <h1 className={styles.title}>
          {mode === "login" && "Welcome Back"}
          {mode === "signup" && "Create Account"}
          {mode === "forgot" && resetStep === "email" && "Reset Password"}
          {mode === "forgot" && resetStep === "questions" && "Security Questions"}
          {mode === "forgot" && resetStep === "complete" && "Password Reset"}
        </h1>

        <p className={styles.subtitle}>
          {mode === "login" && "Sign in to access your blogs and settings"}
          {mode === "signup" && "Start creating SEO-optimized content"}
          {mode === "forgot" && resetStep === "email" && "Enter your email to reset your password"}
          {mode === "forgot" && resetStep === "questions" && "Answer your security questions"}
          {mode === "forgot" && resetStep === "complete" && "Your password has been reset"}
        </p>

        {error && <div className={styles.error}>{error}</div>}
        {message && <div className={styles.success}>{message}</div>}
        {attemptsRemaining !== null && attemptsRemaining > 0 && (
          <div className={styles.warning}>
            {attemptsRemaining} attempt{attemptsRemaining !== 1 ? "s" : ""} remaining
          </div>
        )}

        {/* Password Reset Complete - Show success */}
        {mode === "forgot" && resetStep === "complete" ? (
          <div className={styles.resetComplete}>
            <div className={styles.successIcon}>✓</div>
            <p>You can now sign in with your new password.</p>
            <button
              type="button"
              className={styles.submitButton}
              onClick={() => {
                setMode("login");
                resetForgotState();
                setEmail("");
                setPassword("");
                setError("");
                setMessage("");
              }}
            >
              Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            {mode === "signup" && (
              <div className={styles.inputGroup}>
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>
            )}

            {/* Email input - shown for login, signup, and forgot (email step) */}
            {(mode !== "forgot" || resetStep === "email") && (
              <div className={styles.inputGroup}>
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            )}

            {/* Password for login/signup */}
            {mode !== "forgot" && (
              <div className={styles.inputGroup}>
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
              </div>
            )}

            {mode === "signup" && (
              <div className={styles.inputGroup}>
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  autoComplete="new-password"
                />
              </div>
            )}

            {/* Security Questions Step */}
            {mode === "forgot" && resetStep === "questions" && (
              <>
                <div className={styles.securityQuestionsInfo}>
                  <span className={styles.infoIcon}>🔒</span>
                  <span>Resetting password for: <strong>{email}</strong></span>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="answer1">{securityQuestions[0]}</label>
                  <input
                    type="text"
                    id="answer1"
                    value={answer1}
                    onChange={(e) => setAnswer1(e.target.value)}
                    placeholder="Your answer"
                    required
                    autoComplete="off"
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="answer2">{securityQuestions[1]}</label>
                  <input
                    type="text"
                    id="answer2"
                    value={answer2}
                    onChange={(e) => setAnswer2(e.target.value)}
                    placeholder="Your answer"
                    required
                    autoComplete="off"
                  />
                </div>

                <div className={styles.divider}>
                  <span>New Password</span>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    autoComplete="new-password"
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="confirmNewPassword">Confirm New Password</label>
                  <input
                    type="password"
                    id="confirmNewPassword"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Please wait..."
                : mode === "login"
                ? "Sign In"
                : mode === "signup"
                ? "Create Account"
                : resetStep === "email"
                ? "Continue"
                : "Reset Password"}
            </button>
          </form>
        )}

        {mode === "login" && (
          <>
            <div className={styles.divider}>
              <span>or</span>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className={styles.googleButton}
            >
              <svg viewBox="0 0 24 24" className={styles.googleIcon}>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          </>
        )}

        <div className={styles.footer}>
          {mode === "login" && (
            <>
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  resetForgotState();
                  setError("");
                  setMessage("");
                }}
                className={styles.linkButton}
              >
                Forgot password?
              </button>
              <span className={styles.separator}>|</span>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError("");
                  setMessage("");
                }}
                className={styles.linkButton}
              >
                Create account
              </button>
            </>
          )}
          {(mode === "signup" || mode === "forgot") && (
            <button
              type="button"
              onClick={() => {
                setMode("login");
                resetForgotState();
                setError("");
                setMessage("");
              }}
              className={styles.linkButton}
            >
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
