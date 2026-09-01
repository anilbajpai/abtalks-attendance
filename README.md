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
- **Google Sheets** (attendance storage — free)
- **NextAuth.js** (Google OAuth)
- ~~Prisma + PostgreSQL~~ (disabled — code commented out)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Google Sheet

1. Create a new Google Sheet at [sheets.google.com](https://sheets.google.com)
2. Rename the first tab to **`Attendance`**
3. Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`

### 3. Create a Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project → **APIs & Services** → **Enable APIs** → enable **Google Sheets API**
3. **Credentials** → **Create Credentials** → **Service Account**
4. Create the account → **Keys** → **Add Key** → **JSON** → download
5. From the JSON file, copy `client_email` and `private_key`
6. **Share your Google Sheet** with the service account email (Editor access)

### 4. Configure environment

Copy `.env.example` to `.env` and fill in:

```env
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-sa@project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID="your-sheet-id"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-random-secret-here"
```

### 5. Google OAuth (login)

1. In Google Cloud Console → **Credentials** → **OAuth 2.0 Client ID** (Web application)
2. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
3. Copy Client ID and Secret to `.env`

### 6. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Google Sheet Format

The app auto-creates headers on first use:

| Email | Date | Type | IsOverride | Note | UpdatedAt |
|-------|------|------|------------|------|-----------|
| sksohailswaraj@gmail.com | 2026-09-01 | OFFICE | FALSE | | 2026-09-01T10:00:00Z |

You can view and edit attendance directly in the sheet.

## Database (disabled)

Prisma/PostgreSQL code is commented out in `prisma/`, `src/lib/prisma.ts`, and `prisma/seed.ts`.
To re-enable, uncomment those files, add `DATABASE_URL` to `.env`, and restore prisma deps in `package.json`.

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

## Deploy to Vercel

### Prerequisites
1. [Vercel account](https://vercel.com/signup)
2. Google Sheet + Service Account (see Setup above)
3. Google OAuth credentials with production redirect URI

### 1. Deploy

```bash
npx vercel login
npx vercel --prod
```

### 2. Set environment variables

In Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `GOOGLE_CLIENT_ID` | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email |
| `GOOGLE_PRIVATE_KEY` | Service account private key |
| `GOOGLE_SHEET_ID` | Google Sheet ID |
| `NEXTAUTH_SECRET` | Random string (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |

### 3. Google OAuth production redirect

```
https://your-app.vercel.app/api/auth/callback/google
```

## Business Rules

1. Attendance marking window: 9 AM – 9 PM IST
2. Employees can only mark today's attendance (not past dates)
3. Future dates can only be marked as planned leave (cannot be changed)
4. Sundays are automatically leave
5. Gazetted holidays are automatically leave
6. Employees cannot modify attendance after submission
7. Admin can override attendance for the last 7 days only
