# ABTalks Employee Attendance System

A full-featured employee attendance and payroll management system for ABTalks.

## Features

### Employee
- **Monthly Calendar** — Single-click attendance marking (Office / Home / Leave)
- **Time Restriction** — Attendance can only be marked between 9 AM – 9 PM IST
- **Today Only** — Employees can only mark attendance for the current date
- **Planned Leaves** — Mark future dates as planned leave (immutable after submission)
- **Auto Holidays** — Sundays and gazetted holidays are automatically marked as leave
- **Dashboard** — Daily and monthly attendance summary with salary overview

### Admin
- **Salary Configuration** — Set fixed and variable salary components per employee
- **Target Confirmation** — Toggle whether an employee met their target for variable pay
- **One-Click Payroll** — Process monthly salary for all employees at once
- **Attendance Override** — Override employee attendance for the last 7 days
- **Employee Management** — View and manage all 10 employees

### Authentication
- Google OAuth (Gmail) sign-in
- Role-based access (Admin / Employee)
- Admins: Anil Bajpai, Divya Shukla

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Prisma** + SQLite
- **NextAuth.js** (Google OAuth)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-random-secret-here"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 3. Set up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or use existing)
3. Enable **Google+ API** / **Google Identity**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
7. Copy Client ID and Client Secret to `.env`

### 4. Initialize database

```bash
npx prisma db push
npm run db:seed
```

### 5. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Employees

| Name | Email | Base Salary |
|------|-------|-------------|
| Sohail | sksohailswaraj@gmail.com | ₹30,000 |
| Suyash | contactsuyashgupta@gmail.com | ₹30,000 |
| Sarthak | sarthakguptaksj@gmail.com | ₹30,000 |
| Shallika | shallika.bigbets@gmail.com | ₹20,000 |
| Shivansh | shivanshrai2316@gmail.com | ₹10,000 |
| Aaron | raoaaron077@gmail.com | ₹10,000 |
| Zainab | Zainabshujatali@gmail.com | ₹10,000 |
| Shashank | shashankmishra00026@gmail.com | ₹20,000 |
| Rudra | Mrudra850@gmail.com | ₹18,000 |
| Swarit | swa172acc@gmail.com | ₹25,000 |

## Holidays (2026)

| Date | Holiday |
|------|---------|
| 26 Jan | Republic Day |
| 4 Mar | Holi |
| 21 Mar | Id-ul-Fitr |
| 15 Aug | Independence Day |
| 26 Aug | Milad-un-Nabi / Raksha Bandhan |
| 2 Oct | Mahatma Gandhi's Birthday |
| 20 Oct | Dussehra |
| 8 Nov | Diwali |
| 25 Dec | Christmas Day |

## Salary Calculation

- **Fixed (70%)** — Paid in full every month
- **Variable (30%)** — Paid based on attendance ratio, only if target is met
- Formula: `Variable = variableSalary × (officeDays + homeDays) / totalWorkingDays`

## Business Rules

1. Attendance marking window: 9 AM – 9 PM IST
2. Employees can only mark today's attendance (not past dates)
3. Future dates can only be marked as planned leave (cannot be changed)
4. Sundays are automatically leave
5. Gazetted holidays are automatically leave
6. Employees cannot modify attendance after submission
7. Admin can override attendance for the last 7 days only
