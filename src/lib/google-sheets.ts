import { google } from "googleapis";
import type { AttendanceRecord, AttendanceType } from "@/types";

const SHEET_NAME = "Attendance";
const HEADERS = ["Email", "Date", "Type", "IsOverride", "Note", "UpdatedAt"];

function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!email || !privateKey || !sheetId) {
    throw new Error(
      "Google Sheets not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_SHEET_ID."
    );
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return { sheets: google.sheets({ version: "v4", auth }), sheetId };
}

function rowToRecord(row: string[]): AttendanceRecord | null {
  const [email, date, type, isOverride, note] = row;
  if (!email || !date || !type) return null;

  return {
    id: `${email.toLowerCase()}-${date}`,
    userId: email.toLowerCase(),
    date,
    type: type as AttendanceType,
    isOverride: isOverride === "TRUE" || isOverride === "true",
    note: note || null,
  };
}

async function ensureHeaders() {
  const { sheets, sheetId } = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SHEET_NAME}!A1:F1`,
  });

  if (!res.data.values?.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A1:F1`,
      valueInputOption: "RAW",
      requestBody: { values: [HEADERS] },
    });
  }
}

async function getAllRows(): Promise<string[][]> {
  const { sheets, sheetId } = getSheetsClient();
  await ensureHeaders();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SHEET_NAME}!A2:F`,
  });

  return (res.data.values as string[][]) || [];
}

export async function getAttendanceRecords(
  userId: string,
  startDate: string,
  endDate: string
): Promise<AttendanceRecord[]> {
  const rows = await getAllRows();
  const email = userId.toLowerCase();

  return rows
    .map(rowToRecord)
    .filter(
      (r): r is AttendanceRecord =>
        !!r &&
        r.userId === email &&
        r.date >= startDate &&
        r.date <= endDate
    );
}

export async function getAttendanceRecord(
  userId: string,
  date: string
): Promise<AttendanceRecord | null> {
  const records = await getAttendanceRecords(userId, date, date);
  return records[0] || null;
}

export async function upsertAttendanceRecord(input: {
  userId: string;
  date: string;
  type: AttendanceType;
  isOverride?: boolean;
  note?: string;
}): Promise<AttendanceRecord> {
  const { sheets, sheetId } = getSheetsClient();
  const rows = await getAllRows();
  const email = input.userId.toLowerCase();
  const now = new Date().toISOString();
  const rowIndex = rows.findIndex(
    (row) =>
      row[0]?.toLowerCase() === email && row[1] === input.date
  );

  const newRow = [
    email,
    input.date,
    input.type,
    input.isOverride ? "TRUE" : "FALSE",
    input.note || "",
    now,
  ];

  if (rowIndex >= 0) {
    const sheetRow = rowIndex + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A${sheetRow}:F${sheetRow}`,
      valueInputOption: "RAW",
      requestBody: { values: [newRow] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A:F`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [newRow] },
    });
  }

  return {
    id: `${email}-${input.date}`,
    userId: email,
    date: input.date,
    type: input.type,
    isOverride: !!input.isOverride,
    note: input.note || null,
  };
}
