import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-mono text-sm text-ink-faint">404</p>
      <h1 className="serif text-3xl font-normal tracking-tight text-ink">
        This page wandered off
      </h1>
      <p className="max-w-sm text-sm leading-6 text-ink-muted">
        The page you&apos;re looking for doesn&apos;t exist. Let&apos;s get you
        back to the research copilot.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong"
      >
        Back home
      </Link>
    </div>
  );
}
