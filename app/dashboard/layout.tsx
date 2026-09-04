"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

const STUDENT_MENU_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/dashboard/courses", label: "All Courses", icon: "📫" },
  { href: "/dashboard/my-courses", label: "My Courses", icon: "📚" },
  { href: "/dashboard/study-material", label: "Study Material", icon: "📁" },
  { href: "/dashboard/quizzes", label: "Daily Quizzes", icon: "⚡" },
  { href: "/dashboard/exams", label: "Tests & Exams", icon: "📝" },
  { href: "/dashboard/live", label: "Live Classes", icon: "🔴" },
  { href: "/dashboard/payments", label: "Payment History", icon: "🧾" },

];

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [studentName, setStudentName] = useState<string>("Loading...");

  useEffect(() => {
    async function getStudentProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Try getting name from metadata first
        const metaName = user.user_metadata?.full_name || user.user_metadata?.name;
        if (metaName) {
          setStudentName(metaName);
          return;
        }

        // Fallback: Query profiles table
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        if (profile?.full_name) {
          setStudentName(profile.full_name);
        } else {
          setStudentName("Student");
        }
      } catch (err) {
        console.error("Error fetching student profile:", err);
        setStudentName("Student");
      }
    }

    getStudentProfile();
  }, []);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const currentLabel =
    STUDENT_MENU_ITEMS.find((item) => isActive(item.href))?.label || "Student Portal";

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      router.push("/");
      router.refresh();
    } catch (error: any) {
      console.error("Logout error:", error.message);
      alert("Failed to sign out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-orange-50/30 font-sans">
      {/* MOBILE OVERLAY */}
      {mobileOpen && (
        <button
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Close menu"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-orange-100 bg-white transition-transform duration-200 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* LOGO */}
        <div className="flex h-20 items-center gap-3 border-b border-orange-100 px-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-xl text-white shadow-lg shadow-orange-500/20">
            🎓
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900">Raut Coaching</h1>
            <p className="text-[11px] font-medium text-orange-600">Learning Portal</p>
          </div>

          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-lg px-2 py-1 text-slate-400 md:hidden"
          >
            ✕
          </button>
        </div>

        {/* MENU */}
        <div className="flex-1 overflow-y-auto px-3 py-5">
          <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Student Menu
          </p>
          <nav className="space-y-1">
            {STUDENT_MENU_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                    active
                      ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                      : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                  }`}
                >
                  <span className="w-6 text-center text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* BOTTOM */}
        <div className="space-y-3 border-t border-orange-100 p-4">
          <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-3">
            <p className="text-[10px] font-bold uppercase text-slate-400">Logged in as</p>
            <p className="truncate text-xs font-black text-orange-600">{studentName}</p>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
          >
            <span>🚪</span> {loggingOut ? "Signing Out..." : "Log Out"}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="min-h-screen md:pl-64">
        {/* TOP BAR */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-orange-100 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm md:hidden"
            >
              ☰
            </button>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-orange-500">
                Raut Coaching
              </p>
              <h2 className="text-sm font-black text-slate-900 sm:text-base">
                {currentLabel}
              </h2>
            </div>
          </div>

          <Link
            href="/dashboard/profile"
            className="flex items-center gap-2 rounded-xl border border-orange-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-orange-50"
          >
            <span>👤</span> {studentName !== "Loading..." ? studentName : "My Profile"}
          </Link>
        </header>

        {/* PAGE CONTENT */}
        <main className="min-h-[calc(100vh-4rem)] p-6 sm:p-8">{children}</main>
      </div>
    </div>
  );
}