# MediBook (core booking workflow)

Synthetic demo data only. Not a certified medical-record platform.

## Run locally
```bash
cp .env.example .env        # set DATABASE_URL
npm install
npx prisma migrate dev --name init
npm run db:seed
npm test
npm run dev
```
Demo logins (seed): patient@medibook.test, doctor1@medibook.test, admin@medibook.test / `Password123!`

## What works
- Prisma schema: all 9 models, indexes, relations
- Slot generation (working days, breaks, duration, leave, past/booked slots removed), timezone-aware (`CLINIC_TIMEZONE`)
- Race-safe booking: Serializable transaction + unique `slotKey` guard; cancelling frees the slot
- API: `GET /api/doctors/:id/slots?date=YYYY-MM-DD`, `POST|GET|DELETE /api/appointments` (Zod-validated, patient-scoped)

## Not done yet
Real auth (Auth.js + rate limiting; `lib/auth.ts` is a dev-only stub), all UI/dashboards, landing page,
email/reminder jobs, reschedule, PDF confirmation, payments, Playwright tests, deployment docs.
