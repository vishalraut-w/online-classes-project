"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Question = {
  id: string;
  question_text: string;
  options: string[];
  correct_option_index: number;
  explanation: string;
};

type Quiz = {
  id: string;
  title: string;
  description: string | null;
  time_limit_minutes: number;
  passing_score: number;
  is_published: boolean;
  created_at: string;
  course_id: string | null;
};

type Course = {
  id: string;
  title: string;
};

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // QUIZ METADATA FORM
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [timeLimit, setTimeLimit] = useState("15");
  const [passingScore, setPassingScore] = useState("70");

  // QUESTIONS FORM
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: crypto.randomUUID(),
      question_text: "",
      options: ["", "", "", ""],
      correct_option_index: 0,
      explanation: "",
    },
  ]);

  async function loadInitialData() {
    setLoading(true);

    // Load Quizzes
    const { data: quizData, error: quizError } = await supabase
      .from("quizzes")
      .select("*")
      .order("created_at", { ascending: false });

    if (quizError) {
      console.error("LOAD QUIZZES ERROR:", quizError);
    } else {
      setQuizzes((quizData || []) as Quiz[]);
    }

    // Load Courses for dropdown
    const { data: courseData, error: courseError } = await supabase
      .from("courses")
      .select("id, title")
      .order("title", { ascending: true });

    if (courseError) {
      console.error("LOAD COURSES ERROR:", courseError);
    } else {
      setCourses((courseData || []) as Course[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  // QUESTION HANDLERS
  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        question_text: "",
        options: ["", "", "", ""],
        correct_option_index: 0,
        explanation: "",
      },
    ]);
  }

  function removeQuestion(index: number) {
    if (questions.length === 1) {
      alert("A quiz must have at least one question.");
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateQuestionText(index: number, text: string) {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], question_text: text };
      return updated;
    });
  }

  function updateOptionText(qIndex: number, oIndex: number, text: string) {
    setQuestions((prev) => {
      const updated = [...prev];
      const newOptions = [...updated[qIndex].options];
      newOptions[oIndex] = text;
      updated[qIndex] = { ...updated[qIndex], options: newOptions };
      return updated;
    });
  }

  function updateCorrectOption(qIndex: number, oIndex: number) {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[qIndex] = { ...updated[qIndex], correct_option_index: oIndex };
      return updated;
    });
  }

  function updateExplanation(index: number, text: string) {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], explanation: text };
      return updated;
    });
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setSelectedCourseId("");
    setTimeLimit("15");
    setPassingScore("70");
    setQuestions([
      {
        id: crypto.randomUUID(),
        question_text: "",
        options: ["", "", "", ""],
        correct_option_index: 0,
        explanation: "",
      },
    ]);
  }

  async function createQuiz(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) return alert("Please enter a quiz title.");

    // Validate Questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) {
        return alert(`Question #${i + 1} is missing the question text.`);
      }
      if (q.options.some((opt) => !opt.trim())) {
        return alert(`Question #${i + 1} has empty answer choices.`);
      }
    }

    setSaving(true);

    try {
      // 1. Create Quiz Record
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          course_id: selectedCourseId || null,
          time_limit_minutes: Number(timeLimit) || 15,
          passing_score: Number(passingScore) || 70,
          is_published: false,
        })
        .select()
        .single();

      if (quizError) throw quizError;

      // 2. Prepare and Insert Questions
      const formattedQuestions = questions.map((q, index) => ({
        quiz_id: quizData.id,
        question_text: q.question_text.trim(),
        options: q.options.map((opt) => opt.trim()),
        correct_option_index: q.correct_option_index,
        explanation: q.explanation.trim() || null,
        order_index: index,
      }));

      const { error: questionsError } = await supabase
        .from("quiz_questions")
        .insert(formattedQuestions);

      if (questionsError) throw questionsError;

      alert("Quiz created successfully!");
      resetForm();
      setShowForm(false);
      await loadInitialData();
    } catch (error: any) {
      console.error("CREATE QUIZ ERROR:", error);
      alert(`Failed to create quiz: ${error?.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(quiz: Quiz) {
    const { error } = await supabase
      .from("quizzes")
      .update({ is_published: !quiz.is_published })
      .eq("id", quiz.id);

    if (error) alert(error.message);
    else await loadInitialData();
  }

  async function deleteQuiz(quiz: Quiz) {
    if (!confirm(`Delete "${quiz.title}"?`)) return;

    const { error } = await supabase
      .from("quizzes")
      .delete()
      .eq("id", quiz.id);

    if (error) alert(error.message);
    else await loadInitialData();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-black text-slate-900">
              Raut Coaching
            </h1>
            <p className="text-xs text-slate-500">Quiz Manager</p>
          </div>

          <Link
            href="/admin"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            ← Admin Dashboard
          </Link>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              Quizzes & Assessment
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Create multiple-choice practice tests and assign them to courses.
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600"
          >
            {showForm ? "Close Form" : "+ Create Quiz"}
          </button>
        </div>

        {/* CREATE QUIZ FORM */}
        {showForm && (
          <form
            onSubmit={createQuiz}
            className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h3 className="mb-6 text-lg font-black text-slate-900">
              Quiz Setup
            </h3>

            {/* QUIZ CONFIGURATION */}
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Quiz Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Physics Chapter 1 Practice Test"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief overview or instructions for students..."
                  rows={2}
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Link to Course (Optional)
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-500"
                >
                  <option value="">-- General / No Specific Course --</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Time Limit (Mins)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Passing %
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={passingScore}
                    onChange={(e) => setPassingScore(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* QUESTIONS BUILDER */}
            <div className="mt-8 border-t border-slate-200 pt-6">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-md font-black text-slate-900">
                  Questions ({questions.length})
                </h4>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="rounded-lg border border-orange-500 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-100"
                >
                  + Add Question
                </button>
              </div>

              <div className="space-y-6">
                {questions.map((q, qIndex) => (
                  <div
                    key={q.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-slate-500">
                        Question #{qIndex + 1}
                      </span>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(qIndex)}
                          className="text-xs font-bold text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {/* QUESTION TEXT */}
                    <input
                      value={q.question_text}
                      onChange={(e) =>
                        updateQuestionText(qIndex, e.target.value)
                      }
                      placeholder="Enter question prompt..."
                      className="mb-4 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500"
                    />

                    {/* OPTIONS */}
                    <div className="mb-4 space-y-2">
                      <label className="block text-xs font-bold text-slate-600">
                        Options (Select the radio button next to the correct answer):
                      </label>
                      {q.options.map((opt, oIndex) => (
                        <div
                          key={oIndex}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={q.correct_option_index === oIndex}
                            onChange={() => updateCorrectOption(qIndex, oIndex)}
                            className="h-4 w-4 text-orange-500 focus:ring-orange-500"
                          />
                          <input
                            value={opt}
                            onChange={(e) =>
                              updateOptionText(qIndex, oIndex, e.target.value)
                            }
                            placeholder={`Option ${oIndex + 1}`}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-orange-500"
                          />
                        </div>
                      ))}
                    </div>

                    {/* EXPLANATION */}
                    <input
                      value={q.explanation}
                      onChange={(e) =>
                        updateExplanation(qIndex, e.target.value)
                      }
                      placeholder="Explanation for the correct answer (optional)..."
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-orange-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? "Saving Quiz..." : "Save & Create Quiz"}
              </button>
            </div>
          </form>
        )}

        {/* QUIZZES LIST */}
        {loading ? (
          <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500">
            Loading quizzes...
          </div>
        ) : quizzes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="text-4xl">📝</div>
            <h3 className="mt-4 font-bold text-slate-900">No quizzes created</h3>
            <p className="mt-1 text-sm text-slate-500">
              Create your first quiz to assess student learning.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">
                      {quiz.title}
                    </h3>
                    <span
                      className={`rounded-full px-3 py-0.5 text-[10px] font-black uppercase ${
                        quiz.is_published
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {quiz.is_published ? "Published" : "Draft"}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    {quiz.description || "No description provided."}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-slate-600">
                    <span>⏱ {quiz.time_limit_minutes} Mins</span>
                    <span>🎯 Passing: {quiz.passing_score}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => togglePublished(quiz)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    {quiz.is_published ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    onClick={() => deleteQuiz(quiz)}
                    className="rounded-lg bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}