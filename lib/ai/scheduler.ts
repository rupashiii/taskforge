import { MilestoneTask } from "./schema";

// ─── Configuration ──────────────────────────────────────────────────────

/** Productive working hours per calendar day (accounts for meetings, breaks, context-switching) */
const PRODUCTIVE_HOURS_PER_DAY = 6;

/** Buffer days added after each milestone for client review and revisions */
const REVIEW_BUFFER_DAYS = 1;

/** Minimum calendar days for any single milestone (even trivial tasks need at least 1 day) */
const MIN_MILESTONE_DAYS = 1;

/** Buffer ratio reserved at the end for integration / final QA (fraction of total timeline) */
const INTEGRATION_BUFFER_RATIO = 0.05;

// ─── Types ──────────────────────────────────────────────────────────────

export interface ScheduledMilestone extends MilestoneTask {
  /** ISO date string — computed deadline for this task */
  deadline: string;
  /** Computed working days for this task */
  _workingDays: number;
  /** Computed start offset in calendar days from project start */
  _startOffset: number;
}

// ─── Timeline parsing ───────────────────────────────────────────────────

/**
 * Extracts a project deadline date from the description.
 * Looks for the `[Project Timeline / Deadline: ...]` tag appended during project creation,
 * or falls back to common patterns like "2 weeks", "30 days", "by Dec 2026".
 */
export function parseProjectDeadline(description: string): Date | null {
  // 1. Try the structured tag first
  const tagMatch = description.match(
    /\[Project Timeline\s*\/\s*Deadline:\s*(.+?)\]/i
  );
  const timelineText = tagMatch?.[1]?.trim();

  if (!timelineText) return null;

  // 2. Try parsing as an absolute date (e.g. "2026-12-31", "Dec 2026", "31 Dec 2026")
  const directDate = new Date(timelineText);
  if (!isNaN(directDate.getTime()) && directDate > new Date()) {
    return directDate;
  }

  // 3. Try relative patterns: "N days", "N weeks", "N months"
  const relMatch = timelineText.match(
    /(\d+)\s*(day|days|week|weeks|month|months)/i
  );
  if (relMatch) {
    const count = parseInt(relMatch[1], 10);
    const unit = relMatch[2].toLowerCase();
    const target = new Date();

    if (unit.startsWith("day")) {
      target.setDate(target.getDate() + count);
    } else if (unit.startsWith("week")) {
      target.setDate(target.getDate() + count * 7);
    } else if (unit.startsWith("month")) {
      target.setMonth(target.getMonth() + count);
    }

    return target;
  }

  // 4. Try "by <date>" pattern
  const byMatch = timelineText.match(/by\s+(.+)/i);
  if (byMatch) {
    const byDate = new Date(byMatch[1].trim());
    if (!isNaN(byDate.getTime()) && byDate > new Date()) {
      return byDate;
    }
  }

  return null;
}

// ─── Scheduling engine ──────────────────────────────────────────────────

/**
 * Converts estimated effort hours into calendar days.
 */
function effortToCalendarDays(estimatedHours: number): number {
  const rawDays = Math.ceil(estimatedHours / PRODUCTIVE_HOURS_PER_DAY);
  return Math.max(MIN_MILESTONE_DAYS, rawDays);
}

/**
 * Validates dependency indices — ensures no out-of-range or circular references.
 * Returns sanitised dependency arrays.
 */
