import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { ReportBody } from "../mock-report";
import { gatherAll, type ResearchInput } from "./sources";

// Mirrors `ReportBody`. Structured outputs guarantee the shape comes back valid.
const ReportSchema = z.object({
  productUnderstanding: z
    .string()
    .describe("2-4 sentences modelling the product, its users, and the core tension."),
  userJourney: z
    .array(z.string())
    .describe("3-5 ordered journey stages, each 'Stage — what happens / the user's goal'."),
  executiveSummary: z
    .string()
    .describe("A tight paragraph: the strongest signal, distilled."),
  keyFindings: z.array(z.string()).describe("Exactly 3 punchy findings."),
  mobbin: z
    .array(
      z.object({
        app: z.string().describe("A real, verifiable product/app name."),
        pattern: z.string(),
        takeaway: z.string(),
        tags: z.array(z.string()),
        url: z
          .string()
          .optional()
          .describe(
            "The mobbin.com URL for this pattern. Include it ONLY when the Mobbin source provided live results — copy the URL exactly. Omit when reasoning from knowledge.",
          ),
      }),
    )
    .describe("3-4 patterns worth stealing from comparable real products."),
  figma: z
    .array(
      z.object({
        signal: z.string(),
        detail: z.string(),
        confidence: z.enum(["High", "Medium", "Emerging"]),
      }),
    )
    .describe(
      "3-4 UX observations. When Figma frames are not grounded, frame these as heuristic observations and use 'Emerging' confidence.",
    ),
  recommendations: z
    .array(
      z.object({
        title: z.string(),
        rationale: z.string(),
        impact: z.enum(["High", "Medium", "Low"]),
        effort: z.enum(["S", "M", "L"]),
      }),
    )
    .describe("3-4 recommendations, ordered by impact."),
  actionItems: z
    .array(
      z.object({
        task: z.string(),
        owner: z.string(),
        eta: z.string(),
      }),
    )
    .describe("3-4 concrete next steps."),
  sourcePlan: z.object({
    product: z.string().describe("What product or feature is being discussed."),
    problem: z.string().describe("The problem the user is trying to solve."),
    decisions: z
      .array(
        z.object({
          source: z.enum(["figma", "mobbin", "prompt"]),
          used: z.boolean(),
          rationale: z.string(),
        }),
      )
      .describe("One decision per source: whether it was used, and why."),
  }),
});

const SYSTEM = `You are an AI Product Research Copilot.

Your primary responsibility is to understand the user's design problem, not to search a specific tool. Before producing output, build a mental model:
1. What product or feature is being discussed?
2. What problem is the user trying to solve?
3. Which source provides the best context?

Source selection rules:
- If the user provides a Figma file/frame, treat it as their own design to analyze (flow, components, UX decisions).
- For inspiration, benchmarks, or competitor analysis, use Mobbin.
- If both are available, understand the user's design first, then enrich it with Mobbin comparisons.
- Never assume any source is required. Choose what actually serves the question, and record those choices in sourcePlan.

Honesty rules (important):
- A source is either "grounded" (live data was retrieved) or "not connected". Only claim to have read live Figma frames or Mobbin screens when that source is grounded.
- When a source is not connected, reason from your own knowledge, name specific real and verifiable products/patterns, and make clear (via confidence levels and rationale) what you would still verify against live data.
- When the Mobbin source is grounded, build the mobbin[] items strictly from the live results provided — use those exact apps and copy their mobbin.com URLs into the url field. Do not substitute apps you weren't given.
- When the Figma source is grounded, base the figma[] UX observations on the actual frame structure and copy provided (you may use "High"/"Medium" confidence); otherwise keep them heuristic with "Emerging" confidence.
- In sourcePlan.decisions, set used=true only for sources you actually leaned on.

Your goal is to build a mental model and generate insight, not merely retrieve screens. Be specific, concrete, and grounded in real product behaviour.`;

function buildUserMessage(input: ResearchInput, contextBlock: string): string {
  return `Research request:
"""
${input.prompt.trim()}
"""

Available context sources and what each can contribute right now:

${contextBlock}

Produce a full research report as structured output:
- productUnderstanding and userJourney first (your mental model)
- figma = UX observations, mobbin = relevant real-world patterns, executiveSummary + keyFindings = research findings
- recommendations (prioritized) and actionItems (concrete next steps)
- sourcePlan capturing the product, the problem, and your source decisions.`;
}

export function isLiveEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function runResearch(input: ResearchInput): Promise<ReportBody> {
  const client = new Anthropic();

  const gathered = await gatherAll(input);
  const contextBlock = gathered
    .map(
      (g) =>
        `### ${g.source}${g.grounded ? " (grounded — live context)" : " (not connected — reason carefully)"}\n${g.context}`,
    )
    .join("\n\n");

  const response = await client.messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: zodOutputFormat(ReportSchema),
    },
    system: SYSTEM,
    messages: [{ role: "user", content: buildUserMessage(input, contextBlock) }],
  });

  if (!response.parsed_output) {
    throw new Error("Copilot returned no structured output");
  }
  return response.parsed_output as ReportBody;
}
