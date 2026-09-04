"use client";

import { useEffect, useState, useRef, use } from "react";
import Script from "next/script";
import { supabase } from "@/lib/supabaseClient";

type Lesson = {
  id: string;
  course_id: string;
  title: string;
  video_path: string | null;
  video_url: string | null;
  position: number | null;
};

type Course = {
  id: string;
  title: string;
  description: string | null;
  teacher_name: string | null;
  subject: string | null;
  course_type: string | null;
  price: number;
  is_free: boolean | null;
};

export default function StudentCourseLessonsPage({
  params,
}: {
  params: Promise<Record<string, string>>;
}) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.id || resolvedParams.courseId;

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean>(false);

  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [lessonSearch, setLessonSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "instructor" | "shortcuts">("overview");

  // Custom Player State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to initialize data
  const initData = async () => {
    if (!courseId) {
      setErrorMsg("Invalid Course ID.");
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Fetch Course details
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("id, title, description, teacher_name, subject, course_type, price, is_free")
        .eq("id", courseId)
        .maybeSingle();

      if (courseError || !courseData) {
        setErrorMsg("Course not found or access restricted.");
        setLoading(false);
        return;
      }

      setCourse(courseData);

      // 2. Access Gate Verification
      let userHasAccess = Boolean(courseData.is_free) || Number(courseData.price) === 0;

      if (user && !userHasAccess) {
        const { data: enrollment } = await supabase
          .from("enrollments")
          .select("id")
          .eq("user_id", user.id)
          .eq("course_id", courseId)
          .maybeSingle();

        if (enrollment) {
          userHasAccess = true;
        }
      }

      setHasAccess(userHasAccess);

      // 3. Fetch Lessons & Progress if access is granted
      if (userHasAccess) {
        const { data: lessonsData } = await supabase
          .from("lessons")
          .select("id, course_id, title, video_path, video_url, position")
          .eq("course_id", courseId)
          .order("position", { ascending: true });

        const loadedLessons = lessonsData || [];
        setLessons(loadedLessons);

        if (loadedLessons.length > 0) {
          setActiveLesson(loadedLessons[0]);
        }

        if (user) {
          const { data: progressData } = await supabase
            .from("user_lesson_progress")
            .select("lesson_id, is_completed")
            .eq("user_id", user.id)
            .eq("course_id", courseId)
            .eq("is_completed", true);

          if (progressData) {
            setCompletedLessonIds(new Set(progressData.map((p) => p.lesson_id)));
          }
        }
      }
    } catch (err) {
      console.error("Initialization Error:", err);
      setErrorMsg("An error occurred while loading content.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initData();
  }, [courseId]);

  // Payment Handler
  const handlePurchase = async () => {
    try {
      setPurchasing(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert("Please log in to purchase this course.");
        setPurchasing(false);
        return;
      }

      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: course?.price,
          courseId: course?.id,
          userId: user.id,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Failed to create order");
      }

      const order = await res.json();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Raut Coaching",
        description: course?.title,
        order_id: order.id,
        handler: async function (response: any) {
          const verifyRes = await fetch("/api/razorpay/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              courseId: course?.id,
              userId: user.id,
            }),
          });

          const verifyData = await verifyRes.json();

          if (verifyRes.ok && verifyData.success) {
            alert("Payment successful! Unlocking course...");
            await initData();
          } else {
            alert(verifyData.message || "Payment verification failed. Please contact support.");
          }
        },
        prefill: { email: user.email },
        theme: { color: "#ea580c" },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (err: any) {
      console.error("Payment Error:", err);
      alert(err.message || "Payment failed to initialize.");
    } finally {
      setPurchasing(false);
    }
  };

  // Progress Saving
  async function markLessonCompleted(lessonId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setCompletedLessonIds((prev) => new Set(prev).add(lessonId));

    await supabase.from("user_lesson_progress").upsert(
      {
        user_id: user.id,
        course_id: courseId,
        lesson_id: lessonId,
        is_completed: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" }
    );
  }

  // Auto Play Next Lesson
  const handleLessonEnd = async () => {
    setIsPlaying(false);
    if (activeLesson) {
      await markLessonCompleted(activeLesson.id);
    }

    if (autoPlayNext && activeLesson) {
      const currentIndex = lessons.findIndex((l) => l.id === activeLesson.id);
      if (currentIndex !== -1 && currentIndex < lessons.length - 1) {
        const nextLesson = lessons[currentIndex + 1];
        setActiveLesson(nextLesson);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.play().catch(() => {});
          }
        }, 500);
      }
    }
  };

  // Video Helpers
  function getLessonVideoUrl(lesson: Lesson): string | null {
    if (lesson.video_url) return lesson.video_url;
    if (lesson.video_path) {
      const { data } = supabase.storage.from("course-videos").getPublicUrl(lesson.video_path);
      return data.publicUrl;
    }
    return null;
  }

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const skipTime = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(Math.max(videoRef.current.currentTime + seconds, 0), duration);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = Number(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current) videoRef.current.currentTime = targetTime;
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const mutedState = !isMuted;
    videoRef.current.muted = mutedState;
    setIsMuted(mutedState);
    if (mutedState) {
      videoRef.current.volume = 0;
    } else {
      videoRef.current.volume = volume || 0.8;
    }
  };

  const toggleFullScreen = () => {
    if (!playerContainerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      playerContainerRef.current.requestFullscreen().catch(() => {});
    }
  };

  const togglePictureInPicture = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error("PiP Error:", err);
    }
  };

  const handleInteraction = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) return;

      switch (e.code) {
        case "Space":
        case "KeyK":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
        case "KeyJ":
          e.preventDefault();
          skipTime(-10);
          break;
        case "ArrowRight":
        case "KeyL":
          e.preventDefault();
          skipTime(10);
          break;
        case "KeyM":
          e.preventDefault();
          toggleMute();
          break;
        case "KeyF":
          e.preventDefault();
          toggleFullScreen();
          break;
        case "KeyP":
          e.preventDefault();
          togglePictureInPicture();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, isMuted, duration, volume]);

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return "00:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes < 10 ? "0" : ""}${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const completionPercentage = lessons.length > 0 ? Math.round((completedLessonIds.size / lessons.length) * 100) : 0;

  const filteredLessons = lessons.filter((l) =>
    l.title.toLowerCase().includes(lessonSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700 font-medium">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-600">Loading learning workspace...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md w-full rounded-2xl bg-white p-8 text-center border border-slate-200 shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 border border-red-100">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Error</h2>
          <p className="text-sm text-slate-600 mb-6">{errorMsg}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full rounded-xl bg-slate-900 py-3 text-xs font-semibold text-white hover:bg-slate-800 transition"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const activeVideoUrl = activeLesson ? getLessonVideoUrl(activeLesson) : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-orange-500 selection:text-white">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />

      {/* MAIN CONTENT AREA */}
      <main className="mx-auto max-w-7xl px-3 py-3 sm:px-6">
        
        {/* COMPACT HEADER */}
        <header className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600 border border-orange-200">
              {course?.teacher_name ? course.teacher_name.charAt(0) : "R"}
            </span>

            <div className="flex items-center gap-2 min-w-0">
              <button 
                type="button"
                onClick={() => {
                  const target = document.getElementById("lesson-list-scroll-area");
                  const activeEl = document.getElementById("active-lesson-item");
                  if (target && activeEl) {
                    activeEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
                  }
                }}
                className="text-sm font-bold text-slate-900 truncate tracking-tight hover:text-orange-600 hover:underline transition-colors text-left"
                title="Scroll to active playing lesson"
              >
                {course?.title || "Course Player"}
              </button>

              {course?.subject && (
                <span className="hidden sm:inline-block rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-600 uppercase border border-orange-200">
                  {course.subject}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const target = document.getElementById("lesson-list-scroll-area");
              if (target) {
                target.scrollTop = 0;
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors shrink-0"
          >
            <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            <span>Top</span>
          </button>
        </header>

        {!hasAccess ? (
          /* LOCKED COURSE OVERLAY */
          <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg my-8 relative overflow-hidden">
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-50 text-4xl text-orange-600 border border-orange-100 shadow-inner">
              🔒
            </div>
            <h2 className="text-3xl font-black text-slate-900">Enroll to Unlock Full Access</h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              {course?.description || "Get instant access to all video lectures, interactive modules, and personalized progress tracking."}
            </p>

            <div className="my-8 rounded-2xl bg-slate-50 p-5 border border-slate-200 flex items-center justify-between shadow-sm">
              <div className="text-left">
                <span className="block text-xs font-semibold text-slate-500">Enrollment Fee</span>
                <span className="text-xs text-emerald-600 font-bold">Full lifetime access</span>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-orange-600">₹{course?.price}</span>
              </div>
            </div>

            <button
              onClick={handlePurchase}
              disabled={purchasing}
              className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 py-4 text-sm font-bold text-white shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 transition duration-200 transform active:scale-[0.99]"
            >
              {purchasing ? "Processing Secure Checkout..." : `Unlock Course Now — ₹${course?.price}`}
            </button>
            <p className="mt-4 text-[11px] text-slate-400 font-medium">🔒 Secure payment processed via Razorpay</p>
          </div>
        ) : (
          /* UNLOCKED LEARNING WORKSPACE */
          <div className="grid gap-6 lg:grid-cols-3 items-start">
            {/* LEFT COLUMN: PLAYER & METADATA */}
            <div className="lg:col-span-2 space-y-4">
              {/* VIDEO PLAYER CONTAINER */}
              <div
                ref={playerContainerRef}
                onMouseMove={handleInteraction}
                onTouchStart={handleInteraction}
                onClick={handleInteraction}
                className="group relative aspect-video overflow-hidden rounded-2xl bg-black border border-slate-200 shadow-xl flex items-center justify-center"
              >
                {activeLesson && activeVideoUrl ? (
                  <>
                    <video
                      ref={videoRef}
                      key={activeLesson.id}
                      src={activeVideoUrl}
                      playsInline
                      className="h-full w-full object-contain cursor-pointer"
                      onClick={togglePlay}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onTimeUpdate={() => {
                        if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                      }}
                      onLoadedMetadata={() => {
                        if (videoRef.current) setDuration(videoRef.current.duration);
                      }}
                      onEnded={handleLessonEnd}
                    />

                    {/* OVERLAY PLAY/PAUSE ICON (CENTER) */}
                    {!isPlaying && (
                      <button
                        onClick={togglePlay}
                        className="absolute inset-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-orange-500/90 text-white shadow-xl shadow-orange-500/30 backdrop-blur-sm transition transform hover:scale-110"
                      >
                        <span className="ml-1 text-xl sm:text-2xl">▶</span>
                      </button>
                    )}

                    {/* CONTROLS OVERLAY - MOBILE FRIENDLY */}
                    <div
                      className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-2.5 sm:p-4 transition-opacity duration-300 ${
                        showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
                      }`}
                    >
                      {/* PROGRESS BAR */}
                      <div className="relative mb-2 sm:mb-3 flex items-center">
                        <input
                          type="range"
                          min={0}
                          max={duration || 100}
                          value={currentTime}
                          onChange={handleSeek}
                          className="w-full h-1.5 bg-slate-700/80 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:h-2 transition-all"
                        />
                      </div>

                      {/* CONTROLS BAR (FLEX WRAP OR RESPONSIVE) */}
                      <div className="flex items-center justify-between text-xs font-medium text-slate-200 gap-2">
                        {/* LEFT CONTROLS */}
                        <div className="flex items-center gap-2 sm:gap-3">
                          <button
                            onClick={togglePlay}
                            className="p-1 hover:text-orange-400 text-base sm:text-lg transition"
                            title={isPlaying ? "Pause" : "Play"}
                          >
                            {isPlaying ? "⏸" : "▶"}
                          </button>

                          <button
                            onClick={() => skipTime(-10)}
                            className="hover:text-orange-400 transition text-[11px] sm:text-xs hidden xs:inline-block"
                            title="Rewind 10s"
                          >
                            ↺ 10s
                          </button>

                          <button
                            onClick={() => skipTime(10)}
                            className="hover:text-orange-400 transition text-[11px] sm:text-xs hidden xs:inline-block"
                            title="Forward 10s"
                          >
                            10s ↻
                          </button>

                          {/* VOLUME SLIDER (Desktop/Tablet) */}
                          <div className="hidden sm:flex items-center gap-1.5 group/vol">
                            <button
                              onClick={toggleMute}
                              className="hover:text-orange-400 transition"
                              title="Toggle Mute"
                            >
                              {isMuted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
                            </button>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={isMuted ? 0 : volume}
                              onChange={handleVolumeChange}
                              className="w-14 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500 opacity-70 group-hover/vol:opacity-100 transition"
                            />
                          </div>

                          <span className="text-slate-300 font-mono text-[10px] sm:text-[11px]">
                            {formatTime(currentTime)} / {formatTime(duration)}
                          </span>
                        </div>

                        {/* RIGHT CONTROLS */}
                        <div className="flex items-center gap-2 sm:gap-3">
                          <button
                            onClick={togglePictureInPicture}
                            className="hover:text-orange-400 transition text-xs hidden sm:inline-block"
                            title="Picture-in-Picture"
                          >
                            📺 PiP
                          </button>

                          <select
                            value={playbackSpeed}
                            onChange={(e) => handleSpeedChange(Number(e.target.value))}
                            className="bg-slate-800 text-white rounded-lg px-1.5 py-1 text-[11px] sm:text-xs outline-none border border-slate-700 cursor-pointer"
                          >
                            <option value={0.75}>0.75x</option>
                            <option value={1}>1.0x</option>
                            <option value={1.25}>1.25x</option>
                            <option value={1.5}>1.5x</option>
                            <option value={2}>2.0x</option>
                          </select>

                          {/* FULLSCREEN BUTTON (Guaranteed visibility on Mobile and Desktop) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFullScreen();
                            }}
                            className="bg-slate-800/90 sm:bg-transparent p-1.5 sm:p-0 rounded-lg border border-slate-700 sm:border-0 hover:text-orange-400 transition text-sm flex items-center justify-center shrink-0"
                            title="Fullscreen"
                          >
                            ⛶
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center text-slate-400">
                    <p className="text-sm">🎬 Select a lesson from the list to start streaming</p>
                  </div>
                )}
              </div>

              {/* LESSON DETAILS BAR */}
              {activeLesson && (
                <div id="active-lesson-section" className="rounded-2xl bg-white p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">
                        Active Lesson
                      </span>
                      <h2 className="text-base sm:text-xl font-bold text-slate-900 mt-0.5">
                        {activeLesson.title}
                      </h2>
                    </div>

                    <button
                      onClick={() => markLessonCompleted(activeLesson.id)}
                      className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-sm ${
                        completedLessonIds.has(activeLesson.id)
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/10"
                      }`}
                    >
                      {completedLessonIds.has(activeLesson.id) ? "✓ Completed" : "Mark as Completed"}
                    </button>
                  </div>

                  {/* NAVIGATION TABS */}
                  <div className="border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-6 text-xs font-semibold border-b border-slate-100 pb-2 overflow-x-auto">
                      <button
                        onClick={() => setActiveTab("overview")}
                        className={`pb-2 whitespace-nowrap transition ${
                          activeTab === "overview"
                            ? "text-orange-600 border-b-2 border-orange-500 font-bold"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Overview
                      </button>
                      <button
                        onClick={() => setActiveTab("instructor")}
                        className={`pb-2 whitespace-nowrap transition ${
                          activeTab === "instructor"
                            ? "text-orange-600 border-b-2 border-orange-500 font-bold"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Instructor Info
                      </button>
                      <button
                        onClick={() => setActiveTab("shortcuts")}
                        className={`pb-2 whitespace-nowrap transition ${
                          activeTab === "shortcuts"
                            ? "text-orange-600 border-b-2 border-orange-500 font-bold"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Shortcuts
                      </button>
                    </div>

                    <div className="mt-3 text-xs text-slate-600 leading-relaxed">
                      {activeTab === "overview" && (
                        <p>{course?.description || "No specific lesson description provided."}</p>
                      )}
                      {activeTab === "instructor" && (
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 font-bold border border-orange-200">
                            {course?.teacher_name ? course.teacher_name.charAt(0) : "R"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{course?.teacher_name || "Raut Coaching"}</p>
                            <p className="text-slate-500 text-[11px]">Lead Instructor & Subject Specialist</p>
                          </div>
                        </div>
                      )}
                      {activeTab === "shortcuts" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px] text-slate-700">
                          <div><span className="text-orange-600 font-bold">Space / K</span> : Play / Pause</div>
                          <div><span className="text-orange-600 font-bold">J / L</span> : Rewind / Forward 10s</div>
                          <div><span className="text-orange-600 font-bold">M</span> : Mute / Unmute</div>
                          <div><span className="text-orange-600 font-bold">F</span> : Toggle Fullscreen</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: ISOLATED STICKY SCROLLABLE LESSON SIDEBAR */}
            <div 
              id="course-content-sidebar" 
              className="lg:sticky lg:top-4 flex flex-col h-[65vh] lg:max-h-[calc(100vh-2rem)] rounded-2xl bg-white border border-slate-200 p-4 shadow-sm"
            >
              <div className="space-y-2 border-b border-slate-100 pb-3 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Course Content
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {lessons.length}
                    </span>
                  </div>

                  {/* Autoplay toggle */}
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600 font-medium">
                    <span>Autoplay Next</span>
                    <input
                      type="checkbox"
                      checked={autoPlayNext}
                      onChange={(e) => setAutoPlayNext(e.target.checked)}
                      className="accent-orange-500 rounded cursor-pointer h-3.5 w-3.5"
                    />
                  </label>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span className="text-slate-400">Progress</span>
                    <span className="text-orange-600 font-bold">
                      {completionPercentage}% ({completedLessonIds.size}/{lessons.length})
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300 rounded-full"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* LESSON SEARCH */}
              <div className="pt-3 pb-2 shrink-0">
                <input
                  type="text"
                  placeholder="🔍 Search lessons..."
                  value={lessonSearch}
                  onChange={(e) => setLessonSearch(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-orange-500 focus:bg-white transition"
                />
              </div>

              {/* ISOLATED SCROLLABLE LIST CONTAINER (Prevents page jumping) */}
              <div 
                id="lesson-list-scroll-area"
                className="flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1 min-h-0"
              >
                {filteredLessons.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400">No matching lessons found.</p>
                ) : (
                  filteredLessons.map((lesson, idx) => {
                    const isSelected = activeLesson?.id === lesson.id;
                    const isCompleted = completedLessonIds.has(lesson.id);

                    return (
                      <div
                        key={lesson.id}
                        id={isSelected ? "active-lesson-item" : undefined}
                        onClick={() => {
                          setActiveLesson(lesson);
                          setIsPlaying(false);
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition border ${
                          isSelected
                            ? "bg-orange-50 border-orange-500 text-slate-900 shadow-sm"
                            : "bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                              isCompleted
                                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                : isSelected
                                ? "bg-orange-500 text-white"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {isCompleted ? "✓" : idx + 1}
                          </span>
                          <div className="truncate">
                            <p className="text-xs font-semibold truncate">{lesson.title}</p>
                            {isSelected && (
                              <p className="text-[10px] text-orange-600 font-bold flex items-center gap-1 mt-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-ping" />
                                Now Playing
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}