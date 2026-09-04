import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { courseId, lessonId, userId } = await req.json();

    if ((!courseId && !lessonId) || !userId) {
      return NextResponse.json(
        { success: false, message: "Missing required details." },
        { status: 400 }
      );
    }

    // 1. Get item details from DB
    const table = courseId ? "courses" : "lessons";
    const targetId = courseId || lessonId;

    const { data: item, error: itemError } = await supabaseAdmin
      .from(table)
      .select("id, price")
      .eq("id", targetId)
      .single();

    if (itemError || !item) {
      return NextResponse.json(
        { success: false, message: "Item not found." },
        { status: 404 }
      );
    }

    // 2. Check for existing enrollment
    let query = supabaseAdmin.from("enrollments").select("id").eq("user_id", userId);
    if (courseId) query = query.eq("course_id", courseId);
    if (lessonId) query = query.eq("lesson_id", lessonId);

    const { data: existingEnrollment } = await query.maybeSingle();

    if (existingEnrollment) {
      return NextResponse.json(
        { success: false, message: "You already own this content." },
        { status: 400 }
      );
    }

    // 3. Create Razorpay order (Amount MUST be in Paisa: multiply by 100)
    const options = {
      amount: Math.round(Number(item.price) * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        courseId: courseId || "",
        lessonId: lessonId || "",
        userId,
      },
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("[CREATE_ORDER_ERROR]:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to create order." },
      { status: 500 }
    );
  }
}