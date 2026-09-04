"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

export default function StudentLiveListPage() {
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDesc, setExpandedDesc] = useState<Record<string, boolean>>({});

  const toggleDesc = (id: string) => {
    setExpandedDesc((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("live_classes")
        .select("*")
        .order("start_time", { ascending: true });

      if (error) console.error("Error fetching live classes:", error.message);
      else setClasses(data || []);
      setLoading(false);
    };

    fetchClasses();

    const channel = supabase
      .channel("student_live_classes_status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_classes" },
        () => fetchClasses()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const extractCleanYoutubeId = (urlOrId: string) => {
    if (!urlOrId) return "";
    let clean = urlOrId.trim();
    if (clean.includes("v=")) {
      clean = clean.split("v=")[1]?.split("&")[0] || clean;
    } else if (clean.includes("youtu.be/")) {
      clean = clean.split("youtu.be/")[1]?.split("?")[0] || clean;
    }
    return clean;
  };

  const activeLiveClasses = classes.filter((c) => c.is_live);
  const upcomingClasses = classes.filter((c) => !c.is_live);

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-800 md:p-8">
      <div className="mx-auto max-w-6xl space-y-10">
        
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-black text-slate-900">Live Classroom</h1>
          <p className="mt-1 text-sm text-slate-500">
            Join interactive live sessions, ask questions, and chat in real-time with your teachers.
          </p>
        </div>

        {/* ACTIVE LIVE BROADCASTS SECTION */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500"></span>
            </span>
            <h2 className="text-lg font-extrabold text-slate-900">Live Now</h2>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
              Checking active sessions...
            </div>
          ) : activeLiveClasses.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
              No live classes happening right now. Check upcoming sessions below!
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {activeLiveClasses.map((item) => {
                const cleanId = extractCleanYoutubeId(item.youtube_video_id);
                const isExpanded = !!expandedDesc[item.id];

                return (
                  <div
                    key={item.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border-2 border-rose-500/40 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-500/10"
                  >
                    {/* Thumbnail Container */}
                    <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                      <img
                        src={`https://img.youtube.com/vi/${cleanId}/hqdefault.jpg`}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                      
                      <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
                        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white" />
                        Live Now
                      </div>

                      <span className="absolute bottom-3 right-3 rounded-md bg-slate-900/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-slate-200">
                        {item.duration_minutes} mins
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="rounded-md bg-orange-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-orange-700">
                            {item.subject}
                          </span>
                        </div>

                        <h3 className="line-clamp-2 text-base font-bold text-slate-900 leading-snug">
                          {item.title}
                        </h3>

                        <p className="text-xs font-medium text-slate-500">
                          Instructor: <span className="font-semibold text-slate-800">{item.instructor_name}</span>
                        </p>

                        {/* Collapsible Description */}
                        {item.description && (
                          <div className="pt-1">
                            <button
                              onClick={() => toggleDesc(item.id)}
                              className="text-[11px] font-bold text-orange-600 hover:underline"
                            >
                              {isExpanded ? "Hide Details ▲" : "View Description ▼"}
                            </button>
                            {isExpanded && (
                              <p className="mt-1.5 rounded-xl bg-slate-50 p-2.5 text-[11px] leading-relaxed text-slate-600 border border-slate-100">
                                {item.description}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <Link
                        href={`/dashboard/live/${item.id}`}
                        className="mt-5 block w-full rounded-xl bg-rose-600 py-2.5 text-center text-xs font-bold text-white shadow-lg shadow-rose-600/25 transition hover:bg-rose-700 active:scale-95"
                      >
                        Join Live Class →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* UPCOMING CLASSES CARD GRID */}
        <section className="space-y-4">
          <h2 className="text-lg font-extrabold text-slate-900">Upcoming Scheduled Classes</h2>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
              Loading schedules...
            </div>
          ) : upcomingClasses.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
              No upcoming live sessions scheduled.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingClasses.map((item) => {
                const cleanId = extractCleanYoutubeId(item.youtube_video_id);
                const isExpanded = !!expandedDesc[item.id];

                return (
                  <div
                    key={item.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                  >
                    {/* Thumbnail Container */}
                    <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                      <img
                        src={`https://img.youtube.com/vi/${cleanId}/hqdefault.jpg`}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
                      
                      <span className="absolute bottom-3 right-3 rounded-md bg-slate-900/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-slate-200">
                        {item.duration_minutes} mins
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="rounded-md bg-indigo-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">
                            {item.subject}
                          </span>
                          <div className="text-right">
                            <span className="text-[11px] font-bold text-orange-600">
                              {new Date(item.start_time).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {new Date(item.start_time).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>

                        <h3 className="line-clamp-2 text-base font-bold text-slate-900 leading-snug">
                          {item.title}
                        </h3>

                        <p className="text-xs font-medium text-slate-500">
                          Instructor: <span className="font-semibold text-slate-800">{item.instructor_name}</span>
                        </p>

                        {/* Collapsible Description */}
                        {item.description && (
                          <div className="pt-1">
                            <button
                              onClick={() => toggleDesc(item.id)}
                              className="text-[11px] font-bold text-indigo-600 hover:underline"
                            >
                              {isExpanded ? "Hide Details ▲" : "View Description ▼"}
                            </button>
                            {isExpanded && (
                              <p className="mt-1.5 rounded-xl bg-slate-50 p-2.5 text-[11px] leading-relaxed text-slate-600 border border-slate-100">
                                {item.description}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-5 rounded-xl border border-slate-200/80 bg-slate-50/80 py-2.5 text-center text-xs font-bold text-slate-500">
                        Scheduled Session
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}