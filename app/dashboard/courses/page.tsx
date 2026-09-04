"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Course = {
  id: string;
  title: string;
  description: string | null;
  teacher_name: string | null;
  price: number;
  billing_period: string | null;
  course_type: "subject" | "combo" | null;
  subjects: string[] | null;
  is_published: boolean;
  created_at: string;
};

export default function StudentCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCoursesAndEnrollments() {
      try {
        setLoading(true);

        // 1. Fetch published courses
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select(
            `
            id,
            title,
            description,
            teacher_name,
            price,
            billing_period,
            course_type,
            subjects,
            is_published,
            created_at
            `
          )
          .eq("is_published", true)
          .order("created_at", { ascending: false });

        if (coursesError) {
          console.error("SUPABASE COURSES ERROR:", coursesError);
          setErrorMessage(coursesError.message);
          return;
        }

        setCourses((coursesData || []) as Course[]);

        // 2. Fetch logged-in student's active enrollments
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: enrollmentsData, error: enrollmentsError } = await supabase
            .from("enrollments")
            .select("course_id")
            .eq("user_id", user.id);

          if (!enrollmentsError && enrollmentsData) {
            setEnrolledCourseIds(new Set(enrollmentsData.map((e) => e.course_id)));
          }
        }
      } catch (err: any) {
        console.error("LOAD COURSES EXCEPTION:", err);
        setErrorMessage("Unexpected error loading courses.");
      } finally {
        setLoading(false);
      }
    }

    fetchCoursesAndEnrollments();
  }, []);

  function getBillingText(billing: string | null) {
    if (billing === "monthly") return "/ month";
    if (billing === "yearly") return "/ year";
    if (billing === "one_time") return " one-time";
    return "";
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-6">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-orange-500" />
        <p className="mt-3 text-sm font-semibold text-slate-500">Loading courses...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <div className="rounded-2xl bg-red-50 p-6 text-red-700">
          <h3 className="font-bold">Error Loading Courses</h3>
          <p className="mt-1 text-xs">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] p-4 sm:p-6 lg:p-8">
      <main className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Available Courses</h1>
            <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">
              Explore subject classes and combo packages to start learning.
            </p>
          </div>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <div className="text-5xl">📚</div>
            <h3 className="mt-4 text-lg font-black text-slate-900">No Courses Available</h3>
            <p className="mt-1 text-sm text-slate-500">Check back later for published subjects and combos.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => {
              const isEnrolled = enrolledCourseIds.has(course.id);
              const isFree = Number(course.price) === 0;
              const hasAccess = isEnrolled || isFree;

              return (
                <div
                  key={course.id}
                  className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-orange-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-orange-700">
                        {course.course_type === "combo" ? "🎁 COMBO" : "Single sub"}
                      </span>

                      {course.teacher_name && (
                        <span className="text-xs font-bold text-slate-600">
                          Instructor: {course.teacher_name}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-black text-slate-900">{course.title}</h3>

                    {course.subjects && course.subjects.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {course.subjects.map((subj) => (
                          <span
                            key={subj}
                            className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600"
                          >
                            {subj}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-slate-500">
                      {course.description || "No description provided."}
                    </p>
                  </div>

                  {/* PURCHASE LOCK ACTION BUTTON */}
                  <div className="mt-6 border-t border-slate-100 pt-4">
                    <div className="mb-4 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">
                        ₹{Number(course.price).toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        {getBillingText(course.billing_period)}
                      </span>
                    </div>

                    {hasAccess ? (
                      <Link
                        href={`/dashboard/courses/${course.id}`}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
                      >
                        <span>Access Lessons</span>
                        <span>→</span>
                      </Link>
                    ) : (
                      <Link
                        href={`/checkout?itemType=course&itemId=${course.id}`}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-3 text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700"
                      >
                        <span>🔒 Buy Now to Unlock</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}