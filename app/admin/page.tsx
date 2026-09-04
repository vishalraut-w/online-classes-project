"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type StudentProfile = {
  id: string;
  full_name: string;
  email: string;
  mobile_number: string;
  created_at: string;
  enrollments: {
    amount: number;
    courses?: { title: string } | null;
    lessons?: { title: string } | null;
  }[];
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCourses: 0,
    totalLessons: 0,
    totalExams: 0,
    totalQuizzes: 0,
    totalStudents: 0,
    premiumStudents: 0,
  });
  
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    try {
      setLoading(true);

      // 1. Total Revenue
      const { data: enrollmentsData, error: revError } = await supabase
        .from("enrollments")
        .select("amount");
      if (revError) console.error("Revenue fetch error:", revError);
      
      const revenue = (enrollmentsData || []).reduce(
        (sum, row) => sum + (Number(row.amount) || 0), 
        0
      );

      // 2. Counts
      const { count: coursesCount } = await supabase.from("courses").select("*", { count: "exact", head: true });
      const { count: lessonsCount } = await supabase.from("lessons").select("*", { count: "exact", head: true });
      const { count: examsCount } = await supabase.from("exams").select("*", { count: "exact", head: true });
      const { count: quizzesCount } = await supabase.from("quizzes").select("*", { count: "exact", head: true });
      const { count: studentsCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });

      // 3. Premium Students
      const { data: paidEnrollments } = await supabase.from("enrollments").select("user_id, amount");
      const uniquePremiumUsers = new Set(
        (paidEnrollments || [])
          .filter(e => Number(e.amount) > 0)
          .map(e => e.user_id)
      );

      setStats({
        totalRevenue: revenue,
        totalCourses: coursesCount || 0,
        totalLessons: lessonsCount || 0,
        totalExams: examsCount || 0,
        totalQuizzes: quizzesCount || 0,
        totalStudents: studentsCount || 0,
        premiumStudents: uniquePremiumUsers.size,
      });

      // 4. Student Profiles & Enrollments using safe separation
      const { data: profilesData, error: pError } = await supabase
        .from("profiles")
        .select("id, full_name, email, mobile_number, created_at");

      if (pError) throw pError;

      const { data: rawEnrollments, error: eError } = await supabase
        .from("enrollments")
        .select("user_id, amount, course_id, lesson_id");

      if (eError) throw eError;

      const { data: coursesData } = await supabase.from("courses").select("id, title");
      const { data: lessonsData } = await supabase.from("lessons").select("id, title");

      const courseMap = new Map((coursesData || []).map((c) => [c.id, c.title]));
      const lessonMap = new Map((lessonsData || []).map((l) => [l.id, l.title]));

      const combinedStudents = (profilesData || []).map((student) => {
        const studentEnrollments = (rawEnrollments || [])
          .filter((e) => e.user_id === student.id)
          .map((e) => ({
            amount: e.amount,
            courses: e.course_id ? { title: courseMap.get(e.course_id) || "Course" } : null,
            lessons: e.lesson_id ? { title: lessonMap.get(e.lesson_id) || "Lesson" } : null,
          }));

        return {
          ...student,
          enrollments: studentEnrollments,
        };
      });

      setStudents(combinedStudents);

    } catch (err) {
      console.error("Detailed Error fetching admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  return (
    <div className="space-y-6 p-4 sm:p-8 bg-slate-50 min-h-screen font-sans">
      
      {/* HEADER */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 p-6 sm:p-8 text-white shadow-lg">
        <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider mb-3">
          Control Center
        </span>
        <h1 className="text-2xl sm:text-3xl font-black">Admin Dashboard 🚀</h1>
        <p className="mt-2 text-sm text-slate-300">
          Overview of platform revenue, course metrics, and student enrollments.
        </p>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Total Revenue */}
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Revenue</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {loading ? "..." : `₹${stats.totalRevenue.toLocaleString("en-IN")}`}
            </h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold text-lg border border-emerald-100">
            ₹
          </div>
        </div>

        {/* Total Students */}
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Students</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{loading ? "..." : stats.totalStudents}</h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold text-lg border border-blue-100">
            👥
          </div>
        </div>

        {/* Premium Students */}
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Premium Students</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{loading ? "..." : stats.premiumStudents}</h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 font-bold text-lg border border-amber-100">
            ⭐
          </div>
        </div>

        {/* Total Courses */}
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Courses</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{loading ? "..." : stats.totalCourses}</h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600 font-bold text-lg border border-orange-100">
            📚
          </div>
        </div>

        {/* Total Lessons */}
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Lessons</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{loading ? "..." : stats.totalLessons}</h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 font-bold text-lg border border-purple-100">
            📖
          </div>
        </div>

        {/* Total Exams & Quizzes */}
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Exams / Quizzes</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {loading ? "..." : `${stats.totalExams} / ${stats.totalQuizzes}`}
            </h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 font-bold text-lg border border-rose-100">
            📝
          </div>
        </div>

      </div>

      {/* STUDENT PROFILES TABLE */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Student Profiles</h2>
            <p className="text-xs text-slate-500 mt-0.5">Manage users and track unlocked courses and lessons.</p>
          </div>
          <button
            onClick={fetchAdminData}
            className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
          >
            🔄 Refresh List
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 uppercase font-extrabold tracking-wider">
                <th className="px-6 py-3">Student Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Mobile Number</th>
                <th className="px-6 py-3">Purchased Items</th>
                <th className="px-6 py-3">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Loading student profiles...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    No student profiles found.
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const purchasedItems = student.enrollments
                    ?.map((e) => e.courses?.title || e.lessons?.title)
                    .filter(Boolean);

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {student.full_name || "Unnamed Student"}
                      </td>
                      <td className="px-6 py-4 text-slate-500">{student.email || "N/A"}</td>
                      <td className="px-6 py-4 text-slate-500">{student.mobile_number || "N/A"}</td>
                      <td className="px-6 py-4">
                        {purchasedItems && purchasedItems.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {purchasedItems.map((title, idx) => (
                              <span
                                key={idx}
                                className="inline-block rounded-md bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 border border-indigo-100"
                              >
                                {title}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="italic text-slate-400">No course purchased</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {student.created_at
                          ? new Date(student.created_at).toLocaleDateString()
                          : "N/A"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}