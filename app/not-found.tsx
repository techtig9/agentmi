import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <section className="neon-card max-w-lg p-8 text-center">
        <p className="text-neon-violet font-mono text-sm mb-2">404</p>
        <h1 className="text-2xl font-bold mb-3">Page not found</h1>
        <p className="text-ink-400 mb-6">The page you requested does not exist or is no longer available.</p>
        <Link className="btn-primary" href="/dashboard">Back to dashboard</Link>
      </section>
    </main>
  );
}
