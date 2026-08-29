import Link from "next/link";

export function PlatformPage({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.18em] text-neon-cyan mb-2">{eyebrow}</p>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-ink-400 mt-2 max-w-3xl">{description}</p>
        </div>
        {action && <Link href={action.href} className="btn-primary shrink-0">{action.label}</Link>}
      </div>
      {children}
    </div>
  );
}

export function FeatureCard({ title, description, href, meta }: { title: string; description: string; href?: string; meta?: string }) {
  const content = <div className="neon-card p-5 h-full"><div className="flex items-start justify-between gap-3"><div><h2 className="font-display font-bold">{title}</h2><p className="text-sm text-ink-400 mt-2">{description}</p></div>{meta && <span className="text-[10px] font-mono uppercase text-neon-cyan">{meta}</span>}</div></div>;
  return href ? <Link href={href} className="block h-full">{content}</Link> : content;
}
