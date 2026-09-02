import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import {
  addDays,
  endOfMonth,
  format,
  startOfMonth,
  isAfter,
} from "date-fns";
import { ATTENDANCE_WINDOW } from "./constants";

const TZ = ATTENDANCE_WINDOW.timezone;

/** Today's calendar date in IST (`yyyy-MM-dd`). */
export function todayIST(): string {
  return formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
}

/**
 * Format an instant as an IST calendar date.
 * Pass a real timestamp (`new Date()`), not `getNowIST()`.
 */
export function toDateString(date: Date = new Date()): string {
  return formatInTimeZone(date, TZ, "yyyy-MM-dd");
}

/**
 * IST wall-clock time as a local Date, so getHours()/getMonth() are IST
 * on any server timezone. Do not pass this into formatInTimeZone().
 */
export function getNowIST(): Date {
  return toZonedTime(new Date(), TZ);
}

/** Normalize Sheet/API date values to `yyyy-MM-dd`. */
export function normalizeDateString(raw: string | number | null | undefined): string | null {
  if (raw === null || raw === undefined || raw === "") return null;

  if (typeof raw === "number" || (/^\d+(\.\d+)?$/.test(String(raw).trim()) && Number(raw) > 20000)) {
    const serial = Math.floor(Number(raw));
    const utc = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    return utc.toISOString().slice(0, 10);
  }

  const trimmed = String(raw).trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const slash = trimmed.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (slash) {
    const first = parseInt(slash[1], 10);
    const second = parseInt(slash[2], 10);
    const year = slash[3];
    // India locale is DD/MM/YYYY; treat as MM/DD only when the day slot is > 12.
    const day = first > 12 ? first : second > 12 ? second : first;
    const month = first > 12 ? second : second > 12 ? first : second;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return formatInTimeZone(parsed, TZ, "yyyy-MM-dd");
  }

  return null;
}

function calendarUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function isSunday(dateStr: string): boolean {
  const date = normalizeDateString(dateStr);
  if (!date) return false;
  return calendarUTC(date).getUTCDay() === 0;
}

export function isWithinAttendanceWindow(): boolean {
  const hour = parseInt(formatInTimeZone(new Date(), TZ, "H"), 10);
  return hour >= ATTENDANCE_WINDOW.startHour && hour < ATTENDANCE_WINDOW.endHour;
}

export function isToday(dateStr: string): boolean {
  const date = normalizeDateString(dateStr);
  return date === todayIST();
}

export function isFuture(dateStr: string): boolean {
  const date = normalizeDateString(dateStr);
  return !!date && date > todayIST();
}

export function isPast(dateStr: string): boolean {
  const date = normalizeDateString(dateStr);
  return !!date && date < todayIST();
}

export function isWithinLast7Days(dateStr: string): boolean {
  const date = normalizeDateString(dateStr);
  if (!date) return false;
  const today = todayIST();
  const diff = Math.round(
    (calendarUTC(today).getTime() - calendarUTC(date).getTime()) / 86400000
  );
  return diff >= 0 && diff <= 7;
}

export function getMonthDays(year: number, month: number): string[] {
  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(start);
  const days: string[] = [];
  let current = start;
  while (!isAfter(current, end)) {
    days.push(format(current, "yyyy-MM-dd"));
    current = addDays(current, 1);
  }
  return days;
}

export function getMonthName(year: number, month: number): string {
  return format(new Date(year, month - 1, 1), "MMMM yyyy");
}

export function isLeaveType(type?: string | null): boolean {
  return type === "LEAVE" || type === "PLANNED_LEAVE";
}

export function canEmployeeMark(
  dateStr: string,
  existingType?: string | null,
  existingStatus?: string | null
): { allowed: boolean; reason?: string } {
  const date = normalizeDateString(dateStr);
  if (!date) {
    return { allowed: false, reason: "Invalid date" };
  }

  if (existingStatus === "PENDING") {
    return {
      allowed: false,
      reason: "Leave request is pending admin approval",
    };
  }

  if (date < todayIST()) {
    return { allowed: false, reason: "Cannot mark attendance for past dates" };
  }

  if (date > todayIST()) {
    if (isLeaveType(existingType) && existingStatus === "APPROVED") {
      return { allowed: false, reason: "Approved leave cannot be changed" };
    }
    if (existingType === "PLANNED_LEAVE") {
      return { allowed: false, reason: "Planned leave cannot be changed" };
    }
    return { allowed: true };
  }

  if (isLeaveType(existingType) && existingStatus === "APPROVED") {
    return { allowed: false, reason: "Approved leave cannot be changed" };
  }
  if (existingType && existingType !== "PLANNED_LEAVE") {
    return { allowed: false, reason: "Attendance already submitted for today" };
  }
  if (!isWithinAttendanceWindow()) {
    return {
      allowed: false,
      reason: "Attendance can only be marked between 9 AM and 9 PM IST",
    };
  }
  return { allowed: true };
}

export function canAdminOverride(dateStr: string): boolean {
  return isWithinLast7Days(dateStr) || isToday(dateStr);
}

export function splitSalary(baseSalary: number): {
  fixed: number;
  variable: number;
} {
  const fixed = Math.round(baseSalary * 0.7);
  const variable = baseSalary - fixed;
  return { fixed, variable };
}

export function calculatePayroll(
  fixedSalary: number,
  variableSalary: number,
  targetMet: boolean,
  officeDays: number,
  homeDays: number,
  totalWorkingDays: number
): { fixedAmount: number; variableAmount: number; totalAmount: number } {
  const fixedAmount = fixedSalary;
  const attendanceRatio =
    totalWorkingDays > 0 ? (officeDays + homeDays) / totalWorkingDays : 0;
  const variableAmount = targetMet
    ? Math.round(variableSalary * attendanceRatio)
    : 0;
  return {
    fixedAmount,
    variableAmount,
    totalAmount: fixedAmount + variableAmount,
  };
}

export function countWorkingDays(
  days: string[],
  holidayDates: Set<string>
): number {
  return days.filter((d) => !isSunday(d) && !holidayDates.has(d)).length;
}
