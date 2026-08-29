export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="aurora-backdrop min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-display font-bold text-xl tracking-tight text-ink-100">
            agent<span className="text-neon-cyan">mi</span>
          </span>
        </div>
        <div className="neon-card p-8">{children}</div>
      </div>
    </div>
  );
}
