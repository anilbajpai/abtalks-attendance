import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
  getDay,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { ATTENDANCE_WINDOW } from "./constants";

const TZ = ATTENDANCE_WINDOW.timezone;

export function toDateString(date: Date): string {
  return formatInTimeZone(date, TZ, "yyyy-MM-dd");
}

export function getNowIST(): Date {
  return toZonedTime(new Date(), TZ);
}

export function isSunday(dateStr: string): boolean {
  return getDay(parseISO(dateStr)) === 0;
}

export function isWithinAttendanceWindow(): boolean {
  const now = getNowIST();
  const hour = now.getHours();
  return hour >= ATTENDANCE_WINDOW.startHour && hour < ATTENDANCE_WINDOW.endHour;
}

export function isToday(dateStr: string): boolean {
  const today = toDateString(getNowIST());
  return dateStr === today;
}

export function isFuture(dateStr: string): boolean {
  const today = startOfDay(getNowIST());
  const target = startOfDay(parseISO(dateStr));
  return isAfter(target, today);
}

export function isPast(dateStr: string): boolean {
  const today = startOfDay(getNowIST());
  const target = startOfDay(parseISO(dateStr));
  return isBefore(target, today);
}

export function isWithinLast7Days(dateStr: string): boolean {
  const today = startOfDay(getNowIST());
  const target = startOfDay(parseISO(dateStr));
  const diff = differenceInCalendarDays(today, target);
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
  if (existingStatus === "PENDING") {
    return {
      allowed: false,
      reason: "Leave request is pending admin approval",
    };
  }

  if (isPast(dateStr) && !isToday(dateStr)) {
    return { allowed: false, reason: "Cannot mark attendance for past dates" };
  }

  if (isFuture(dateStr)) {
    if (isLeaveType(existingType) && existingStatus === "APPROVED") {
      return { allowed: false, reason: "Approved leave cannot be changed" };
    }
    if (existingType === "PLANNED_LEAVE") {
      return { allowed: false, reason: "Planned leave cannot be changed" };
    }
    return { allowed: true };
  }

  if (isToday(dateStr)) {
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

  return { allowed: false, reason: "Invalid date" };
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
