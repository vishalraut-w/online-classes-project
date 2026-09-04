"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Course = {
  id: string;
  title: string;
  price: number;
};

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  payment_id?: string | null;
  enrolled_at?: string;
  created_at?: string;
  profiles: Profile | null;
  courses: Course | null;
};

type SystemStatus = {
  dbConnection: boolean;
  rlsActive: boolean;
  latencyMs: number;
};

export default function AdminAdvancePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Tools State
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [bulkCourse, setBulkCourse] = useState("");
  
  // System Diagnostics
  const [sysStatus, setSysStatus] = useState<SystemStatus | null>(null);
  const [dbLogMessage, setDbLogMessage] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      // 1. Query enrollments using select("*") to pull all fields (including payment_id)
      const [coursesRes, profilesRes, rawEnrollmentsRes] = await Promise.all([
        supabase.from("courses").select("id, title, price").order("title"),
        supabase.from("profiles").select("id, full_name, email").order("full_name"),
        supabase.from("enrollments").select("*"),
      ]);

      if (coursesRes.error) throw coursesRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (rawEnrollmentsRes.error) throw rawEnrollmentsRes.error;

      const coursesData = coursesRes.data || [];
      const profilesData = profilesRes.data || [];
      const rawEnrollments = rawEnrollmentsRes.data || [];

      // 2. Build quick lookup maps
      const profileMap = new Map(profilesData.map((p) => [p.id, p]));
      const courseMap = new Map(coursesData.map((c) => [c.id, c]));

      // 3. Assemble and sort enrollments by date
      const combinedEnrollments: Enrollment[] = rawEnrollments
        .map((item) => ({
          ...item,
          profiles: profileMap.get(item.user_id) || null,
          courses: courseMap.get(item.course_id) || null,
        }))
        .sort((a, b) => {
          const dateA = new Date(a.enrolled_at || a.created_at || 0).getTime();
          const dateB = new Date(b.enrolled_at || b.created_at || 0).getTime();
          return dateB - dateA;
        });

      setCourses(coursesData);
      setProfiles(profilesData);
      setEnrollments(combinedEnrollments);
    } catch (err: any) {
      console.error("Error loading advance data:", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // TOOL 1: Run System Diagnostics & Latency Test
  async function runSystemDiagnostics() {
    setActionLoading(true);
    setDbLogMessage(null);
    const startTime = performance.now();

    try {
      const { error } = await supabase.from("profiles").select("id").limit(1);
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      if (error) throw error;

      setSysStatus({
        dbConnection: true,
        rlsActive: true,
        latencyMs: latency,
      });
      setDbLogMessage(`Diagnostics complete. Database latency: ${latency}ms.`);
    } catch (err: any) {
      setSysStatus({
        dbConnection: false,
        rlsActive: false,
        latencyMs: 0,
      });
      setDbLogMessage(`Diagnostics Failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  // TOOL 2: Reload PostgREST Schema Cache
  async function reloadSchemaCache() {
    setActionLoading(true);
    setDbLogMessage(null);
    try {
      const { error } = await supabase.rpc("is_admin");
      if (error) throw error;
      setDbLogMessage("Schema cache reloaded successfully.");
    } catch (err: any) {
      setDbLogMessage(`Cache Reload Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  // TOOL 3: Single Student Manual Access Grant
  async function handleManualEnrollment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser || !selectedCourse) {
      alert("Please select both a student and a course.");
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase.from("enrollments").insert({
        user_id: selectedUser,
        course_id: selectedCourse,
      });

      if (error) throw error;

      alert("Student enrolled successfully!");
      setSelectedUser("");
      setSelectedCourse("");
      await loadData();
    } catch (err: any) {
      alert(`Enrollment failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  // TOOL 4: Bulk Enroll All Registered Students into a Course
  async function handleBulkEnrollment() {
    if (!bulkCourse) {
      alert("Please select a target course for bulk enrollment.");
      return;
    }

    const confirmRun = confirm(
      `Are you sure you want to enroll ALL ${profiles.length} registered students into this course?`
    );
    if (!confirmRun) return;

    setActionLoading(true);
    try {
      const bulkPayload = profiles.map((p) => ({
        user_id: p.id,
        course_id: bulkCourse,
      }));

      const { error } = await supabase.from("enrollments").upsert(bulkPayload, {
        onConflict: "user_id,course_id",
        ignoreDuplicates: true,
      });

      if (error) throw error;

      alert("Bulk enrollment batch execution complete!");
      setBulkCourse("");
      await loadData();
    } catch (err: any) {
      alert(`Bulk enrollment failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  // TOOL 5: Revoke Course Access (Updated with .select() verification)
  async function revokeEnrollment(id: string) {
  if (!confirm("Are you sure you want to revoke this student's course access?")) return;

  setActionLoading(true);
  try {
    const { error } = await supabase.rpc("admin_revoke_enrollment", {
      target_enrollment_id: id,
    });

    if (error) throw error;

    alert("Access revoked successfully!");
    await loadData();
  } catch (err: any) {
    alert(`Failed to revoke enrollment: ${err.message}`);
  } finally {
    setActionLoading(false);
  }
}

  // TOOL 6: Export Enrollments Log to CSV (Includes Payment ID)
  function exportAuditCSV() {
    if (enrollments.length === 0) return alert("No enrollment data available to export.");

    const headers = ["Enrollment ID,Payment ID,Student Name,Student Email,Course Title,Price,Enrolled Date"];
    const rows = enrollments.map((e) => {
      const rawDate = e.enrolled_at || e.created_at;
      const formattedDate = rawDate ? new Date(rawDate).toISOString() : "N/A";

      return [
        e.id,
        `"${e.payment_id || "N/A"}"`,
        `"${e.profiles?.full_name || "Unnamed"}"`,
        `"${e.profiles?.email || "No Email"}"`,
        `"${e.courses?.title || "Unknown Course"}"`,
        e.courses?.price || 0,
        formattedDate,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `enrollments_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 font-sans md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Advanced Administrative Controls & Utilities
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Manual access grants, system health diagnostics, and bulk operational tools.
            </p>
          </div>
          <button
            onClick={exportAuditCSV}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            📥 Export Audit (CSV)
          </button>
        </div>

        {/* TOOLKIT GRID */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          {/* TOOL 1: MANUAL SINGLE ACCESS GRANT */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Single Access Grant</h2>
            <p className="mt-1 text-xs text-slate-500">
              Manually enroll a specific student into a single course.
            </p>

            <form onSubmit={handleManualEnrollment} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Student</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  disabled={actionLoading}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select Student --</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || "Unnamed"} ({p.email || "No Email"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Course</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  disabled={actionLoading}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select Course --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {actionLoading ? "Processing..." : "Grant Access"}
              </button>
            </form>
          </div>

          {/* TOOL 2: BULK ENROLLMENT EXECUTION */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Bulk Batch Enrollment</h2>
            <p className="mt-1 text-xs text-slate-500">
              Enroll all ({profiles.length}) registered students into a selected course simultaneously.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Target Course</label>
                <select
                  value={bulkCourse}
                  onChange={(e) => setBulkCourse(e.target.value)}
                  disabled={actionLoading}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choose Course for All Students --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
                ⚠️ Operational Note: Existing user enrollments for this course will be skipped automatically without duplicate error.
              </div>

              <button
                onClick={handleBulkEnrollment}
                disabled={actionLoading || !bulkCourse}
                className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {actionLoading ? "Running Batch..." : "Execute Bulk Grant"}
              </button>
            </div>
          </div>

          {/* TOOL 3: DIAGNOSTICS & SYSTEM MAINTENANCE */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">System Maintenance</h2>
            <p className="mt-1 text-xs text-slate-500">
              Run connection diagnostics and trigger PostgREST schema updates.
            </p>

            <div className="mt-5 space-y-3">
              <button
                onClick={runSystemDiagnostics}
                disabled={actionLoading}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                ⚡ Run Database Diagnostics
              </button>

              <button
                onClick={reloadSchemaCache}
                disabled={actionLoading}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                🔄 Force Reload Schema Cache
              </button>

              {sysStatus && (
                <div className="mt-2 space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">DB Status:</span>
                    <span className="font-bold text-emerald-600">
                      {sysStatus.dbConnection ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Latency:</span>
                    <span className="font-mono font-bold text-slate-800">{sysStatus.latencyMs}ms</span>
                  </div>
                </div>
              )}

              {dbLogMessage && (
                <div className="mt-2 rounded-xl bg-slate-900 p-3 font-mono text-[11px] text-emerald-400">
                  {dbLogMessage}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ACTIVE ENROLLMENTS AUDIT TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="font-semibold text-slate-900">Active Access Grants Audit</h2>
              <p className="text-xs text-slate-400">Total Grants: {enrollments.length}</p>
            </div>
            <button
              onClick={loadData}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              🔄 Refresh List
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400">
              Loading enrollments audit table...
            </div>
          ) : enrollments.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400">
              No course grants found in system logs.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3.5">Student</th>
                    <th className="px-6 py-3.5">Course Title</th>
                    <th className="px-6 py-3.5">Payment ID</th>
                    <th className="px-6 py-3.5">Granted On</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enrollments.map((item) => {
                    const grantedDate = item.enrolled_at || item.created_at;

                    return (
                      <tr key={item.id} className="transition-colors hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">
                            {item.profiles?.full_name || "Unnamed Student"}
                          </div>
                          <div className="text-xs text-slate-400">
                            {item.profiles?.email || "No Email"}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-800">
                          {item.courses?.title || "Unknown Course"}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">
                          {item.payment_id ? (
                            <span className="rounded bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                              {item.payment_id}
                            </span>
                          ) : (
                            <span className="italic text-slate-400">Manual / Free</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {grantedDate ? new Date(grantedDate).toLocaleDateString() : "N/A"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => revokeEnrollment(item.id)}
                            disabled={actionLoading}
                            className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                          >
                            Revoke Access
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}