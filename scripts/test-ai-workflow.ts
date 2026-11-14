import {
  clampMilestoneRewards,
  extractAndValidateJson,
  decomposeProjectWithAI,
} from "../lib/ai/decompose";
import { MilestoneTask } from "../lib/ai/schema";

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
    },
    {
      title: "Backend API",
      description: "Build REST endpoints for auth and tasks",
      skills_required: ["node", "postgres"],
      acceptance_criteria: ["Unit tests passing", "Endpoints documented"],
      complexity: 4,
      estimated_hours: 20,
      reward_amount: 35000,
    },
    {
      title: "Integration & Testing",
      description: "End to end integration and deployment",
      skills_required: ["react", "nextjs"],
      acceptance_criteria: ["Deployed on Vercel", "Zero console errors"],
      complexity: 4,
      estimated_hours: 15,
      reward_amount: 20000,
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
      "reward_amount": 12000
    },
    {
      "title": "API Layer Implementation",
      "description": "Implement Server Actions and REST API endpoints",
      "skills_required": ["nextjs", "typescript"],
      "acceptance_criteria": ["Input validated with Zod", "Error handling in place"],
      "complexity": 3,
      "estimated_hours": 16,
      "reward_amount": 16000
    },
    {
      "title": "Frontend UI & State",
      "description": "Construct reactive client dashboard with Tailwind",
      "skills_required": ["react", "tailwind"],
      "acceptance_criteria": ["Responsive on mobile", "Dark mode supported"],
      "complexity": 3,
      "estimated_hours": 12,
      "reward_amount": 12000
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

  console.log("\n🎉 ALL 5 TEST SUITES PASSED PERFECTLY!\n");
}

runTests().catch((e) => {
  console.error("Test runner failed:", e);
  process.exit(1);
});
