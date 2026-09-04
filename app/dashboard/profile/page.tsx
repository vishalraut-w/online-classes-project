"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type StudentProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
};

export default function StudentProfilePage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch current student profile details
  async function loadProfile() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user found");

      // Fetch row from profiles table
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, created_at")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      const profileData: StudentProfile = {
        id: user.id,
        email: user.email || data?.email || "",
        full_name: data?.full_name || user.user_metadata?.full_name || "",
        phone: data?.phone || user.user_metadata?.phone || "",
        created_at: data?.created_at || user.created_at,
      };

      setProfile(profileData);
      setFullName(profileData.full_name || "");
      // Clean loaded phone string to max 10 digits
      setPhone((profileData.phone || "").replace(/\D/g, "").slice(0, 10));
    } catch (err: any) {
      console.error("Error loading profile:", err.message);
      setMessage({ type: "error", text: "Failed to load profile details." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  // Handle phone input change (digits only, max 10 digits)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const digitsOnly = rawValue.replace(/\D/g, "").slice(0, 10);
    setPhone(digitsOnly);
  };

  // Handle Mobile Number & Name Update
  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    // Validate mobile number length
    if (phone && phone.length !== 10) {
      setMessage({ type: "error", text: "Mobile number must be exactly 10 digits." });
      return;
    }

    setUpdating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Update Supabase Auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName, phone: phone },
      });

      if (authError) throw authError;

      // 2. Update public.profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          phone: phone,
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      setMessage({ type: "success", text: "Profile details updated successfully!" });
      await loadProfile();
    } catch (err: any) {
      console.error("Error updating profile:", err.message);
      setMessage({ type: "error", text: err.message || "Failed to update profile." });
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm font-semibold text-slate-400">Loading student profile...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 font-sans">
      
      {/* HEADER CARD */}
      <div className="flex flex-col gap-5 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500 text-2xl text-white shadow-md shadow-orange-500/20">
          👤
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            {profile?.full_name || "Student Profile"}
          </h1>
          <p className="text-xs font-semibold text-orange-600">
            Active Student Account • Member since {new Date(profile?.created_at || "").toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {message && (
        <div
          className={`rounded-xl p-4 text-xs font-bold ${
            message.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* DETAILS & UPDATE FORM */}
      <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-base font-black text-slate-900">Account Details</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Review your credentials and update your contact phone number.
        </p>

        <form onSubmit={handleUpdateProfile} className="mt-6 space-y-5">
          {/* EMAIL (READ-ONLY) */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              Email Address (Login ID)
            </label>
            <input
              type="email"
              value={profile?.email || ""}
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-500 outline-none"
            />
            <p className="mt-1 text-[10px] text-slate-400">
              Email address cannot be changed directly from here.
            </p>
          </div>

          {/* FULL NAME */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          {/* MOBILE NUMBER */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Mobile Number
              </label>
              <span className="text-[10px] font-bold text-slate-400">
                {phone.length}/10 Digits
              </span>
            </div>
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              maxLength={10}
              placeholder="1234567890"
              required
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-xs font-mono outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={updating}
              className="rounded-xl bg-orange-500 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 transition hover:bg-orange-600 disabled:opacity-50"
            >
              {updating ? "Saving Changes..." : "Update Phone & Details"}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}