import { Prisma } from "@prisma/client";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "./prisma";

export const TZ = process.env.CLINIC_TIMEZONE ?? "Asia/Dhaka";
export class SlotUnavailableError extends Error {}

const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const at = (date: string, min: number) =>
  fromZonedTime(`${date}T${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}:00`, TZ);

/** Pure: build the slot grid for a schedule on a date (clinic-local), as UTC Dates. */
export function buildSlots(date: string, s: { startTime: string; endTime: string; breakStart?: string | null; breakEnd?: string | null; slotMinutes: number }) {
  const out: { startsAt: Date; endsAt: Date }[] = [];
  const bs = s.breakStart ? toMin(s.breakStart) : null, be = s.breakEnd ? toMin(s.breakEnd) : null;
  for (let m = toMin(s.startTime); m + s.slotMinutes <= toMin(s.endTime); m += s.slotMinutes) {
    const overlapsBreak = bs !== null && be !== null && m < be && m + s.slotMinutes > bs;
    if (!overlapsBreak) out.push({ startsAt: at(date, m), endsAt: at(date, m + s.slotMinutes) });
  }
  return out;
}

export async function getAvailableSlots(doctorId: string, date: string) {
  const dayStart = new Date(`${date}T00:00:00Z`);
  const [sched, leave, taken] = await Promise.all([
    prisma.doctorSchedule.findFirst({ where: { doctorId, dayOfWeek: dayStart.getUTCDay(), isActive: true } }),
    prisma.doctorLeave.findFirst({ where: { doctorId, date: dayStart } }),
    prisma.appointment.findMany({
      where: { doctorId, slotKey: { not: null }, startsAt: { gte: at(date, 0), lt: at(date, 1439) } },
      select: { startsAt: true },
    }),
  ]);
  if (!sched || leave) return [];
  const takenSet = new Set(taken.map((t) => t.startsAt.getTime()));
  const now = Date.now();
  return buildSlots(date, sched).filter((s) => s.startsAt.getTime() > now && !takenSet.has(s.startsAt.getTime()));
}

export async function bookAppointment(input: { doctorId: string; patientId: string; date: string; startsAtIso: string; reason: string }) {
  const slots = await getAvailableSlots(input.doctorId, input.date);
  const slot = slots.find((s) => s.startsAt.toISOString() === new Date(input.startsAtIso).toISOString());
  if (!slot) throw new SlotUnavailableError("That time is no longer available. Pick another slot.");
  try {
    return await prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.create({
        data: {
          doctorId: input.doctorId, patientId: input.patientId, reason: input.reason,
          startsAt: slot.startsAt, endsAt: slot.endsAt, status: "PENDING",
          slotKey: `${input.doctorId}:${slot.startsAt.toISOString()}`,
        },
      });
      await tx.auditLog.create({ data: { action: "APPOINTMENT_BOOKED", entity: "Appointment", entityId: appt.id } });
      return appt;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (e) {
    // P2002 = unique slotKey hit, P2034 = serialization conflict: someone else won the slot.
    if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2002" || e.code === "P2034"))
      throw new SlotUnavailableError("That time was just booked by someone else.");
    throw e;
  }
}

export async function cancelAppointment(id: string, patientId: string) {
  const res = await prisma.appointment.updateMany({
    where: { id, patientId, status: { in: ["PENDING", "CONFIRMED"] } },
    data: { status: "CANCELLED", slotKey: null }, // frees the slot
  });
  return res.count === 1;
}
