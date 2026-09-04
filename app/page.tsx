"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [isSignUp, setIsSignUp] = useState(false);

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setErrorMsg("");
    setMessage("");

    // ============================================================
    // SIGN UP
    // ============================================================

    if (isSignUp) {
      if (!fullName.trim()) {
        setErrorMsg("Please enter your full name.");
        setLoading(false);
        return;
      }

      if (!mobile.trim()) {
        setErrorMsg("Please enter your mobile number.");
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setErrorMsg("Password must be at least 6 characters.");
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setErrorMsg("Passwords do not match.");
        setLoading(false);
        return;
      }

      const {
        data: authData,
        error: signUpError,
      } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: mobile.trim(),
          },
        },
      });

      if (signUpError) {
        setErrorMsg(signUpError.message);
        setLoading(false);
        return;
      }

      const user = authData.user;

      if (!user) {
        setErrorMsg("Account was created, but user information was not returned.");
        setLoading(false);
        return;
      }

      if (!authData.session) {
        setMessage(
          "Account created successfully! Please check your email and confirm your account before logging in."
        );

        setIsSignUp(false);
        setPassword("");
        setConfirmPassword("");
        setLoading(false);

        return;
      }

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: user.user_metadata?.full_name || fullName.trim(),
        phone: user.user_metadata?.phone || mobile.trim(),
        email: user.email || email.trim(),
        updated_at: new Date().toISOString(),
      });

      if (profileError) {
        console.error("Error saving profile to public table:", profileError.message);
      }

      router.push("/dashboard");
      return;
    }

    // ============================================================
    // LOGIN (Email Confirmed State)
    // ============================================================

    const {
      data: loginData,
      error: loginError,
    } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (loginError) {
      setErrorMsg(loginError.message);
      setLoading(false);
      return;
    }

    // ============================================================
    // SAVE / SYNC PROFILE UPON VERIFIED LOGIN
    // ============================================================
    if (loginData.user) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: loginData.user.id,
        full_name: loginData.user.user_metadata?.full_name || "",
        phone: loginData.user.user_metadata?.phone || "",
        email: loginData.user.email || email.trim(),
        updated_at: new Date().toISOString(),
      });

      if (profileError) {
        console.error("Error saving profile to public table:", profileError.message);
      }
    }

    router.push("/dashboard");
  }

  function switchMode() {
    setIsSignUp((value) => !value);

    setErrorMsg("");
    setMessage("");

    setPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-orange-50/50 p-4 font-sans">
      <div className="w-full max-w-md rounded-2xl border border-orange-100 bg-white p-8 shadow-xl">

        {/* HEADER */}

        <div className="mb-6 text-center">

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-2xl text-white shadow-lg shadow-orange-500/30">
            🎓
          </div>

          <h1 className="mt-4 text-2xl font-black text-slate-900">
            {isSignUp
              ? "Create Student Account"
              : "Welcome Back"}
          </h1>

          <p className="mt-1 text-xs text-slate-400">
            {isSignUp
              ? "Create your Raut Coaching student account"
              : "Log in to access your learning dashboard"}
          </p>

        </div>

        {/* SUCCESS MESSAGE */}

        {message && (
          <div className="mb-4 rounded-xl border border-green-100 bg-green-50 p-3 text-center text-xs font-semibold text-green-700">
            {message}
          </div>
        )}

        {/* ERROR */}

        {errorMsg && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-center text-xs font-semibold text-red-600">
            {errorMsg}
          </div>
        )}

        {/* FORM */}

        <form
          onSubmit={handleAuth}
          className="space-y-4"
        >

          {/* STUDENT NAME */}

          {isSignUp && (
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                👤 Student Name
              </label>

              <input
                type="text"
                required
                value={fullName}
                onChange={(e) =>
                  setFullName(e.target.value)
                }
                placeholder="Enter your full name"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          )}

          {/* MOBILE */}

          {isSignUp && (
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                📱 Mobile Number
              </label>

              <input
                type="tel"
                required
                value={mobile}
                onChange={(e) =>
                  setMobile(e.target.value)
                }
                placeholder="Enter mobile number"
                inputMode="numeric"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          )}

          {/* EMAIL */}

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              📧 Email Address
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="student@example.com"
              autoComplete="email"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          {/* PASSWORD */}

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              🔐 Password
            </label>

            <input
              type="password"
              required
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Minimum 6 characters"
              autoComplete={
                isSignUp
                  ? "new-password"
                  : "current-password"
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          {/* CONFIRM PASSWORD */}

          {isSignUp && (
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                🔐 Confirm Password
              </label>

              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                placeholder="Enter password again"
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          )}

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-orange-500 py-3 text-xs font-bold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Processing..."
              : isSignUp
              ? "Create Account"
              : "Log In"}
          </button>

        </form>

        {/* SWITCH */}

        <div className="mt-6 text-center">

          <button
            type="button"
            onClick={switchMode}
            className="text-xs font-bold text-orange-600 hover:underline"
          >
            {isSignUp
              ? "Already have an account? Log In"
              : "Don't have an account? Sign Up"}
          </button>

        </div>

      </div>
    </div>
  );
}