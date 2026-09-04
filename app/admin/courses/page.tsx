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

const SUBJECT_OPTIONS = [
  "English",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Marathi",
  "Hindi",
  "Social Science",
  "Computer Science",
];

const BILLING_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "one_time", label: "One Time" },
];

export default function AdminPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // EDIT STATE
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

  // FORM FIELDS
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [price, setPrice] = useState("");
  const [courseType, setCourseType] = useState<"subject" | "combo">("subject");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [billingPeriod, setBillingPeriod] = useState("monthly");

  async function loadCourses() {
    setLoading(true);
    const { data, error } = await supabase
      .from("courses")
      .select("id, title, description, teacher_name, price, billing_period, course_type, subjects, is_published, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("LOAD COURSES ERROR:", error);
      alert(error.message);
    } else {
      setCourses((data || []) as Course[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadCourses();
  }, []);

  function toggleSubject(subject: string) {
    setSelectedSubjects((previous) =>
      previous.includes(subject)
        ? previous.filter((item) => item !== subject)
        : [...previous, subject]
    );
  }

  function resetForm() {
    setEditingCourseId(null);
    setTitle("");
    setDescription("");
    setTeacherName("");
    setPrice("");
    setCourseType("subject");
    setSelectedSubjects([]);
    setBillingPeriod("monthly");
  }

  function handleStartEdit(course: Course) {
    setEditingCourseId(course.id);
    setTitle(course.title);
    setDescription(course.description || "");
    setTeacherName(course.teacher_name || "");
    setPrice(String(course.price));
    setCourseType(course.course_type === "combo" ? "combo" : "subject");
    setSelectedSubjects(course.subjects || []);
    setBillingPeriod(course.billing_period || "monthly");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSaveCourse(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !teacherName.trim() || !price.trim()) {
      alert("Please fill in title, teacher name, and price.");
      return;
    }

    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      alert("Please enter a valid price.");
      return;
    }

    if (selectedSubjects.length === 0) {
      alert("Please select at least one subject.");
      return;
    }

    if (courseType === "combo" && selectedSubjects.length < 2) {
      alert("A combo must contain at least two subjects.");
      return;
    }

    setSaving(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        alert("You are not logged in.");
        return;
      }

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        teacher_name: teacherName.trim(),
        price: numericPrice,
        billing_period: billingPeriod,
        course_type: courseType,
        subjects: selectedSubjects,
      };

      if (editingCourseId) {
        // UPDATE EXISTING COURSE
        const { error } = await supabase
          .from("courses")
          .update(payload)
          .eq("id", editingCourseId);

        if (error) throw error;
        alert("Course updated successfully!");
      } else {
        // CREATE NEW COURSE
        const { error } = await supabase.from("courses").insert({
          ...payload,
          instructor_id: userData.user.id,
          is_published: false,
        });

        if (error) throw error;
        alert("Course created successfully!");
      }

      resetForm();
      setShowForm(false);
      await loadCourses();
    } catch (error: any) {
      console.error("SAVE ERROR:", error);
      alert(error.message || "Something went wrong saving the course.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(course: Course) {
    const { error } = await supabase
      .from("courses")
      .update({ is_published: !course.is_published })
      .eq("id", course.id);

    if (error) alert(error.message);
    else await loadCourses();
  }

  async function deleteCourse(course: Course) {
    if (!confirm(`Delete "${course.title}"?`)) return;
    const { error } = await supabase.from("courses").delete().eq("id", course.id);
    if (error) alert(error.message);
    else await loadCourses();
  }

  function billingLabel(billing: string | null) {
    if (billing === "monthly") return "/ month";
    if (billing === "yearly") return "/ year";
    if (billing === "one_time") return " one time";
    return "";
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-black text-slate-900">Raut Coaching</h1>
            <p className="text-xs text-slate-500">Admin Course Manager</p>
          </div>
          <a href="/dashboard" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Student Dashboard
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Courses & Combos</h2>
            <p className="mt-1 text-sm text-slate-500">Create and manage prices, courses, and subscription options.</p>
          </div>

          <button
            onClick={() => {
              if (showForm) resetForm();
              setShowForm(!showForm);
            }}
            className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600"
          >
            {showForm ? "Close Form" : "+ Add Course"}
          </button>
        </div>

        {/* FORM (CREATE OR EDIT) */}
        {showForm && (
          <form onSubmit={handleSaveCourse} className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-6 text-lg font-black text-slate-900">
              {editingCourseId ? "Edit Course / Pricing" : "Create New Course / Combo"}
            </h3>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold text-slate-700">Course Type</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setCourseType("subject")}
                    className={`rounded-xl border p-4 text-left ${courseType === "subject" ? "border-orange-500 bg-orange-50" : "border-slate-200 bg-white"}`}
                  >
                    <div className="font-black text-slate-900">📚 Single Subject</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCourseType("combo")}
                    className={`rounded-xl border p-4 text-left ${courseType === "combo" ? "border-orange-500 bg-orange-50" : "border-slate-200 bg-white"}`}
                  >
                    <div className="font-black text-slate-900">🎁 Combo</div>
                  </button>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold text-slate-700">Course Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold text-slate-700">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Teacher Name</label>
                <input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Price (₹)</label>
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Billing Period</label>
                <select value={billingPeriod} onChange={(e) => setBillingPeriod(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm">
                  {BILLING_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold text-slate-700">Subjects</label>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {SUBJECT_OPTIONS.map((sub) => {
                    const selected = selectedSubjects.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => toggleSubject(sub)}
                        className={`rounded-xl border p-3 text-left text-sm font-bold ${selected ? "border-orange-500 bg-orange-50 text-orange-700" : "border-slate-200 text-slate-700"}`}
                      >
                        {selected ? "✓ " : ""}{sub}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              {editingCourseId && (
                <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">
                  Cancel
                </button>
              )}
              <button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800">
                {saving ? "Saving..." : editingCourseId ? "Update Course" : "Create Course"}
              </button>
            </div>
          </form>
        )}

        {/* LIST */}
        <div className="grid gap-5">
          {courses.map((course) => (
            <div key={course.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-900">{course.title}</h3>
                <p className="text-sm text-slate-500">{course.teacher_name}</p>
                <p className="mt-2 text-lg font-black text-orange-600">₹{course.price} {billingLabel(course.billing_period)}</p>
              </div>
              <div className="flex gap-2">
                {/* LESSON MANAGER BUTTON (BEFORE EDIT COURSE) */}
                <Link 
                  href={`/admin/courses/${course.id}/lessons`} 
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 flex items-center gap-1"
                >
                  📖 Lesson Manager
                </Link>
                <button onClick={() => handleStartEdit(course)} className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200">
                  ✏️ Edit Course
                </button>
                <button onClick={() => togglePublished(course)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700">
                  {course.is_published ? "Unpublish" : "Publish"}
                </button>
                <button onClick={() => deleteCourse(course)} className="rounded-lg bg-red-50 px-4 py-2 text-xs font-bold text-red-600">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}