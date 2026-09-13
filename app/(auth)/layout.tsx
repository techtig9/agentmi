export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="aurora-backdrop flex min-h-screen items-center justify-center px-4 py-10">
      <main className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-display text-xl font-bold tracking-tight text-ink-100">
            agent<span className="text-neon-cyan">mi</span>
          </span>
        </div>
        <div className="neon-card p-6 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
