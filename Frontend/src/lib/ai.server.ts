const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.5-flash";

type Msg = { role: "system" | "user"; content: string };

/**
 * Calls the Lovable AI Gateway and forces a JSON response that matches the
 * supplied JSON schema (via tool calling). Returns the parsed object.
 */
export async function callStructuredAI<T>(
  messages: Msg[],
  toolName: string,
  parameters: Record<string, unknown>,
): Promise<T> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured for this project.");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: [{ type: "function", function: { name: toolName, parameters } }],
      tool_choice: { type: "function", function: { name: toolName } },
    }),
  });

  if (res.status === 429) throw new Error("AI rate limit reached. Please try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
  if (!res.ok) throw new Error(`AI request failed (${res.status}): ${await res.text()}`);

  const json = (await res.json()) as {
    choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
  };
  const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("AI returned an unexpected response.");
  return JSON.parse(args) as T;
}

export const syllabusSchema = {
  type: "object",
  properties: {
    subject: { type: "string", description: "Subject name exactly as written in the syllabus" },
    code: { type: "string", description: "Subject code if present, else empty string" },
    units: {
      type: "array",
      items: {
        type: "object",
        properties: {
          unitNumber: { type: "number" },
          title: { type: "string" },
          topics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                subtopics: { type: "array", items: { type: "string" } },
              },
              required: ["title", "subtopics"],
            },
          },
        },
        required: ["unitNumber", "title", "topics"],
      },
    },
  },
  required: ["subject", "code", "units"],
} as const;

export const lectureSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    learningObjectives: { type: "array", items: { type: "string" } },
    introduction: { type: "string" },
    conceptExplanation: { type: "string", description: "Detailed markdown-free explanation, multiple paragraphs" },
    importantPoints: { type: "array", items: { type: "string" } },
    examples: { type: "array", items: { type: "string" } },
    applications: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
    importantQuestions: { type: "array", items: { type: "string" } },
    syllabusGaps: {
      type: "string",
      description:
        "If the syllabus does not contain enough detail, state clearly what additional reference material the faculty should supply. Empty string when the syllabus was sufficient.",
    },
  },
  required: [
    "title",
    "learningObjectives",
    "introduction",
    "conceptExplanation",
    "importantPoints",
    "examples",
    "applications",
    "summary",
    "importantQuestions",
    "syllabusGaps",
  ],
} as const;

export const pptSchema = {
  type: "object",
  properties: {
    slides: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          points: { type: "array", items: { type: "string" } },
          notes: { type: "string", description: "Optional speaker notes" },
        },
        required: ["title", "points", "notes"],
      },
    },
  },
  required: ["slides"],
} as const;

export const GROUNDING_RULES = `You are an academic e-content assistant for university faculty.
Stay strictly grounded in the official syllabus context provided.
Never introduce topics that are outside the given unit and topic.
If the syllabus context lacks detail, say so explicitly in the syllabusGaps field instead of pretending the detail came from the syllabus.
Write in clear, formal, teachable language suitable for undergraduate lectures.`;
