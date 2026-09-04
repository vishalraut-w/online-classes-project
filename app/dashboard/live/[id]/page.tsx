"use client";

import { useEffect, useState, use, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

type LiveClass = {
  id: string;
  title: string;
  subject: string;
  instructor_name: string;
  youtube_video_id: string;
  is_live: boolean;
};

type Commentary = {
  id: string;
  user_name: string;
  is_instructor: boolean;
  message: string;
  created_at: string;
};

function extractVideoId(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|live\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = trimmed.match(regExp);
  return match && match[2].length === 11 ? match[2] : trimmed;
}

export default function StudentLiveRoomPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const classId = resolvedParams.id;

  const [classData, setClassData] = useState<LiveClass | null>(null);
  const [messages, setMessages] = useState<Commentary[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Toggle state for description container
  const [showDetails, setShowDetails] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!classId) return;

    const initData = async () => {
      setLoading(true);

      const { data: classDetails } = await supabase
        .from("live_classes")
        .select("*")
        .eq("id", classId)
        .single();

      if (classDetails) setClassData(classDetails);

      const { data: initialComments } = await supabase
        .from("live_commentary")
        .select("*")
        .eq("class_id", classId)
        .order("created_at", { ascending: true });

      if (initialComments) setMessages(initialComments);

      setLoading(false);
    };

    initData();

    const channel = supabase
      .channel(`room_${classId}`, {
        config: { broadcast: { self: true } },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_commentary",
          filter: `class_id=eq.${classId}`,
        },
        (payload) => {
          const newMsg = payload.new as Commentary;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .on("broadcast", { event: "new_comment" }, ({ payload }) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.id)) return prev;
          return [...prev, payload];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !classId) return;

    const messageText = input.trim();
    setInput("");

    const { data, error } = await supabase
      .from("live_commentary")
      .insert([
        {
          class_id: classId,
          user_name: "Student",
          is_instructor: false,
          message: messageText,
        },
      ])
      .select()
      .single();

    if (!error && data) {
      supabase.channel(`room_${classId}`).send({
        type: "broadcast",
        event: "new_comment",
        payload: data,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-xs font-semibold text-slate-500">
        Connecting to Classroom...
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-xs font-semibold text-slate-500">
        Classroom session not found.
      </div>
    );
  }

  const cleanVideoId = extractVideoId(classData.youtube_video_id);
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="h-[calc(100vh-5rem)] w-full overflow-hidden bg-slate-50 p-2 text-slate-800 lg:p-3">
      <div className="mx-auto grid h-full max-w-7xl grid-cols-1 gap-3 lg:grid-cols-3">
        
        {/* LEFT: VIDEO & DESCRIPTION CONTAINER */}
        <div className="flex h-full flex-col space-y-2 overflow-hidden lg:col-span-2">
          
          {/* Main Video Section */}
          <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-slate-900 shadow-sm">
            <iframe
              className="h-full w-full border-0"
              src={`https://www.youtube.com/embed/${cleanVideoId}?autoplay=1&modestbranding=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(
                currentOrigin
              )}`}
              title={classData.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>

          {/* CLASS TITLE, SUBJECT & INSTRUCTOR CONTAINER WITH TOGGLE */}
          <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200/60 bg-white/90 shadow-sm transition-all duration-300">
            
            {/* Header Control Bar */}
            <div className="flex items-center justify-between border-b border-slate-100 p-2 px-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Class Details
              </span>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 transition hover:text-orange-600"
              >
                {showDetails ? "▲ Hide Info" : "▼ Show Info"}
              </button>
            </div>

            {/* Collapsible Content Section */}
            {showDetails && (
              <div className="p-3">
                {/* Subject & Live Badges */}
                <div className="flex items-center gap-2">
                  <span className="rounded bg-orange-100/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-600">
                    {classData.subject || "General"}
                  </span>
                  {classData.is_live && (
                    <span className="flex items-center gap-1.5 rounded-full bg-rose-100/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-600">
                      <span className="h-1.5 w-1.5 animate-ping rounded-full bg-rose-500"></span>
                      Live
                    </span>
                  )}
                </div>

                {/* Class Title */}
                <h1 className="mt-1.5 text-base font-bold text-slate-900">
                  {classData.title}
                </h1>

                {/* Instructor Name */}
                <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                  Instructor:{" "}
                  <span className="font-semibold text-slate-700">
                    {classData.instructor_name || "N/A"}
                  </span>
                </p>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT: LIVE CHAT */}
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200/60 bg-white/90 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-2.5">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-slate-800">Live Chat</h2>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                {messages.length}
              </span>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              Live
            </span>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
                No comments yet.
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-lg p-2 transition-colors ${
                    msg.is_instructor
                      ? "border border-orange-200/60 bg-orange-50/50 text-slate-800"
                      : "border border-slate-100 bg-slate-50/60 text-slate-700"
                  }`}
                >
                  <div className="mb-0.5 flex items-center justify-between">
                    <span
                      className={`text-[10px] font-semibold ${
                        msg.is_instructor ? "text-orange-600" : "text-slate-900"
                      }`}
                    >
                      {msg.user_name} {msg.is_instructor && "🎓"}
                    </span>
                    <span className="text-[8px] text-slate-400">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-[10px] leading-snug text-slate-700">{msg.message}</p>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <div className="shrink-0 border-t border-slate-100 p-2 bg-white">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-[11px] text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-orange-500 px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-orange-600 active:scale-95 shrink-0"
              >
                Send
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}