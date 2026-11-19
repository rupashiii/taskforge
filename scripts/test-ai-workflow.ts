import {
  clampMilestoneRewards,
  extractAndValidateJson,
  decomposeProjectWithAI,
} from "../lib/ai/decompose";
import { MilestoneTask } from "../lib/ai/schema";
import {
  computeSchedule,
  parseProjectDeadline,
  validateSchedule,
} from "../lib/ai/scheduler";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ ${message}`);
  }
}

async function runTests() {
  console.log("\n🧪 RUNNING AI WORKFLOW VERIFICATION TEST SUITE\n");

  // -------------------------------------------------------------
  // Test 1: Budget Overflow Clamp (Zero reliance on LLM arithmetic)
  // -------------------------------------------------------------
  console.log("--- Test 1: Budget Overflow Clamp ---");
  const overflowTasks: MilestoneTask[] = [
    {
      title: "UI Design",
      description: "Design high fidelity wireframes and prototype",
      skills_required: ["figma", "ui"],
      acceptance_criteria: ["Mobile and desktop views", "Interactive prototype"],
      complexity: 3,
      estimated_hours: 10,
      reward_amount: 25000,
      depends_on_indices: [],
    },
    {
      title: "Backend API",
      description: "Build REST endpoints for auth and tasks",
      skills_required: ["node", "postgres"],
      acceptance_criteria: ["Unit tests passing", "Endpoints documented"],
      complexity: 4,
      estimated_hours: 20,
      reward_amount: 35000,
      depends_on_indices: [],
    },
    {
      title: "Integration & Testing",
      description: "End to end integration and deployment",
      skills_required: ["react", "nextjs"],
      acceptance_criteria: ["Deployed on Vercel", "Zero console errors"],
      complexity: 4,
      estimated_hours: 15,
      reward_amount: 20000,
      depends_on_indices: [0, 1],
    },
  ];

  // Total is 25000 + 35000 + 20000 = 80000. Target budget is 50000.
  const budget = 50000;
  const clamped = clampMilestoneRewards(overflowTasks, budget);
  const clampedTotal = clamped.reduce((sum, t) => sum + t.reward_amount, 0);

  assert(
    clampedTotal <= budget,
    `Clamped total (${clampedTotal}) does not exceed budget (${budget})`
  );
  assert(
    clampedTotal === budget,
    `Clamped total exactly equals the budget after integer remainder distribution (${clampedTotal} === ${budget})`
  );
  assert(
    clamped.every((t) => Number.isInteger(t.reward_amount) && t.reward_amount > 0),
    "All clamped rewards are positive integers"
  );

  // -------------------------------------------------------------
  // Test 2: Valid JSON inside Markdown Code Blocks
  // -------------------------------------------------------------
  console.log("\n--- Test 2: Markdown Code Block Extraction & Zod Parse ---");
  const mockValidJson = `\`\`\`json
{
  "tasks": [
    {
      "title": "Database Architecture",
      "description": "Design PostgreSQL relational schema and write migrations",
      "skills_required": ["postgresql", "database"],
      "acceptance_criteria": ["All FK constraints in place", "RLS policies implemented"],
      "complexity": 4,
      "estimated_hours": 12,
      "reward_amount": 12000,
      "depends_on_indices": []
    },
    {
      "title": "API Layer Implementation",
      "description": "Implement Server Actions and REST API endpoints",
      "skills_required": ["nextjs", "typescript"],
      "acceptance_criteria": ["Input validated with Zod", "Error handling in place"],
      "complexity": 3,
      "estimated_hours": 16,
      "reward_amount": 16000,
      "depends_on_indices": [0]
    },
    {
      "title": "Frontend UI & State",
      "description": "Construct reactive client dashboard with Tailwind",
      "skills_required": ["react", "tailwind"],
      "acceptance_criteria": ["Responsive on mobile", "Dark mode supported"],
      "complexity": 3,
      "estimated_hours": 12,
      "reward_amount": 12000,
      "depends_on_indices": [1]
    }
  ]
}
\`\`\``;

  const parsedValid = extractAndValidateJson(mockValidJson);
  assert(
    parsedValid.length === 3,
    `Successfully extracted 3 tasks from markdown JSON block`
  );
  assert(
    parsedValid[0].title === "Database Architecture",
    `Task titles parsed correctly: "${parsedValid[0].title}"`
  );
  assert(
    Array.isArray(parsedValid[1].depends_on_indices) && parsedValid[1].depends_on_indices[0] === 0,
    `Dependencies parsed correctly: task 1 depends on [0]`
  );

  // -------------------------------------------------------------
  // Test 3: Invalid AI JSON Rejection
  // -------------------------------------------------------------
  console.log("\n--- Test 3: Invalid JSON Syntax Handling ---");
  const invalidJson = `Here is the breakdown: { "tasks": [ broken json ...`;
  let syntaxErrorCaught = false;
  try {
    extractAndValidateJson(invalidJson);
  } catch (err: any) {
    syntaxErrorCaught = true;
    assert(
      err.message.includes("could not be parsed as valid JSON"),
      `Proper syntax error caught: "${err.message}"`
    );
  }
  assert(syntaxErrorCaught, "Syntax error was successfully detected and prevented");

  // -------------------------------------------------------------
  // Test 4: Invalid Schema Structure (Fewer than 3 tasks)
  // -------------------------------------------------------------
  console.log("\n--- Test 4: Zod Schema Constraint Violations ---");
  const tooFewTasksJson = JSON.stringify({
    tasks: [
      {
        title: "Only Task",
        description: "This is too few tasks",
        skills_required: ["skills"],
        acceptance_criteria: ["Criteria 1", "Criteria 2"],
        complexity: 2,
        estimated_hours: 5,
        reward_amount: 5000,
        depends_on_indices: [],
      },
    ],
  });

  let schemaErrorCaught = false;
  try {
    extractAndValidateJson(tooFewTasksJson);
  } catch (err: any) {
    schemaErrorCaught = true;
    assert(
      err.message.includes("AI must produce at least 3 milestones"),
      `Schema validation caught invalid milestone count: "${err.message}"`
    );
  }
  assert(schemaErrorCaught, "Schema constraint was enforced by Zod");

  // -------------------------------------------------------------
  // Test 5: Missing API Key Guard
  // -------------------------------------------------------------
  console.log("\n--- Test 5: Missing / Empty API Key Guard ---");
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  let apiKeyErrorCaught = false;
  try {
    await decomposeProjectWithAI({
      title: "Test",
      description: "Test description at least 30 characters long",
      totalBudget: 10000,
    });
  } catch (err: any) {
    apiKeyErrorCaught = true;
    assert(
      err.message.includes("AI API key is not configured"),
      `Missing API key caught with clear guidance: "${err.message}"`
    );
  }
  assert(apiKeyErrorCaught, "API key guard safely prevented unauthenticated call");

  if (originalKey) {
    process.env.GEMINI_API_KEY = originalKey;
  }

  // -------------------------------------------------------------
  // Test 6: Scheduler — Deadline Computation with Dependencies
  // -------------------------------------------------------------
  console.log("\n--- Test 6: Scheduler — Dependency-aware Deadline Scheduling ---");

  const scheduleTasks: MilestoneTask[] = [
    {
      title: "Design",
      description: "UI/UX design and wireframing",
      skills_required: ["figma"],
      acceptance_criteria: ["Mockups approved", "Design system docs"],
      complexity: 2,
      estimated_hours: 12,
      reward_amount: 5000,
      depends_on_indices: [], // independent — starts day 0
    },
    {
      title: "Backend API",
      description: "REST API with auth and database",
      skills_required: ["node"],
      acceptance_criteria: ["Tests passing", "Docs ready"],
      complexity: 4,
      estimated_hours: 24,
      reward_amount: 10000,
      depends_on_indices: [], // independent — starts day 0 (parallel with Design)
    },
    {
      title: "Frontend",
      description: "React frontend connected to API",
      skills_required: ["react"],
      acceptance_criteria: ["Responsive UI", "API integrated"],
      complexity: 3,
      estimated_hours: 18,
      reward_amount: 8000,
      depends_on_indices: [0, 1], // depends on both Design and Backend
    },
  ];

  // Schedule with no project deadline
  const scheduledNoDeadline = computeSchedule(scheduleTasks, null);

  assert(
    scheduledNoDeadline.length === 3,
    `Scheduler produced 3 scheduled milestones`
  );
  assert(
    scheduledNoDeadline.every((t) => !!t.deadline),
    `All milestones have a deadline assigned`
  );

  // Design and Backend should start at same offset (parallel)
  assert(
    scheduledNoDeadline[0]._startOffset === 0 && scheduledNoDeadline[1]._startOffset === 0,
    `Independent tasks (Design, Backend) start at offset 0 (parallel): [${scheduledNoDeadline[0]._startOffset}, ${scheduledNoDeadline[1]._startOffset}]`
  );

  // Frontend should start after the longer of Design/Backend + review buffer
  assert(
    scheduledNoDeadline[2]._startOffset > 0,
    `Dependent task (Frontend) starts after predecessors: offset=${scheduledNoDeadline[2]._startOffset}`
  );

  // Deadlines should be chronologically ordered for dependent chain
  assert(
    scheduledNoDeadline[2].deadline >= scheduledNoDeadline[0].deadline &&
    scheduledNoDeadline[2].deadline >= scheduledNoDeadline[1].deadline,
    `Dependent task deadline (${scheduledNoDeadline[2].deadline}) >= predecessor deadlines (${scheduledNoDeadline[0].deadline}, ${scheduledNoDeadline[1].deadline})`
  );

  // Schedule with a tight project deadline (14 days from now)
  const tightDeadline = new Date();
  tightDeadline.setDate(tightDeadline.getDate() + 14);
  const scheduledTight = computeSchedule(scheduleTasks, tightDeadline);

  assert(
    scheduledTight.every((t) => t.deadline <= tightDeadline.toISOString().slice(0, 10)),
    `All milestones fit within 14-day project deadline`
  );

  const validationResult = validateSchedule(scheduledTight, tightDeadline);
  assert(
    validationResult === null,
    `Schedule validation passes with tight deadline`
  );

  // -------------------------------------------------------------
  // Test 7: Timeline Parser
  // -------------------------------------------------------------
  console.log("\n--- Test 7: Project Timeline Parsing ---");

  const dl1 = parseProjectDeadline("Some description\n\n[Project Timeline / Deadline: 2 weeks]");
  assert(dl1 !== null, `Parsed "2 weeks" timeline`);
  const diffDays1 = Math.round(((dl1 as Date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  assert(diffDays1 >= 13 && diffDays1 <= 15, `"2 weeks" resolves to ~14 days from now: ${diffDays1} days`);

  const dl2 = parseProjectDeadline("Desc\n\n[Project Timeline / Deadline: 30 days]");
  assert(dl2 !== null, `Parsed "30 days" timeline`);
  const diffDays2 = Math.round(((dl2 as Date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  assert(diffDays2 >= 29 && diffDays2 <= 31, `"30 days" resolves to ~30 days: ${diffDays2} days`);

  const dl3 = parseProjectDeadline("No timeline tag here");
  assert(dl3 === null, `Returns null when no timeline tag is present`);

  console.log("\n🎉 ALL 7 TEST SUITES PASSED PERFECTLY!\n");
}

runTests().catch((e) => {
  console.error("Test runner failed:", e);
  process.exit(1);
});
