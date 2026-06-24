// Live Figma frame reading via the official Figma REST API.
//
// Why REST and not the MCP connector (like Mobbin): the Figma connection in the
// Claude client is the official Figma *plugin* (a local desktop server), which a
// web server can't reach. Figma's REST API is the server-friendly door — a
// Personal Access Token (Figma → Settings → Security → Personal access tokens)
// plus plain HTTPS reads of the referenced file/frame.

const FIGMA_API = "https://api.figma.com/v1";

type FigmaNode = {
  id?: string;
  name?: string;
  type?: string;
  characters?: string;
  children?: FigmaNode[];
};

/** True when a Figma personal access token is configured. */
export function figmaLiveEnabled(): boolean {
  return Boolean(process.env.FIGMA_TOKEN);
}

/** Pull the file key (and optional frame node-id) out of a Figma URL. */
export function parseFigmaTarget(
  url: string,
): { fileKey: string; nodeId?: string } | null {
  const keyMatch = url.match(
    /figma\.com\/(?:file|design|proto|board)\/([A-Za-z0-9]+)/i,
  );
  if (!keyMatch) return null;
  const nodeMatch = url.match(/[?&]node-id=([^&]+)/i);
  // URLs encode node ids as "1-2" or "1%3A2"; the API expects "1:2".
  const nodeId = nodeMatch
    ? decodeURIComponent(nodeMatch[1]).replace(/-/g, ":")
    : undefined;
  return { fileKey: keyMatch[1], nodeId };
}

function summarize(roots: FigmaNode[], fileName?: string): string {
  const lines: string[] = [];
  let budget = 120; // cap output size

  const walk = (node: FigmaNode | undefined, depth: number) => {
    if (!node || budget <= 0 || depth > 6) return;
    const indent = "  ".repeat(depth);
    let label = `${indent}- ${node.type ?? "NODE"}: ${node.name ?? ""}`.trimEnd();
    if (node.type === "TEXT" && node.characters) {
      label += ` — "${node.characters.replace(/\s+/g, " ").slice(0, 90)}"`;
    }
    lines.push(label);
    budget -= 1;
    if (Array.isArray(node.children)) {
      for (const child of node.children) walk(child, depth + 1);
    }
  };

  for (const root of roots) walk(root, 0);
  const header = fileName ? `File: ${fileName}\n` : "";
  return (header + lines.join("\n")).slice(0, 6000);
}

/**
 * Read the referenced Figma file/frame and return a concise, grounded outline
 * of its structure and copy. Falls back to a conceptual note if no token, no
 * usable URL, or on error.
 */
export async function retrieveFigmaContext(
  figmaUrl: string,
): Promise<{ grounded: boolean; context: string }> {
  const token = process.env.FIGMA_TOKEN;
  if (!token) {
    return {
      grounded: false,
      context: `The user referenced a Figma file (${figmaUrl}), but live frame reading is not connected. Treat it as their own design under review: infer likely flow, components, and UX decisions, flag what you would verify against the real frames, and recommend connecting Figma for grounded analysis.`,
    };
  }

  const target = parseFigmaTarget(figmaUrl);
  if (!target) {
    return {
      grounded: false,
      context: `A Figma link was provided but its file key couldn't be parsed (${figmaUrl}). Reason conceptually and ask the user for a standard figma.com/design/<key> link.`,
    };
  }

  try {
    const url = target.nodeId
      ? `${FIGMA_API}/files/${target.fileKey}/nodes?ids=${encodeURIComponent(target.nodeId)}&depth=4`
      : `${FIGMA_API}/files/${target.fileKey}?depth=3`;

    const res = await fetch(url, { headers: { "X-Figma-Token": token } });
    if (!res.ok) {
      return {
        grounded: false,
        context: `Live Figma read failed (HTTP ${res.status}). Reason about the design conceptually; the token may lack access to this file.`,
      };
    }

    const json = (await res.json()) as {
      name?: string;
      document?: FigmaNode;
      nodes?: Record<string, { document?: FigmaNode }>;
    };

    const roots: FigmaNode[] = target.nodeId
      ? Object.values(json.nodes ?? {})
          .map((n) => n.document)
          .filter((n): n is FigmaNode => Boolean(n))
      : json.document
        ? [json.document]
        : [];

    if (roots.length === 0) {
      return {
        grounded: false,
        context: "The Figma file returned no readable frames. Reason conceptually.",
      };
    }

    return {
      grounded: true,
      context: `Live Figma frames (read just now via the Figma API). Base your UX observations on this actual structure and copy:\n\n${summarize(roots, json.name)}`,
    };
  } catch (error) {
    console.error("Figma retrieval failed:", error);
    return {
      grounded: false,
      context:
        "A live Figma read was attempted but failed. Reason about the design conceptually.",
    };
  }
}
