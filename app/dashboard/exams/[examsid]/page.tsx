"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Question = {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
};

type Exam = {
  id: string;
  title: string;
  duration_minutes: number;
  end_time: string;
};

export default function ExamTakingPage({
  params,
}: {
  params: Promise<{ examsid: string }>;
}) {
  const resolvedParams = use(params);
  const examId = resolvedParams.examsid;
  const router = useRouter();

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Use refs to access latest values in timer callbacks safely
  const answersRef = useRef(answers);
  const questionsRef = useRef(questions);
  const submittingRef = useRef(submitting);

  useEffect(() => {
    answersRef.current = answers;
    questionsRef.current = questions;
    submittingRef.current = submitting;
  }, [answers, questions, submitting]);

  // Fetch Exam Data & Questions
  useEffect(() => {
    if (!examId) return;

    const fetchExamAndQuestions = async () => {
      setLoading(true);

      const { data: examData, error: examErr } = await supabase
        .from("exams")
        .select("id, title, duration_minutes, end_time")
        .eq("id", examId)
        .single();

      if (examErr || !examData) {
        console.error("Error fetching exam:", examErr?.message);
        setLoading(false);
        return;
      }

      setExam(examData);

      // Calculate initial timer (cap by scheduled end_time)
      const now = new Date().getTime();
      const endTimeMs = new Date(examData.end_time).getTime();
      const durationMs = examData.duration_minutes * 60 * 1000;
      
      const timeRemainingMs = Math.min(durationMs, endTimeMs - now);
      const initialSeconds = Math.max(0, Math.floor(timeRemainingMs / 1000));

      setSecondsLeft(initialSeconds);

      const { data: qData, error: qErr } = await supabase
        .from("exam_questions")
        .select("id, question_text, option_a, option_b, option_c, option_d, correct_option")
        .eq("exam_id", examId);

      if (qErr) {
        console.error("Error fetching questions:", qErr.message);
      } else {
        setQuestions(qData || []);
      }

      setLoading(false);
    };

    fetchExamAndQuestions();
  }, [examId]);

  // Execute Submission Handler
  const executeSubmit = async (isAuto = false) => {
    if (submittingRef.current) return;
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      let score = 0;
      questionsRef.current.forEach((q) => {
        if (answersRef.current[q.id] === q.correct_option) {
          score += 1;
        }
      });

      const { error: subError } = await supabase
        .from("exam_submissions")
        .insert([
          {
            exam_id: examId,
            user_id: user.id,
            total_score: score,
          },
        ]);

      if (subError) throw subError;

      if (isAuto) {
        alert(`Time's up! Your exam has been submitted automatically. Score: ${score}/${questionsRef.current.length}`);
      } else {
        alert(`Exam submitted successfully! Score: ${score}/${questionsRef.current.length}`);
      }

      router.push("/dashboard/exams");
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
      setSubmitting(false);
    }
  };

  // Timer & Auto-Submit Loop
  useEffect(() => {
    if (secondsLeft === null || submitting) return;

    if (secondsLeft <= 0) {
      executeSubmit(true);
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          executeSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, submitting]);

  const handleManualSubmit = () => {
    const answeredCount = Object.keys(answers).length;
    if (window.confirm(`You answered ${answeredCount} of ${questions.length} questions. Submit paper?`)) {
      executeSubmit(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-sans">Loading exam...</div>;
  }

  if (!exam || questions.length === 0) {
    return <div className="p-12 text-center text-rose-500 font-sans">Exam unavailable or empty.</div>;
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* TOP BAR WITH COUNTDOWN TIMER */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{exam.title}</h1>
            <p className="text-xs text-slate-500 mt-1">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* TIMER DISPLAY */}
            <div className={`px-4 py-2 rounded-xl border text-sm font-black font-mono tracking-wider ${
              (secondsLeft || 0) < 300 
                ? "bg-rose-50 text-rose-600 border-rose-200 animate-pulse" 
                : "bg-slate-100 text-slate-700 border-slate-200"
            }`}>
              ⏱ {secondsLeft !== null ? formatTimer(secondsLeft) : "--:--"}
            </div>

            <button
              onClick={handleManualSubmit}
              disabled={submitting}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl transition shadow-sm disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Finish Exam"}
            </button>
          </div>
        </div>

        {/* MAIN BODY */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg">
                Question #{currentIndex + 1}
              </span>
              <h2 className="text-base font-bold text-slate-900 leading-relaxed">
                {currentQ.question_text}
              </h2>

              <div className="space-y-3 pt-2">
                {[
                  { key: "A", text: currentQ.option_a },
                  { key: "B", text: currentQ.option_b },
                  { key: "C", text: currentQ.option_c },
                  { key: "D", text: currentQ.option_d },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, [currentQ.id]: opt.key }))}
                    className={`w-full p-4 rounded-xl border text-left text-xs font-medium transition ${
                      answers[currentQ.id] === opt.key
                        ? "border-indigo-600 bg-indigo-50/60 text-indigo-900 font-bold shadow-sm"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span className="font-bold mr-2">{opt.key}.</span> {opt.text}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                disabled={currentIndex === 0}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition disabled:opacity-40"
              >
                ← Previous
              </button>

              {currentIndex === questions.length - 1 ? (
                <button
                  type="button"
                  onClick={handleManualSubmit}
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition shadow-sm"
                >
                  Submit Paper
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, questions.length - 1))}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition shadow-sm"
                >
                  Next →
                </button>
              )}
            </div>
          </div>

          {/* PALETTE */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-fit space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Question Navigator
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = idx === currentIndex;

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 w-9 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                      isCurrent
                        ? "ring-2 ring-indigo-600 ring-offset-1 bg-indigo-600 text-white"
                        : isAnswered
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}