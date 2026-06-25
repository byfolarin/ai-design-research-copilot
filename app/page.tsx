"use client";

import { useEffect, useRef, useState } from "react";
import {
  type ResearchReport,
  type FigmaInsight,
  type Recommendation,
} from "./lib/mock-report";

type Phase = "idle" | "loading" | "done";
type ChatMessage = { id: number; role: "user" | "assistant"; content: string };

const SAMPLE_PROMPTS = [
  "Onboarding for a fintech mobile app",
  "Checkout flow for a DTC brand",
  "AI assistant settings & permissions",
  "B2B analytics dashboard",
];

const LOADING_STEPS = [
  "Scanning Mobbin flows",
  "Reading Figma frames",
  "Clustering UX patterns",
  "Drafting recommendations",
];

let msgId = 0;

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== "loading") return;
    const stepTimer = setInterval(() => {
      setActiveStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 700);
    return () => clearInterval(stepTimer);
  }, [phase]);

  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, phase]);

  async function runResearch() {
    const trimmed = prompt.trim();
    if (phase === "loading" || trimmed.length === 0) return;
    setMessages((m) => [
      ...m,
      { id: msgId++, role: "user", content: trimmed },
    ]);
    setPrompt("");
    setReport(null);
    setActiveStep(0);
    setPhase("loading");

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.error ?? `Request failed (${res.status})`);
      }
      const next = (await res.json()) as ResearchReport;
      const usedSources = next.sourcePlan.decisions
        .filter((d) => d.used)
        .map((d) => d.source);
      setReport(next);
      setMessages((m) => [
        ...m,
        {
          id: msgId++,
          role: "assistant",
          content:
            next.mode === "live"
              ? `Here's your research report on “${next.query}.” I built a mental model first, then drew on ${usedSources.join(" + ")} — ${next.recommendations.length} prioritized recommendations are in the sandbox.`
              : `Here's a sample report on “${next.query}.” Set ANTHROPIC_API_KEY to generate live, reasoned reports. The structure and ${next.recommendations.length} recommendations are in the sandbox.`,
        },
      ]);
      setPhase("done");
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          id: msgId++,
          role: "assistant",
          content: `I couldn't generate the report — ${(err as Error).message}. Try again in a moment.`,
        },
      ]);
      setPhase("idle");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      runResearch();
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden lg:flex-row">
      {/* ---------------------- LEFT: chat panel ---------------------- */}
      <aside className="flex h-[52vh] w-full shrink-0 flex-col border-b border-line bg-paper lg:h-screen lg:w-[420px] lg:border-b-0 lg:border-r">
        <ChatHeader />

        <div
          ref={threadRef}
          className="flex-1 overflow-y-auto px-4 py-5"
        >
          {empty ? (
            <EmptyThread onPick={setPrompt} />
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((m) => (
                <ChatBubble key={m.id} message={m} />
              ))}
              {phase === "loading" && <WorkingBubble />}
            </div>
          )}
        </div>

        <Composer
          prompt={prompt}
          setPrompt={setPrompt}
          phase={phase}
          onRun={runResearch}
          onKeyDown={handleKeyDown}
        />
      </aside>

      {/* ---------------------- RIGHT: sandbox ----------------------- */}
      <main className="dot-grid relative flex h-[48vh] min-w-0 flex-1 flex-col lg:h-screen">
        <SandboxChrome report={report} />

        <div className="relative z-10 min-h-0 min-w-0 flex-1">
          {phase === "done" && report ? (
            <ReportView report={report} />
          ) : phase === "loading" ? (
            <SandboxLoading activeStep={activeStep} />
          ) : (
            <SandboxEmpty />
          )}
        </div>
      </main>
    </div>
  );
}

/* --------------------------- Left panel ---------------------------- */

