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

function sheetsSerialToISO(serial: number): string {
  const whole = Math.floor(serial);
  const utc = new Date(Date.UTC(1899, 11, 30) + whole * 86400000);
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

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

  if (typeof raw === "number" && Number.isFinite(raw)) {
    return sheetsSerialToISO(raw);
  }

  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  // Google Sheets UNFORMATTED_VALUE returns date cells as serials.
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const n = Number(trimmed);
    if (n > 20000 && n < 80000) return sheetsSerialToISO(n);
  }

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const slash = trimmed.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (slash) {
    const first = parseInt(slash[1], 10);
    const second = parseInt(slash[2], 10);
    const year = slash[3];
    // US formatted values look like 9/2/2026 (Sept 2). India looks like 02/09/2026.
    // If the second part is > 12 it must be MM/DD; if the first is > 12 it must be DD/MM.
    // Otherwise treat as MM/DD when first <= 12, which matches Google Sheets US locale
    // (the common default) for September 1–12 — those were disappearing from the calendar.
    let month: number;
    let day: number;
    if (second > 12) {
      month = first;
      day = second;
    } else if (first > 12) {
      day = first;
      month = second;
    } else {
      month = first;
      day = second;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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
