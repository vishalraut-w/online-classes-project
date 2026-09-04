"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type EnrolledCourse = {
  id: string;
  title: string;
  description: string | null;
  teacher_name: string | null;
  course_type: "subject" | "combo" | null;
  subjects: string[] | null;
  price: number;
};

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMyCourses() {
      try {
        setLoading(true);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setErrorMessage("Please log in to view your enrolled courses.");
          return;
        }

        // Join enrollments table with courses table using foreign key
        const { data, error } = await supabase
          .from("enrollments")
          .select(
            `
            course_id,
            courses (
              id,
              title,
              description,
              teacher_name,
              course_type,
              subjects,
              price
            )
            `
          )
          .eq("user_id", user.id);

        if (error) {
          console.error("MY COURSES ERROR:", error);
          setErrorMessage(error.message);
          return;
        }

        // Extract nested course objects
        const enrolledList = (data || [])
          .map((item: any) => item.courses)
          .filter(Boolean) as EnrolledCourse[];

        setCourses(enrolledList);
      } catch (err: any) {
        console.error("EXCEPTIONS:", err);
        setErrorMessage("An unexpected error occurred while loading courses.");
      } finally {
        setLoading(false);
      }
    }

    fetchMyCourses();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-6 font-sans">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-orange-500" />
        <p className="mt-3 text-sm font-semibold text-slate-500">
          Loading your courses...
        </p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="mx-auto max-w-7xl p-6 font-sans">
        <div className="rounded-2xl bg-red-50 p-6 text-red-700">
          <h3 className="font-bold">Error</h3>
          <p className="mt-1 text-xs">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] p-4 sm:p-6 lg:p-8 font-sans">
      <main className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
              My Purchased Courses
            </h1>
            <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">
              Access your enrolled subjects and manage learning materials.
            </p>
          </div>

          <Link
            href="/dashboard/courses"
            className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Browse All Courses →
          </Link>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <div className="text-5xl">🎓</div>
            <h3 className="mt-4 text-lg font-black text-slate-900">
              No Purchased Courses
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              You haven't enrolled in any courses yet.
            </p>
            <Link
              href="/dashboard/courses"
              className="mt-6 inline-block rounded-xl bg-orange-500 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
            >
              Browse Available Courses
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-orange-700">
                      {course.course_type === "combo" ? "🎁 COMBO" : "📚 SINGLE SUB"}
                    </span>

                    {course.teacher_name && (
                      <span className="text-xs font-bold text-slate-600">
                        👨‍🏫 {course.teacher_name}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-black text-slate-900">
                    {course.title}
                  </h3>

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

                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-500">
                    {course.description || "No description provided."}
                  </p>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4">
                  <Link
                    href={`/dashboard/courses/${course.id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
                  >
                    <span>Start Learning</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}