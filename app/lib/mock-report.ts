export type ReportMeta = {
  label: string;
  value: string;
};

export type MobbinItem = {
  app: string;
  pattern: string;
  takeaway: string;
  tags: string[];
  /** Real mobbin.com link, present when grounded in live Mobbin data. */
  url?: string;
};

export type FigmaInsight = {
  signal: string;
  detail: string;
  confidence: "High" | "Medium" | "Emerging";
};

export type Recommendation = {
  title: string;
  rationale: string;
  impact: "High" | "Medium" | "Low";
  effort: "S" | "M" | "L";
};

export type ActionItem = {
  task: string;
  owner: string;
  eta: string;
};

export type SourceId = "figma" | "mobbin" | "prompt";

export type SourceDecision = {
  source: SourceId;
  used: boolean;
  rationale: string;
};

export type SourcePlan = {
  product: string;
  problem: string;
  decisions: SourceDecision[];
};

// The content fields the copilot reasons about — shared by the live pipeline
// and the mock fallback. The route attaches `query`, `generatedAt`, `meta`,
// and `mode` around this.
export type ReportBody = {
  productUnderstanding: string;
  userJourney: string[];
  executiveSummary: string;
  keyFindings: string[];
  mobbin: MobbinItem[];
  figma: FigmaInsight[];
  recommendations: Recommendation[];
  actionItems: ActionItem[];
  sourcePlan: SourcePlan;
};

export type ResearchReport = ReportBody & {
  query: string;
  generatedAt: string;
  meta: ReportMeta[];
  mode: "live" | "mock";
};

// Deterministic mock — used when ANTHROPIC_API_KEY isn't configured, or as a
// fallback if the live pipeline fails. Lightly personalized off the prompt.
export function buildMockReport(
  prompt: string,
  figmaUrl?: string,
): ResearchReport {
  const query = prompt.trim() || "Onboarding for a fintech mobile app";

  return {
    query,
    mode: "mock",
    generatedAt: new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    meta: [
      { label: "Mode", value: "Mock" },
      { label: "Sources", value: figmaUrl ? "Figma · Mobbin" : "Mobbin" },
      { label: "Patterns", value: "4" },
      { label: "Recommendations", value: "4" },
    ],
    productUnderstanding:
      "A consumer fintech onboarding flow whose job is to turn a curious visitor into an activated, verified account holder. The core tension is trust versus momentum: the product must collect sensitive identity information while keeping the user moving.",
    userJourney: [
      "Discover — land on a value-led intro that frames the payoff",
      "Commit — opt in and start a low-friction, one-thing-per-screen flow",
      "Verify — clear the KYC / identity step with visible progress and reassurance",
      "Activate — reach a first tangible 'aha' (funded account, first insight)",
    ],
    sourcePlan: {
      product: "Consumer fintech mobile onboarding",
      problem:
        "Reduce drop-off at sign-up and identity verification without eroding trust",
      decisions: [
        {
          source: "prompt",
          used: true,
          rationale:
            "The prompt defines the product and the problem to anchor the analysis.",
        },
        {
          source: "figma",
          used: Boolean(figmaUrl),
          rationale: figmaUrl
            ? "A Figma file was referenced — frame-level UX observations would be drawn from it."
            : "No Figma file was provided, so the design is reasoned about conceptually.",
        },
        {
          source: "mobbin",
          used: true,
          rationale:
            "Mobbin patterns from comparable fintech apps benchmark the flow against the market.",
        },
      ],
    },
    executiveSummary:
      "The strongest products in this space treat onboarding as a guided value-discovery moment rather than a form to complete. Across the cohort, the winning pattern is a progressive, three-step flow that defers account creation until after the user has felt a tangible benefit. Friction concentrates at identity verification and permission prompts — and that's precisely where the best teams invest in motion, micro-copy, and trust signals to keep momentum high.",
    keyFindings: [
      "Deferred sign-up lifts activation by ~24% versus gate-first flows.",
      "Progress indicators reduce drop-off at the KYC step by a third.",
      "Single-purpose screens outperform dense multi-field forms 3:1.",
    ],
    mobbin: [
      {
        app: "Revolut",
        pattern: "Animated value carousel before sign-up",
        takeaway:
          "Leads with outcome screens (savings, spend insights) so users opt in already convinced of the payoff.",
        tags: ["Onboarding", "Motion", "Fintech"],
      },
      {
        app: "Cash App",
        pattern: "Single-field, one-thing-per-screen flow",
        takeaway:
          "Each step asks for exactly one input with a giant tap target — perceived effort stays near zero.",
        tags: ["Forms", "Minimalism"],
      },
      {
        app: "Monzo",
        pattern: "Inline trust + progress scaffolding",
        takeaway:
          "Pairs every sensitive request with a plain-language 'why we ask' note and a persistent progress bar.",
        tags: ["Trust", "KYC", "Copy"],
      },
      {
        app: "Wise",
        pattern: "Live fee transparency widget",
        takeaway:
          "Surfaces the real cost in real time, converting a moment of doubt into a moment of confidence.",
        tags: ["Transparency", "Conversion"],
      },
    ],
    figma: [
      {
        signal: "Spacing system drift",
        detail:
          "Three competing spacing scales detected across the explored frames. Consolidating to a 4pt base would remove visible rhythm breaks on the review screen.",
        confidence: "High",
      },
      {
        signal: "Primary CTA contrast",
        detail:
          "The dominant CTA sits at 3.9:1 against its surface — below AA. A one-step darkening of the accent restores compliance without a palette change.",
        confidence: "High",
      },
      {
        signal: "Component variant sprawl",
        detail:
          "The button component carries 14 variants, 5 of them near-duplicates. Merging them would shrink the library and speed hand-off.",
        confidence: "Medium",
      },
      {
        signal: "Emerging dark-mode tokens",
        detail:
          "Half the screens reference dark surfaces with no matching token set yet — a theming gap worth closing before scale.",
        confidence: "Emerging",
      },
    ],
    recommendations: [
      {
        title: "Defer account creation to step 3",
        rationale:
          "Let users feel the core value first; ask for credentials only once intent is established.",
        impact: "High",
        effort: "M",
      },
      {
        title: "Add a persistent progress bar through KYC",
        rationale:
          "Set expectations and reduce abandonment at the highest-friction moment in the funnel.",
        impact: "High",
        effort: "S",
      },
      {
        title: "Collapse forms to one input per screen",
        rationale:
          "Lower perceived effort and improve completion on small viewports.",
        impact: "Medium",
        effort: "M",
      },
      {
        title: "Pair every permission with a 'why' line",
        rationale:
          "In-context justification consistently outperforms generic system prompts on opt-in rate.",
        impact: "Medium",
        effort: "S",
      },
    ],
    actionItems: [
      { task: "Prototype the deferred sign-up flow", owner: "Design", eta: "This week" },
      { task: "Run a 5-user moderated test on KYC", owner: "Research", eta: "Next week" },
      { task: "Fix primary CTA contrast to AA", owner: "Design Systems", eta: "2 days" },
      { task: "Spec progress-bar component states", owner: "Product", eta: "This sprint" },
    ],
  };
}
