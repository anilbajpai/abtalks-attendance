import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { upsertAttendanceRecord } from "@/lib/google-sheets";
import { canAdminOverride } from "@/lib/attendance-rules";
import type { AttendanceType } from "@/types";

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const { userId, date, type, note } = await req.json();

    if (!userId || !date || !type) {
      return NextResponse.json(
        { error: "userId, date, and type are required" },
        { status: 400 }
      );
    }

    if (!canAdminOverride(date)) {
      return NextResponse.json(
        { error: "Admin can only override attendance for the last 7 days" },
        { status: 400 }
      );
    }

    const validTypes: AttendanceType[] = [
      "OFFICE",
      "HOME",
      "LEAVE",
      "PLANNED_LEAVE",
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid attendance type" },
        { status: 400 }
      );
    }

    const record = await upsertAttendanceRecord({
      userId,
      date,
      type,
      isOverride: true,
      note: note || `Overridden by ${session.user.name}`,
    });

    return NextResponse.json({ record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
