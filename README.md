# BuMIS

BuMIS is a business management information system with a React + Vite frontend and a NestJS backend connected to Microsoft SQL Server.

It is designed to support multiple roles, including:

- Platform admin
- Business owner
- Staff users

The application includes modules for authentication, business management, subscriptions, invoices, products, inventory, customers, vendors, ledger, reports, permissions, audit logs, notifications, and system settings.

## Tech Stack

- Frontend: React 19, Vite, React Router, Tailwind CSS, Framer Motion, Recharts
- Backend: NestJS, TypeORM, SQL Server, JWT authentication, Nodemailer
- Tooling: TypeScript, Oxlint, npm

## Project Structure

- `frontend/` - React app
- `backend/` - NestJS API
- `Functional Requirement and Business Logic.docx` - project requirements and business rules

## Features

- Authentication and password management
- Role and permission management
- Admin dashboard and platform management
- Business dashboard and operations
- Staff workspace
- Invoice creation, listing, and details
- Products, categories, customers, vendors, and inventory
- Ledger and reports
- Subscription management and revenue analytics
- Audit logs and system settings

## Prerequisites

- Node.js and npm
- Microsoft SQL Server
- ODBC Driver 17 for SQL Server
- A configured SMTP server if you want email features such as password reset and notifications

## Setup

### 1. Backend

```bash
cd backend
npm install
```

Create a `.env` file in `backend/` with the required values.

Example:

```env
APP_NAME=BuMIS
APP_PORT=3001
NODE_ENV=development

DB_HOST=localhost
DB_PORT=
DB_NAME=BuMIS
DB_INSTANCE=
DB_USERNAME=
DB_PASSWORD=
DB_TRUSTED_CONNECTION=true
DB_TRUST_SERVER_CERTIFICATE=true
DB_ENCRYPT=false
DB_LOGGING=false

JWT_ACCESS_SECRET=change-me
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=change-me-too
JWT_REFRESH_EXPIRES_IN=7d

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=BuMIS <no-reply@bumis.local>
```

Run the backend:

```bash
npm run start:dev
```

The API runs on `http://localhost:3001` by default and is prefixed with `/api`.

### 2. Frontend

```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/` if you want to override the API URL:

```env
VITE_API_BASE_URL=/api
```

Run the frontend:

```bash
npm run dev
```

The Vite dev server runs on `http://localhost:5173` and proxies `/api` requests to the backend at `http://localhost:3001`.

## Available Scripts

### Backend

- `npm run build` - compile the NestJS app
- `npm run start` - run the backend in production mode
- `npm run start:dev` - run the backend with watch mode
- `npm run start:debug` - run the backend with debug mode
- `npm run lint` - run ESLint
- `npm run migration:generate` - generate a TypeORM migration
- `npm run migration:create` - create a new TypeORM migration file
- `npm run migration:run` - run migrations
- `npm run migration:revert` - revert the last migration

### Frontend

- `npm run dev` - start the Vite development server
- `npm run build` - build the production frontend
- `npm run lint` - run Oxlint
- `npm run preview` - preview the built frontend

## Useful Routes

### Admin

- `/dashboard`
- `/admin/businesses`
- `/admin/subscriptions`
- `/admin/revenue`
- `/admin/login-as-business`
- `/users`
- `/roles`
- `/permissions`
- `/audit`
- `/settings`

### Business Owner

- `/dashboard`
- `/invoices`
- `/invoices/new`
- `/invoices/:id`
- `/products`
- `/categories`
- `/customers`
- `/vendors`
- `/inventory`
- `/ledger`
- `/users`
- `/roles`
- `/permissions`
- `/reports`
- `/subscription`
- `/settings`
- `/audit`

### Staff

- `/dashboard`
- `/invoices`
- `/invoices/new`
- `/invoices/:id`
- `/products`
- `/customers`
- `/vendors`
- `/inventory`
- `/reports`
- `/audit`

## Notes

- The backend uses SQL Server through TypeORM.
- The frontend talks to the backend through `/api` in development.
- Build artifacts and uploaded files may be present in the repository depending on the current workspace state.

## License

No license has been specified yet.
