import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import {
  calculatePayroll,
  countWorkingDays,
  getMonthDays,
  isSunday,
} from "@/lib/attendance-rules";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month") || "1");
    const year = parseInt(searchParams.get("year") || "2026");

    const runs = await prisma.payrollRun.findMany({
      where: { month, year },
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { user: { name: "asc" } },
    });

    return NextResponse.json({ runs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const { month, year } = await req.json();

    if (!month || !year) {
      return NextResponse.json(
        { error: "month and year are required" },
        { status: 400 }
      );
    }

    const employees = await prisma.user.findMany({
      where: { role: "EMPLOYEE" },
    });

    const days = getMonthDays(year, month);
    const holidays = await prisma.holiday.findMany({
      where: {
        date: {
          gte: days[0],
          lte: days[days.length - 1],
        },
      },
    });
    const holidaySet = new Set(holidays.map((h) => h.date));
    const totalWorkingDays = countWorkingDays(days, holidaySet);

    const results = [];

    for (const emp of employees) {
      const records = await prisma.attendanceRecord.findMany({
        where: {
          userId: emp.id,
          date: { in: days },
        },
      });

      const recordMap = Object.fromEntries(
        records.map((r) => [r.date, r.type])
      );

      let officeDays = 0;
      let homeDays = 0;
      let leaveDays = 0;

      for (const day of days) {
        const type = recordMap[day];
        if (isSunday(day) || holidaySet.has(day)) {
          leaveDays++;
          continue;
        }
        if (type === "OFFICE") officeDays++;
        else if (type === "HOME") homeDays++;
        else leaveDays++;
      }

      const { fixedAmount, variableAmount, totalAmount } = calculatePayroll(
        emp.fixedSalary,
        emp.variableSalary,
        emp.targetMet,
        officeDays,
        homeDays,
        totalWorkingDays
      );

      const run = await prisma.payrollRun.upsert({
        where: {
          userId_month_year: {
            userId: emp.id,
            month,
            year,
          },
        },
        update: {
          fixedAmount,
          variableAmount,
          totalAmount,
          targetMet: emp.targetMet,
          officeDays,
          homeDays,
          leaveDays,
          processedAt: new Date(),
          processedBy: session.user.name || session.user.email || "Admin",
        },
        create: {
          userId: emp.id,
          month,
          year,
          fixedAmount,
          variableAmount,
          totalAmount,
          targetMet: emp.targetMet,
          officeDays,
          homeDays,
          leaveDays,
          processedBy: session.user.name || session.user.email || "Admin",
        },
      });

      results.push(run);
    }

    return NextResponse.json({ runs: results, count: results.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
