import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { HOLIDAYS_2026 } from "@/lib/constants";
import { getAllEmployees } from "@/lib/users";
import { getAttendanceRecords } from "@/lib/google-sheets";
import {
  calculatePayroll,
  countWorkingDays,
  getMonthDays,
  isSunday,
} from "@/lib/attendance-rules";

// Payroll runs are computed on the fly from Google Sheets attendance.
// Database persistence for payroll history is disabled.

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month") || "1");
    const year = parseInt(searchParams.get("year") || "2026");

    const runs = await computePayrollRuns(month, year);
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

    const runs = await computePayrollRuns(month, year, session.user.name || "Admin");
    return NextResponse.json({ runs, count: runs.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

async function computePayrollRuns(
  month: number,
  year: number,
  processedBy = "Admin"
) {
  const employees = getAllEmployees();
  const days = getMonthDays(year, month);
  const holidaySet = new Set(
    HOLIDAYS_2026.filter((h) => h.date >= days[0] && h.date <= days.at(-1)!)
      .map((h) => h.date)
  );
  const totalWorkingDays = countWorkingDays(days, holidaySet);

  const runs = [];

  for (const emp of employees) {
    const records = await getAttendanceRecords(emp.id, days[0], days.at(-1)!);
    const recordMap = Object.fromEntries(records.map((r) => [r.date, r.type]));

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

    runs.push({
      id: `${emp.id}-${year}-${month}`,
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
      processedAt: new Date().toISOString(),
      processedBy,
      user: { name: emp.name, email: emp.email },
    });
  }

  return runs;
}
