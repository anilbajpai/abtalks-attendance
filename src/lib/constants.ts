export const ADMIN_EMAILS = [
  "anilbajpai1987@gmail.com",
  "divyashukla515@gmail.com",
];

export const EMPLOYEES = [
  { name: "Sohail", email: "sksohailswaraj@gmail.com", baseSalary: 30000 },
  { name: "Suyash", email: "contactsuyashgupta@gmail.com", baseSalary: 30000 },
  { name: "Sarthak", email: "sarthakguptaksj@gmail.com", baseSalary: 30000 },
  { name: "Shallika", email: "shallika.bigbets@gmail.com", baseSalary: 20000 },
  { name: "Shivansh", email: "shivanshrai2316@gmail.com", baseSalary: 15000 },
  { name: "Aaron", email: "raoaaron077@gmail.com", baseSalary: 10000 },
  { name: "Zainab", email: "Zainabshujatali@gmail.com", baseSalary: 10000 },
  { name: "Shashank", email: "shashankmishra00026@gmail.com", baseSalary: 20000 },
  { name: "Rudra", email: "Mrudra850@gmail.com", baseSalary: 18000 },
  { name: "Swarit", email: "swa172acc@gmail.com", baseSalary: 25000 },
  { name: "BB", email: "contact.bigbetsai@gmail.com", baseSalary: 0 },
];

export const HOLIDAYS_2026 = [
  { date: "2026-01-26", name: "Republic Day", type: "Gazetted" },
  { date: "2026-03-04", name: "Holi", type: "Gazetted" },
  { date: "2026-03-21", name: "Id-ul-Fitr", type: "Gazetted" },
  { date: "2026-08-15", name: "Independence Day", type: "Gazetted" },
  { date: "2026-08-26", name: "Milad-un-Nabi / Id-e-Milad / Raksha Bandhan", type: "Gazetted" },
  { date: "2026-10-02", name: "Mahatma Gandhi's Birthday", type: "Gazetted" },
  { date: "2026-10-20", name: "Dussehra", type: "Gazetted" },
  { date: "2026-11-08", name: "Diwali", type: "Gazetted" },
  { date: "2026-12-25", name: "Christmas Day", type: "Gazetted" },
];

export const ATTENDANCE_WINDOW = {
  startHour: 9,
  endHour: 21,
  timezone: "Asia/Kolkata",
};

export const ATTENDANCE_TYPE_LABELS: Record<string, string> = {
  OFFICE: "Office",
  HOME: "Home",
  LEAVE: "Leave",
  PLANNED_LEAVE: "Planned Leave",
  SUNDAY: "Sunday",
  HOLIDAY: "Holiday",
};

export const ATTENDANCE_TYPE_COLORS: Record<string, string> = {
  OFFICE: "bg-emerald-500",
  HOME: "bg-blue-500",
  LEAVE: "bg-amber-500",
  PLANNED_LEAVE: "bg-orange-500",
  SUNDAY: "bg-slate-400",
  HOLIDAY: "bg-purple-500",
};

export const ATTENDANCE_TYPE_BG: Record<string, string> = {
  OFFICE: "bg-emerald-50 border-emerald-200 text-emerald-800",
  HOME: "bg-blue-50 border-blue-200 text-blue-800",
  LEAVE: "bg-amber-50 border-amber-200 text-amber-800",
  PLANNED_LEAVE: "bg-orange-50 border-orange-200 text-orange-800",
  SUNDAY: "bg-slate-50 border-slate-200 text-slate-600",
  HOLIDAY: "bg-purple-50 border-purple-200 text-purple-800",
  PENDING: "bg-yellow-50 border-yellow-300 text-yellow-800",
};
