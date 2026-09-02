export type Role = "ADMIN" | "EMPLOYEE";

export type AttendanceType =
  | "OFFICE"
  | "HOME"
  | "LEAVE"
  | "PLANNED_LEAVE"
  | "SUNDAY"
  | "HOLIDAY";

export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  baseSalary: number;
  fixedSalary: number;
  variableSalary: number;
  targetMet: boolean;
  image?: string | null;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  type: AttendanceType;
  isOverride: boolean;
  note?: string | null;
  status: LeaveStatus;
  updatedAt?: string | null;
}

export interface Holiday {
  date: string;
  name: string;
  type: string;
}
