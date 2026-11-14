import { z } from "zod";

export const MilestoneTaskSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(120, "Title cannot exceed 120 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters"),
  skills_required: z
    .array(z.string().min(1))
    .min(1, "At least one skill is required")
    .max(8, "Maximum 8 skills allowed"),
  acceptance_criteria: z
    .array(z.string().min(3))
    .min(2, "At least 2 acceptance criteria required")
    .max(8, "Maximum 8 criteria allowed"),
  complexity: z
    .number()
    .int()
    .min(1, "Complexity minimum is 1")
    .max(5, "Complexity maximum is 5"),
  estimated_hours: z
    .number()
    .min(0.5, "Minimum 0.5 hours")
    .max(500, "Maximum 500 hours"),
  reward_amount: z
    .number()
    .positive("Reward must be greater than 0"),
});

export const AIDecompositionResponseSchema = z.object({
  tasks: z
    .array(MilestoneTaskSchema)
    .min(3, "AI must produce at least 3 milestones")
    .max(6, "AI must produce at most 6 milestones"),
});

export type MilestoneTask = z.infer<typeof MilestoneTaskSchema>;
export type AIDecompositionResponse = z.infer<typeof AIDecompositionResponseSchema>;
