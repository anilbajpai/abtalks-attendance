"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { getNowIST } from "@/lib/attendance-rules";

interface PayrollRun {
  id: string;
  month: number;
  year: number;
  fixedAmount: number;
  variableAmount: number;
  totalAmount: number;
  targetMet: boolean;
  officeDays: number;
  homeDays: number;
  leaveDays: number;
  processedAt: string;
  processedBy: string;
  user: { name: string; email: string };
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function PayrollPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const now = getNowIST();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      fetchRuns();
    }
  }, [status, session, month, year]);
/* ------------------------------------------------------------- */
  async function fetchRuns() {
    setLoading(true);
    const res = await fetch(`/api/admin/payroll?month=${month}&year=${year}`);
    const data = await res.json();
    setRuns(data.runs || []);
    setLoading(false);
  }

  async function processPayroll() {
    if (
      !confirm(
        `Process payroll for ${MONTHS[month - 1]} ${year}? This will calculate salaries for all employees.`
      )
    )
      return;

    setProcessing(true);
    const res = await fetch("/api/admin/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, year }),
    });

    if (res.ok) {
      const data = await res.json();
      alert(`Payroll processed for ${data.count} employees.`);
      await fetchRuns();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to process payroll");
    }
    setProcessing(false);
  }

  const totalPayout = runs.reduce((sum, r) => sum + r.totalAmount, 0);

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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Payroll Processing</h1>
          <div className="flex items-center gap-3">
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              onClick={processPayroll}
              disabled={processing}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {processing ? "Processing..." : "Process Payroll"}
            </button>
          </div>
        </div>

        {runs.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
            <span className="text-blue-800 font-medium">
              Total Payout for {MONTHS[month - 1]} {year}
            </span>
            <span className="text-2xl font-bold text-blue-900">
              ₹{totalPayout.toLocaleString("en-IN")}
            </span>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : runs.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <p className="text-lg">No payroll processed for this month yet.</p>
              <p className="text-sm mt-2">
                Click &quot;Process Payroll&quot; to calculate salaries.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-slate-500">
                    <th className="px-6 py-3 font-medium">Employee</th>
                    <th className="px-6 py-3 font-medium text-center">Office</th>
                    <th className="px-6 py-3 font-medium text-center">Home</th>
                    <th className="px-6 py-3 font-medium text-center">Leave</th>
                    <th className="px-6 py-3 font-medium text-center">Target</th>
                    <th className="px-6 py-3 font-medium text-right">Fixed</th>
                    <th className="px-6 py-3 font-medium text-right">Variable</th>
                    <th className="px-6 py-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {runs.map((run) => (
                    <tr key={run.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3">
                        <p className="font-medium text-slate-900">
                          {run.user.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {run.user.email}
                        </p>
                      </td>
                      <td className="px-6 py-3 text-center text-emerald-600 font-medium">
                        {run.officeDays}
                      </td>
                      <td className="px-6 py-3 text-center text-blue-600 font-medium">
                        {run.homeDays}
                      </td>
                      <td className="px-6 py-3 text-center text-amber-600 font-medium">
                        {run.leaveDays}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            run.targetMet
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {run.targetMet ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        ₹{run.fixedAmount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-3 text-right">
                        ₹{run.variableAmount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-slate-900">
                        ₹{run.totalAmount.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
