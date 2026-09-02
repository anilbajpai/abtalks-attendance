"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { AttendanceCalendar } from "@/components/AttendanceCalendar";
import { getNowIST } from "@/lib/attendance-rules";

interface Employee {
  id: string;
  name: string;
  email: string;
  baseSalary: number;
  fixedSalary: number;
  variableSalary: number;
  targetMet: boolean;
}

interface AttendanceRecord {
  id: string;
  date: string;
  type: string;
  isOverride: boolean;
  status?: string;
}

interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  email: string;
  date: string;
  type: string;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [holidays, setHolidays] = useState<Record<string, { name: string; type: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveAction, setLeaveAction] = useState<string | null>(null);
  const now = getNowIST();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);
/* //Employee Salary Configuration */
  const fetchLeaveRequests = useCallback(async () => {
    const res = await fetch("/api/admin/leave-requests");
    const data = await res.json();
    setLeaveRequests(data.requests || []);
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      fetch("/api/admin/employees")
        .then((r) => r.json())
        .then((d) => {
          setEmployees(d.employees || []);
          if (d.employees?.length) setSelectedEmployee(d.employees[0].id);
        });
      fetchLeaveRequests();
    }
  }, [status, session, fetchLeaveRequests]);

  const fetchAttendance = useCallback(async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    const res = await fetch(
      `/api/attendance?year=${year}&month=${month}&userId=${selectedEmployee}`
    );
    const data = await res.json();
    setRecords(data.records || []);
    setHolidays(data.holidays || {});
    setLoading(false);
  }, [selectedEmployee, year, month]);

  useEffect(() => {
    if (selectedEmployee) fetchAttendance();
  }, [selectedEmployee, fetchAttendance]);

  async function handleSalaryUpdate(
    userId: string,
    field: string,
    value: number | boolean
  ) {
    setSaving(true);
    await fetch(`/api/admin/employees/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    const res = await fetch("/api/admin/employees");
    const d = await res.json();
    setEmployees(d.employees || []);
    setSaving(false);
  }

  async function handleLeaveDecision(
    userId: string,
    date: string,
    action: "approve" | "reject"
  ) {
    setLeaveAction(`${userId}-${date}-${action}`);
    const res = await fetch("/api/admin/leave-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, date, action }),
    });
    setLeaveAction(null);
    if (res.ok) {
      await Promise.all([fetchLeaveRequests(), fetchAttendance()]);
    } else {
      const err = await res.json();
      alert(err.error || `Failed to ${action} leave`);
    }
  }

  async function handleCalendarLeaveDecision(
    date: string,
    action: "approve" | "reject"
  ) {
    if (!selectedEmployee) return;
    await handleLeaveDecision(selectedEmployee, date, action);
  }

  async function handleAdminOverride(date: string, type: string) {
    if (!selectedEmployee) return;
    const res = await fetch("/api/admin/attendance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedEmployee, date, type }),
    });
    if (res.ok) {
      await Promise.all([fetchAttendance(), fetchLeaveRequests()]);
    } else {
      const err = await res.json();
      alert(err.error || "Failed to override");
    }
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>

        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Leave Requests
            </h2>
            {leaveRequests.length > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {leaveRequests.length} pending
              </span>
            )}
          </div>
          {leaveRequests.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-500">
              No pending leave requests.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-slate-500">
                    <th className="px-6 py-3 font-medium">Employee</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaveRequests.map((req) => {
                    const busy = leaveAction?.startsWith(`${req.userId}-${req.date}-`);
                    return (
                      <tr key={req.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3">
                          <p className="font-medium text-slate-900">{req.userName}</p>
                          <p className="text-xs text-slate-500">{req.email}</p>
                        </td>
                        <td className="px-6 py-3 text-slate-700">
                          {new Date(`${req.date}T12:00:00`).toLocaleDateString("en-IN", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-6 py-3 text-slate-700">
                          {req.type === "PLANNED_LEAVE" ? "Planned Leave" : "Leave"}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() =>
                                handleLeaveDecision(req.userId, req.date, "approve")
                              }
                              disabled={!!leaveAction}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {busy && leaveAction?.endsWith("approve")
                                ? "Approving..."
                                : "Approve"}
                            </button>
                            <button
                              onClick={() =>
                                handleLeaveDecision(req.userId, req.date, "reject")
                              }
                              disabled={!!leaveAction}
                              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                            >
                              {busy && leaveAction?.endsWith("reject")
                                ? "Rejecting..."
                                : "Reject"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Employee Salary Configuration
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-500">
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Fixed (₹)</th>
                  <th className="px-6 py-3 font-medium">Variable (₹)</th>
                  <th className="px-6 py-3 font-medium">Total (₹)</th>
                  <th className="px-6 py-3 font-medium">Target Met</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">
                      {emp.name}
                    </td>
                    <td className="px-6 py-3 text-slate-600">{emp.email}</td>
                    <td className="px-6 py-3">
                      <input
                        type="number"
                        defaultValue={emp.fixedSalary}
                        onBlur={(e) =>
                          handleSalaryUpdate(
                            emp.id,
                            "fixedSalary",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-24 px-2 py-1 border border-slate-200 rounded text-right"
                        disabled={saving}
                      />
                    </td>
                    <td className="px-6 py-3">
                      <input
                        type="number"
                        defaultValue={emp.variableSalary}
                        onBlur={(e) =>
                          handleSalaryUpdate(
                            emp.id,
                            "variableSalary",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-24 px-2 py-1 border border-slate-200 rounded text-right"
                        disabled={saving}
                      />
                    </td>
                    <td className="px-6 py-3 text-slate-900 font-medium">
                      ₹{(emp.fixedSalary + emp.variableSalary).toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() =>
                          handleSalaryUpdate(emp.id, "targetMet", !emp.targetMet)
                        }
                        disabled={saving}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          emp.targetMet
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {emp.targetMet ? "Yes" : "No"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              Attendance Override
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  let m = month - 1;
                  let y = year;
                  if (m < 1) { m = 12; y--; }
                  setMonth(m);
                  setYear(y);
                }}
                className="p-2 rounded-lg border border-slate-200 hover:bg-white"
              >
                ←
              </button>
              <button
                onClick={() => {
                  const n = getNowIST();
                  setYear(n.getFullYear());
                  setMonth(n.getMonth() + 1);
                }}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-white"
              >
                Today
              </button>
              <button
                onClick={() => {
                  let m = month + 1;
                  let y = year;
                  if (m > 12) { m = 1; y++; }
                  setMonth(m);
                  setYear(y);
                }}
                className="p-2 rounded-lg border border-slate-200 hover:bg-white"
              >
                →
              </button>
              <select
                value={selectedEmployee || ""}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : (
            <AttendanceCalendar
              year={year}
              month={month}
              records={records}
              holidays={holidays}
              onMark={handleAdminOverride}
              isAdmin
              onAdminOverride={handleAdminOverride}
              onLeaveDecision={handleCalendarLeaveDecision}
            />
          )}
        </section>
      </main>
    </div>
  );
}