function ChatHeader() {
  return (
    <header className="flex items-center justify-between border-b border-line px-4 py-3.5">
      <div className="flex items-center gap-2.5">
        <Logo />
        <div className="leading-tight">
          <div className="text-[14px] font-semibold tracking-tight text-ink">
            Research Copilot
          </div>
          <div className="text-[11px] text-ink-faint">AI Product Research</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1 text-[11px] text-ink-muted sm:flex">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Connected
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}

function Logo() {
  return (
    <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-accent shadow-sm">
      <SparkIcon className="h-[18px] w-[18px] text-white" />
    </div>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(() =>
    typeof document === "undefined"
      ? true
      : document.documentElement.classList.contains("dark"),
  );

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      suppressHydrationWarning
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className="grid h-8 w-8 place-items-center rounded-full border border-line bg-paper text-ink-muted transition hover:border-line-strong hover:text-ink"
    >
      {dark ? (
        <SunIcon className="h-[18px] w-[18px]" />
      ) : (
        <MoonIcon className="h-[18px] w-[18px]" />
      )}
    </button>
  );
}

function EmptyThread({ onPick }: { onPick: (v: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-2 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft">
        <SparkIcon className="h-6 w-6 text-accent" />
      </div>
      <h1 className="serif text-2xl font-normal leading-snug tracking-tight text-ink">
        What are you{" "}
        <span className="serif text-accent">researching</span>?
      </h1>
      <p className="mt-2 max-w-[16rem] text-[13px] leading-6 text-ink-muted">
        Describe a flow or product. Your synthesized report renders in the
        sandbox.
      </p>

      <div className="mt-6 flex w-full flex-col gap-2">
        {SAMPLE_PROMPTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="group flex items-center gap-2.5 rounded-xl border border-line bg-paper px-3.5 py-2.5 text-left text-[13px] text-ink-muted transition hover:border-line-strong hover:text-ink"
          >
            <SparkIcon className="h-3.5 w-3.5 shrink-0 text-ink-faint transition group-hover:text-accent" />
            <span className="flex-1">{s}</span>
            <ArrowIcon className="h-3.5 w-3.5 text-ink-faint opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-3.5 py-2.5 text-[14px] leading-6 text-white shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent-soft">
        <SparkIcon className="h-4 w-4 text-accent" />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-line bg-cream/60 px-3.5 py-2.5 text-[14px] leading-6 text-ink">
        {message.content}
      </div>
    </div>
  );
}

function WorkingBubble() {
  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent-soft">
        <Spinner small accent />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-line bg-cream/60 px-3.5 py-3 text-[14px] text-ink-muted">
        <span className="font-medium text-ink-muted">Researching</span>
        <Dots />
      </div>
    </div>
  );
}

function Dots() {
  return (
    <span className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

function Composer({
  prompt,
  setPrompt,
  phase,
  onRun,
  onKeyDown,
}: {
  prompt: string;
  setPrompt: (v: string) => void;
  phase: Phase;
  onRun: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  const loading = phase === "loading";
  const disabled = loading || prompt.trim().length === 0;

  return (
    <div className="border-t border-line p-3">
      <div className="card rounded-[20px] p-2 transition focus-within:border-line-strong focus-within:shadow-[0_2px_4px_rgba(40,38,31,0.05),0_12px_30px_-14px_rgba(201,100,66,0.3)]">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder="Ask the copilot to research a product experience…"
          className="block max-h-40 w-full resize-none bg-transparent px-2.5 pt-1.5 text-[15px] leading-6 text-ink placeholder:text-ink-faint focus:outline-none"
        />
        <div className="flex items-center justify-between gap-2 px-1 pt-1">
          <div className="flex items-center gap-1.5">
            <ToolPill
              icon={<DeepIcon className="h-3.5 w-3.5" />}
              label="Deep research"
              active
            />
          </div>
          <div className="flex items-center gap-2">
            <kbd className="hidden rounded border border-line bg-cream px-1.5 py-0.5 font-mono text-[10px] text-ink-muted sm:inline">
              ⌘↵
            </kbd>
            <button
              type="button"
              onClick={onRun}
              disabled={disabled}
              aria-label="Run research"
              className="grid h-9 w-9 place-items-center rounded-full bg-accent text-white shadow-sm transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:bg-ink-faint/40 disabled:text-white/70"
            >
              {loading ? (
                <Spinner small />
              ) : (
                <ArrowUpIcon className="h-[18px] w-[18px]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolPill({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition ${
        active
          ? "border-accent/30 bg-accent-soft text-accent"
          : "border-line bg-paper text-ink-muted hover:border-line-strong hover:text-ink"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/* ----------------------------- Sandbox ----------------------------- */

function reportToMarkdown(r: ResearchReport): string {
  const lines: string[] = [
    `# Research Report: ${r.query}`,
    ``,
    `_Generated ${r.generatedAt} · ${r.mode === "live" ? "Live · Opus 4.8" : "Sample report"}_`,
    ``,
    `## Product understanding`,
    r.productUnderstanding,
    ``,
    `## User journey`,
    ...r.userJourney.map((s, i) => `${i + 1}. ${s}`),
    ``,
    `## Source plan`,
    `- **Product:** ${r.sourcePlan.product}`,
    `- **Problem:** ${r.sourcePlan.problem}`,
    ...r.sourcePlan.decisions.map(
      (d) => `- **${d.source}** — ${d.used ? "used" : "skipped"}: ${d.rationale}`,
    ),
    ``,
    `## Executive summary`,
    r.executiveSummary,
    ``,
    `### Key findings`,
    ...r.keyFindings.map((f) => `- ${f}`),
    ``,
    `## Mobbin inspiration`,
    ...r.mobbin.flatMap((m) => [
      `### ${m.app} — ${m.pattern}`,
      m.takeaway,
      m.url ? `[View on Mobbin](${m.url})` : "",
      `Tags: ${m.tags.join(", ")}`,
      ``,
    ]),
    `## Figma insights (UX observations)`,
    ...r.figma.flatMap((f) => [`### ${f.signal} (${f.confidence})`, f.detail, ``]),
    `## UX recommendations`,
    ...r.recommendations.map(
      (rec) =>
        `- **${rec.title}** _(impact: ${rec.impact}, effort: ${rec.effort})_ — ${rec.rationale}`,
    ),
    ``,
    `## Action items`,
    ...r.actionItems.map((a) => `- [ ] ${a.task} — ${a.owner} · ${a.eta}`),
    ``,
  ];
  return lines.join("\n");
}

function downloadReport(report: ResearchReport) {
  const slug =
    report.query
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "research-report";
  const blob = new Blob([reportToMarkdown(report)], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function SandboxChrome({ report }: { report: ResearchReport | null }) {
  return (
    <div className="relative z-10 flex items-center justify-between border-b border-line bg-paper/70 px-4 py-2.5 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#fb7185]/70" />
          <span className="h-3 w-3 rounded-full bg-amber-400/70" />
          <span className="h-3 w-3 rounded-full bg-emerald-400/70" />
        </div>
        <div className="flex items-center gap-2 rounded-md border border-line bg-cream/70 px-2.5 py-1 text-[12px] text-ink-muted">
          <WindowIcon className="h-3.5 w-3.5 text-ink-faint" />
          {report ? "research-report.md" : "sandbox"}
        </div>
      </div>
      <button
        type="button"
        disabled={!report}
        onClick={() => report && downloadReport(report)}
        className="inline-flex items-center gap-1.5 rounded-md border border-line bg-paper px-2.5 py-1 text-[12px] font-medium text-ink-muted transition hover:border-line-strong hover:text-ink disabled:opacity-40"
      >
        <ExportIcon className="h-3.5 w-3.5" />
        Export
      </button>
    </div>
  );
}

function SandboxEmpty() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="relative mb-6">
        <div className="grid h-16 w-16 place-items-center rounded-3xl border border-line bg-paper shadow-sm">
          <SparkIcon className="h-8 w-8 text-accent" />
        </div>
        <span className="absolute -inset-3 -z-10 rounded-[2rem] bg-accent/10 blur-xl" />
      </div>
      <h2 className="serif text-2xl font-normal tracking-tight text-ink">
        Your research sandbox
      </h2>
      <p className="mt-2 max-w-sm text-[14px] leading-7 text-ink-muted">
        Send a prompt from the chat and a synthesized report — Mobbin
        inspiration, Figma insights, and prioritized UX moves — will render
        right here.
      </p>
      <div className="mt-8 grid w-full max-w-md grid-cols-2 gap-3 opacity-60">
        {["Executive Summary", "Mobbin Inspiration", "Figma Insights", "Action Items"].map(
          (label) => (
            <div
              key={label}
              className="rounded-xl border border-dashed border-line-strong bg-paper/50 px-3 py-4 text-left text-[12px] font-medium text-ink-faint"
            >
              {label}
              <div className="mt-2 h-1.5 w-3/4 rounded-full bg-line" />
              <div className="mt-1.5 h-1.5 w-1/2 rounded-full bg-line" />
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function SandboxLoading({ activeStep }: { activeStep: number }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft">
        <Spinner accent />
      </div>
      <h2 className="serif mt-5 text-xl font-normal tracking-tight text-ink">
        Synthesizing your report
      </h2>
      <p className="mt-1.5 text-[13px] text-ink-faint">
        Drawing from Mobbin & Figma
      </p>
      <div className="mt-7 grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-4">
        {LOADING_STEPS.map((step, i) => {
          const state =
            i < activeStep ? "done" : i === activeStep ? "active" : "todo";
          return (
            <div
              key={step}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs transition ${
                state === "todo"
                  ? "border-line bg-paper/60 text-ink-faint"
                  : "border-accent/25 bg-accent-soft text-ink"
              }`}
            >
              {state === "done" ? (
                <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />
              ) : state === "active" ? (
                <Spinner small accent />
              ) : (
                <span className="h-3.5 w-3.5 rounded-full border border-line-strong" />
              )}
              <span className={state === "active" ? "text-ink" : undefined}>
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------ Report ----------------------------- */

function ReportView({ report }: { report: ResearchReport }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Translate vertical wheel into horizontal scroll across the canvas,
  // unless the cursor is over a panel that can still scroll vertically.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      if (!el) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (el.scrollWidth <= el.clientWidth) return;

      let node = e.target as HTMLElement | null;
      while (node && node !== el) {
        const oy = getComputedStyle(node).overflowY;
        if (
          (oy === "auto" || oy === "scroll") &&
          node.scrollHeight > node.clientHeight
        ) {
          const atTop = node.scrollTop <= 0;
          const atBottom =
            node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
          if ((e.deltaY > 0 && !atBottom) || (e.deltaY < 0 && !atTop)) return;
        }
        node = node.parentElement;
      }

      el.scrollLeft += e.deltaY;
      e.preventDefault();
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div
      ref={scrollerRef}
      className="h-full overflow-x-auto overflow-y-hidden overscroll-x-contain"
    >
      <div className="flex h-full w-max items-stretch gap-5 px-6 py-6">
        {/* Intro / meta panel */}
        <section
          className="animate-fade-up flex h-full w-[300px] shrink-0 flex-col"
          style={{ animationDelay: "40ms" }}
        >
          <div className="card flex h-full min-h-0 flex-col overflow-y-auto rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Research Report
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  report.mode === "live"
                    ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-500/12 text-amber-700 dark:text-amber-300"
                }`}
              >
                {report.mode}
              </span>
            </div>
            <h2 className="serif mt-3 text-[1.6rem] font-normal leading-tight tracking-tight text-ink">
              {report.query}
            </h2>
            <p className="mt-2 text-sm text-ink-faint">
              Generated {report.generatedAt}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {report.meta.map((m) => (
                <div
                  key={m.label}
                  className="rounded-xl border border-line bg-cream/40 px-3 py-2.5"
                >
                  <div className="text-base font-semibold tracking-tight text-ink">
                    {m.value}
                  </div>
                  <div className="mt-0.5 text-[11px] text-ink-faint">
                    {m.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <div className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">
                Understanding
              </div>
              <p className="mt-1.5 text-[13px] leading-6 text-ink-muted">
                {report.productUnderstanding}
              </p>
            </div>

            <div className="mt-5">
              <div className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">
                Source plan
              </div>
              <p className="mt-1.5 text-[12px] leading-5 text-ink-faint">
                <span className="text-ink-muted">Problem:</span>{" "}
                {report.sourcePlan.problem}
              </p>
              <div className="mt-2.5 flex flex-col gap-2">
                {report.sourcePlan.decisions.map((d) => (
                  <div
                    key={d.source}
                    className="rounded-xl border border-line bg-cream/40 p-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold capitalize text-ink">
                        {d.source}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          d.used
                            ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                            : "bg-cream text-ink-faint"
                        }`}
                      >
                        {d.used ? "used" : "skipped"}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-5 text-ink-faint">
                      {d.rationale}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-center gap-1.5 pt-1 text-[11px] text-ink-faint">
              <SparkIcon className="h-3.5 w-3.5 text-accent" />
              Scroll right to explore
            </div>
          </div>
        </section>

        <Panel
          index={1}
          delay={120}
          icon={<DocIcon className="h-4 w-4" />}
          color="bg-accent"
          title="Executive Summary"
          subtitle="The signal, distilled"
        >
          <p className="text-pretty text-[15px] leading-7 text-ink-muted">
            {report.executiveSummary}
          </p>

          {report.userJourney.length > 0 && (
            <div className="mt-5">
              <div className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">
                User journey
              </div>
              <ol className="mt-2 flex flex-col gap-2">
                {report.userJourney.map((step, i) => (
                  <li key={step} className="flex gap-2.5 text-sm leading-6 text-ink">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="mt-5 text-[11px] font-medium uppercase tracking-wider text-ink-faint">
            Findings
          </div>
          <div className="mt-2 flex flex-col gap-2.5">
            {report.keyFindings.map((f) => (
              <div
                key={f}
                className="flex gap-2.5 rounded-xl border border-line bg-cream/50 p-3.5 text-sm leading-6 text-ink"
              >
                <TrendIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {f}
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          index={2}
          delay={200}
          icon={<GridIcon className="h-4 w-4" />}
          color="bg-[#8b5cf6]"
          title="Mobbin Inspiration"
          subtitle="Patterns worth stealing"
        >
          <div className="flex flex-col gap-3">
            {report.mobbin.map((item) => (
              <article
                key={item.app}
                className="group rounded-2xl border border-line bg-cream/40 p-4 transition hover:border-line-strong hover:bg-cream"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-paper text-sm font-semibold text-ink">
                      {item.app.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-ink">
                        {item.app}
                      </div>
                      <div className="text-xs text-ink-faint">
                        {item.pattern}
                      </div>
                    </div>
                  </div>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-0.5 text-[11px] font-medium text-accent transition hover:border-accent/40"
                    >
                      Mobbin
                      <ArrowIcon className="h-3 w-3 -rotate-45" />
                    </a>
                  ) : (
                    <ArrowIcon className="h-4 w-4 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-accent" />
                  )}
                </div>
                <p className="mt-3 text-sm leading-6 text-ink-muted">
                  {item.takeaway}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-md border border-line bg-paper px-2 py-0.5 text-[11px] text-ink-muted"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel
          index={3}
          delay={280}
          icon={<LayersIcon className="h-4 w-4" />}
          color="bg-[#0ea5e9]"
          title="Figma Insights"
          subtitle="What the files reveal"
        >
          <div className="flex flex-col gap-3">
            {report.figma.map((insight) => (
              <FigmaCard key={insight.signal} insight={insight} />
            ))}
          </div>
        </Panel>

        <Panel
          index={4}
          delay={360}
          icon={<CompassIcon className="h-4 w-4" />}
          color="bg-[#f59e0b]"
          title="UX Recommendations"
          subtitle="Prioritized by impact"
        >
          <div className="flex flex-col gap-2.5">
            {report.recommendations.map((rec, i) => (
              <RecommendationRow key={rec.title} rec={rec} rank={i + 1} />
            ))}
          </div>
        </Panel>

        <Panel
          index={5}
          delay={440}
          icon={<CheckIcon className="h-4 w-4" />}
          color="bg-[#10b981]"
          title="Action Items"
          subtitle="Ready for the backlog"
        >
          <div className="overflow-hidden rounded-2xl border border-line">
            {report.actionItems.map((a, i) => (
              <label
                key={a.task}
                className={`flex cursor-pointer items-center gap-3 bg-paper px-3.5 py-3.5 transition hover:bg-cream/50 ${
                  i !== 0 ? "border-t border-line" : ""
                }`}
              >
                <input
                  type="checkbox"
                  className="peer h-4 w-4 shrink-0 appearance-none rounded-md border border-line-strong bg-paper checked:border-emerald-500 checked:bg-emerald-500/20"
                />
                <span className="flex-1 text-sm text-ink transition peer-checked:text-ink-faint peer-checked:line-through">
                  {a.task}
                </span>
                <span className="text-xs text-ink-faint">{a.eta}</span>
              </label>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* --------------------------- Sub-pieces ---------------------------- */

function Panel({
  index,
  delay,
  icon,
  color,
  title,
  subtitle,
  children,
}: {
  index: number;
  delay: number;
  icon: React.ReactNode;
  color: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="animate-fade-up flex h-full w-[360px] shrink-0 flex-col"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-3 flex items-center gap-3">
        <div
          className={`grid h-9 w-9 place-items-center rounded-xl text-white ${color}`}
        >
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-ink-faint">
              0{index}
            </span>
            <h3 className="text-lg font-semibold tracking-tight text-ink">
              {title}
            </h3>
          </div>
          <p className="text-xs text-ink-faint">{subtitle}</p>
        </div>
      </div>
      <div className="card min-h-0 flex-1 overflow-y-auto rounded-2xl p-5">
        {children}
      </div>
    </section>
  );
}

function FigmaCard({ insight }: { insight: FigmaInsight }) {
  const tone =
    insight.confidence === "High"
      ? "text-emerald-700 dark:text-emerald-300 bg-emerald-500/12"
      : insight.confidence === "Medium"
        ? "text-amber-700 dark:text-amber-300 bg-amber-500/12"
        : "text-sky-700 dark:text-sky-300 bg-sky-500/12";
  return (
    <article className="rounded-2xl border border-line bg-cream/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold text-ink">{insight.signal}</h4>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}
        >
          {insight.confidence}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-ink-muted">{insight.detail}</p>
    </article>
  );
}

function RecommendationRow({
  rec,
  rank,
}: {
  rec: Recommendation;
  rank: number;
}) {
  const impactTone =
    rec.impact === "High"
      ? "text-emerald-700 dark:text-emerald-300 bg-emerald-500/12 border-emerald-500/25"
      : rec.impact === "Medium"
        ? "text-amber-700 dark:text-amber-300 bg-amber-500/12 border-amber-500/25"
        : "text-ink-muted bg-cream border-line";
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-cream/40 p-4 transition hover:border-line-strong hover:bg-cream">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-paper text-sm font-semibold text-ink-muted shadow-sm">
        {rank}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-ink">{rec.title}</div>
        <div className="mt-0.5 truncate text-xs text-ink-faint">
          {rec.rationale}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${impactTone}`}
        >
          {rec.impact} impact
        </span>
        <span className="hidden rounded-md border border-line bg-paper px-2 py-0.5 font-mono text-[11px] text-ink-faint sm:inline">
          {rec.effort}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------ Icons ------------------------------ */

function Spinner({ small, accent }: { small?: boolean; accent?: boolean }) {
  const size = small ? "h-4 w-4" : "h-6 w-6";
  return (
    <svg
      className={`${size} animate-spin ${accent ? "text-accent" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-90"
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

type IconProps = { className?: string };

function SparkIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l1.8 4.6L18.5 8l-4.6 1.8L12 14.5l-1.8-4.7L5.5 8l4.7-1.4L12 2zM18 13l.9 2.3 2.3.9-2.3.9L18 19.4l-.9-2.3-2.3-.9 2.3-.9.9-2.3zM6 14l.8 2 2 .8-2 .8L6 19.6l-.8-2-2-.8 2-.8L6 14z" />
    </svg>
  );
}

function ArrowUpIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function DeepIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function SunIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function WindowIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
    </svg>
  );
}

function CheckIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function DocIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M9 13h6M9 17h6" />
    </svg>
  );
}

function GridIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function LayersIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2l9 5-9 5-9-5 9-5z" />
      <path d="M3 12l9 5 9-5M3 17l9 5 9-5" />
    </svg>
  );
}

function CompassIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M16.2 7.8l-2.9 6.4-6.4 2.9 2.9-6.4 6.4-2.9z" />
    </svg>
  );
}

function TrendIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 17l6-6 4 4 7-7" />
      <path d="M17 8h4v4" />
    </svg>
  );
}

function ArrowIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function ExportIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
    </svg>
  );
}
