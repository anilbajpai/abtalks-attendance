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
  const now = getNowIST();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      fetch("/api/admin/employees")
        .then((r) => r.json())
        .then((d) => {
          setEmployees(d.employees || []);
          if (d.employees?.length) setSelectedEmployee(d.employees[0].id);
        });
    }
  }, [status, session]);

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

  async function handleAdminOverride(date: string, type: string) {
    if (!selectedEmployee) return;
    const res = await fetch("/api/admin/attendance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedEmployee, date, type }),
    });
    if (res.ok) {
      await fetchAttendance();
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
              Attendance Override (Last 7 Days)
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
            />
          )}
        </section>
      </main>
    </div>
  );
}
