import {
  AIDecompositionResponseSchema,
  MilestoneTask,
} from "./schema";
import {
  computeSchedule,
  parseProjectDeadline,
  validateSchedule,
  ScheduledMilestone,
} from "./scheduler";

interface DecomposeProjectInput {
  title: string;
  description: string;
  totalBudget: number;
}

/**
 * Computes milestone rewards deterministically using Approach 2:
 *   weight_i  = estimated_hours_i × complexity_i
 *   reward_i  = floor(weight_i / sum(weights) × totalBudget)
 *
 * The AI's suggested reward_amount is intentionally ignored — the math
 * always decides the money. Integer remainder is distributed to the
 * highest-complexity task so that sum(rewards) == totalBudget exactly.
 *
 * If budget is 0 or unset, a minimum floor of ₹100 per task is applied.
 */
export function clampMilestoneRewards(
  tasks: MilestoneTask[],
  totalBudget: number
): MilestoneTask[] {
  if (tasks.length === 0) return tasks;

  if (totalBudget <= 0) {
    return tasks.map((t) => ({ ...t, reward_amount: 100 }));
  }

  // Compute per-task weights: hours × complexity
  const weights = tasks.map((t) =>
    Math.max(1, t.estimated_hours) * Math.max(1, t.complexity)
  );
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  // Allocate rewards proportionally, floor to avoid overshoot
  const rewards = weights.map((w) =>
    Math.max(1, Math.floor((w / totalWeight) * totalBudget))
  );

  // Distribute integer remainder to the highest-complexity task
  const allocated = rewards.reduce((sum, r) => sum + r, 0);
  const remainder = totalBudget - allocated;

  if (remainder > 0) {
    let maxComplexityIndex = 0;
    for (let i = 1; i < tasks.length; i++) {
      if (tasks[i].complexity > tasks[maxComplexityIndex].complexity) {
        maxComplexityIndex = i;
      }
    }
    rewards[maxComplexityIndex] += remainder;
  }

  return tasks.map((t, i) => ({ ...t, reward_amount: rewards[i] }));
}

/**
 * Extracts and parses JSON from the AI response text.
 * Handles both raw JSON and markdown code-fenced JSON.
 */
export function extractAndValidateJson(rawText: string): MilestoneTask[] {
  // Strip markdown code fences if present
  let cleaned = rawText.trim();
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = cleaned.match(fenceRegex);
  if (match && match[1]) {
    cleaned = match[1].trim();
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleaned);
  } catch (err: any) {
    throw new Error(
      `AI response could not be parsed as valid JSON: ${err.message}`
    );
  }

  const validated = AIDecompositionResponseSchema.safeParse(parsedJson);
  if (!validated.success) {
    const errorDetails = validated.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    throw new Error(`AI generated invalid milestone structure: ${errorDetails}`);
  }

  return validated.data.tasks;
}

// ─── Gemini REST API helpers ─────────────────────────────────────────────

/** Models to attempt in priority order (first success wins) */
const GEMINI_MODELS = ["gemini-3-flash-preview"] as const;

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  let lastError: Error | null = null;

  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
          },
        }),
        signal: AbortSignal.timeout(30000), // 30s timeout
      });
    } catch (err: any) {
      lastError = new Error(
        `Gemini API request to ${model} failed: ${err.message || String(err)}`
      );
      continue; // try next model
    }

    if (!res.ok) {
      const errBody = await res.text().catch(() => "unknown error");
      lastError = new Error(
        `Gemini model ${model} returned HTTP ${res.status}: ${errBody.slice(0, 200)}`
      );
      continue; // try next model
    }

    const data: GeminiResponse = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      lastError = new Error(
        `No text response received from Gemini model ${model}.`
      );
      continue;
    }

    return text;
  }

  throw lastError ?? new Error("All Gemini models failed.");
}

// ─── Main decomposition function ────────────────────────────────────────

/**
 * Decomposes a project into 3-6 milestones via Google Gemini API,
 * strictly validated with Zod and mathematical budget constraints.
 * Computes deadline scheduling based on effort, dependencies, and project timeline.
 *
 * Uses GEMINI_API_KEY from environment. Server-side only — never
 * expose the key to the client browser.
 */
export async function decomposeProjectWithAI({
  title,
  description,
  totalBudget,
}: DecomposeProjectInput): Promise<ScheduledMilestone[]> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  if (!geminiKey) {
    throw new Error(
      "AI API key is not configured. Please set GEMINI_API_KEY in your environment to enable AI decomposition."
    );
  }

  const systemPrompt = `You are an expert technical product manager and software architect specializing in agile milestone decomposition.
Your goal is to break down software and technical projects into 3 to 6 logical, actionable milestones for verified freelancers.

RULES:
1. Decompose the project into between 3 and 6 milestones (inclusive).
2. Each milestone must have:
   - title: concise deliverable name (3-120 chars)
   - description: clear, actionable technical scope (min 10 chars)
   - skills_required: array of 1 to 5 relevant technical/design skills (lowercase)
   - acceptance_criteria: array of 2 to 5 concrete, verifiable evaluation checks
   - complexity: integer from 1 (very easy) to 5 (complex architecture)
   - estimated_hours: realistic development hours (e.g. 4, 8, 16, 24, 40). Be precise — these hours directly drive deadline scheduling.
   - reward_amount: suggested reward in INR (₹). The sum across all tasks MUST NOT exceed the client total budget of ₹${totalBudget}.
   - depends_on_indices: array of 0-based indices of milestones this task depends on. Use [] if the task has no dependencies (can start immediately). Only reference indices of tasks that appear BEFORE this task in the array.
3. Ordering and dependency guidelines:
   - Tasks that can be worked on independently and in parallel SHOULD have depends_on_indices: [].
   - Tasks that require output from a prior task MUST list that task's index in depends_on_indices.
   - Do NOT make all tasks sequential unless they truly depend on each other.
   - Example: if task 2 needs task 0's output but NOT task 1's, set depends_on_indices: [0], not [0, 1].
4. Respond ONLY with a valid JSON object matching the requested schema. No conversational preamble or trailing explanation.`;

  const userPrompt = `Project Title: ${title}
Total Budget: ₹${totalBudget}
Project Description & Requirements:
${description}

Generate the milestone breakdown as a JSON object:
{
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "skills_required": ["skill1", "skill2"],
      "acceptance_criteria": ["criteria 1", "criteria 2"],
      "complexity": 1-5,
      "estimated_hours": 8,
      "reward_amount": 5000,
      "depends_on_indices": []
    }
  ]
}`;

  const responseText = await callGemini(geminiKey, systemPrompt, userPrompt);

  // Parse and Zod-validate structure
  const rawTasks = extractAndValidateJson(responseText);

  // Independently clamp budget constraints mathematically
  const clampedTasks = clampMilestoneRewards(rawTasks, totalBudget);

  // Parse project deadline from description
  const projectDeadline = parseProjectDeadline(description);

  // Compute deadlines using the scheduling engine
  const scheduled = computeSchedule(clampedTasks, projectDeadline);

  // Validate that all deadlines respect the project deadline
  const validationError = validateSchedule(scheduled, projectDeadline);
  if (validationError) {
    // This shouldn't happen since computeSchedule enforces it, but just in case
    console.warn("Schedule validation warning:", validationError);
  }

  return scheduled;
}