function sanitiseDependencies(
  tasks: MilestoneTask[]
): number[][] {
  const n = tasks.length;
  const deps: number[][] = tasks.map((t) =>
    (t.depends_on_indices ?? []).filter((idx) => idx >= 0 && idx < n)
  );

  // Strip self-references
  for (let i = 0; i < n; i++) {
    deps[i] = deps[i].filter((d) => d !== i);
  }

  // Detect cycles using topological sort; if a cycle exists, break it by clearing deps
  const visited = new Set<number>();
  const inStack = new Set<number>();
  let hasCycle = false;

  function dfs(node: number) {
    if (inStack.has(node)) {
      hasCycle = true;
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    inStack.add(node);
    for (const dep of deps[node]) {
      dfs(dep);
      if (hasCycle) return;
    }
    inStack.delete(node);
  }

  for (let i = 0; i < n; i++) {
    if (!visited.has(i)) dfs(i);
    if (hasCycle) break;
  }

  // If cycle detected, fall back to purely sequential ordering
  if (hasCycle) {
    return tasks.map((_, i) => (i > 0 ? [i - 1] : []));
  }

  return deps;
}

/**
 * Computes a schedule using a dependency-aware forward pass.
 *
 * Independent tasks (no dependency overlap) are scheduled in parallel.
 * Dependent tasks start after all their predecessors finish + review buffer.
 *
 * If a project deadline is provided, all milestone deadlines are compressed
 * proportionally to fit within the available calendar.
 */
export function computeSchedule(
  tasks: MilestoneTask[],
  projectDeadline: Date | null
): ScheduledMilestone[] {
  if (tasks.length === 0) return [];

  const deps = sanitiseDependencies(tasks);
  const n = tasks.length;

  // Compute raw working days for each task
  const workingDays = tasks.map((t) => effortToCalendarDays(t.estimated_hours));

  // Forward pass: compute earliest start offset (in calendar days from project start)
  const startOffset = new Array(n).fill(0);

  // Process in topological order
  const inDegree = new Array(n).fill(0);
  for (const d of deps) {
    for (const dep of d) {
      inDegree[dep] = (inDegree[dep] ?? 0); // dep is a predecessor, not incremented here
    }
  }
  // Actually compute in-degree for each node based on who depends on it
  const inDeg = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (const dep of deps[i]) {
      // i depends on dep — dep must finish before i starts
      // We need to process dep before i
    }
    inDeg[i] = deps[i].length;
  }

  const queue: number[] = [];
  for (let i = 0; i < n; i++) {
    if (inDeg[i] === 0) queue.push(i);
  }

  const topoOrder: number[] = [];
  const processed = new Set<number>();

  while (queue.length > 0) {
    const node = queue.shift()!;
    topoOrder.push(node);
    processed.add(node);

    // Find tasks that depend on this node
    for (let i = 0; i < n; i++) {
      if (processed.has(i)) continue;
      if (deps[i].includes(node)) {
        // Check if all dependencies of i are now processed
        if (deps[i].every((d) => processed.has(d))) {
          queue.push(i);
        }
      }
    }
  }

  // If some nodes weren't reached (shouldn't happen after sanitise), add them
  for (let i = 0; i < n; i++) {
    if (!processed.has(i)) topoOrder.push(i);
  }

  // Compute earliest start for each task
  for (const i of topoOrder) {
    if (deps[i].length === 0) {
      startOffset[i] = 0;
    } else {
      // Start after the latest predecessor finishes + review buffer
      let maxPredEnd = 0;
      for (const dep of deps[i]) {
        const predEnd = startOffset[dep] + workingDays[dep] + REVIEW_BUFFER_DAYS;
        if (predEnd > maxPredEnd) maxPredEnd = predEnd;
      }
      startOffset[i] = maxPredEnd;
    }
  }

  // Compute raw end offsets and total span
  const endOffset = tasks.map((_, i) => startOffset[i] + workingDays[i]);
  const rawTotalDays = Math.max(...endOffset);

  // Determine available calendar days
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let availableDays: number | null = null;
  if (projectDeadline) {
    const deadlineCopy = new Date(projectDeadline);
    deadlineCopy.setHours(23, 59, 59, 999);
    const totalMs = deadlineCopy.getTime() - today.getTime();
    availableDays = Math.max(1, Math.floor(totalMs / (1000 * 60 * 60 * 24)));
  }

  // Compute compression ratio if needed (reserve integration buffer at the end)
  let scale = 1;
  if (availableDays !== null) {
    const usableDays = Math.max(
      tasks.length, // at minimum 1 day per task
      Math.floor(availableDays * (1 - INTEGRATION_BUFFER_RATIO))
    );

    if (rawTotalDays > usableDays) {
      scale = usableDays / rawTotalDays;
    }
  }

  // Build scheduled milestones
  const result: ScheduledMilestone[] = tasks.map((task, i) => {
    const scaledStart = Math.floor(startOffset[i] * scale);
    const scaledDays = Math.max(MIN_MILESTONE_DAYS, Math.ceil(workingDays[i] * scale));
    const deadlineOffset = scaledStart + scaledDays;

    const deadlineDate = new Date(today);
    deadlineDate.setDate(deadlineDate.getDate() + deadlineOffset);

    // Enforce: no milestone deadline can exceed the project deadline
    if (projectDeadline && deadlineDate > projectDeadline) {
      deadlineDate.setTime(projectDeadline.getTime());
    }

    return {
      ...task,
      deadline: deadlineDate.toISOString().slice(0, 10), // YYYY-MM-DD
      _workingDays: scaledDays,
      _startOffset: scaledStart,
    };
  });

  return result;
}

/**
 * Validates that all computed deadlines are within the project deadline.
 * Returns an error string if any violation is found, null otherwise.
 */
export function validateSchedule(
  scheduled: ScheduledMilestone[],
  projectDeadline: Date | null
): string | null {
  if (!projectDeadline || scheduled.length === 0) return null;

  const deadlineStr = projectDeadline.toISOString().slice(0, 10);

  for (const task of scheduled) {
    if (task.deadline > deadlineStr) {
      return `Task "${task.title}" deadline (${task.deadline}) exceeds the project deadline (${deadlineStr}). Please adjust the timeline or reduce scope.`;
    }
  }

  return null;
}
