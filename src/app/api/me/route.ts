import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getUserById } from "@/lib/users";
import { getAttendanceRecord } from "@/lib/google-sheets";
import { getNowIST, toDateString } from "@/lib/attendance-rules";

export async function GET() {
  try {
    const session = await requireAuth();
    const today = toDateString(getNowIST());
    const user = getUserById(session.user.id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const todayRecord = await getAttendanceRecord(session.user.id, today);

    return NextResponse.json({ user, todayRecord, today });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
