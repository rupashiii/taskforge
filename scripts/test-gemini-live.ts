import * as fs from "fs";
import * as path from "path";

// Load .env.local manually for the script
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key && rest.length > 0) {
      process.env[key.trim()] = rest.join("=").trim();
    }
  }
}

const geminiKey = process.env.GEMINI_API_KEY;
console.log("Using Gemini API key exists:", Boolean(geminiKey));

async function testGeminiModels() {
  const models = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-3-flash-preview",
    "gemini-flash-latest"
  ];

  for (const model of models) {
    console.log(`\nTesting model: ${model}...`);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: "Hello, reply with JSON: {\"status\": \"ok\"}" }]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.log(`❌ Model ${model} returned ${res.status}: ${errorText.slice(0, 150)}`);
      } else {
        const data = await res.json();
        console.log(`✅ Model ${model} SUCCEEDED! Response:`, JSON.stringify(data.candidates?.[0]?.content?.parts?.[0]?.text));
      }
    } catch (e: any) {
      console.log(`❌ Model ${model} threw error:`, e.message);
    }
  }
}

testGeminiModels();
