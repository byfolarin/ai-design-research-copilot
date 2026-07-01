# AI Product Research Copilot

**▶ Live demo: [ai-design-research-copilot.vercel.app](https://ai-design-research-copilot.vercel.app)**

Describe a product or design problem and get a synthesized research report —
product understanding, user journey, Mobbin-style patterns, Figma UX
observations, recommendations, and action items — rendered in a live sandbox.

> The live demo runs in sample mode (no API key) so it's free and safe to share.
> Add an `ANTHROPIC_API_KEY` to generate real reports — see [Modes](#modes) below.

A split-pane app: a chat panel on the left, a dotted node-canvas "sandbox" on
the right that fills with report panels you scroll through horizontally.

## Features

- **Reasoning-first pipeline** — builds a mental model of the product, then
  decides which sources (Figma, Mobbin, the prompt) actually serve the question.
- **Structured, typed reports** — product understanding, user journey, UX
  observations, real-world patterns, prioritized recommendations, action items.
- **Live data, optional** — pulls real Mobbin screens (with links) and reads
  real Figma frames when tokens are provided; reasons from knowledge otherwise.
- **Export & copy** — download any report as Markdown or copy it to the clipboard.
- **Light / dark**, keyboard-accessible, reduced-motion aware, and social-preview ready.

## How it works

1. You describe a product or design problem (optionally with a Figma link).
2. `POST /api/research` runs the copilot: it plans which sources to use, gathers
   context from each, then asks Claude (Opus 4.8, structured outputs) to
   synthesize a typed report.
3. The report streams into the sandbox as scrollable panels.

Sources are pluggable behind a small interface (`app/lib/research/`), so Figma
(REST API) and Mobbin (MCP connector) can be swapped or extended. With no API
key configured, everything gracefully falls back to a sample report.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Modes

- **Mock** (default): a sample report, so the app works with zero setup.
- **Live**: real reports written by Claude (Opus 4.8) about your prompt.

Turn on live mode by adding a key in `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### Optional live data sources

- **Mobbin** — paste a Mobbin access token as `MOBBIN_MCP_TOKEN` to pull real
  screens (with mobbin.com links) into reports.
- **Figma** — add a Figma personal access token as `FIGMA_TOKEN` and include a
  `figma.com/design/...` link in your prompt to ground UX observations in your
  real frames.

`.env.local` is git-ignored — your keys never get committed.

## Stack

Next.js 16 · React 19 · Tailwind v4 · Anthropic SDK.
