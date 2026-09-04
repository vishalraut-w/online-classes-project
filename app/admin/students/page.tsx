'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface StudentRecord {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  created_at: string;
  enrollments?: {
    courses?: {
      title?: string | null;
    } | null;
  }[];
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // 1. Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        setStudents([]);
        return;
      }

      // 2. Fetch enrollments with related course titles
      const userIds = profiles.map((p) => p.id);
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          user_id,
          courses (
            title
          )
        `)
        .in('user_id', userIds);

      if (enrollmentsError) throw enrollmentsError;

      // 3. Map enrollments to their respective profile
      const mergedStudents: StudentRecord[] = profiles.map((profile) => {
        const userEnrollments = (enrollments || [])
          .filter((e) => e.user_id === profile.id)
          .map((e) => ({
            courses: Array.isArray(e.courses) ? e.courses[0] : e.courses,
          }));

        return {
          ...profile,
          enrollments: userEnrollments,
        };
      });

      setStudents(mergedStudents);
    } catch (err: any) {
      console.error('Error fetching students:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = students.filter((student) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = student.full_name?.toLowerCase().includes(query) ?? false;
    const emailMatch = student.email?.toLowerCase().includes(query) ?? false;
    const phoneMatch = student.phone?.toLowerCase().includes(query) ?? false;

    return nameMatch || emailMatch || phoneMatch;
  });

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Directory</h1>
            <p className="text-sm text-slate-500 mt-0.5">Profiles, contact information, and purchased course details.</p>
          </div>
          <div className="w-full sm:w-80">
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm outline-none"
            />
          </div>
        </div>

        {/* METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Registered Students</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">{students.length}</p>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Active Course Enrollments</p>
            <p className="text-3xl font-extrabold text-indigo-600 mt-2">
              {students.reduce((acc, curr) => acc + (curr.enrollments?.length || 0), 0)}
            </p>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-semibold text-slate-900">Student Profiles</h2>
            <button
              onClick={fetchStudents}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              🔄 Refresh List
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Fetching student profiles from database...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">No profiles found matching your search.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Student Name</th>
                    <th className="px-6 py-3.5">Email</th>
                    <th className="px-6 py-3.5">Mobile Number</th>
                    <th className="px-6 py-3.5">Purchased Courses</th>
                    <th className="px-6 py-3.5">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student) => {
                    const courseTitles = student.enrollments
                      ?.map((e) => e.courses?.title)
                      .filter(Boolean);

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {student.full_name || 'Unnamed Student'}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-800">
                          {student.email || <span className="text-slate-400 italic">No email</span>}
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                          {student.phone || <span className="text-slate-400 italic">No mobile number</span>}
                        </td>
                        <td className="px-6 py-4">
                          {courseTitles && courseTitles.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {courseTitles.map((title, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                                >
                                  {title}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No course purchased</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {new Date(student.created_at).toLocaleDateString()}
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