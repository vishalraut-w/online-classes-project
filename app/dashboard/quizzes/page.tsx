"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Question = {
  id: string;
  question_text: string;
  options: string[];
  correct_option_index: number;
  explanation: string | null;
  order_index: number;
};

type Quiz = {
  id: string;
  title: string;
  description: string | null;
  time_limit_minutes: number;
  passing_score: number;
};

type QuizAttempt = {
  quiz_id: string;
  score_percentage: number;
  passed: boolean;
  created_at: string;
};

export default function StudentQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Record<string, QuizAttempt>>({});
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Active Quiz State
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});

  // Quiz Session Control
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState<{
    correct: number;
    percentage: number;
    passed: boolean;
  } | null>(null);

  // Load User, Quizzes, and Saved Results
  const loadInitialData = useCallback(async () => {
    setLoading(true);

    // Get Logged-in User
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setCurrentUserId(user.id);
    }

    // Load Quizzes
    const { data: quizData, error: quizError } = await supabase
      .from("quizzes")
      .select("id, title, description, time_limit_minutes, passing_score")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (quizError) {
      console.error("ERROR FETCHING QUIZZES:", quizError.message);
    } else {
      setQuizzes((quizData || []) as Quiz[]);
    }

    // Load Past Attempts for Current User
    if (user) {
      const { data: attemptData, error: attemptError } = await supabase
        .from("quiz_attempts")
        .select("quiz_id, score_percentage, passed, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (attemptError) {
        console.error("ERROR FETCHING ATTEMPTS:", attemptError.message);
      } else if (attemptData) {
        // Map best/latest attempt by quiz_id
        const attemptMap: Record<string, QuizAttempt> = {};
        attemptData.forEach((att) => {
          if (
            !attemptMap[att.quiz_id] ||
            att.score_percentage > attemptMap[att.quiz_id].score_percentage
          ) {
            attemptMap[att.quiz_id] = att;
          }
        });
        setAttempts(attemptMap);
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Save Attempt to Database
  const saveQuizAttempt = async (
    quizId: string,
    percentage: number,
    passed: boolean
  ) => {
    if (!currentUserId) return;

    const { error } = await supabase.from("quiz_attempts").insert({
      user_id: currentUserId,
      quiz_id: quizId,
      score_percentage: percentage,
      passed: passed,
    });

    if (error) {
      console.error("ERROR SAVING ATTEMPT:", error.message);
    } else {
      // Update local attempt state
      setAttempts((prev) => ({
        ...prev,
        [quizId]: {
          quiz_id: quizId,
          score_percentage: percentage,
          passed,
          created_at: new Date().toISOString(),
        },
      }));
    }
  };

  // Submit Quiz Function
  const submitQuiz = useCallback(async () => {
    if (isSubmitted || !questions.length || !activeQuiz) return;

    let correctCount = 0;
    questions.forEach((q) => {
      if (userAnswers[q.id] === q.correct_option_index) {
        correctCount += 1;
      }
    });

    const percentage = Math.round((correctCount / questions.length) * 100);
    const passed = percentage >= activeQuiz.passing_score;

    setScore({ correct: correctCount, percentage, passed });
    setIsSubmitted(true);

    // Save attempt to backend
    await saveQuizAttempt(activeQuiz.id, percentage, passed);
  }, [isSubmitted, questions, userAnswers, activeQuiz]);

  // Live Countdown Timer
  useEffect(() => {
    if (!activeQuiz || isSubmitted || timeRemaining === null) return;

    if (timeRemaining <= 0) {
      submitQuiz();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, isSubmitted, activeQuiz, submitQuiz]);

  // Start / Retake Quiz Action
  async function startQuiz(quiz: Quiz) {
    setLoading(true);
    const { data, error } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", quiz.id)
      .order("order_index", { ascending: true });

    if (error) {
      alert("Failed to load questions: " + error.message);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      alert("This quiz has no questions available yet.");
      setLoading(false);
      return;
    }

    setActiveQuiz(quiz);
    setQuestions(data as Question[]);
    setUserAnswers({});
    setIsSubmitted(false);
    setScore(null);
    setTimeRemaining(quiz.time_limit_minutes * 60);
    setLoading(false);
  }

  function selectOption(questionId: string, optionIndex: number) {
    if (isSubmitted) return;
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-black text-slate-900">Raut Coaching</h1>
            <p className="text-xs text-slate-500">Practice & Assessment Center</p>
          </div>
          {activeQuiz && (
            <button
              onClick={() => {
                if (
                  isSubmitted ||
                  confirm("Quit quiz? Progress will be lost.")
                ) {
                  setActiveQuiz(null);
                }
              }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              ← Back to Quizzes
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* VIEW 1: QUIZ LIST WITH SAVED SCORES & STATUS */}
        {!activeQuiz && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-black text-slate-900">
                Available Practice Tests
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                View completed test scores or retake a quiz to improve your rank.
              </p>
            </div>

            {loading ? (
              <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500">
                Loading practice quizzes...
              </div>
            ) : quizzes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <div className="text-4xl">📚</div>
                <h3 className="mt-4 font-bold text-slate-900">
                  No quizzes available
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Check back later for new practice exams!
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {quizzes.map((quiz) => {
                  const attempt = attempts[quiz.id];

                  return (
                    <div
                      key={quiz.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-orange-200 hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-lg font-black text-slate-900">
                            {quiz.title}
                          </h3>

                          {/* PASS / FAIL STATUS BADGE */}
                          {attempt && (
                            <span
                              className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                                attempt.passed
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {attempt.passed ? "✓ Passed" : "✕ Failed"}
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          {quiz.description || "No instructions provided."}
                        </p>

                        {/* SAVED SCORE SUMMARY */}
                        {attempt && (
                          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-700">
                            Best Score:{" "}
                            <span
                              className={`font-black ${
                                attempt.passed
                                  ? "text-emerald-600"
                                  : "text-red-600"
                              }`}
                            >
                              {attempt.score_percentage}%
                            </span>{" "}
                            (Pass mark: {quiz.passing_score}%)
                          </div>
                        )}
                      </div>

                      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                        <div className="flex gap-4 text-xs font-bold text-slate-500">
                          <span>⏱ {quiz.time_limit_minutes} Mins</span>
                        </div>

                        <button
                          onClick={() => startQuiz(quiz)}
                          className={`rounded-xl px-4 py-2 text-xs font-bold shadow-md transition-all ${
                            attempt
                              ? "bg-slate-900 text-white hover:bg-slate-800"
                              : "bg-orange-500 text-white shadow-orange-500/20 hover:bg-orange-600"
                          }`}
                        >
                          {attempt ? "Retake Quiz ↺" : "Start Test →"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: ACTIVE QUIZ & RESULTS INTERFACE */}
        {activeQuiz && (
          <div>
            {/* TIMER & PROGRESS BAR */}
            <div className="sticky top-20 z-20 mb-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {activeQuiz.title}
                </h2>
                <p className="text-xs text-slate-500">
                  Answered {Object.keys(userAnswers).length} of{" "}
                  {questions.length} questions
                </p>
              </div>

              {!isSubmitted && timeRemaining !== null && (
                <div
                  className={`rounded-xl px-4 py-2 text-sm font-black ${
                    timeRemaining < 120
                      ? "animate-pulse bg-red-100 text-red-600"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  ⏱ {formatTime(timeRemaining)}
                </div>
              )}
            </div>

            {/* RESULTS SCORE CARD */}
            {isSubmitted && score && (
              <div
                className={`mb-8 rounded-2xl border p-6 text-center ${
                  score.passed
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-red-200 bg-red-50/50"
                }`}
              >
                <div className="text-4xl">{score.passed ? "🎉" : "💪"}</div>
                <h3 className="mt-2 text-2xl font-black text-slate-900">
                  {score.passed ? "Test Passed!" : "Keep Practicing!"}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  You scored <span className="font-bold">{score.percentage}%</span> (
                  {score.correct} out of {questions.length} correct)
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Passing threshold: {activeQuiz.passing_score}%
                </p>
              </div>
            )}

            {/* QUESTION LIST */}
            <div className="space-y-6">
              {questions.map((q, qIndex) => {
                const selectedOption = userAnswers[q.id];
                const isCorrect = selectedOption === q.correct_option_index;

                return (
                  <div
                    key={q.id}
                    className={`rounded-2xl border bg-white p-6 shadow-sm transition-all ${
                      isSubmitted
                        ? isCorrect
                          ? "border-emerald-300"
                          : "border-red-300"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                        Question {qIndex + 1}
                      </span>
                      {isSubmitted && (
                        <span
                          className={`text-xs font-black uppercase ${
                            isCorrect ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {isCorrect ? "✓ Correct" : "✕ Incorrect"}
                        </span>
                      )}
                    </div>

                    <h3 className="mb-4 text-base font-bold text-slate-900">
                      {q.question_text}
                    </h3>

                    {/* ANSWER OPTIONS */}
                    <div className="space-y-2">
                      {q.options.map((option, oIndex) => {
                        let buttonStyle =
                          "border-slate-200 hover:bg-slate-50 text-slate-700";

                        if (isSubmitted) {
                          if (oIndex === q.correct_option_index) {
                            buttonStyle =
                              "border-emerald-500 bg-emerald-50 font-bold text-emerald-900";
                          } else if (selectedOption === oIndex) {
                            buttonStyle =
                              "border-red-500 bg-red-50 font-bold text-red-900";
                          } else {
                            buttonStyle =
                              "border-slate-100 opacity-50 text-slate-400";
                          }
                        } else if (selectedOption === oIndex) {
                          buttonStyle =
                            "border-orange-500 bg-orange-50 font-bold text-orange-900";
                        }

                        return (
                          <button
                            key={oIndex}
                            disabled={isSubmitted}
                            onClick={() => selectOption(q.id, oIndex)}
                            className={`flex w-full items-center justify-start rounded-xl border p-3.5 text-left text-sm transition-all ${buttonStyle}`}
                          >
                            <span className="mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
                              {String.fromCharCode(65 + oIndex)}
                            </span>
                            {option}
                          </button>
                        );
                      })}
                    </div>

                    {/* EXPLANATION */}
                    {isSubmitted && q.explanation && (
                      <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
                        <span className="font-bold text-slate-900">
                          Explanation:{" "}
                        </span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* SUBMIT BUTTON */}
            {!isSubmitted && (
              <div className="mt-8 flex justify-end">
                <button
                  onClick={submitQuiz}
                  className="rounded-xl bg-slate-900 px-8 py-3 text-sm font-bold text-white shadow-lg hover:bg-slate-800"
                >
                  Submit Quiz Answers
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}