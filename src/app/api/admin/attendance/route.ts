import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import {
  getAttendanceRecords,
  upsertAttendanceRecord,
} from "@/lib/google-sheets";
import {
  canAdminOverride,
  canTakeHalfDay,
  monthRange,
} from "@/lib/attendance-rules";
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

    const validTypes: AttendanceType[] = [
      "OFFICE",
      "HOME",
      "HALF_DAY",
      "LEAVE",
      "PLANNED_LEAVE",
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid attendance type" },
        { status: 400 }
      );
    }

    const isLeave = type === "LEAVE" || type === "PLANNED_LEAVE";
    if (!isLeave && !canAdminOverride(date)) {
      return NextResponse.json(
        { error: "Admin can only override attendance for the last 7 days" },
        { status: 400 }
      );
    }

    if (type === "HALF_DAY") {
      const { start, end } = monthRange(date);
      const monthRecords = await getAttendanceRecords(userId, start, end);
      const halfDay = canTakeHalfDay(monthRecords, date);
      if (!halfDay.allowed) {
        return NextResponse.json({ error: halfDay.reason }, { status: 400 });
      }
    }

    const record = await upsertAttendanceRecord({
      userId,
      date,
      type,
      isOverride: true,
      status: "APPROVED",
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
