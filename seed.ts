import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("Password123!", 12); // synthetic demo data only
  const names = ["Cardiology", "Dermatology", "Neurology", "Pediatrics", "Orthopedics", "General Medicine"];
  const depts = await Promise.all(names.map((name) => prisma.department.upsert({ where: { name }, update: {}, create: { name } })));
  for (const [i, d] of depts.entries()) {
    const user = await prisma.user.upsert({
      where: { email: `doctor${i + 1}@medibook.test` }, update: {},
      create: { email: `doctor${i + 1}@medibook.test`, name: `Dr. Demo ${d.name}`, passwordHash: hash, role: "DOCTOR" },
    });
    const doc = await prisma.doctorProfile.upsert({
      where: { userId: user.id }, update: {},
      create: { userId: user.id, departmentId: d.id, qualifications: "MBBS, MD", experienceYears: 5 + i, consultationFee: 50000 },
    });
    for (const dayOfWeek of [0, 1, 2, 3, 4]) // Sun–Thu
      await prisma.doctorSchedule.upsert({
        where: { doctorId_dayOfWeek: { doctorId: doc.id, dayOfWeek } }, update: {},
        create: { doctorId: doc.id, dayOfWeek, startTime: "09:00", endTime: "17:00", breakStart: "13:00", breakEnd: "14:00", slotMinutes: 30 },
      });
  }
  await prisma.user.upsert({ where: { email: "admin@medibook.test" }, update: {}, create: { email: "admin@medibook.test", name: "Demo Admin", passwordHash: hash, role: "ADMIN" } });
  const p = await prisma.user.upsert({ where: { email: "patient@medibook.test" }, update: {}, create: { email: "patient@medibook.test", name: "Demo Patient", passwordHash: hash, role: "PATIENT" } });
  await prisma.patientProfile.upsert({ where: { userId: p.id }, update: {}, create: { userId: p.id } });
}
main().finally(() => prisma.$disconnect());
