import { ADMIN_EMAILS, EMPLOYEES } from "./constants";
import { splitSalary } from "./attendance-rules";
import type { Role, User } from "@/types";

function buildEmployeeUser(emp: {
  name: string;
  email: string;
  baseSalary: number;
}): User {
  const { fixed, variable } = splitSalary(emp.baseSalary);
  const email = emp.email.toLowerCase();
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

const ADMIN_USERS: User[] = ADMIN_EMAILS.map((email) => ({
  id: email.toLowerCase(),
  email: email.toLowerCase(),
  name: email.includes("anil") ? "Anil Bajpai" : "Divya Shukla",
  role: "ADMIN" as Role,
  baseSalary: 0,
  fixedSalary: 0,
  variableSalary: 0,
  targetMet: false,
}));

const ALL_USERS = [...ADMIN_USERS, ...EMPLOYEE_USERS];

export function getUserByEmail(email: string): User | undefined {
  return ALL_USERS.find((u) => u.email === email.toLowerCase());
}

export function getUserById(id: string): User | undefined {
  return ALL_USERS.find((u) => u.id === id.toLowerCase());
}

export function getAllEmployees(): User[] {
  return EMPLOYEE_USERS.sort((a, b) => a.name.localeCompare(b.name));
}

export function isAllowedEmail(email: string): boolean {
  return !!getUserByEmail(email);
}
