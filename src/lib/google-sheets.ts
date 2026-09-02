import { google } from "googleapis";
import type { AttendanceRecord, AttendanceType } from "@/types";

const SHEET_NAME = "Attendance";

const HEADERS = [
  "Email",
  "Date",
  "Type",
  "IsOverride",
  "Note",
  "UpdatedAt",
];

/**
 * Remove accidental wrapping quotes from Vercel environment variables.
 *
 * Example:
 *   "abc@example.com" -> abc@example.com
 */
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
 * Normalize a Google service-account private key.
 *
 * Supports:
 *   -----BEGIN PRIVATE KEY-----
 *   ...
 *   -----END PRIVATE KEY-----
 *
 * and Vercel environment variables containing literal \n.
 */
function normalizePrivateKey(raw: string): string {
  let key = stripWrappingQuotes(raw);

  // In case the entire Google service-account JSON was pasted.
  if (key.startsWith("{")) {
    try {
      const parsed = JSON.parse(key) as {
        private_key?: string;
      };

      if (parsed.private_key) {
        key = stripWrappingQuotes(parsed.private_key);
      }
    } catch {
      // Not JSON; continue treating it as a PEM string.
    }
  }

  // Convert literal escaped newlines to real newlines.
  key = key
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  // Remove accidental whitespace around the PEM.
  key = key.trim();

  const beginMarker = "-----BEGIN PRIVATE KEY-----";
  const endMarker = "-----END PRIVATE KEY-----";

  const beginIndex = key.indexOf(beginMarker);
  const endIndex = key.indexOf(endMarker);

  if (beginIndex === -1 || endIndex === -1) {
    throw new Error(
      "GOOGLE_PRIVATE_KEY is not a valid PEM private key. " +
        "It must contain -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----."
    );
  }

  if (endIndex <= beginIndex) {
    throw new Error("GOOGLE_PRIVATE_KEY has an invalid PEM structure.");
  }

  const body = key
    .slice(beginIndex + beginMarker.length, endIndex)
    .replace(/\s+/g, "");

  if (!body) {
    throw new Error(
      "GOOGLE_PRIVATE_KEY does not contain any key data."
    );
  }

  // Wrap base64 body at 64 characters.
  const wrappedBody =
    body.match(/.{1,64}/g)?.join("\n") ?? body;

  return `${beginMarker}\n${wrappedBody}\n${endMarker}\n`;
}

/**
 * Create an authenticated Google Sheets client.
 */
function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    ? stripWrappingQuotes(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL)
    : "";

  const rawKey = process.env.GOOGLE_PRIVATE_KEY;

  const sheetId = process.env.GOOGLE_SHEET_ID
    ? stripWrappingQuotes(process.env.GOOGLE_SHEET_ID)
    : "";

  if (!email) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL environment variable."
    );
  }

  if (!rawKey) {
    throw new Error(
      "Missing GOOGLE_PRIVATE_KEY environment variable."
    );
  }

  if (!sheetId) {
    throw new Error(
      "Missing GOOGLE_SHEET_ID environment variable."
    );
  }

  const privateKey = normalizePrivateKey(rawKey);

  // Safe diagnostic logging.
  // IMPORTANT: We never log the private key itself.
  console.log("Google Sheets configuration:", {
    email,
    sheetId,
    keyStartsCorrectly: privateKey.startsWith(
      "-----BEGIN PRIVATE KEY-----"
    ),
    keyEndsCorrectly: privateKey.endsWith(
      "-----END PRIVATE KEY-----\n"
    ),
    keyLength: privateKey.length,
  });

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });

  return {
    sheets: google.sheets({
      version: "v4",
      auth,
    }),
    sheetId,
  };
}

/**
 * Convert a Google Sheets row into an AttendanceRecord.
 */
function rowToRecord(
  row: string[]
): AttendanceRecord | null {
  const [
    email,
    date,
    type,
    isOverride,
    note,
  ] = row;

  if (!email || !date || !type) {
    return null;
  }

  return {
    id: `${email.toLowerCase()}-${date}`,
    userId: email.toLowerCase(),
    date,
    type: type as AttendanceType,
    isOverride:
      isOverride === "TRUE" ||
      isOverride === "true",
    note: note || null,
  };
}

/**
 * Make sure the Attendance sheet has the correct headers.
 */
async function ensureHeaders() {
  const { sheets, sheetId } = getSheetsClient();

  try {
    const response =
      await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${SHEET_NAME}!A1:F1`,
      });

    const existingHeaders =
      response.data.values?.[0];

    if (!existingHeaders?.length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${SHEET_NAME}!A1:F1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [HEADERS],
        },
      });
    }
  } catch (error) {
    console.error(
      "Google Sheets ensureHeaders error:",
      error
    );

    throw error;
  }
}

/**
 * Get all attendance rows.
 */
async function getAllRows(): Promise<string[][]> {
  const { sheets, sheetId } = getSheetsClient();

  await ensureHeaders();

  try {
    const response =
      await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${SHEET_NAME}!A2:F`,
      });

    return (
      (response.data.values as string[][]) || []
    );
  } catch (error) {
    console.error(
      "Google Sheets getAllRows error:",
      error
    );

    throw error;
  }
}

/**
 * Get attendance records for a user between two dates.
 */
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
      (
        record
      ): record is AttendanceRecord =>
        !!record &&
        record.userId === email &&
        record.date >= startDate &&
        record.date <= endDate
    );
}

/**
 * Get attendance record for one user and one date.
 */
export async function getAttendanceRecord(
  userId: string,
  date: string
): Promise<AttendanceRecord | null> {
  const records =
    await getAttendanceRecords(
      userId,
      date,
      date
    );

  return records[0] || null;
}

/**
 * Create or update an attendance record.
 */
export async function upsertAttendanceRecord(input: {
  userId: string;
  date: string;
  type: AttendanceType;
  isOverride?: boolean;
  note?: string;
}): Promise<AttendanceRecord> {
  const { sheets, sheetId } =
    getSheetsClient();

  const rows = await getAllRows();

  const email =
    input.userId.toLowerCase();

  const now =
    new Date().toISOString();

  const rowIndex = rows.findIndex(
    (row) =>
      row[0]?.toLowerCase() === email &&
      row[1] === input.date
  );

  const newRow = [
    email,
    input.date,
    input.type,
    input.isOverride
      ? "TRUE"
      : "FALSE",
    input.note || "",
    now,
  ];

  try {
    if (rowIndex >= 0) {
      // Existing row.
      //
      // Google Sheets row numbers are 1-based,
      // and our data starts at row 2.
      const sheetRow =
        rowIndex + 2;

      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${SHEET_NAME}!A${sheetRow}:F${sheetRow}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [newRow],
        },
      });
    } else {
      // New row.
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `${SHEET_NAME}!A:F`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [newRow],
        },
      });
    }
  } catch (error) {
    console.error(
      "Google Sheets upsertAttendanceRecord error:",
      error
    );

    throw error;
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
