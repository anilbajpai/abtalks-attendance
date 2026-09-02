import { createPrivateKey } from "crypto";
import { google } from "googleapis";
import type { AttendanceRecord, AttendanceType } from "@/types";

const SHEET_NAME = "Attendance";
const HEADERS = ["Email", "Date", "Type", "IsOverride", "Note", "UpdatedAt"];

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim().replace(/^\uFEFF/, "");
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

/**
 * Vercel env vars do not parse like dotenv. Pasting a quoted PEM
 * (`"-----BEGIN...\\n-----END..."`) leaves quotes and literal `\n`,
 * which OpenSSL 3 rejects as `error:1E08010C:DECODER routines::unsupported`.
 */
function normalizePrivateKey(raw: string): string {
  let key = stripWrappingQuotes(raw);

  if (key.startsWith("{")) {
    try {
      const parsed = JSON.parse(key) as { private_key?: string };
      if (parsed.private_key) key = stripWrappingQuotes(parsed.private_key);
    } catch {
      // Not a service-account JSON blob; keep treating it as a PEM string.
    }
  }

  key = key
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  const headerMatch = key.match(/-----BEGIN [A-Z ]+KEY-----/);
  const footerMatch = key.match(/-----END [A-Z ]+KEY-----/);
  if (!headerMatch || !footerMatch) {
    throw new Error(
      "GOOGLE_PRIVATE_KEY is not a PEM key. Copy `private_key` from the service account JSON, including the BEGIN/END lines."
    );
  }

  const header = headerMatch[0];
  const footer = footerMatch[0];
  const body = key
    .slice(key.indexOf(header) + header.length, key.indexOf(footer))
    .replace(/\s+/g, "");

  if (!body) {
    throw new Error(
      "GOOGLE_PRIVATE_KEY is missing key data between the BEGIN/END lines."
    );
  }

  const wrapped = body.match(/.{1,64}/g)?.join("\n") ?? body;
  return `${header}\n${wrapped}\n${footer}\n`;
}

function parsePrivateKey(raw: string): string {
  const pem = normalizePrivateKey(raw);
  try {
    return createPrivateKey(pem).export({
      type: "pkcs8",
      format: "pem",
    }) as string;
  } catch {
    throw new Error(
      "GOOGLE_PRIVATE_KEY could not be parsed. In Vercel, paste the key without extra quotes — either as a multiline value, or with \\n between PEM lines."
    );
  }
}

function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    ? stripWrappingQuotes(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL)
    : "";
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID
    ? stripWrappingQuotes(process.env.GOOGLE_SHEET_ID)
    : "";

  if (!email || !rawKey || !sheetId) {
    throw new Error(
      "Google Sheets not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_SHEET_ID."
    );
  }

  const auth = new google.auth.JWT({
    email,
    key: parsePrivateKey(rawKey),
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
