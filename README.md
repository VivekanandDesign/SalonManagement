# Orrenza — Open-Source Salon Management System

A full-featured, web-based salon management platform built for small-to-mid-sized salons. Manage customers, appointments, billing, staff, loyalty programs, and more — all from one place.

---

## Features

| Module | Highlights |
|---|---|
| **Dashboard** | Revenue charts, today's appointments, key KPIs |
| **Customers** | Profiles with visit history, tags (New/Regular/VIP/Inactive), notes |
| **Appointments** | Calendar scheduling (daily/weekly), walk-ins, status tracking, double-booking prevention |
| **Billing & Invoices** | Quick invoice generation, multiple payment modes, tax support |
| **Services** | Categories, combos/packages, staff mapping, active/inactive toggle |
| **Staff** | Role-based access (Admin, Stylist, Receptionist), attendance, commission tracking |
| **Communications** | WhatsApp integration (Baileys), automated reminders, birthday/re-engagement messages |
| **Loyalty** | Visit-milestone rewards, configurable thresholds |
| **Memberships** | Membership plans with discount rules |
| **Wallet** | Customer wallet top-ups and payments |
| **Products** | Retail product inventory & sales |
| **Queue** | Real-time walk-in queue management |
| **Happy Hours** | Time-based discount rules |
| **Referrals** | Referral reward program |
| **Campaigns** | Bulk SMS/WhatsApp campaign manager |
| **Expenses** | Salon expense tracking with categories |
| **Reports** | Revenue, service, staff performance, and customer analytics |
| **Public Pages** | Online booking page & post-visit feedback form |
| **Settings** | Salon profile, business hours, message templates |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 · Vite 8 · Tailwind CSS v4 · React Router 7 |
| Backend | Express 5 · Node.js 20 |
| Database | PostgreSQL 16 · Prisma 7 (ORM) |
| Messaging | WhatsApp via Baileys |
| Auth | JWT + bcrypt, role-based access |
| Containerization | Docker & Docker Compose |

---

## Prerequisites

- **Node.js** ≥ 20
- **PostgreSQL** ≥ 14 (or use the included Docker Compose)
- **npm** ≥ 9

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/VivekcMW/SMVIVEK.git
cd "Salon Management"
```

### 2. Set up the backend

```bash
cd salon-backend

# Copy and configure environment variables
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, etc.

# Install dependencies
npm install

# Run database migrations and seed demo data
npx prisma migrate deploy
npx prisma generate
node prisma/seed.js
```

### 3. Set up the frontend

```bash
cd ../salon-app

# Copy and configure environment variables
cp .env.example .env

# Install dependencies
npm install
```

### 4. Run in development mode

Open two terminals:

```bash
# Terminal 1 — Backend (port 4000)
cd salon-backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd salon-app
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Default Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@orrenza.com` | `admin123` |
| Stylist | `priya@orrenza.com` | `stylist123` |
| Receptionist | `reception@orrenza.com` | `recep123` |

> **Important:** Change these passwords immediately in production by setting `SEED_ADMIN_PASSWORD`, `SEED_STYLIST_PASSWORD`, and `SEED_RECEPTIONIST_PASSWORD` in your `.env` before running the seed script.

---

## Docker Setup

Run the entire stack with Docker Compose:

```bash
cd salon-backend

# Set required env vars
export JWT_SECRET="your-strong-random-secret-at-least-32-characters"
export POSTGRES_PASSWORD="a-strong-database-password"

# Start PostgreSQL + API
docker compose up -d

# Run migrations & seed (first time only)
docker compose exec api npx prisma migrate deploy
docker compose exec api node prisma/seed.js
```

The API will be available at **http://localhost:4000**.

Build and serve the frontend separately, or use a reverse proxy (Nginx/Caddy) to serve the built frontend alongside the API.

---

## Environment Variables

### Backend (`salon-backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | — (required) |
| `JWT_SECRET` | Secret for signing JWTs (≥32 chars in prod) | — (required) |
| `JWT_EXPIRES_IN` | Token expiry duration | `7d` |
| `PORT` | API server port | `4000` |
| `NODE_ENV` | `development` or `production` | `development` |
| `FRONTEND_URL` | CORS-allowed origin | `http://localhost:5173` |
| `SEED_ADMIN_PASSWORD` | Admin password for seed script | `admin123` |
| `SEED_STYLIST_PASSWORD` | Stylist password for seed script | `stylist123` |
| `SEED_RECEPTIONIST_PASSWORD` | Receptionist password for seed script | `recep123` |

### Frontend (`salon-app/.env`)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://localhost:4000` |

---

## Project Structure

```
├── salon-app/               # React frontend (Vite)
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # React context (Auth)
│   │   ├── layouts/         # App layout shell
│   │   ├── pages/           # Page-level components
│   │   └── services/        # API client
│   └── public/
│
├── salon-backend/           # Express API server
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/       # Auth, validation, error handling
│   │   ├── routes/          # Express route definitions
│   │   ├── services/        # Background scheduler
│   │   ├── config/          # Environment configuration
│   │   └── utils/           # JWT helpers
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   ├── seed.js          # Demo data seeder
│   │   └── migrations/      # Database migrations
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── PRD.md                   # Product Requirements Document
├── LICENSE                  # MIT License
└── README.md                # ← You are here
```

---

## API Overview

All API routes are prefixed with `/api` and require JWT authentication (except auth and public routes).

| Endpoint Group | Base Path |
|---|---|
| Auth | `/api/auth` |
| Customers | `/api/customers` |
| Appointments | `/api/appointments` |
| Services | `/api/services` |
| Staff | `/api/staff` |
| Invoices | `/api/invoices` |
| Loyalty | `/api/loyalty` |
| Messages | `/api/messages` |
| Dashboard | `/api/dashboard` |
| Settings | `/api/settings` |
| Reports | `/api/reports` |
| Expenses | `/api/expenses` |
| Campaigns | `/api/campaigns` |
| Memberships | `/api/memberships` |
| Wallet | `/api/wallet` |
| Products | `/api/products` |
| Queue | `/api/queue` |
| Happy Hours | `/api/happy-hours` |
| Referrals | `/api/referrals` |
| Gift Vouchers | `/api/gift-vouchers` |
| Public Booking | `/api/public` |
| Feedback | `/api/feedback` |
| WhatsApp | `/api/whatsapp` |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

Please ensure your code passes the existing ESLint rules and the application builds without errors.

---

## License

This project is licensed under the [MIT License](LICENSE).
