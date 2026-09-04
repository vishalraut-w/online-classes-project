"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Course = {
  id: string;
  title: string;
};

type Material = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  material_type: "pdf" | "document" | "link" | "other";
  file_path: string | null;
  external_url: string | null;
  is_published: boolean;
  created_at: string;
};

const MATERIAL_TYPES = [
  { value: "pdf", label: "📄 PDF" },
  { value: "document", label: "📝 Document" },
  { value: "link", label: "🔗 External Link" },
  { value: "other", label: "📁 Other" },
];

export default function StudyMaterialPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [materialType, setMaterialType] =
    useState<Material["material_type"]>("pdf");

  const [externalUrl, setExternalUrl] = useState("");
  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  // ============================================================
  // LOAD COURSES
  // ============================================================

  async function loadCourses() {
    const { data, error } = await supabase
      .from("courses")
      .select("id, title")
      .order("title", {
        ascending: true,
      });

    if (error) {
      console.error("LOAD COURSES ERROR:", error);
      alert(error.message);
      return;
    }

    setCourses(data || []);
  }

  // ============================================================
  // LOAD MATERIALS
  // ============================================================

  async function loadMaterials() {
    const { data, error } = await supabase
      .from("study_materials")
      .select(`
        id,
        course_id,
        title,
        description,
        material_type,
        file_path,
        external_url,
        is_published,
        created_at
      `)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "LOAD MATERIALS ERROR:",
        error
      );

      alert(error.message);
      return;
    }

    setMaterials((data || []) as Material[]);
  }

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    async function loadPage() {
      setLoading(true);

      await Promise.all([
        loadCourses(),
        loadMaterials(),
      ]);

      setLoading(false);
    }

    loadPage();
  }, []);

  // ============================================================
  // RESET FORM
  // ============================================================

  function resetForm() {
    setCourseId("");
    setTitle("");
    setDescription("");
    setMaterialType("pdf");
    setExternalUrl("");
    setSelectedFile(null);

    const input = document.getElementById(
      "material-file"
    ) as HTMLInputElement | null;

    if (input) {
      input.value = "";
    }
  }

  // ============================================================
  // ADD MATERIAL
  // ============================================================

  async function addMaterial(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!courseId) {
      alert("Please select a course.");
      return;
    }

    if (!title.trim()) {
      alert("Please enter a material title.");
      return;
    }

    if (materialType === "link") {
      if (!externalUrl.trim()) {
        alert("Please enter the external URL.");
        return;
      }
    } else {
      if (!selectedFile) {
        alert("Please select a file.");
        return;
      }
    }

    setSaving(true);

    try {
      // --------------------------------------------------------
      // CHECK LOGIN
      // --------------------------------------------------------

      const {
        data: userData,
        error: userError,
      } = await supabase.auth.getUser();

      if (
        userError ||
        !userData.user
      ) {
        alert("You are not logged in.");
        return;
      }

      // --------------------------------------------------------
      // CHECK ADMIN
      // --------------------------------------------------------

      const {
        data: adminCheck,
        error: adminCheckError,
      } = await supabase.rpc("is_admin");

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

      let filePath: string | null = null;
      let finalExternalUrl: string | null = null;

      // --------------------------------------------------------
      // EXTERNAL LINK
      // --------------------------------------------------------

      if (materialType === "link") {
        finalExternalUrl = externalUrl.trim();
      }

      // --------------------------------------------------------
      // FILE UPLOAD
      // --------------------------------------------------------

      if (
        materialType !== "link" &&
        selectedFile
      ) {
        const fileExtension =
          selectedFile.name
            .split(".")
            .pop() || "file";

        const safeName =
          selectedFile.name
            .replace(
              /[^a-zA-Z0-9._-]/g,
              "_"
            );

        const uniqueName =
          `${crypto.randomUUID()}-${safeName}`;

        filePath =
          `${courseId}/${uniqueName}`;

        const {
          error: uploadError,
        } = await supabase.storage
          .from("study-materials")
          .upload(
            filePath,
            selectedFile,
            {
              cacheControl: "3600",
              upsert: false,
              contentType:
                selectedFile.type ||
                `application/${fileExtension}`,
            }
          );

        if (uploadError) {
          console.error(
            "MATERIAL UPLOAD ERROR:",
            uploadError
          );

          alert(
            `File upload failed\n\n${uploadError.message}`
          );

          return;
        }
      }

      // --------------------------------------------------------
      // CREATE DATABASE RECORD
      // --------------------------------------------------------

      const {
        error: insertError,
      } = await supabase
        .from("study_materials")
        .insert({
          course_id: courseId,
          title: title.trim(),
          description:
            description.trim() || null,
          material_type: materialType,
          file_path: filePath,
          external_url:
            finalExternalUrl,
          is_published: false,
        });

      if (insertError) {
        console.error(
          "CREATE MATERIAL ERROR:",
          insertError
        );

        // Remove uploaded file if database insert failed
        if (filePath) {
          await supabase.storage
            .from("study-materials")
            .remove([filePath]);
        }

        alert(
          `Material creation failed\n\n${insertError.message}`
        );

        return;
      }

      alert(
        "Study material created successfully!"
      );

      resetForm();
      setShowForm(false);

      await loadMaterials();
    } catch (error) {
      console.error(
        "MATERIAL CREATION ERROR:",
        error
      );

      alert(
        "Something went wrong while creating the material."
      );
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // PUBLISH / UNPUBLISH
  // ============================================================

  async function togglePublished(
    material: Material
  ) {
    const { error } = await supabase
      .from("study_materials")
      .update({
        is_published:
          !material.is_published,
      })
      .eq("id", material.id);

    if (error) {
      console.error(
        "PUBLISH MATERIAL ERROR:",
        error
      );

      alert(error.message);
      return;
    }

    await loadMaterials();
  }

  // ============================================================
  // DELETE MATERIAL
  // ============================================================

  async function deleteMaterial(
    material: Material
  ) {
    const confirmed = window.confirm(
      `Delete "${material.title}"?\n\nThis cannot be undone.`
    );

    if (!confirmed) return;

    try {
      // Delete database record
      const { error } = await supabase
        .from("study_materials")
        .delete()
        .eq("id", material.id);

      if (error) {
        console.error(
          "DELETE MATERIAL ERROR:",
          error
        );

        alert(error.message);
        return;
      }

      // Delete storage file
      if (material.file_path) {
        const {
          error: storageError,
        } = await supabase.storage
          .from("study-materials")
          .remove([
            material.file_path,
          ]);

        if (storageError) {
          console.error(
            "DELETE MATERIAL FILE ERROR:",
            storageError
          );
        }
      }

      await loadMaterials();
    } catch (error) {
      console.error(
        "DELETE MATERIAL EXCEPTION:",
        error
      );

      alert(
        "Something went wrong while deleting the material."
      );
    }
  }

  // ============================================================
  // GET COURSE NAME
  // ============================================================

  function getCourseName(
    id: string
  ) {
    return (
      courses.find(
        (course) => course.id === id
      )?.title ||
      "Unknown Course"
    );
  }

  // ============================================================
  // OPEN MATERIAL
  // ============================================================

  function openMaterial(
    material: Material
  ) {
    if (material.external_url) {
      window.open(
        material.external_url,
        "_blank",
        "noopener,noreferrer"
      );

      return;
    }

    if (material.file_path) {
      const {
        data,
      } = supabase.storage
        .from("study-materials")
        .getPublicUrl(
          material.file_path
        );

      window.open(
        data.publicUrl,
        "_blank",
        "noopener,noreferrer"
      );
    }
  }

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm font-semibold text-orange-600">
          Loading study materials...
        </div>
      </div>
    );
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-50">

      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div>
            <h1 className="text-xl font-black text-slate-900">
              Study Material
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              Manage notes, PDFs and learning resources.
            </p>
          </div>

          <button
            onClick={() =>
              setShowForm(!showForm)
            }
            className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600"
          >
            {showForm
              ? "Close"
              : "+ Add Material"}
          </button>

        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">

        {/* ADD FORM */}

        {showForm && (
          <form
            onSubmit={addMaterial}
            className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >

            <h2 className="mb-6 text-lg font-black text-slate-900">
              Add Study Material
            </h2>

            <div className="grid gap-5 md:grid-cols-2">

              {/* COURSE */}

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  📚 Course
                </label>

                <select
                  value={courseId}
                  disabled={saving}
                  onChange={(e) =>
                    setCourseId(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500"
                >
                  <option value="">
                    Select Course
                  </option>

                  {courses.map(
                    (course) => (
                      <option
                        key={course.id}
                        value={course.id}
                      >
                        {course.title}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* TYPE */}

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Material Type
                </label>

                <select
                  value={materialType}
                  disabled={saving}
                  onChange={(e) =>
                    setMaterialType(
                      e.target.value as Material["material_type"]
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500"
                >
                  {MATERIAL_TYPES.map(
                    (type) => (
                      <option
                        key={type.value}
                        value={type.value}
                      >
                        {type.label}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* TITLE */}

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  📝 Material Title
                </label>

                <input
                  value={title}
                  disabled={saving}
                  onChange={(e) =>
                    setTitle(
                      e.target.value
                    )
                  }
                  placeholder="Example: Chapter 1 Complete Notes"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-500"
                />
              </div>

              {/* DESCRIPTION */}

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  📋 Description
                </label>

                <textarea
                  value={description}
                  disabled={saving}
                  onChange={(e) =>
                    setDescription(
                      e.target.value
                    )
                  }
                  rows={3}
                  placeholder="Describe this study material..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-500"
                />
              </div>

              {/* FILE */}

              {materialType !== "link" && (
                <div className="md:col-span-2">

                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    📄 Select File
                  </label>

                  <input
                    id="material-file"
                    type="file"
                    disabled={saving}
                    accept={
                      materialType === "pdf"
                        ? "application/pdf"
                        : undefined
                    }
                    onChange={(e) =>
                      setSelectedFile(
                        e.target.files?.[0] ||
                          null
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />

                  {selectedFile && (
                    <div className="mt-2 rounded-xl bg-emerald-50 p-3">

                      <p className="text-xs font-bold text-emerald-700">
                        ✓ Selected file
                      </p>

                      <p className="mt-1 truncate text-xs text-emerald-600">
                        {selectedFile.name}
                      </p>

                    </div>
                  )}

                </div>
              )}

              {/* EXTERNAL URL */}

              {materialType === "link" && (
                <div className="md:col-span-2">

                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    🔗 External URL
                  </label>

                  <input
                    type="url"
                    value={externalUrl}
                    disabled={saving}
                    onChange={(e) =>
                      setExternalUrl(
                        e.target.value
                      )
                    }
                    placeholder="https://example.com/notes"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-500"
                  />

                </div>
              )}

            </div>

            {/* BUTTON */}

            <div className="mt-6 flex justify-end gap-3">

              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Create Material"}
              </button>

            </div>

          </form>
        )}

        {/* MATERIAL LIST */}

        <div className="mb-4">

          <h2 className="text-lg font-black text-slate-900">
            All Study Materials
          </h2>

          <p className="text-xs text-slate-500">
            {materials.length}{" "}
            {materials.length === 1
              ? "material"
              : "materials"}
          </p>

        </div>

        {materials.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">

            <div className="text-5xl">
              📁
            </div>

            <h3 className="mt-4 font-bold text-slate-900">
              No study material yet
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Click "+ Add Material" to create your first resource.
            </p>

          </div>
        ) : (
          <div className="space-y-4">

            {materials.map(
              (material) => (
                <div
                  key={material.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >

                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                    {/* INFO */}

                    <div className="min-w-0">

                      <div className="flex flex-wrap items-center gap-2">

                        <h3 className="text-lg font-black text-slate-900">
                          {material.title}
                        </h3>

                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                            material.is_published
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {material.is_published
                            ? "Published"
                            : "Draft"}
                        </span>

                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">

                        <span className="rounded-lg bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-700">
                          📚{" "}
                          {getCourseName(
                            material.course_id
                          )}
                        </span>

                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                          {MATERIAL_TYPES.find(
                            (type) =>
                              type.value ===
                              material.material_type
                          )?.label ||
                            "📁 Material"}
                        </span>

                      </div>

                      {material.description && (
                        <p className="mt-3 line-clamp-2 text-sm text-slate-500">
                          {material.description}
                        </p>
                      )}

                    </div>

                    {/* ACTIONS */}

                    <div className="flex shrink-0 flex-wrap gap-2">

                      {(material.file_path ||
                        material.external_url) && (
                        <button
                          type="button"
                          onClick={() =>
                            openMaterial(
                              material
                            )
                          }
                          className="rounded-lg bg-orange-50 px-4 py-2 text-xs font-bold text-orange-600 hover:bg-orange-100"
                        >
                          ↗ Open
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          togglePublished(
                            material
                          )
                        }
                        className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        {material.is_published
                          ? "Unpublish"
                          : "Publish"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteMaterial(
                            material
                          )
                        }
                        className="rounded-lg bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
                      >
                        Delete
                      </button>

                    </div>

                  </div>

                </div>
              )
            )}

          </div>
        )}

      </main>

    </div>
  );
}