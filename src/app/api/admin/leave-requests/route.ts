import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { getUserByEmail } from "@/lib/users";
import {
  getAttendanceRecord,
  getPendingLeaveRequests,
  upsertAttendanceRecord,
} from "@/lib/google-sheets";
import { isLeaveType } from "@/lib/attendance-rules";

export async function GET() {
  try {
    await requireAdmin();
    const pending = await getPendingLeaveRequests();
    const requests = pending.map((record) => {
      const user = getUserByEmail(record.userId);
      return {
        ...record,
        userName: user?.name || record.userId,
        email: record.userId,
      };
    });

    return NextResponse.json({ requests });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const { userId, date, action } = await req.json();

    if (!userId || !date || !action) {
      return NextResponse.json(
        { error: "userId, date, and action are required" },
        { status: 400 }
      );
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "action must be approve or reject" },
        { status: 400 }
      );
    }

    const existing = await getAttendanceRecord(userId, date);
    if (!existing || existing.status !== "PENDING" || !isLeaveType(existing.type)) {
      return NextResponse.json(
        { error: "No pending leave request found for this date" },
        { status: 404 }
      );
    }

    const approved = action === "approve";
    const record = await upsertAttendanceRecord({
      userId,
      date,
      type: existing.type,
      isOverride: true,
      status: approved ? "APPROVED" : "REJECTED",
      note: `${approved ? "Approved" : "Rejected"} by ${session.user.name}`,
    });

    return NextResponse.json({ record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
