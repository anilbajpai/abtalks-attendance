import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: userId } = await params;
    const { fixedSalary, variableSalary, targetMet } = await req.json();

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const newFixed = fixedSalary ?? existing.fixedSalary;
    const newVariable = variableSalary ?? existing.variableSalary;

    const data: Record<string, unknown> = {
      baseSalary: newFixed + newVariable,
    };
    if (fixedSalary !== undefined) data.fixedSalary = fixedSalary;
    if (variableSalary !== undefined) data.variableSalary = variableSalary;
    if (targetMet !== undefined) data.targetMet = targetMet;

    const employee = await prisma.user.update({
      where: { id: userId },
      data,
    });

    return NextResponse.json({ employee });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
