"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

type LiveClass = {
  id: string;
  title: string;
  subject: string;
  description?: string;
  instructor_name: string;
  youtube_video_id: string;
  start_time: string;
  duration_minutes: number;
  is_live: boolean;
};

export default function AdminLivePage() {
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [instructor, setInstructor] = useState("");
  const [youtubeId, setYoutubeId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [submitting, setSubmitting] = useState(false);

  // Toggle description view for items in list
  const [expandedDesc, setExpandedDesc] = useState<Record<string, boolean>>({});

  const toggleDesc = (id: string) => {
    setExpandedDesc((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("live_classes")
      .select("*")
      .order("start_time", { ascending: false });

    if (error) console.error("Error fetching classes:", error.message);
    else setClasses(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const extractCleanYoutubeId = (urlOrId: string) => {
    let clean = urlOrId.trim();
    if (clean.includes("v=")) {
      clean = clean.split("v=")[1]?.split("&")[0] || clean;
    } else if (clean.includes("youtu.be/")) {
      clean = clean.split("youtu.be/")[1]?.split("?")[0] || clean;
    }
    return clean;
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const cleanYoutubeId = extractCleanYoutubeId(youtubeId);

    const { error } = await supabase.from("live_classes").insert([
      {
        title,
        subject,
        description,
        instructor_name: instructor,
        youtube_video_id: cleanYoutubeId,
        start_time: new Date(startTime).toISOString(),
        duration_minutes: parseInt(duration, 10),
        is_live: false,
      },
    ]);

    if (error) {
      alert("Error creating class: " + error.message);
    } else {
      setTitle("");
      setSubject("");
      setDescription("");
      setInstructor("");
      setYoutubeId("");
      setStartTime("");
      fetchClasses();
    }
    setSubmitting(false);
  };

  const toggleLiveStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("live_classes")
      .update({ is_live: !currentStatus })
      .eq("id", id);

    if (error) alert("Error updating status: " + error.message);
    else fetchClasses();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this session?")) return;
    const { error } = await supabase.from("live_classes").delete().eq("id", id);
    if (error) alert("Error deleting class: " + error.message);
    else fetchClasses();
  };

  const currentCleanFormId = extractCleanYoutubeId(youtubeId);

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-800 md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Live Stream Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Schedule live YouTube sessions, add titles/descriptions, and control active broadcast status.
          </p>
        </div>

        {/* CREATE CLASS FORM */}
        <form
          onSubmit={handleCreateClass}
          className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Schedule New Live Class</h2>
            <span className="text-xs font-semibold text-slate-400">Step 1 of 2</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Class Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Physics Quantum Mechanics"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Subject
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Physics"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Instructor Name
              </label>
              <input
                type="text"
                required
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                placeholder="e.g. Dr. Alex Smith"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                YouTube URL or Video ID
              </label>
              <input
                type="text"
                required
                value={youtubeId}
                onChange={(e) => setYoutubeId(e.target.value)}
                placeholder="e.g. https://youtube.com/watch?v=..."
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Start Time
              </label>
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Duration (Minutes)
              </label>
              <input
                type="number"
                required
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* CLASS DESCRIPTION TEXTAREA */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Class Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a brief overview of topics covered in this session..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* LIVE THUMBNAIL PREVIEW (IF YOUTUBE ID ENTERED) */}
          {currentCleanFormId && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-slate-900 shadow-sm">
                <img
                  src={`https://img.youtube.com/vi/${currentCleanFormId}/hqdefault.jpg`}
                  alt="Thumbnail Preview"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-700">Thumbnail Preview</p>
                <p className="text-[10px] text-slate-400">
                  Detected ID: <span className="font-mono text-indigo-600">{currentCleanFormId}</span>
                </p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition active:scale-95 disabled:opacity-50"
          >
            {submitting ? "Scheduling..." : "Create Live Schedule"}
          </button>
        </form>

        {/* MANAGED CLASSES LIST */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <h2 className="text-sm font-bold text-slate-900">All Scheduled Classes</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading sessions...</div>
          ) : classes.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No scheduled sessions found.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {classes.map((item) => {
                const isExpanded = !!expandedDesc[item.id];
                const cleanId = extractCleanYoutubeId(item.youtube_video_id);

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 p-4 transition hover:bg-slate-50/50 sm:flex-row sm:items-start sm:justify-between"
                  >
                    {/* LEFT SECTION: THUMBNAIL + METADATA */}
                    <div className="flex gap-3">
                      {/* Classy Thumbnail Box */}
                      <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl bg-slate-900 shadow-sm border border-slate-200/60">
                        <img
                          src={`https://img.youtube.com/vi/${cleanId}/hqdefault.jpg`}
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                        {item.is_live && (
                          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full bg-rose-600/90 backdrop-blur-md px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
                            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white"></span>
                            LIVE
                          </div>
                        )}
                      </div>

                      {/* Info Details */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                            {item.subject}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                        </div>

                        <p className="text-xs text-slate-500">
                          Instructor: <span className="font-semibold text-slate-700">{item.instructor_name}</span>
                        </p>

                        <p className="text-[11px] text-slate-400">
                          Start: {new Date(item.start_time).toLocaleString()} ({item.duration_minutes} Mins)
                        </p>

                        {/* Collapsible / Expandable Description */}
                        {item.description && (
                          <div className="mt-1">
                            <button
                              type="button"
                              onClick={() => toggleDesc(item.id)}
                              className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition flex items-center gap-0.5"
                            >
                              {isExpanded ? "▲ Hide Description" : "▼ Show Description"}
                            </button>
                            {isExpanded && (
                              <p className="mt-1 text-[11px] leading-relaxed text-slate-600 bg-slate-100/60 p-2 rounded-lg border border-slate-200/40">
                                {item.description}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RIGHT SECTION: ACTION BUTTONS */}
                    <div className="flex items-center gap-2 shrink-0 sm:pt-1">
                      <button
                        onClick={() => toggleLiveStatus(item.id, item.is_live)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-sm active:scale-95 ${
                          item.is_live
                            ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                            : "bg-emerald-600 text-white hover:bg-emerald-700"
                        }`}
                      >
                        {item.is_live ? "End Broadcast" : "Go Live"}
                      </button>

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition active:scale-95"
                      >
                        Delete
                      </button>
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