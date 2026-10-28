import { cookies } from "next/headers";
import { prisma } from "./prisma";
/**
 * DEV-ONLY session stub: reads the `dev-user-id` cookie. Disabled in production.
 * TODO (next step): replace with Auth.js credentials provider + bcrypt + rate limiting.
 */
export async function getCurrentUser() {
  if (process.env.NODE_ENV === "production") return null;
  const id = cookies().get("dev-user-id")?.value;
  return id ? prisma.user.findUnique({ where: { id }, include: { patient: true, doctor: true } }) : null;
}
