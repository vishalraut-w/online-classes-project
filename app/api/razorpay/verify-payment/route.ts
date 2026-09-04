import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, message: "Server misconfiguration: missing Supabase keys." },
        { status: 500 }
      );
    }

    // Bypass RLS using admin service role client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courseId,
      lessonId,
      userId,
      amount,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, message: "Missing required payment parameters." },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Missing required user identity parameter." },
        { status: 400 }
      );
    }

    // 1. HMAC Verification
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return NextResponse.json(
        { success: false, message: "Server configuration missing Razorpay secret." },
        { status: 500 }
      );
    }

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json(
        { success: false, message: "Invalid payment signature." },
        { status: 400 }
      );
    }

    // 2. Resolve final amount dynamically if not passed from frontend
    let finalAmount = amount;

    if (!finalAmount) {
      if (courseId) {
        const { data: courseData } = await supabaseAdmin
          .from("courses")
          .select("price")
          .eq("id", courseId)
          .single();

        if (courseData && courseData.price != null) {
          finalAmount = courseData.price;
        }
      } else if (lessonId) {
        const { data: lessonData } = await supabaseAdmin
          .from("lessons")
          .select("price")
          .eq("id", lessonId)
          .single();

        if (lessonData && lessonData.price != null) {
          finalAmount = lessonData.price;
        }
      }
    }

    // 3. Exact match against your DB columns
    const enrollmentData: Record<string, any> = {
      user_id: userId,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      created_at: new Date().toISOString(),
    };

    if (finalAmount != null) enrollmentData.amount = finalAmount;
    if (courseId) enrollmentData.course_id = courseId;
    if (lessonId) enrollmentData.lesson_id = lessonId;

    // Handle conflict target depending on whether it's a course or a lesson
    const conflictTarget = courseId ? "user_id,course_id" : "user_id,lesson_id";

    // 4. Upsert into database
    const { error: dbError } = await supabaseAdmin
      .from("enrollments")
      .upsert(enrollmentData, { onConflict: conflictTarget });

    if (dbError) {
      console.error("[SUPABASE_ENROLLMENT_ERROR]:", dbError);
      return NextResponse.json(
        { success: false, message: `Database error (${dbError.code}): ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully!",
    });
  } catch (err: any) {
    console.error("[VERIFY_PAYMENT_EXCEPTION]:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Internal server error." },
      { status: 500 }
    );
  }
}