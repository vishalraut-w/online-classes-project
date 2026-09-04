"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ItemDetails = {
  id: string;
  title: string;
  description?: string;
  price: number;
  type: "course" | "lesson";
};

declare global {
  interface Window {
    Razorpay: any;
  }
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const itemType = (searchParams.get("itemType") as "course" | "lesson") || "course";
  const itemId = searchParams.get("itemId");

  const [item, setItem] = useState<ItemDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const handleCancel = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard/courses");
    }
  };

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    async function fetchItem() {
      if (!itemId) {
        setLoading(false);
        return;
      }
      setLoading(true);

      const table = itemType === "course" ? "courses" : "lessons";
      const { data, error } = await supabase
        .from(table)
        .select("id, title, description, price")
        .eq("id", itemId)
        .single();

      if (error || !data) {
        console.error("Error loading item:", error);
      } else {
        setItem({
          id: data.id,
          title: data.title,
          description: data.description,
          price: Number(data.price) || 0,
          type: itemType,
        });
      }
      setLoading(false);
    }

    fetchItem();
  }, [itemId, itemType]);

  const handlePayment = async () => {
    if (!item) return;
    setProcessing(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Please log in to continue.");
        router.push("/");
        return;
      }

      // 1. Create Razorpay Order
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: item.price,
          courseId: item.type === "course" ? item.id : null,
          lessonId: item.type === "lesson" ? item.id : null,
          userId: user.id,
        }),
      });

      const orderData = await res.json();

      if (!res.ok || !orderData?.order?.id) {
        throw new Error(orderData.message || "Failed to initiate payment order.");
      }

      const razorpayOrder = orderData.order;

      // 2. Open Razorpay Modal
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || "INR",
        name: "Raut Coaching Classes",
        description: `Unlock ${item.type}: ${item.title}`,
        order_id: razorpayOrder.id,
        prefill: { email: user.email },
        theme: { color: "#ea580c" },
        modal: {
          ondismiss: () => {
            setProcessing(false);
          },
        },
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                courseId: item.type === "course" ? item.id : null,
                lessonId: item.type === "lesson" ? item.id : null,
                userId: user.id,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              alert("Payment successful! Access granted.");
              router.push("/dashboard");
            } else {
              alert(verifyData.message || "Payment verification failed.");
            }
          } catch (verifyErr: any) {
            console.error("Verification Error:", verifyErr);
            alert("An error occurred during payment verification.");
          } finally {
            setProcessing(false);
          }
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err: any) {
      console.error("Payment Error:", err);
      alert(err.message || "Payment processing failed.");
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-xs text-slate-500">
        Loading Checkout Details...
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-xs text-slate-500">
        <p>Invalid checkout request or item not found.</p>
        <button
          onClick={handleCancel}
          className="rounded-xl bg-slate-200 px-4 py-2 font-bold text-slate-700 hover:bg-slate-300 transition"
        >
          ✕ Close
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-800 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-xl">
        <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <button
            onClick={handleCancel}
            aria-label="Close Checkout"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            ✕
          </button>

          <div className="pr-8">
            <h1 className="text-xl font-black text-slate-900">Checkout</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Complete your payment to instantly unlock this {item.type}.
            </p>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="rounded-md bg-orange-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-orange-700">
              Unlocking {item.type}
            </span>
            <span className="text-xs text-slate-400">One-time Payment</span>
          </div>

          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">{item.title}</h2>
              {item.description && (
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">{item.description}</p>
              )}
            </div>
            <span className="text-xl font-black text-slate-900">₹{item.price}</span>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Item Price</span>
              <span>₹{item.price}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Taxes & Fees</span>
              <span>₹0.00</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-slate-900 border-t border-slate-100 pt-3">
              <span>Total Amount</span>
              <span className="text-orange-600">₹{item.price}</span>
            </div>
          </div>

          <button
            onClick={handlePayment}
            disabled={processing}
            className="w-full rounded-xl bg-orange-600 py-3 text-xs font-bold text-white shadow-lg shadow-orange-600/20 hover:bg-orange-700 transition active:scale-95 disabled:opacity-50"
          >
            {processing ? "Preparing Gateway..." : `Pay ₹${item.price} to Unlock`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}