import Link from "next/link";

export default function Nav() {
  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            AI
          </span>
          Support Assistant
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium text-muted">
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 transition-colors hover:bg-accent-soft hover:text-accent"
          >
            Chat
          </Link>
          <Link
            href="/admin"
            className="rounded-md px-3 py-1.5 transition-colors hover:bg-accent-soft hover:text-accent"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
