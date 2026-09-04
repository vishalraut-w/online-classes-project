"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function StudentDashboardPage() {
  const [userName, setUserName] = useState("Student");
  const [stats, setStats] = useState({
    enrolledCourses: 0,
    quizzesAttempted: 0,
    examsAttempted: 0,
    averageScore: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Set username from metadata or email
        if (user.user_metadata?.full_name) {
          setUserName(user.user_metadata.full_name);
        } else if (user.email) {
          setUserName(user.email.split("@")[0]);
        }

        // 1. Fetch Enrolled Courses Count
        const { count: enrollCount } = await supabase
          .from("enrollments")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        // 2. Fetch Quiz Attempts
        const { data: quizData } = await supabase
          .from("quiz_attempts")
          .select("score_percentage")
          .eq("user_id", user.id);

        // 3. Fetch Exam Submissions
        const { data: examData } = await supabase
          .from("exam_submissions")
          .select("score_percentage")
          .eq("user_id", user.id);

        const quizzes = quizData || [];
        const exams = examData || [];
        
        const formattedQuizzes = quizzes.map(q => ({ score: q.score_percentage }));
        const formattedExams = exams.map(e => ({ score: e.score_percentage }));
        const totalAttempts = [...formattedQuizzes, ...formattedExams];

        let avg = 0;
        if (totalAttempts.length > 0) {
          const totalScoreSum = totalAttempts.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0);
          avg = Math.round(totalScoreSum / totalAttempts.length);
        }

        setStats({
          enrolledCourses: enrollCount || 0,
          quizzesAttempted: quizzes.length,
          examsAttempted: exams.length,
          averageScore: avg,
        });
      } catch (err) {
        console.error("Dashboard stats error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      
      {/* WELCOME BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-500 to-amber-500 p-6 sm:p-8 text-white shadow-lg">
        <div className="relative z-10 max-w-xl">
          <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md mb-3">
            Student Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-black">Welcome back, {userName}! 👋</h1>
          <p className="mt-2 text-sm text-orange-100 leading-relaxed">
            Monitor your overall learning activity, track quiz and exam performance, and continue your lessons.
          </p>
        </div>
      </div>

      {/* STATS GRID (NOW CLICKABLE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Enrolled Courses Card */}
        <Link 
          href="/dashboard/my-courses"
          className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm flex items-center justify-between hover:border-orange-500 hover:shadow-md transition group"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-orange-600">Enrolled Courses</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{loading ? "..." : stats.enrolledCourses}</h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600 font-bold text-lg border border-orange-100 group-hover:bg-orange-500 group-hover:text-white transition">
            📚
          </div>
        </Link>

        {/* Quizzes Attempted Card */}
        <Link 
          href="/dashboard/quizzes"
          className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm flex items-center justify-between hover:border-amber-500 hover:shadow-md transition group"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-amber-600">Quizzes Attempted</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{loading ? "..." : stats.quizzesAttempted}</h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 font-bold text-lg border border-amber-100 group-hover:bg-amber-500 group-hover:text-white transition">
            ✍️
          </div>
        </Link>

        {/* Exams Taken Card */}
        <Link 
          href="/dashboard/exams"
          className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-500 hover:shadow-md transition group"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-600">Exams Taken</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{loading ? "..." : stats.examsAttempted}</h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold text-lg border border-blue-100 group-hover:bg-blue-500 group-hover:text-white transition">
            📝
          </div>
        </Link>

        {/* Average Score Card */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Average Score</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{loading ? "..." : `${stats.averageScore}%`}</h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 font-bold text-lg border border-purple-100">
            📊
          </div>
        </div>

      </div>

      {/* QUICK ACTIONS SECTION */}
      <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Quick Shortcuts</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/dashboard/my-courses"
            className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 transition group"
          >
            <span className="text-xl">🎓</span>
            <div>
              <p className="text-xs font-bold text-slate-900 group-hover:text-orange-600">My Courses</p>
              <p className="text-[11px] text-slate-500">Continue learning workspace</p>
            </div>
          </Link>

          <Link
            href="/dashboard/quizzes"
            className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 transition group"
          >
            <span className="text-xl">⚡</span>
            <div>
              <p className="text-xs font-bold text-slate-900 group-hover:text-orange-600">Daily Quizzes</p>
              <p className="text-[11px] text-slate-500">Test your knowledge</p>
            </div>
          </Link>

          <Link
            href="/dashboard/payments"
            className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 transition group"
          >
            <span className="text-xl">💳</span>
            <div>
              <p className="text-xs font-bold text-slate-900 group-hover:text-orange-600">Payment History</p>
              <p className="text-[11px] text-slate-500">Check receipts & orders</p>
            </div>
          </Link>
        </div>
      </div>

    </div>
  );
}