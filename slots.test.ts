import { describe, it, expect } from "vitest";
import { buildSlots } from "../lib/booking";

describe("buildSlots", () => {
  const s = { startTime: "09:00", endTime: "12:00", breakStart: "10:00", breakEnd: "10:30", slotMinutes: 30 };
  it("skips the break and respects duration", () => {
    const slots = buildSlots("2026-11-01", s);
    expect(slots).toHaveLength(5); // 09:00, 09:30, 10:30, 11:00, 11:30
    expect(slots[0].endsAt.getTime() - slots[0].startsAt.getTime()).toBe(30 * 60000);
  });
});
