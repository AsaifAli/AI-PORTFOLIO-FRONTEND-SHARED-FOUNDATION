import type { ReactNode } from "react";

export function ProductShell({ children, product }: { children: ReactNode; product: string }) {
  return <div className={`app app-${product}`}>{children}</div>;
}

export function AppHeader({
  monogram,
  name,
  descriptor,
  sessionLabel = "Studio session",
  status = "good",
  actions,
}: {
  monogram: string;
  name: string;
  descriptor: string;
  sessionLabel?: string;
  status?: "good" | "warn" | "bad" | "neutral";
  actions?: ReactNode;
}) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">{monogram}</div>
        <div className="brand-copy"><strong>{name}</strong><span>{descriptor}</span></div>
      </div>
      <div className="top-actions">
        <StatusChip label={sessionLabel} tone={status}/>
        {actions}
      </div>
    </header>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="hero-actions">{actions}</div> : null}
    </section>
  );
}

export function Panel({ children, className = "", title, detail, actions }: {
  children: ReactNode;
  className?: string;
  title?: string;
  detail?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={`panel ${className}`.trim()}>
      {title || detail || actions ? (
        <div className="panel-head">
          <div>{title ? <h2>{title}</h2> : null}{detail ? <p>{detail}</p> : null}</div>
          {actions ? <div className="panel-actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function StatusChip({ label, tone = "neutral" }: {
  label: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  return <span className={`status-chip ${tone}`}><i aria-hidden="true"/>{label}</span>;
}

export function MetricCard({ label, value, detail, tone = "neutral" }: {
  label: string;
  value: ReactNode;
  detail?: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  return <div className={`metric metric-${tone}`}><span>{label}</span><strong>{value}</strong>{detail ? <small>{detail}</small> : null}</div>;
}

export function EmptyState({ title, body, action }: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return <div className="empty-state"><span className="empty-mark" aria-hidden="true">＋</span><strong>{title}</strong><span>{body}</span>{action ? <div>{action}</div> : null}</div>;
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "success" | "warning" | "error" }) {
  return <div className={`notice notice-${tone}`} role={tone === "error" ? "alert" : "status"}>{children}</div>;
}

export function Button({
  children,
  variant = "secondary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "quiet" | "danger" }) {
  return <button className={`btn ${variant} ${className}`.trim()} {...props}>{children}</button>;
}

export function SectionLabel({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return <div className="section-label"><span>{children}</span>{aside ? <small>{aside}</small> : null}</div>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="field"><span className="field-label">{label}</span>{children}{hint ? <small>{hint}</small> : null}</label>;
}
