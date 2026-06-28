# AI Product Research Copilot

**▶ Live demo: [ai-design-research-copilot.vercel.app](https://ai-design-research-copilot.vercel.app)**

Describe a product or design problem and get a synthesized research report —
product understanding, user journey, Mobbin-style patterns, Figma UX
observations, recommendations, and action items — rendered in a live sandbox.

> The live demo runs in sample mode (no API key) so it's free and safe to share.
> Add an `ANTHROPIC_API_KEY` to generate real reports — see [Modes](#modes) below.

A split-pane app: a chat panel on the left, a dotted node-canvas "sandbox" on
the right that fills with report panels you scroll through horizontally.

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
