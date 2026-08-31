"use client";

import { useState } from "react";
import {
  ATTENDANCE_TYPE_BG,
  ATTENDANCE_TYPE_COLORS,
  ATTENDANCE_TYPE_LABELS,
} from "@/lib/constants";
import {
  canEmployeeMark,
  getMonthDays,
  getMonthName,
  getNowIST,
  isFuture,
  isSunday,
  isToday,
  toDateString,
} from "@/lib/attendance-rules";
import { format, parseISO } from "date-fns";

interface AttendanceRecord {
  id: string;
  date: string;
  type: string;
  isOverride: boolean;
}

interface Holiday {
  name: string;
  type: string;
}

interface CalendarProps {
  year: number;
  month: number;
  records: AttendanceRecord[];
  holidays: Record<string, Holiday>;
  onMark: (date: string, type: string) => Promise<void>;
  isAdmin?: boolean;
  onAdminOverride?: (date: string, type: string) => Promise<void>;
  loading?: boolean;
}

const MARK_OPTIONS = [
  { type: "OFFICE", label: "Office", color: "bg-emerald-500" },
  { type: "HOME", label: "Home", color: "bg-blue-500" },
  { type: "LEAVE", label: "Leave", color: "bg-amber-500" },
];

const FUTURE_OPTIONS = [
  { type: "PLANNED_LEAVE", label: "Planned Leave", color: "bg-orange-500" },
];

export function AttendanceCalendar({
  year,
  month,
  records,
  holidays,
  onMark,
  isAdmin = false,
  onAdminOverride,
  loading = false,
}: CalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  const days = getMonthDays(year, month);
  const recordMap = Object.fromEntries(records.map((r) => [r.date, r]));
  const firstDayOfWeek = parseISO(days[0]).getDay();
  const today = toDateString(getNowIST());

  function getDayType(date: string): string | null {
    if (recordMap[date]) return recordMap[date].type;
    if (isSunday(date)) return "SUNDAY";
    if (holidays[date]) return "HOLIDAY";
    return null;
  }

  function getDayLabel(date: string): string | null {
    const type = getDayType(date);
    if (!type) return null;
    if (type === "HOLIDAY") return holidays[date]?.name || "Holiday";
    return ATTENDANCE_TYPE_LABELS[type] || type;
  }

  async function handleMark(type: string) {
    if (!selectedDate) return;
    setMarking(true);
    try {
      if (isAdmin && onAdminOverride) {
        await onAdminOverride(selectedDate, type);
      } else {
        await onMark(selectedDate, type);
      }
      setSelectedDate(null);
    } finally {
      setMarking(false);
    }
  }

  const selectedRecord = selectedDate ? recordMap[selectedDate] : null;
  const canMark = selectedDate
    ? isAdmin
      ? true
      : canEmployeeMark(selectedDate, selectedRecord?.type).allowed
    : false;

  const options = selectedDate && isFuture(selectedDate)
    ? FUTURE_OPTIONS
    : MARK_OPTIONS;

  const summary = {
    office: records.filter((r) => r.type === "OFFICE").length,
    home: records.filter((r) => r.type === "HOME").length,
    leave: records.filter(
      (r) => r.type === "LEAVE" || r.type === "PLANNED_LEAVE"
    ).length,
    sundays: days.filter((d) => isSunday(d)).length,
    holidays: days.filter((d) => holidays[d]).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">
          {getMonthName(year, month)}
        </h2>
        <div className="flex gap-4 text-sm">
          {Object.entries({
            Office: summary.office,
            Home: summary.home,
            Leave: summary.leave,
            Sundays: summary.sundays,
            Holidays: summary.holidays,
          }).map(([label, count]) => (
            <span key={label} className="text-slate-600">
              {label}: <strong className="text-slate-900">{count}</strong>
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(ATTENDANCE_TYPE_LABELS).map(([type, label]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div
              className={`w-3 h-3 rounded-full ${ATTENDANCE_TYPE_COLORS[type]}`}
            />
            <span className="text-slate-600">{label}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="py-3 text-center text-xs font-medium text-slate-500 uppercase"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-slate-100" />
          ))}
          {days.map((date) => {
            const type = getDayType(date);
            const label = getDayLabel(date);
            const isCurrentDay = date === today;
            const record = recordMap[date];
            const bgClass = type ? ATTENDANCE_TYPE_BG[type] : "";
            const isClickable =
              isAdmin ||
              canEmployeeMark(date, record?.type).allowed ||
              isFuture(date);

            return (
              <button
                key={date}
                onClick={() => isClickable && setSelectedDate(date)}
                disabled={!isClickable || loading}
                className={`min-h-[80px] p-2 border-b border-r border-slate-100 text-left transition-all relative
                  ${bgClass}
                  ${isCurrentDay ? "ring-2 ring-inset ring-blue-500" : ""}
                  ${isClickable ? "hover:brightness-95 cursor-pointer" : "cursor-default opacity-70"}
                  ${selectedDate === date ? "ring-2 ring-blue-600" : ""}
                `}
              >
                <span
                  className={`text-sm font-medium ${
                    isCurrentDay ? "text-blue-700" : ""
                  }`}
                >
                  {format(parseISO(date), "d")}
                </span>
                {label && (
                  <p className="text-[10px] mt-1 leading-tight truncate">
                    {label}
                  </p>
                )}
                {record?.isOverride && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" title="Admin override" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {format(parseISO(selectedDate), "EEEE, MMMM d, yyyy")}
              </h3>
              {getDayType(selectedDate) && (
                <p className="text-sm text-slate-500 mt-1">
                  Current: {getDayLabel(selectedDate)}
                </p>
              )}
              {isToday(selectedDate) && !canMark && !isAdmin && (
                <p className="text-sm text-amber-600 mt-1">
                  {canEmployeeMark(selectedDate, selectedRecord?.type).reason}
                </p>
              )}
            </div>

            {(canMark || isAdmin) && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">
                  {isFuture(selectedDate)
                    ? "Mark planned leave"
                    : "Mark attendance"}
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {(isAdmin ? [...MARK_OPTIONS, ...FUTURE_OPTIONS] : options).map(
                    (opt) => (
                      <button
                        key={opt.type}
                        onClick={() => handleMark(opt.type)}
                        disabled={marking}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors disabled:opacity-50`}
                      >
                        <div className={`w-4 h-4 rounded-full ${opt.color}`} />
                        <span className="font-medium text-slate-800">
                          {opt.label}
                        </span>
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedDate(null)}
              className="w-full py-2 text-sm text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
