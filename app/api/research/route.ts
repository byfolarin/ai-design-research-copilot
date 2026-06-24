import type { ResearchReport } from "../../lib/mock-report";
import { buildMockReport } from "../../lib/mock-report";
import { isLiveEnabled, runResearch } from "../../lib/research/copilot";
import { extractFigmaUrl } from "../../lib/research/sources";

export const runtime = "nodejs";
export const maxDuration = 60;

function generatedAt(): string {
  return new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function POST(request: Request): Promise<Response> {
  let prompt = "";
  let figmaUrl: string | undefined;

  try {
    const body = (await request.json()) as {
      prompt?: unknown;
      figmaUrl?: unknown;
    };
    prompt = typeof body.prompt === "string" ? body.prompt : "";
    figmaUrl =
      typeof body.figmaUrl === "string" && body.figmaUrl
        ? body.figmaUrl
        : extractFigmaUrl(prompt);
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!prompt.trim()) {
    return Response.json({ error: "A prompt is required" }, { status: 400 });
  }

  // No key configured → honest mock so the experience still works end-to-end.
  if (!isLiveEnabled()) {
    return Response.json(buildMockReport(prompt, figmaUrl));
  }

  try {
    const body = await runResearch({ prompt, figmaUrl });

    const usedSources = body.sourcePlan.decisions
      .filter((d) => d.used)
      .map((d) => d.source);

    const report: ResearchReport = {
      ...body,
      query: prompt.trim(),
      mode: "live",
      generatedAt: generatedAt(),
      meta: [
        { label: "Mode", value: "Live · Opus 4.8" },
        {
          label: "Sources",
          value: usedSources.length ? usedSources.join(" · ") : "—",
        },
        { label: "Patterns", value: String(body.mobbin.length) },
        { label: "Recommendations", value: String(body.recommendations.length) },
      ],
    };
    return Response.json(report);
  } catch (error) {
    // Fail soft: return the mock with a notice rather than breaking the UI.
    console.error("Research pipeline failed:", error);
    const fallback = buildMockReport(prompt, figmaUrl);
    return Response.json({
      ...fallback,
      meta: [{ label: "Mode", value: "Mock (live failed)" }, ...fallback.meta.slice(1)],
    });
  }
}
