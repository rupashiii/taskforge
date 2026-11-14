import {
  AIDecompositionResponseSchema,
  MilestoneTask,
} from "./schema";

interface DecomposeProjectInput {
  title: string;
  description: string;
  totalBudget: number;
}

/**
 * Independently validates and clamps milestone rewards so that
 * their sum never exceeds the project budget, regardless of LLM arithmetic.
 */
export function clampMilestoneRewards(
  tasks: MilestoneTask[],
  totalBudget: number
): MilestoneTask[] {
  if (totalBudget <= 0) {
    return tasks.map((t) => ({
      ...t,
      reward_amount: Math.max(100, Math.round(t.reward_amount)),
    }));
  }

  const currentTotal = tasks.reduce((sum, t) => sum + t.reward_amount, 0);

  if (currentTotal <= totalBudget) {
    return tasks.map((t) => ({
      ...t,
      reward_amount: Math.max(1, Math.round(t.reward_amount)),
    }));
  }

  // Mathematically scale down rewards proportionally
  const scale = totalBudget / currentTotal;
  const scaledTasks = tasks.map((t) => ({
    ...t,
    reward_amount: Math.max(1, Math.floor(t.reward_amount * scale)),
  }));

  // Distribute any remainder due to Math.floor to the highest complexity task
  const scaledTotal = scaledTasks.reduce((sum, t) => sum + t.reward_amount, 0);
  const remainder = Math.floor(totalBudget - scaledTotal);

  if (remainder > 0 && scaledTasks.length > 0) {
    let maxComplexityIndex = 0;
    for (let i = 1; i < scaledTasks.length; i++) {
      if (scaledTasks[i].complexity > scaledTasks[maxComplexityIndex].complexity) {
        maxComplexityIndex = i;
      }
    }
    scaledTasks[maxComplexityIndex].reward_amount += remainder;
  }

  return scaledTasks;
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
 *
 * Uses GEMINI_API_KEY from environment. Server-side only — never
 * expose the key to the client browser.
 */
export async function decomposeProjectWithAI({
  title,
  description,
  totalBudget,
}: DecomposeProjectInput): Promise<MilestoneTask[]> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  if (!geminiKey) {
    throw new Error(
      "AI API key is not configured. Please set GEMINI_API_KEY in your environment to enable AI decomposition."
    );
  }

  const systemPrompt = `You are an expert technical product manager and software architect specializing in agile milestone decomposition.
Your goal is to break down software and technical projects into 3 to 6 logical, sequentially actionable milestones for verified freelancers.

RULES:
1. Decompose the project into between 3 and 6 milestones (inclusive).
2. Each milestone must have:
   - title: concise deliverable name (3-120 chars)
   - description: clear, actionable technical scope (min 10 chars)
   - skills_required: array of 1 to 5 relevant technical/design skills (lowercase)
   - acceptance_criteria: array of 2 to 5 concrete, verifiable evaluation checks
   - complexity: integer from 1 (very easy) to 5 (complex architecture)
   - estimated_hours: realistic development hours (e.g. 4, 8, 16)
   - reward_amount: suggested reward in INR (₹). The sum across all tasks MUST NOT exceed the client total budget of ₹${totalBudget}.
3. Respond ONLY with a valid JSON object matching the requested schema. No conversational preamble or trailing explanation.`;

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
      "reward_amount": 5000
    }
  ]
}`;

  const responseText = await callGemini(geminiKey, systemPrompt, userPrompt);

  // Parse and Zod-validate structure
  const rawTasks = extractAndValidateJson(responseText);

  // Independently clamp budget constraints mathematically
  const clampedTasks = clampMilestoneRewards(rawTasks, totalBudget);

  return clampedTasks;
}
