import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { getAllEmployees } from "@/lib/users";

export async function GET() {
  try {
    await requireAdmin();
    const employees = getAllEmployees().map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      baseSalary: u.baseSalary,
      fixedSalary: u.fixedSalary,
      variableSalary: u.variableSalary,
      targetMet: u.targetMet,
    }));
    return NextResponse.json({ employees });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
