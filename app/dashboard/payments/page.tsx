"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PaymentHistoryItem = {
  id: string;
  amount: number | null;
  payment_id: string | null;
  order_id: string | null;
  created_at: string;
  courses: {
    title: string;
    subject: string | null;
    price: number | null;
  }[];
};

export default function StudentPaymentsPage() {
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setErrorMsg("Please log in to view your purchase history.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("enrollments")
          .select(`
            id,
            amount,
            payment_id,
            order_id,
            created_at,
            courses (
              title,
              subject,
              price
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching enrollments:", error.message);
          setErrorMsg("Failed to load purchase history.");
        } else {
          setPayments((data ?? []) as PaymentHistoryItem[]);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setErrorMsg("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700 font-medium">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-600">
            Loading your purchase history...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white p-6 border border-slate-200 shadow-sm">
          <div>
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">
              Billing & Orders
            </span>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              Purchase History
            </h1>
          </div>

          <div className="rounded-xl bg-orange-50 px-4 py-2.5 border border-orange-100 text-xs font-bold text-orange-700">
            Total Orders: {payments.length}
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-2xl bg-red-50 p-4 text-center text-xs font-semibold text-red-600 border border-red-100">
            {errorMsg}
          </div>
        )}

        {/* PAYMENTS LIST / TABLE */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          {payments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
                📄
              </div>

              <h3 className="text-base font-bold text-slate-900">
                No purchases found
              </h3>

              <p className="text-xs text-slate-500 mt-1">
                You haven&apos;t enrolled in any courses yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="p-4">Course Details</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Transaction ID</th>
                    <th className="p-4">Date</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {payments.map((item) => {
                    const course = item.courses?.[0];

                    const displayAmount =
                      item.amount ?? course?.price ?? 0;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/50 transition"
                      >
                        <td className="p-4">
                          <p className="font-bold text-slate-900">
                            {course?.title || "Course Enrollment"}
                          </p>

                          {course?.subject && (
                            <span className="inline-block mt-0.5 rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-600 uppercase border border-orange-200">
                              {course.subject}
                            </span>
                          )}
                        </td>

                        <td className="p-4 font-black text-slate-900">
                          ₹{displayAmount}{" "}
                          <span className="text-[10px] text-slate-400 uppercase font-medium">
                            INR
                          </span>
                        </td>

                        <td className="p-4">
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Success
                          </span>
                        </td>

                        <td className="p-4 font-mono text-[11px] text-slate-500">
                          {item.payment_id ||
                            item.order_id ||
                            "Direct Access"}
                        </td>

                        <td className="p-4 text-slate-500 font-medium whitespace-nowrap">
                          {formatDate(item.created_at)}
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