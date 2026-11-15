import type { EffortSize, DifficultyLevel } from "@/types/database.types";

/**
 * Minimal task shape the Governor Engine needs. Compatible with TasksRow
 * and with ParsedTaskPayload once an id is attached.
 */
export interface GovernorTaskInput {
  id: string;
  title: string;
  effortSize: EffortSize | string | null;
  difficulty: DifficultyLevel | string | null;
  deadline?: string | null;
}

export interface ScheduledBlock {
  id: string;
  taskId: string;
  title: string;
  type: "work" | "recovery";
  durationMinutes: number;
  effortSize: string;
  difficulty: string;
  isOverridden: boolean;
  reason?: string;
}

export interface GovernorSchedule {
  blocks: ScheduledBlock[];
  postponedBlocks: ScheduledBlock[];
  totalWorkMinutes: number;
  totalRecoveryMinutes: number;
  overriddenTaskIds: string[];
  statusMessage: string | null;
}

/**
 * Pick which tasks are allowed to occupy today's capacity: every pending task,
 * plus tasks completed today (that work really was done today, so it still
 * counts against the budget). Tasks completed on earlier days must NOT be fed
 * to the scheduler — they sort first by their old deadlines, fill the whole
 * daily budget, and are then hidden as "completed", leaving 0m of focus.
 */
export function selectSchedulableTasks<
  T extends { status: string | null; completed_at?: string | null },
>(tasks: T[], isToday: (iso: string) => boolean): T[] {
  return tasks.filter(
    (t) =>
      t.status === "pending" ||
      (t.status === "completed" && !!t.completed_at && isToday(t.completed_at)),
  );
}

export const GUARDRAIL_REASON =
  "Postponed by Biometric Guardrail due to low recovery baseline.";

export function generateDailySchedule(
  tasks: GovernorTaskInput[],
  targetHours: number = 6.0,
  sleepHours: number = 7.0,
  energyLevel: number = 5,
  burnoutScore: number = 0,
): GovernorSchedule {
  const maxWorkMinutes = Math.round((targetHours || 6) * 60);
  const isSleepDeprived = sleepHours < 5.0 || energyLevel <= 3;
  const isRedState = burnoutScore >= 75;
  const guardrailActive = isSleepDeprived || isRedState;

  let currentWorkMinutes = 0;
  let currentRecoveryMinutes = 0;
  const blocks: ScheduledBlock[] = [];
  const postponedBlocks: ScheduledBlock[] = [];
  const overriddenTaskIds: string[] = [];

  const sortedTasks = [...tasks].sort((a, b) => {
    const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    return dateA - dateB;
  });

  for (const task of sortedTasks) {
    if (currentWorkMinutes >= maxWorkMinutes) break;

    // Biometric / Red-State Guardrail: bar cognitively expensive tasks
    const isHeavy =
      task.effortSize === "Deep Work" ||
      task.difficulty === "Very Hard" ||
      task.difficulty === "Challenging";

    if (guardrailActive && isHeavy) {
      overriddenTaskIds.push(task.id);
      postponedBlocks.push({
        id: `${task.id}-postponed`,
        taskId: task.id,
        title: task.title || "Untitled Assignment",
        type: "work",
        durationMinutes: task.effortSize === "Quick" ? 25 : 50,
        effortSize: (task.effortSize as string) || "Deep Work",
        difficulty: (task.difficulty as string) || "Very Hard",
        isOverridden: true,
        reason: GUARDRAIL_REASON,
      });
      continue;
    }

    let blockDuration = 50;
    if (task.effortSize === "Quick") blockDuration = 25;
    if (task.effortSize === "Deep Work") blockDuration = 50;

    if (currentWorkMinutes + blockDuration > maxWorkMinutes) {
      blockDuration = maxWorkMinutes - currentWorkMinutes;
    }
    if (blockDuration <= 0) break;

    blocks.push({
      id: `${task.id}-work-${blocks.length}`,
      taskId: task.id,
      title: task.title || "Untitled Assignment",
      type: "work",
      durationMinutes: blockDuration,
      effortSize: (task.effortSize as string) || "Standard",
      difficulty: (task.difficulty as string) || "Challenging",
      isOverridden: false,
    });
    currentWorkMinutes += blockDuration;

    if (
      blockDuration >= 45 &&
      currentWorkMinutes < maxWorkMinutes &&
      blocks[blocks.length - 1]?.type !== "recovery"
    ) {
      blocks.push({
        id: `${task.id}-rest-${blocks.length}`,
        // Tied to the parent task's id (not a shared constant) so that once
        // the parent task is marked complete and its work block is filtered
        // out of the UI, this recovery block is recognized as belonging to
        // a completed task and filtered out too, instead of being orphaned
        // and accumulating forever.
        taskId: task.id,
        title: "Cognitive Recovery Interval",
        type: "recovery",
        durationMinutes: 10,
        effortSize: "Quick",
        difficulty: "Comfortable",
        isOverridden: false,
      });
      currentRecoveryMinutes += 10;
    }
  }

  let statusMessage: string | null = null;
  if (guardrailActive && postponedBlocks.length > 0) {
    statusMessage = isRedState
      ? `Red State Lockout: ${postponedBlocks.length} demanding task(s) postponed until your recovery index improves.`
      : `Biometric Guardrail Active: ${postponedBlocks.length} complex task(s) postponed due to low energy/sleep baseline.`;
  }

  return {
    blocks,
    postponedBlocks,
    totalWorkMinutes: currentWorkMinutes,
    totalRecoveryMinutes: currentRecoveryMinutes,
    overriddenTaskIds,
    statusMessage,
  };
}
