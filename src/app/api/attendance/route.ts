import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { HOLIDAYS_2026 } from "@/lib/constants";
import {
  getAttendanceRecord,
  getAttendanceRecords,
  upsertAttendanceRecord,
} from "@/lib/google-sheets";
import {
  canEmployeeMark,
  isFuture,
  isSunday,
} from "@/lib/attendance-rules";
import type { AttendanceType } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") || "2026");
    const month = parseInt(searchParams.get("month") || "1");
    const userId = searchParams.get("userId") || session.user.id;

    if (userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

    const records = await getAttendanceRecords(userId, startDate, endDate);
    const holidays = Object.fromEntries(
      HOLIDAYS_2026.filter((h) => h.date >= startDate && h.date <= endDate).map(
        (h) => [h.date, h]
      )
    );

    return NextResponse.json({ records, holidays });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { date, type } = await req.json();

    if (!date || !type) {
      return NextResponse.json(
        { error: "Date and type are required" },
        { status: 400 }
      );
    }

    const validTypes: AttendanceType[] = ["OFFICE", "HOME", "LEAVE"];
    const futureTypes: AttendanceType[] = ["PLANNED_LEAVE"];

    if (isSunday(date)) {
      return NextResponse.json(
        { error: "Sundays are automatically marked as leave" },
        { status: 400 }
      );
    }

    const holiday = HOLIDAYS_2026.find((h) => h.date === date);
    if (holiday) {
      return NextResponse.json(
        { error: `${holiday.name} is a gazetted holiday` },
        { status: 400 }
      );
    }

    const existing = await getAttendanceRecord(session.user.id, date);
    const { allowed, reason } = canEmployeeMark(date, existing?.type);
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 400 });
    }

    let attendanceType: AttendanceType;
    if (isFuture(date)) {
      if (!futureTypes.includes(type)) {
        return NextResponse.json(
          { error: "Future dates can only be marked as planned leave" },
          { status: 400 }
        );
      }
      attendanceType = "PLANNED_LEAVE";
    } else {
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: "Invalid attendance type for today" },
          { status: 400 }
        );
      }
      attendanceType = type;
    }

    const record = await upsertAttendanceRecord({
      userId: session.user.id,
      date,
      type: attendanceType,
    });

    return NextResponse.json({ record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
