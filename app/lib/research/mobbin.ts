import Anthropic from "@anthropic-ai/sdk";

// Mobbin exposes a remote (Streamable HTTP) MCP server. We reach it from the
// server via the Claude Messages API MCP connector — a separate retrieval call,
// kept apart from the structured-report call so the two never conflict.
const MOBBIN_MCP_URL =
  process.env.MOBBIN_MCP_URL || "https://api.mobbin.com/mcp";

const KNOWLEDGE_NOTE =
  "Mobbin's live library is not connected for retrieval here. Draw on well-known, real public products in the relevant category, and name the specific apps and patterns so they can be verified in Mobbin.";

/** True when a Mobbin access token is configured for server-side use. */
export function mobbinLiveEnabled(): boolean {
  return Boolean(process.env.MOBBIN_MCP_TOKEN);
}

/**
 * Ask Claude to search Mobbin (via the MCP connector) for real flows/screens
 * relevant to the prompt, and return a concise, grounded digest with
 * mobbin.com URLs. Falls back to the knowledge note if disabled or on error.
 */
export async function retrieveMobbinContext(
  query: string,
): Promise<{ grounded: boolean; context: string }> {
  const token = process.env.MOBBIN_MCP_TOKEN;
  if (!token) return { grounded: false, context: KNOWLEDGE_NOTE };

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4000,
      betas: ["mcp-client-2025-11-20"],
      mcp_servers: [
        {
          type: "url",
          url: MOBBIN_MCP_URL,
          name: "mobbin",
          authorization_token: token,
        },
      ],
      tools: [{ type: "mcp_toolset", mcp_server_name: "mobbin" }],
      system:
        "You retrieve real UI references from Mobbin. Use the Mobbin tools to find flows and screens relevant to the user's product. Report ONLY what the tools actually return — never invent apps, patterns, or URLs. For each relevant result give: the app name, the pattern, a one-line takeaway, and its mobbin.com URL.",
      messages: [
        {
          role: "user",
          content: `Search Mobbin for real UI patterns relevant to this product/problem:\n"""${query}"""\n\nReturn 4-6 concrete patterns. For each: App — pattern — takeaway — mobbin.com URL.`,
        },
      ],
    });

    const text = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim();

    if (!text) return { grounded: false, context: KNOWLEDGE_NOTE };
    return {
      grounded: true,
      context: `Live Mobbin results (real flows/screens retrieved just now — use these apps and mobbin.com URLs, do not substitute your own):\n\n${text}`,
    };
  } catch (error) {
    console.error("Mobbin retrieval failed:", error);
    return {
      grounded: false,
      context: `${KNOWLEDGE_NOTE} (Live Mobbin retrieval was attempted but failed.)`,
    };
  }
}
