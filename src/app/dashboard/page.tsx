"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { ATTENDANCE_TYPE_BG, ATTENDANCE_TYPE_LABELS } from "@/lib/constants";
import { isWithinAttendanceWindow } from "@/lib/attendance-rules";

interface UserData {
  user: {
    name: string;
    email: string;
    role: string;
  };
  todayRecord: { type: string; status?: string } | null;
  today: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<UserData | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<Record<string, number>>({});

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/me")
        .then((r) => r.json())
        .then(setData);

      const now = new Date();
      fetch(
        `/api/attendance?year=${now.getFullYear()}&month=${now.getMonth() + 1}`
      )
        .then((r) => r.json())
        .then((d) => {
          const stats: Record<string, number> = {};
          for (const r of d.records || []) {
            if (r.status === "PENDING") continue;
            stats[r.type] = (stats[r.type] || 0) + 1;
          }
          setMonthlyStats(stats);
        });
    }
  }, [status]);

  if (status === "loading" || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const inWindow = isWithinAttendanceWindow();
  const todayType = data.todayRecord?.type;
  const todayPending = data.todayRecord?.status === "PENDING";

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome, {data.user.name}
          </h1>
          <p className="text-slate-500 mt-1">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              timeZone: "Asia/Kolkata",
            })}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
              Today&apos;s Attendance
            </h2>
            {todayType ? (
              <div className="space-y-2">
                <div
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${
                    todayPending
                      ? ATTENDANCE_TYPE_BG.PENDING
                      : ATTENDANCE_TYPE_BG[todayType]
                  }`}
                >
                  {ATTENDANCE_TYPE_LABELS[todayType]}
                  {todayPending ? " (Pending approval)" : ""}
                </div>
                {todayPending && (
                  <p className="text-sm text-yellow-700">
                    Your leave request is waiting for admin approval.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-slate-600">Not marked yet</p>
                {inWindow ? (
                  <a
                    href="/calendar"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Mark Attendance
                  </a>
                ) : (
                  <p className="text-sm text-amber-600">
                    Attendance window: 9 AM – 9 PM IST
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
              This Month
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Office", key: "OFFICE", color: "text-emerald-600" },
                { label: "Home", key: "HOME", color: "text-blue-600" },
                { label: "Leave", key: "LEAVE", color: "text-amber-600" },
                {
                  label: "Planned",
                  key: "PLANNED_LEAVE",
                  color: "text-orange-600",
                },
              ].map((item) => (
                <div key={item.key}>
                  <p className="text-2xl font-bold text-slate-900">
                    {monthlyStats[item.key] || 0}
                  </p>
                  <p className={`text-sm ${item.color}`}>{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <a
              href="/calendar"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Calendar
            </a>
            {session?.user?.role === "ADMIN" && (
              <a
                href="/admin"
                className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-900 transition-colors"
              >
                Admin Panel
              </a>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
