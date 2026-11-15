import { describe, it, expect } from "vitest";
import { generateDailySchedule, selectSchedulableTasks } from "@/lib/governorEngine";

const TODAY = "2026-11-15";
const isToday = (iso: string) => iso.startsWith(TODAY);

describe("selectSchedulableTasks", () => {
  it("keeps pending and completed-today, drops older completed tasks", () => {
    const tasks = [
      { id: "old", status: "completed", completed_at: "2026-10-01T10:00:00Z" },
      { id: "today", status: "completed", completed_at: `${TODAY}T09:00:00Z` },
      { id: "p", status: "pending", completed_at: null },
      { id: "rb", status: "rolled_back", completed_at: null },
    ];
    expect(selectSchedulableTasks(tasks, isToday).map((t) => t.id)).toEqual(["today", "p"]);
  });

  it("regression: old completed tasks no longer starve today's schedule", () => {
    const old = Array.from({ length: 10 }, (_, i) => ({
      id: `old${i}`,
      title: `old ${i}`,
      status: "completed",
      completed_at: "2026-10-01T10:00:00Z",
      effortSize: "Standard",
      difficulty: "Comfortable",
      deadline: `2026-10-0${(i % 9) + 1}T10:00:00Z`,
    }));
    const pending = {
      id: "p1",
      title: "pending",
      status: "pending",
      completed_at: null,
      effortSize: "Standard",
      difficulty: "Comfortable",
      deadline: "2026-11-20T10:00:00Z",
    };
    const schedule = generateDailySchedule(selectSchedulableTasks([...old, pending], isToday), 6);
    expect(schedule.blocks.some((b) => b.taskId === "p1" && b.type === "work")).toBe(true);
  });
});
