"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Exam = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  created_at: string;
  total_questions?: number;
};

type ExamSubmission = {
  exam_id: string;
  total_score: number;
  created_at: string;
};

export default function StudentExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, ExamSubmission>>({});
  const [loading, setLoading] = useState(true);

  const getGradeDetails = (percentage: number) => {
    if (percentage >= 90) return { grade: "Grade A+", color: "bg-emerald-100 text-emerald-800 border-emerald-200" };
    if (percentage >= 80) return { grade: "Grade A", color: "bg-teal-100 text-teal-800 border-teal-200" };
    if (percentage >= 70) return { grade: "Grade B", color: "bg-blue-100 text-blue-800 border-blue-200" };
    if (percentage >= 50) return { grade: "Grade C", color: "bg-amber-100 text-amber-800 border-amber-200" };
    return { grade: "Grade F", color: "bg-rose-100 text-rose-800 border-rose-200" };
  };

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Fetch exams list
      const { data: examData, error: examError } = await supabase
        .from("exams")
        .select("id, title, start_time, end_time, duration_minutes, created_at")
        .order("start_time", { ascending: false });

      if (examError) console.error("Error fetching exams:", examError.message);

      // 2. Fetch total questions per exam for accurate percentage
      const examsWithQuestionCount = await Promise.all(
        (examData || []).map(async (exam) => {
          const { count } = await supabase
            .from("exam_questions")
            .select("*", { count: "exact", head: true })
            .eq("exam_id", exam.id);

          return { ...exam, total_questions: count || 0 };
        })
      );

      setExams(examsWithQuestionCount);

      // 3. Fetch user submissions
      if (user) {
        const { data: subData, error: subError } = await supabase
          .from("exam_submissions")
          .select("exam_id, total_score, created_at")
          .eq("user_id", user.id);

        if (subError) {
          console.error("Error fetching submissions:", subError.message);
        } else if (subData) {
          const subMap: Record<string, ExamSubmission> = {};
          subData.forEach((sub) => {
            subMap[sub.exam_id] = sub;
          });
          setSubmissions(subMap);
        }
      }
    } catch (err: any) {
      console.error("Unexpected error loading dashboard:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getExamState = (exam: Exam) => {
    const now = new Date();
    const start = new Date(exam.start_time);
    const end = new Date(exam.end_time);

    if (now < start) return "UPCOMING";
    if (now >= start && now <= end) return "LIVE";
    return "EXPIRED";
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-800 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Scheduled Exams</h1>
          <p className="mt-1 text-sm text-slate-500">
            Take timed competitive tests, view schedules, and check performance reports.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400">
              Loading available exams...
            </div>
          ) : exams.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400">
              No exams scheduled at this time. Check back later!
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {exams.map((exam) => {
                const state = getExamState(exam);
                const submission = submissions[exam.id];
                const totalQ = exam.total_questions || 1;
                const score = submission?.total_score ?? 0;
                const percentage = Math.round((score / totalQ) * 100);
                const gradeInfo = getGradeDetails(percentage);

                return (
                  <div
                    key={exam.id}
                    className="flex flex-col gap-4 p-6 transition-colors hover:bg-slate-50/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-bold text-slate-900">
                          {exam.title}
                        </h3>

                        {submission ? (
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${gradeInfo.color}`}>
                            {gradeInfo.grade} • {percentage}%
                          </span>
                        ) : state === "LIVE" ? (
                          <span className="animate-pulse rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                            ● Live Now
                          </span>
                        ) : state === "UPCOMING" ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                            Upcoming
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 border border-slate-200">
                            Closed
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>⏱ {exam.duration_minutes} Minutes</span>
                        <span>•</span>
                        <span>Start: {new Date(exam.start_time).toLocaleString()}</span>
                        <span>•</span>
                        <span>End: {new Date(exam.end_time).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {submission ? (
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block uppercase font-semibold">
                            Total Marks
                          </span>
                          <span className="text-base font-black text-slate-900">
                            {score} / {exam.total_questions}
                          </span>
                        </div>
                      ) : state === "LIVE" ? (
                        <Link
                          href={`/dashboard/exams/${exam.id}`}
                          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                        >
                          Start Exam →
                        </Link>
                      ) : state === "UPCOMING" ? (
                        <button
                          disabled
                          className="cursor-not-allowed rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-400"
                        >
                          Not Started
                        </button>
                      ) : (
                        <button
                          disabled
                          className="cursor-not-allowed rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-400"
                        >
                          Expired
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}