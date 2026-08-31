"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { AttendanceCalendar } from "@/components/AttendanceCalendar";
import { getNowIST } from "@/lib/attendance-rules";

interface AttendanceRecord {
  id: string;
  date: string;
  type: string;
  isOverride: boolean;
}

export default function CalendarPage() {
  const { status } = useSession();
  const router = useRouter();
  const now = getNowIST();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [holidays, setHolidays] = useState<Record<string, { name: string; type: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/attendance?year=${year}&month=${month}`);
    const data = await res.json();
    setRecords(data.records || []);
    setHolidays(data.holidays || {});
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    if (status === "authenticated") fetchAttendance();
  }, [status, fetchAttendance]);

  async function handleMark(date: string, type: string) {
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, type }),
    });
    if (res.ok) {
      await fetchAttendance();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to mark attendance");
    }
  }

  function changeMonth(delta: number) {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    setMonth(newMonth);
    setYear(newYear);
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Attendance Calendar</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 rounded-lg border border-slate-200 hover:bg-white transition-colors"
            >
              ←
            </button>
            <button
              onClick={() => {
                const n = getNowIST();
                setYear(n.getFullYear());
                setMonth(n.getMonth() + 1);
              }}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-white transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 rounded-lg border border-slate-200 hover:bg-white transition-colors"
            >
              →
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          <AttendanceCalendar
            year={year}
            month={month}
            records={records}
            holidays={holidays}
            onMark={handleMark}
            loading={loading}
          />
        )}
      </main>
    </div>
  );
}
