import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getNowIST } from "@/lib/attendance-rules";
import { toDateString } from "@/lib/attendance-rules";

export async function GET() {
  try {
    const session = await requireAuth();
    const today = toDateString(getNowIST());

    const todayRecord = await prisma.attendanceRecord.findUnique({
      where: {
        userId_date: { userId: session.user.id, date: today },
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        baseSalary: true,
        fixedSalary: true,
        variableSalary: true,
        targetMet: true,
      },
    });

    return NextResponse.json({ user, todayRecord, today });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
