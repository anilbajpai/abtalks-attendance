import { ADMIN_EMAILS, EMPLOYEES } from "./constants";
import { splitSalary } from "./attendance-rules";
import type { Role, User } from "@/types";

/** Gmail ignores dots and +tags; Google may return googlemail.com. */
export function canonicalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at < 0) return trimmed;

  let local = trimmed.slice(0, at);
  let domain = trimmed.slice(at + 1);

  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") {
    local = local.split("+")[0].replace(/\./g, "");
  }

  return `${local}@${domain}`;
}

function buildEmployeeUser(emp: {
  name: string;
  email: string;
  baseSalary: number;
}): User {
  const { fixed, variable } = splitSalary(emp.baseSalary);
  const email = canonicalizeEmail(emp.email);
  return {
    id: email,
    email,
    name: emp.name,
    role: "EMPLOYEE",
    baseSalary: emp.baseSalary,
    fixedSalary: fixed,
    variableSalary: variable,
    targetMet: false,
  };
}

const EMPLOYEE_USERS = EMPLOYEES.map(buildEmployeeUser);

const ADMIN_USERS: User[] = ADMIN_EMAILS.map((email) => {
  const normalized = canonicalizeEmail(email);
  return {
    id: normalized,
    email: normalized,
    name: normalized.includes("anil") ? "Anil Bajpai" : "Divya Shukla",
    role: "ADMIN" as Role,
    baseSalary: 0,
    fixedSalary: 0,
    variableSalary: 0,
    targetMet: false,
  };
});

const ALL_USERS = [...ADMIN_USERS, ...EMPLOYEE_USERS];

export function getUserByEmail(email: string): User | undefined {
  const normalized = canonicalizeEmail(email);
  return ALL_USERS.find((u) => u.email === normalized);
}

export function getUserById(id: string): User | undefined {
  const normalized = canonicalizeEmail(id);
  return ALL_USERS.find((u) => u.id === normalized);
}

export function getAllEmployees(): User[] {
  return EMPLOYEE_USERS.sort((a, b) => a.name.localeCompare(b.name));
}

export function isAllowedEmail(email: string): boolean {
  return !!getUserByEmail(email);
}
