"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const menuItems = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: "📊",
  },
  {
    href: "/admin/courses",
    label: "Courses",
    icon: "📚",
  },
  {
    href: "/admin/live",
    label: "Live Classes",
    icon: "🎥",
  },
  {
    href: "/admin/study-material",
    label: "Study Material",
    icon: "📁",
  },
  {
    href: "/admin/quizzes",
    label: "Daily Quizzes",
    icon: "⚡",
  },
  {
    href: "/admin/exams",
    label: "Tests & Exams",
    icon: "📝",
  },
  {
    href: "/admin/students",
    label: "Students",
    icon: "👨‍🎓",
  },
  {
    href: "/admin/payments",
    label: "Payments",
    icon: "💳",
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/admin") {
      return pathname === "/admin";
    }

    return (
      pathname === href ||
      pathname.startsWith(href + "/")
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">

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
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-64 flex-col
          border-r border-slate-200
          bg-white
          transition-transform duration-200
          md:translate-x-0
          ${
            mobileOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >

        {/* LOGO */}

        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-5">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-xl text-white shadow-lg shadow-orange-500/20">
            🎓
          </div>

          <div>
            <h1 className="text-sm font-black text-slate-900">
              Raut Coaching
            </h1>

            <p className="text-[11px] font-medium text-slate-400">
              Admin Panel
            </p>
          </div>

          {/* MOBILE CLOSE */}

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
            Management
          </p>

          <nav className="space-y-1">

            {menuItems.map((item) => {

              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() =>
                    setMobileOpen(false)
                  }
                  className={`
                    flex items-center gap-3
                    rounded-xl px-3 py-3
                    text-sm font-bold
                    transition
                    ${
                      active
                        ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                        : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                    }
                  `}
                >

                  <span className="w-6 text-center text-base">
                    {item.icon}
                  </span>

                  <span>
                    {item.label}
                  </span>

                </Link>
              );
            })}

          </nav>

        </div>

        {/* BOTTOM */}

        <div className="border-t border-slate-100 p-4">

          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            🎓 Student Dashboard
          </Link>

          <p className="mt-3 text-center text-[10px] text-slate-400">
            Raut Coaching Admin
          </p>

        </div>

      </aside>

      {/* MAIN */}

      <div className="min-h-screen md:pl-64">

        {/* TOP BAR */}

        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">

          <div className="flex items-center gap-3">

            {/* MOBILE MENU */}

            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm md:hidden"
            >
              ☰
            </button>

            <div>

              <p className="text-[10px] font-black uppercase tracking-wider text-orange-500">
                Raut Coaching
              </p>

              <h2 className="text-sm font-black text-slate-900 sm:text-base">
                {menuItems.find((item) =>
                  isActive(item.href)
                )?.label || "Admin Panel"}
              </h2>

            </div>

          </div>

          {/* STUDENT VIEW */}

          <Link
            href="/dashboard"
            className="hidden rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 sm:block"
          >
            Student Dashboard →
          </Link>

        </header>

        {/* PAGE */}

        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>

      </div>

    </div>
  );
}