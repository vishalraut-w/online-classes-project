"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Material = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  material_type: "pdf" | "document" | "link" | "other";
  file_path: string | null;
  external_url: string | null;
  created_at: string;
  courses: {
    id: string;
    title: string;
    price: number;
  } | null;
};

export default function StudentStudyMaterialListView() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    async function loadAllMaterials() {
      try {
        setLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        // 1. Fetch Student's Enrollments
        if (user) {
          const { data: enrollmentData } = await supabase
            .from("enrollments")
            .select("course_id")
            .eq("user_id", user.id);

          if (enrollmentData) {
            const ids = new Set(enrollmentData.map((e) => e.course_id));
            setEnrolledCourseIds(ids);
          }
        }

        // 2. Fetch ALL Published Study Materials
        const { data: materialData, error: materialError } = await supabase
          .from("study_materials")
          .select(
            `
            id,
            course_id,
            title,
            description,
            material_type,
            file_path,
            external_url,
            created_at,
            courses (
              id,
              title,
              price
            )
          `
          )
          .eq("is_published", true)
          .order("created_at", { ascending: false });

        if (materialError) {
          console.error("MATERIALS FETCH ERROR:", materialError);
          setErrorMessage(materialError.message);
          return;
        }

        setMaterials((materialData || []) as unknown as Material[]);
      } catch (err: any) {
        console.error("STUDY MATERIAL EXCEPTION:", err);
        setErrorMessage("An error occurred while loading study materials.");
      } finally {
        setLoading(false);
      }
    }

    loadAllMaterials();
  }, []);

  function openMaterial(material: Material) {
    if (material.external_url) {
      window.open(material.external_url, "_blank", "noopener,noreferrer");
      return;
    }

    if (material.file_path) {
      const { data } = supabase.storage
        .from("study-materials")
        .getPublicUrl(material.file_path);

      window.open(data.publicUrl, "_blank", "noopener,noreferrer");
    }
  }

  function getTypeBadge(type: Material["material_type"]) {
    switch (type) {
      case "pdf":
        return { label: "📄 PDF", style: "bg-red-50 text-red-700 border-red-200" };
      case "document":
        return { label: "📝 Doc", style: "bg-blue-50 text-blue-700 border-blue-200" };
      case "link":
        return { label: "🔗 Link", style: "bg-purple-50 text-purple-700 border-purple-200" };
      default:
        return { label: "📁 File", style: "bg-slate-100 text-slate-700 border-slate-200" };
    }
  }

  const filteredMaterials = materials.filter((item) => {
    const matchesType =
      selectedType === "all" || item.material_type === selectedType;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description &&
        item.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesType && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-6 font-sans">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-orange-500" />
        <p className="mt-3 text-sm font-semibold text-slate-500">
          Loading study materials...
        </p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="mx-auto max-w-7xl p-6 font-sans">
        <div className="rounded-2xl bg-red-50 p-6 text-red-700">
          <h3 className="font-bold">Error Loading Resources</h3>
          <p className="mt-1 text-xs">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] p-4 sm:p-6 lg:p-8 font-sans">
      <main className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
            Study Materials Library
          </h1>
          <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">
            Browse downloadable notes, reference guides, and resources across all courses.
          </p>
        </div>

        {/* FILTERS */}
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">
              🔍 Search Title or Description
            </label>
            <input
              type="text"
              placeholder="Search materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">
              📁 Filter by Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-orange-500"
            >
              <option value="all">All Material Types</option>
              <option value="pdf">📄 PDF Documents</option>
              <option value="document">📝 Word / Text Documents</option>
              <option value="link">🔗 External Links</option>
              <option value="other">📁 Other Files</option>
            </select>
          </div>
        </div>

        {/* LIST VIEW CONTAINER */}
        {filteredMaterials.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <div className="text-5xl">📂</div>
            <h3 className="mt-4 text-lg font-black text-slate-900">
              No Materials Found
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              No study materials match your search parameters.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMaterials.map((material) => {
              const badge = getTypeBadge(material.material_type);
              const isCourseFree = Number(material.courses?.price || 0) === 0;
              const isEnrolled = enrolledCourseIds.has(material.course_id);
              const hasAccess = isCourseFree || isEnrolled;

              return (
                <div
                  key={material.id}
                  className={`flex flex-col justify-between gap-4 rounded-2xl border bg-white p-4 shadow-sm transition md:flex-row md:items-center ${
                    hasAccess
                      ? "border-slate-200 hover:border-slate-300"
                      : "border-slate-200 bg-slate-50/60"
                  }`}
                >
                  {/* LEFT DETAILS */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold ${badge.style}`}
                      >
                        {badge.label}
                      </span>

                      <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                        📚 {material.courses?.title || "Course Material"}
                      </span>

                      {hasAccess ? (
                        <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          {isCourseFree ? "FREE" : "UNLOCKED"}
                        </span>
                      ) : (
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          🔒 LOCKED
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-black text-slate-900">
                      {material.title}
                    </h3>

                    {material.description && (
                      <p className="line-clamp-2 text-xs text-slate-500">
                        {material.description}
                      </p>
                    )}
                  </div>

                  {/* RIGHT ACCESS ACTION */}
                  <div className="shrink-0">
                    {hasAccess ? (
                      <button
                        type="button"
                        onClick={() => openMaterial(material)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 transition hover:bg-orange-600 sm:w-auto"
                      >
                        <span>
                          {material.material_type === "link"
                            ? "Open Link"
                            : "Download"}
                        </span>
                        <span>↗</span>
                      </button>
                    ) : (
                      <Link
                        href={`/dashboard/courses/${material.course_id}`}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 sm:w-auto"
                      >
                        <span>Unlock Course</span>
                        <span>🔒</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}