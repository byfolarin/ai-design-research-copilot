import type { SourceId } from "../mock-report";
import { figmaLiveEnabled, retrieveFigmaContext } from "./figma";
import { mobbinLiveEnabled, retrieveMobbinContext } from "./mobbin";

/**
 * Context sources the copilot can draw on. The copilot's job (per the product
 * spec) is to build a mental model of the product first, then decide which of
 * these sources actually serves the question — never assuming any one is
 * required.
 *
 * Each source advertises whether it can contribute live context in the current
 * environment. Today, Figma and Mobbin live data flow through MCP servers that
 * are attached to the Claude Code session, not to this web server — so their
 * `gather()` returns an honest "not connected for live retrieval" note and the
 * synthesis step reasons from the prompt + the model's knowledge of these
 * products, clearly labelling what was and wasn't grounded in live data.
 *
 * To make a source live, implement `gather()` against the real integration
 * (e.g. the Claude Messages API MCP connector, or a server-side MCP client) and
 * flip `available`.
 */
export type GatheredContext = {
  source: SourceId;
  /** True when this source contributed real, retrieved context. */
  grounded: boolean;
  /** Human-readable context handed to the synthesis prompt. */
  context: string;
};

export type ResearchInput = {
  prompt: string;
  figmaUrl?: string;
};

export interface ResearchSource {
  id: SourceId;
  label: string;
  /** Whether this source can contribute live, retrieved context right now. */
  isAvailable(input: ResearchInput): boolean;
  gather(input: ResearchInput): Promise<GatheredContext>;
}

const promptSource: ResearchSource = {
  id: "prompt",
  label: "User prompt",
  isAvailable: () => true,
  async gather({ prompt }) {
    return {
      source: "prompt",
      grounded: true,
      context: prompt.trim() || "(no prompt provided)",
    };
  },
};

const figmaSource: ResearchSource = {
  id: "figma",
  label: "Figma",
  // Live frame reading needs both a Figma token and a referenced file.
  isAvailable: ({ figmaUrl }) => figmaLiveEnabled() && Boolean(figmaUrl),
  async gather({ figmaUrl }) {
    if (!figmaUrl) {
      return {
        source: "figma",
        grounded: false,
        context:
          "No Figma file was provided. Reason about the product's design conceptually and recommend connecting a Figma file for frame-level UX observations.",
      };
    }
    const { grounded, context } = await retrieveFigmaContext(figmaUrl);
    return { source: "figma", grounded, context };
  },
};

const mobbinSource: ResearchSource = {
  id: "mobbin",
  label: "Mobbin",
  // Live when a Mobbin token is configured; otherwise the model reasons from
  // its knowledge of real products (see ./mobbin).
  isAvailable: () => mobbinLiveEnabled(),
  async gather({ prompt }) {
    const { grounded, context } = await retrieveMobbinContext(prompt);
    return { source: "mobbin", grounded, context };
  },
};

export const SOURCES: ResearchSource[] = [
  promptSource,
  figmaSource,
  mobbinSource,
];

/** Pull a Figma file/frame URL out of free-text, if present. */
export function extractFigmaUrl(text: string): string | undefined {
  const match = text.match(
    /https?:\/\/(?:www\.)?figma\.com\/[^\s)]+/i,
  );
  return match?.[0];
}

export async function gatherAll(
  input: ResearchInput,
): Promise<GatheredContext[]> {
  return Promise.all(SOURCES.map((s) => s.gather(input)));
}
