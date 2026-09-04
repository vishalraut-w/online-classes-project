"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// ============================================================
// TYPES
// ============================================================

type Course = {
  id: string;
  title: string;
  description: string | null;
  teacher_name: string | null;
  subject: string | null;
  price: number | null;
  billing_period: string | null;
  course_type: string | null;
  is_free: boolean | null;
  is_published: boolean | null;
};

type Lesson = {
  id: string;
  course_id: string;
  title: string;
  video_path: string | null;
  video_url: string | null;
  position: number | null;
};

type VideoSource = "upload" | "url";

// ============================================================
// PAGE
// ============================================================

export default function LessonsPage() {
  const params = useParams();
  const router = useRouter();

  const courseId = Array.isArray(params.courseId)
    ? params.courseId[0]
    : params.courseId;

  // ==========================================================
  // STATE
  // ==========================================================

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");

  const [videoFile, setVideoFile] =
    useState<File | null>(null);

  const [videoUrl, setVideoUrl] =
    useState("");

  const [videoSource, setVideoSource] =
    useState<VideoSource>("upload");

  const [previewLesson, setPreviewLesson] =
    useState<Lesson | null>(null);

  // ==========================================================
  // LOAD COURSE
  // ==========================================================

  async function loadCourse() {
    if (!courseId) return;

    const { data, error } = await supabase
      .from("courses")
      .select(`
        id,
        title,
        description,
        teacher_name,
        subject,
        price,
        billing_period,
        course_type,
        is_free,
        is_published
      `)
      .eq("id", courseId)
      .maybeSingle();

    if (error) {
      console.error(
        "LOAD COURSE ERROR:",
        error
      );

      alert(error.message);
      return;
    }

    if (!data) {
      alert("Course not found.");
      router.push("/admin/courses");
      return;
    }

    setCourse(data);
  }

  // ==========================================================
  // LOAD LESSONS
  // ==========================================================

  async function loadLessons() {
    if (!courseId) return;

    const { data, error } = await supabase
      .from("lessons")
      .select(`
        id,
        course_id,
        title,
        video_path,
        video_url,
        position
      `)
      .eq("course_id", courseId)
      .order("position", {
        ascending: true,
      });

    if (error) {
      console.error(
        "LOAD LESSONS ERROR:",
        error
      );

      alert(error.message);
      return;
    }

    setLessons(data || []);
  }

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    if (!courseId) return;

    async function loadPage() {
      setLoading(true);

      await Promise.all([
        loadCourse(),
        loadLessons(),
      ]);

      setLoading(false);
    }

    loadPage();
  }, [courseId]);

  // ==========================================================
  // RESET FORM
  // ==========================================================

  function resetForm() {
    setTitle("");
    setVideoUrl("");
    setVideoFile(null);
    setVideoSource("upload");

    const input =
      document.getElementById(
        "lesson-video"
      ) as HTMLInputElement | null;

    if (input) {
      input.value = "";
    }
  }

  // ==========================================================
  // CHANGE VIDEO SOURCE
  // ==========================================================

  function changeVideoSource(
    source: VideoSource
  ) {
    setVideoSource(source);

    if (source === "upload") {
      setVideoUrl("");
    }

    if (source === "url") {
      setVideoFile(null);

      const input =
        document.getElementById(
          "lesson-video"
        ) as HTMLInputElement | null;

      if (input) {
        input.value = "";
      }
    }
  }

  // ==========================================================
  // ADD LESSON
  // ==========================================================

  async function addLesson(
    e: React.FormEvent
  ) {
    e.preventDefault();

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!title.trim()) {
      alert(
        "Please enter a lesson title."
      );
      return;
    }

    if (
      videoSource === "upload" &&
      !videoFile
    ) {
      alert(
        "Please select a video file."
      );
      return;
    }

    if (
      videoSource === "url" &&
      !videoUrl.trim()
    ) {
      alert(
        "Please enter the video URL."
      );
      return;
    }

    setSaving(true);

    try {
      // ------------------------------------------------------
      // CHECK LOGIN
      // ------------------------------------------------------

      const {
        data: userData,
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !userData.user
      ) {
        alert(
          "You are not logged in."
        );
        return;
      }

      // ------------------------------------------------------
      // CHECK ADMIN
      // ------------------------------------------------------

      const {
        data: adminCheck,
        error: adminCheckError,
      } = await supabase.rpc(
        "is_admin"
      );

      console.log(
        "ADMIN CHECK:",
        adminCheck
      );

      if (adminCheckError) {
        console.error(
          "ADMIN CHECK ERROR:",
          adminCheckError
        );

        alert(
          "Could not verify administrator permission."
        );

        return;
      }

      if (!adminCheck) {
        alert(
          "You do not have administrator permission."
        );

        return;
      }

      // ------------------------------------------------------
      // VIDEO VARIABLES
      // ------------------------------------------------------

      let videoPath: string | null =
        null;

      let finalVideoUrl: string | null =
        null;

      // ------------------------------------------------------
      // UPLOAD VIDEO
      // ------------------------------------------------------

      if (videoSource === "upload") {
        if (!videoFile) {
          alert(
            "Please select a video file."
          );
          return;
        }

        const fileExtension =
          videoFile.name
            .split(".")
            .pop() || "mp4";

        const fileName =
          `${crypto.randomUUID()}.${fileExtension}`;

        const storagePath =
          `${courseId}/${fileName}`;

        console.log(
          "Uploading video:",
          storagePath
        );

        const {
          error: uploadError,
        } = await supabase.storage
          .from("course-videos")
          .upload(
            storagePath,
            videoFile,
            {
              cacheControl: "3600",
              upsert: false,
              contentType:
                videoFile.type ||
                "video/mp4",
            }
          );

        if (uploadError) {
          console.error(
            "VIDEO UPLOAD ERROR:",
            uploadError
          );

          alert(
            `Video upload failed\n\n${uploadError.message}`
          );

          return;
        }

        videoPath =
          storagePath;

        console.log(
          "VIDEO UPLOAD SUCCESS:",
          videoPath
        );
      }

      // ------------------------------------------------------
      // EXTERNAL VIDEO URL
      // ------------------------------------------------------

      if (videoSource === "url") {
        finalVideoUrl =
          videoUrl.trim();

        console.log(
          "Using external video URL:",
          finalVideoUrl
        );
      }

      // ------------------------------------------------------
      // CREATE LESSON
      // ------------------------------------------------------

      const {
        error: lessonError,
      } = await supabase
        .from("lessons")
        .insert({
          course_id: courseId,

          title: title.trim(),

          video_path:
            videoPath,

          video_url:
            finalVideoUrl,

          position:
            lessons.length,
        });

      if (lessonError) {
        console.error(
          "CREATE LESSON ERROR:",
          lessonError
        );

        console.error(
          "message:",
          lessonError.message
        );

        console.error(
          "details:",
          lessonError.details
        );

        console.error(
          "hint:",
          lessonError.hint
        );

        console.error(
          "code:",
          lessonError.code
        );

        // ----------------------------------------------------
        // REMOVE UPLOADED FILE IF DATABASE INSERT FAILED
        // ----------------------------------------------------

        if (videoPath) {
          const {
            error:
              cleanupError,
          } =
            await supabase.storage
              .from(
                "course-videos"
              )
              .remove([
                videoPath,
              ]);

          if (cleanupError) {
            console.error(
              "VIDEO CLEANUP ERROR:",
              cleanupError
            );
          }
        }

        alert(
          `Lesson creation failed\n\n${lessonError.message}`
        );

        return;
      }

      // ------------------------------------------------------
      // SUCCESS
      // ------------------------------------------------------

      alert(
        "Lesson created successfully!"
      );

      resetForm();

      await loadLessons();

    } catch (error) {
      console.error(
        "LESSON CREATION ERROR:",
        error
      );

      alert(
        "Something went wrong while creating the lesson."
      );

    } finally {
      setSaving(false);
    }
  }

  // ==========================================================
  // GET STORAGE VIDEO URL
  // ==========================================================

  function getStorageVideoUrl(
    videoPath: string
  ) {
    const { data } =
      supabase.storage
        .from("course-videos")
        .getPublicUrl(
          videoPath
        );

    return data.publicUrl;
  }

  // ==========================================================
  // GET LESSON VIDEO URL
  // ==========================================================

  function getLessonVideoUrl(
    lesson: Lesson
  ) {
    if (lesson.video_url) {
      return lesson.video_url;
    }

    if (lesson.video_path) {
      return getStorageVideoUrl(
        lesson.video_path
      );
    }

    return null;
  }

  // ==========================================================
  // DELETE LESSON
  // ==========================================================

  async function deleteLesson(
    lesson: Lesson
  ) {
    const confirmed =
      window.confirm(
        `Delete "${lesson.title}"?\n\nThis cannot be undone.`
      );

    if (!confirmed) return;

    try {
      // ------------------------------------------------------
      // DELETE DATABASE RECORD
      // ------------------------------------------------------

      const { error } =
        await supabase
          .from("lessons")
          .delete()
          .eq(
            "id",
            lesson.id
          );

      if (error) {
        console.error(
          "DELETE LESSON ERROR:",
          error
        );

        alert(error.message);
        return;
      }

      // ------------------------------------------------------
      // DELETE STORAGE VIDEO
      // ------------------------------------------------------

      if (lesson.video_path) {
        const {
          error:
            storageError,
        } =
          await supabase.storage
            .from(
              "course-videos"
            )
            .remove([
              lesson.video_path,
            ]);

        if (storageError) {
          console.error(
            "STORAGE DELETE ERROR:",
            storageError
          );
        }
      }

      setPreviewLesson(null);

      await loadLessons();

    } catch (error) {
      console.error(
        "DELETE ERROR:",
        error
      );

      alert(
        "Something went wrong while deleting the lesson."
      );
    }
  }

  // ==========================================================
  // MOVE LESSON UP
  // ==========================================================

  async function moveLessonUp(
    index: number
  ) {
    if (index === 0) return;

    const current =
      lessons[index];

    const previous =
      lessons[index - 1];

    const currentPosition =
      current.position ??
      index + 1;

    const previousPosition =
      previous.position ??
      index;

    const {
      error: firstError,
    } = await supabase
      .from("lessons")
      .update({
        position:
          previousPosition,
      })
      .eq(
        "id",
        current.id
      );

    if (firstError) {
      console.error(
        "MOVE LESSON ERROR:",
        firstError
      );

      alert(
        firstError.message
      );

      return;
    }

    const {
      error: secondError,
    } = await supabase
      .from("lessons")
      .update({
        position:
          currentPosition,
      })
      .eq(
        "id",
        previous.id
      );

    if (secondError) {
      console.error(
        "MOVE LESSON ERROR:",
        secondError
      );

      alert(
        secondError.message
      );

      return;
    }

    await loadLessons();
  }

  // ==========================================================
  // MOVE LESSON DOWN
  // ==========================================================

  async function moveLessonDown(
    index: number
  ) {
    if (
      index ===
      lessons.length - 1
    ) {
      return;
    }

    const current =
      lessons[index];

    const next =
      lessons[index + 1];

    const currentPosition =
      current.position ??
      index + 1;

    const nextPosition =
      next.position ??
      index + 2;

    const {
      error: firstError,
    } = await supabase
      .from("lessons")
      .update({
        position:
          nextPosition,
      })
      .eq(
        "id",
        current.id
      );

    if (firstError) {
      console.error(
        "MOVE LESSON ERROR:",
        firstError
      );

      alert(
        firstError.message
      );

      return;
    }

    const {
      error: secondError,
    } = await supabase
      .from("lessons")
      .update({
        position:
          currentPosition,
      })
      .eq(
        "id",
        next.id
      );

    if (secondError) {
      console.error(
        "MOVE LESSON ERROR:",
        secondError
      );

      alert(
        secondError.message
      );

      return;
    }

    await loadLessons();
  }

  // ==========================================================
  // TOGGLE COURSE PUBLISHED
  // ==========================================================

  async function toggleCoursePublished() {
    if (!course) return;

    const newStatus =
      !course.is_published;

    const { error } =
      await supabase
        .from("courses")
        .update({
          is_published:
            newStatus,
        })
        .eq(
          "id",
          course.id
        );

    if (error) {
      console.error(
        "COURSE PUBLISH ERROR:",
        error
      );

      alert(error.message);
      return;
    }

    setCourse({
      ...course,
      is_published:
        newStatus,
    });
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm font-semibold text-orange-600">
          Loading course...
        </div>
      </div>
    );
  }

  // ==========================================================
  // COURSE NOT FOUND
  // ==========================================================

  if (!course) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

          <div className="text-4xl">
            📚
          </div>

          <h2 className="mt-4 text-xl font-black text-slate-900">
            Course not found
          </h2>

          <button
            onClick={() =>
              router.push(
                "/admin/courses"
              )
            }
            className="mt-5 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white"
          >
            ← Back to Courses
          </button>

        </div>
      </div>
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">

          <div className="min-w-0">

            <h1 className="text-xl font-black text-slate-900">
              Raut Coaching
            </h1>

            <p className="text-xs text-slate-500">
              Lesson Manager
            </p>

          </div>

          <button
            onClick={() =>
              router.push(
                "/admin/courses"
              )
            }
            className="shrink-0 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            ← Courses
          </button>

        </div>

      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">

        {/* ====================================================
            COURSE INFORMATION
        ==================================================== */}

        <div className="mb-8 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div className="min-w-0">

              <div className="flex flex-wrap items-center gap-2">

                <h2 className="text-2xl font-black text-slate-900">
                  {course.title}
                </h2>

                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                    course.is_published
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {course.is_published
                    ? "Published"
                    : "Draft"}
                </span>

              </div>

              <div className="mt-3 flex flex-wrap gap-2">

                {course.subject && (
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                    📚 {course.subject}
                  </span>
                )}

                {course.course_type && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {course.course_type}
                  </span>
                )}

                {course.teacher_name && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    👨‍🏫 {course.teacher_name}
                  </span>
                )}

              </div>

              {course.description && (
                <p className="mt-4 max-w-3xl text-sm text-slate-500">
                  {course.description}
                </p>
              )}

            </div>

            <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">

              <div className="text-right">

                <p className="text-xs font-semibold text-slate-400">
                  Course Price
                </p>

                {course.is_free ||
                !course.price ||
                course.price <= 0 ? (
                  <p className="text-2xl font-black text-emerald-600">
                    FREE
                  </p>
                ) : (
                  <p className="text-2xl font-black text-orange-600">

                    ₹
                    {Number(
                      course.price
                    ).toLocaleString(
                      "en-IN"
                    )}

                    {course.billing_period && (
                      <span className="text-xs font-semibold text-slate-400">
                        {" "}
                        /{" "}
                        {
                          course.billing_period
                        }
                      </span>
                    )}

                  </p>
                )}

              </div>

              <button
                onClick={
                  toggleCoursePublished
                }
                className={`rounded-xl px-5 py-2.5 text-xs font-bold ${
                  course.is_published
                    ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    : "bg-emerald-500 text-white hover:bg-emerald-600"
                }`}
              >
                {course.is_published
                  ? "Unpublish Course"
                  : "Publish Course"}
              </button>

            </div>

          </div>

        </div>

        {/* ====================================================
            ADD LESSON
        ==================================================== */}

        <form
          onSubmit={addLesson}
          className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >

          <div className="mb-5">

            <h3 className="text-lg font-black text-slate-900">
              Add New Lesson
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Add a lesson and attach either an uploaded video
              or an external video URL.
            </p>

          </div>

          <div className="grid gap-5">

            {/* LESSON TITLE */}

            <div>

              <label className="mb-2 block text-sm font-bold text-slate-700">
                Lesson Title
              </label>

              <input
                value={title}
                onChange={(e) =>
                  setTitle(
                    e.target.value
                  )
                }
                placeholder="Example: Introduction to Algebra"
                disabled={saving}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 disabled:bg-slate-50"
              />

            </div>

            {/* VIDEO SOURCE */}

            <div>

              <label className="mb-3 block text-sm font-bold text-slate-700">
                Video Source
              </label>

              <div className="grid gap-3 sm:grid-cols-2">

                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    changeVideoSource(
                      "upload"
                    )
                  }
                  className={`rounded-xl border-2 p-4 text-left transition ${
                    videoSource === "upload"
                      ? "border-orange-500 bg-orange-50"
                      : "border-slate-200 hover:border-orange-200"
                  }`}
                >

                  <div className="font-black text-slate-900">
                    📁 Upload Video
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Upload an MP4 or other video to Supabase Storage.
                  </p>

                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    changeVideoSource(
                      "url"
                    )
                  }
                  className={`rounded-xl border-2 p-4 text-left transition ${
                    videoSource === "url"
                      ? "border-orange-500 bg-orange-50"
                      : "border-slate-200 hover:border-orange-200"
                  }`}
                >

                  <div className="font-black text-slate-900">
                    🔗 External Video URL
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Use a direct video URL such as an MP4 file.
                  </p>

                </button>

              </div>

            </div>

            {/* UPLOAD */}

            {videoSource === "upload" && (
              <div>

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Select Video
                </label>

                <input
                  id="lesson-video"
                  type="file"
                  accept="video/*"
                  disabled={saving}
                  onChange={(e) =>
                    setVideoFile(
                      e.target.files?.[0] ||
                        null
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                />

                {videoFile && (
                  <div className="mt-2 rounded-lg bg-emerald-50 p-3">

                    <p className="text-xs font-bold text-emerald-700">
                      ✓ Selected video
                    </p>

                    <p className="mt-1 truncate text-xs text-emerald-600">
                      {videoFile.name}
                    </p>

                  </div>
                )}

              </div>
            )}

            {/* EXTERNAL URL */}

            {videoSource === "url" && (
              <div>

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Direct Video URL
                </label>

                <input
                  type="url"
                  value={videoUrl}
                  disabled={saving}
                  onChange={(e) =>
                    setVideoUrl(
                      e.target.value
                    )
                  }
                  placeholder="https://example.com/video.mp4"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-500"
                />

                <p className="mt-2 text-xs text-slate-400">
                  The URL should point directly to a playable video file.
                </p>

              </div>
            )}

          </div>

          <div className="mt-6 flex justify-end">

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Creating Lesson..."
                : "+ Add Lesson"}
            </button>

          </div>

        </form>

        {/* ====================================================
            LESSON LIST
        ==================================================== */}

        <section>

          <div className="mb-4 flex items-center justify-between">

            <div>

              <h3 className="text-lg font-black text-slate-900">
                Course Lessons
              </h3>

              <p className="text-xs text-slate-500">
                {lessons.length}{" "}
                {lessons.length === 1
                  ? "lesson"
                  : "lessons"}
              </p>

            </div>

          </div>

          {lessons.length === 0 ? (

            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">

              <div className="text-5xl">
                🎥
              </div>

              <h4 className="mt-4 font-bold text-slate-900">
                No lessons yet
              </h4>

              <p className="mt-1 text-sm text-slate-500">
                Add your first lesson above.
              </p>

            </div>

          ) : (

            <div className="space-y-3">

              {lessons.map(
                (
                  lesson,
                  index
                ) => {

                  const videoUrl =
                    getLessonVideoUrl(
                      lesson
                    );

                  return (
                    <div
                      key={
                        lesson.id
                      }
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >

                      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                        {/* LESSON INFO */}

                        <div className="flex min-w-0 items-center gap-4">

                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-lg font-black text-orange-600">
                            {lesson.position ??
                              index + 1}
                          </div>

                          <div className="min-w-0">

                            <h4 className="font-bold text-slate-900">
                              {
                                lesson.title
                              }
                            </h4>

                            <div className="mt-1 flex flex-wrap items-center gap-2">

                              {lesson.video_path && (
                                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                                  🎥 Uploaded Video
                                </span>
                              )}

                              {lesson.video_url && (
                                <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                                  🔗 External URL
                                </span>
                              )}

                              {!lesson.video_path &&
                                !lesson.video_url && (
                                  <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold text-red-600">
                                    ❌ No Video
                                  </span>
                                )}

                            </div>

                            {lesson.video_url && (
                              <p className="mt-2 max-w-xl truncate text-xs text-blue-500">
                                {
                                  lesson.video_url
                                }
                              </p>
                            )}

                          </div>

                        </div>

                        {/* ACTIONS */}

                        <div className="flex flex-wrap gap-2">

                          {videoUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewLesson(
                                  lesson
                                )
                              }
                              className="rounded-lg bg-orange-50 px-4 py-2 text-xs font-bold text-orange-600 hover:bg-orange-100"
                            >
                              ▶ Preview
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={
                              index === 0
                            }
                            onClick={() =>
                              moveLessonUp(
                                index
                              )
                            }
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ↑
                          </button>

                          <button
                            type="button"
                            disabled={
                              index ===
                              lessons.length -
                                1
                            }
                            onClick={() =>
                              moveLessonDown(
                                index
                              )
                            }
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ↓
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteLesson(
                                lesson
                              )
                            }
                            className="rounded-lg bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
                          >
                            Delete
                          </button>

                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </section>

      </main>

      {/* ======================================================
          VIDEO PREVIEW MODAL
      ====================================================== */}

      {previewLesson && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
          onClick={() =>
            setPreviewLesson(null)
          }
        >

          <div
            className="w-full max-w-4xl rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="mb-4 flex items-center justify-between gap-4">

              <div className="min-w-0">

                <p className="text-xs font-bold uppercase text-orange-500">
                  Video Preview
                </p>

                <h3 className="truncate text-lg font-black text-slate-900">
                  {
                    previewLesson.title
                  }
                </h3>

              </div>

              <button
                type="button"
                onClick={() =>
                  setPreviewLesson(
                    null
                  )
                }
                className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200"
              >
                ✕
              </button>

            </div>

            {getLessonVideoUrl(
              previewLesson
            ) ? (

              <video
                key={
                  previewLesson.id
                }
                controls
                playsInline
                className="max-h-[70vh] w-full rounded-xl bg-black"
                src={
                  getLessonVideoUrl(
                    previewLesson
                  ) || undefined
                }
              >
                Your browser does not support video playback.
              </video>

            ) : (

              <div className="rounded-xl bg-slate-100 p-12 text-center text-sm text-slate-500">
                No video available.
              </div>

            )}

          </div>

        </div>
      )}

    </div>
  );
}