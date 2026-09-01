import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";

// Database disabled — salary updates are read-only from constants.ts for now.
// Re-enable Prisma to persist salary/target changes.

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    await params;
    await req.json();

    return NextResponse.json(
      {
        error:
          "Salary updates are disabled while using Google Sheets. Edit src/lib/constants.ts or re-enable the database.",
      },
      { status: 501 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
