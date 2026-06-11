import Link from "next/link";

import { AutoRefresh } from "../components/AutoRefresh";
import { CreateLeadForm } from "../components/CreateLeadForm";
import { LeadFilters } from "../components/LeadFilters";

type LeadScoreMini = {
  tier: string | null;
  priority: string | null;
  confidence: number | null;
};

type Lead = {
  id: number;
  source: string;
  raw_content: string;
  status: string;
  created_at: string;
  score: LeadScoreMini | null;
};

const INTERNAL_API_URL =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

async function getLeads(tier?: string, priority?: string): Promise<Lead[]> {
  try {
    const params = new URLSearchParams();
    if (tier) params.set("tier", tier);
    if (priority) params.set("priority", priority);

    const url = params.toString()
      ? `${INTERNAL_API_URL}/api/v1/leads?${params.toString()}`
      : `${INTERNAL_API_URL}/api/v1/leads`;

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}

function fmtConfidence(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `${Math.round(value * 100)}%`;
}

function statusLabel(status: string): string {
  return status.replaceAll("_", " ");
}

function statusTone(status: string): "neutral" | "success" | "warning" | "danger" | "cool" {
  if (status.includes("failed") || status === "rejected") return "danger";
  if (status === "sent" || status === "approved") return "success";
  if (status.includes("pending")) return "warning";
  return "neutral";
}

function tierTone(tier: string | null | undefined): "neutral" | "success" | "warning" | "danger" | "cool" {
  if (tier === "hot") return "danger";
  if (tier === "warm") return "warning";
  if (tier === "cold") return "cool";
  return "neutral";
}

function priorityTone(priority: string | null | undefined): "neutral" | "success" | "warning" | "danger" | "cool" {
  if (priority === "high") return "danger";
  if (priority === "medium") return "warning";
  if (priority === "low") return "success";
  return "neutral";
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "cool";
}) {
  return <span className={`rf-badge rf-badge--${tone}`}>{children}</span>;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ tier?: string; priority?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const tier = sp.tier;
  const priority = sp.priority;

  const leads = await getLeads(tier, priority);

  const hasPendingPipeline = leads.some((lead) =>
    ["extraction_pending", "scoring_pending", "proposal_pending"].includes(
      lead.status
    )
  );

  const totalLeads = leads.length;
  const hotLeads = leads.filter((lead) => lead.score?.tier === "hot").length;
  const pendingApprovals = leads.filter(
    (lead) => lead.status === "approval_pending"
  ).length;
  const inProgress = leads.filter((lead) =>
    ["extraction_pending", "scoring_pending", "proposal_pending"].includes(
      lead.status
    )
  ).length;

  return (
    <main className="rf-home">
      <style>{`
        .rf-home {
          min-height: 100vh;
          padding: 40px 20px 64px;
          font-family: Inter, Arial, sans-serif;
          background:
            radial-gradient(circle at top left, rgba(99, 102, 241, 0.14), transparent 28%),
            radial-gradient(circle at top right, rgba(16, 185, 129, 0.10), transparent 24%),
            linear-gradient(180deg, #07111f 0%, #0b1324 38%, #0f172a 100%);
          color: #e5eefc;
        }

        .rf-home__container {
          max-width: 1240px;
          margin: 0 auto;
        }

        .rf-hero {
          position: relative;
          overflow: hidden;
          display: grid;
          grid-template-columns: 1.35fr 0.9fr;
          gap: 20px;
          padding: 28px;
          border-radius: 28px;
          background:
            linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(17, 24, 39, 0.86)),
            rgba(15, 23, 42, 0.82);
          border: 1px solid rgba(148, 163, 184, 0.14);
          box-shadow:
            0 22px 70px rgba(2, 8, 23, 0.45),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);
          margin-bottom: 20px;
        }

        .rf-hero::before {
          content: "";
          position: absolute;
          inset: -25% auto auto -10%;
          width: 280px;
          height: 280px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.24), transparent 70%);
          pointer-events: none;
        }

        .rf-hero::after {
          content: "";
          position: absolute;
          inset: auto -8% -20% auto;
          width: 280px;
          height: 280px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.18), transparent 70%);
          pointer-events: none;
        }

        .rf-hero__left,
        .rf-hero__right {
          position: relative;
          z-index: 1;
        }

        .rf-kicker {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(99, 102, 241, 0.14);
          border: 1px solid rgba(129, 140, 248, 0.24);
          color: #c7d2fe;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .rf-hero h1 {
          margin: 0 0 12px;
          font-size: clamp(2.35rem, 4vw, 4rem);
          line-height: 1.02;
          letter-spacing: -0.04em;
          color: #f8fbff;
        }

        .rf-hero p {
          margin: 0;
          font-size: 16px;
          line-height: 1.72;
          color: #bfd0e9;
          max-width: 760px;
        }

        .rf-hero__cta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 24px;
        }

        .rf-button-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 13px 18px;
          border-radius: 14px;
          text-decoration: none;
          font-weight: 700;
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
        }

        .rf-button-link:hover {
          transform: translateY(-1px);
        }

        .rf-button-link--primary {
          background: linear-gradient(135deg, #6366f1, #7c3aed);
          color: white;
          box-shadow: 0 16px 36px rgba(99, 102, 241, 0.30);
        }

        .rf-button-link--secondary {
          background: rgba(15, 23, 42, 0.52);
          color: #e2e8f0;
          border: 1px solid rgba(148, 163, 184, 0.18);
        }

        .rf-hero__panel {
          height: 100%;
          display: grid;
          gap: 14px;
          padding: 18px;
          border-radius: 22px;
          background:
            linear-gradient(180deg, rgba(15, 23, 42, 0.82), rgba(2, 8, 23, 0.74));
          border: 1px solid rgba(148, 163, 184, 0.12);
          backdrop-filter: blur(12px);
        }

        .rf-hero__panel-title {
          margin: 0;
          color: #f8fbff;
          font-size: 15px;
          font-weight: 700;
        }

        .rf-hero__panel-copy {
          margin: 0;
          color: #9fb3cf;
          font-size: 14px;
          line-height: 1.6;
        }

        .rf-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin: 18px 0 26px;
        }

        .rf-stat-card {
          position: relative;
          overflow: hidden;
          padding: 18px;
          border-radius: 24px;
          background:
            linear-gradient(180deg, rgba(14, 20, 33, 0.96), rgba(10, 16, 28, 0.90));
          box-shadow:
            0 22px 52px rgba(2, 8, 23, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }

        .rf-stat-card::before {
          content: "";
          position: absolute;
          inset: 0 auto auto 0;
          width: 100%;
          height: 1px;
          background: linear-gradient(90deg, rgba(129, 140, 248, 0.6), transparent);
        }

        .rf-stat-card__label {
          display: block;
          margin-bottom: 10px;
          color: #8fa7c6;
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .rf-stat-card__value {
          display: block;
          color: #f8fbff;
          font-size: clamp(1.8rem, 2.8vw, 2.4rem);
          line-height: 1;
          font-weight: 800;
          letter-spacing: -0.04em;
        }

        .rf-stat-card__hint {
          display: block;
          margin-top: 10px;
          color: #9fb3cf;
          font-size: 13px;
        }

        .rf-workspace {
          display: grid;
          grid-template-columns: 1.4fr 0.95fr;
          gap: 18px;
          margin-bottom: 28px;
        }

        .rf-section-card {
          padding: 22px;
          border-radius: 28px;
          background:
            linear-gradient(180deg, rgba(14, 20, 33, 0.96), rgba(10, 16, 28, 0.92));
          box-shadow:
            0 22px 56px rgba(2, 8, 23, 0.30),
            inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }

        .rf-section-card__title {
          margin: 0 0 8px;
          font-size: 18px;
          font-weight: 800;
          color: #f8fbff;
        }

        .rf-section-card__text {
          margin: 0;
          font-size: 14px;
          line-height: 1.65;
          color: #9fb3cf;
        }

        .rf-section-card__stack {
          display: grid;
          gap: 14px;
          margin-top: 18px;
        }

        .rf-feature {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 14px;
          border-radius: 18px;
          background: rgba(15, 23, 42, 0.54);
          border: 1px solid rgba(148, 163, 184, 0.09);
        }

        .rf-feature__dot {
          width: 10px;
          height: 10px;
          margin-top: 7px;
          flex: 0 0 auto;
          border-radius: 999px;
          background: linear-gradient(135deg, #818cf8, #22c55e);
          box-shadow: 0 0 18px rgba(129, 140, 248, 0.5);
        }

        .rf-feature strong {
          display: block;
          margin-bottom: 4px;
          color: #eef5ff;
          font-size: 14px;
        }

        .rf-feature span {
          color: #90a6c5;
          font-size: 13px;
          line-height: 1.6;
        }

        .rf-leads-header {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }

        .rf-leads-header h2 {
          margin: 0;
          font-size: 30px;
          letter-spacing: -0.03em;
          color: #f8fbff;
        }

        .rf-leads-header p {
          margin: 6px 0 0;
          color: #90a6c5;
          font-size: 14px;
        }

        .rf-leads-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
        }

        .rf-lead-card {
          position: relative;
          overflow: hidden;
          display: grid;
          gap: 16px;
          min-height: 230px;
          padding: 20px;
          border-radius: 26px;
          text-decoration: none;
          color: inherit;
          background:
            linear-gradient(180deg, rgba(14, 20, 33, 0.96), rgba(10, 16, 28, 0.90));
          box-shadow:
            0 22px 52px rgba(2, 8, 23, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.03);
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
        }

        .rf-lead-card:hover {
          transform: translateY(-4px);
          box-shadow:
            0 30px 65px rgba(2, 8, 23, 0.38),
            0 0 0 1px rgba(129, 140, 248, 0.14) inset;
        }

        .rf-lead-card__top {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: flex-start;
        }

        .rf-lead-card__id {
          margin: 0;
          color: #f8fbff;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .rf-lead-card__sub {
          margin-top: 6px;
          color: #8fa7c6;
          font-size: 13px;
        }

        .rf-lead-card__badges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: flex-end;
        }

        .rf-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          padding: 0 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.01em;
          border: 1px solid transparent;
          white-space: nowrap;
        }

        .rf-badge--neutral {
          color: #dbeafe;
          background: rgba(30, 41, 59, 0.9);
          border-color: rgba(148, 163, 184, 0.16);
        }

        .rf-badge--success {
          color: #dcfce7;
          background: rgba(22, 101, 52, 0.35);
          border-color: rgba(74, 222, 128, 0.18);
        }

        .rf-badge--warning {
          color: #fef3c7;
          background: rgba(146, 64, 14, 0.34);
          border-color: rgba(251, 191, 36, 0.18);
        }

        .rf-badge--danger {
          color: #fee2e2;
          background: rgba(127, 29, 29, 0.40);
          border-color: rgba(248, 113, 113, 0.2);
        }

        .rf-badge--cool {
          color: #dbeafe;
          background: rgba(30, 64, 175, 0.30);
          border-color: rgba(96, 165, 250, 0.18);
        }

        .rf-lead-card__meta {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .rf-mini-stat {
          padding: 12px 14px;
          border-radius: 16px;
          background: rgba(15, 23, 42, 0.48);
          border: 1px solid rgba(148, 163, 184, 0.08);
        }

        .rf-mini-stat__label {
          display: block;
          margin-bottom: 6px;
          color: #7f95b2;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .rf-mini-stat__value {
          color: #f8fbff;
          font-size: 14px;
          font-weight: 700;
          line-height: 1.5;
        }

        .rf-lead-card__summary {
          color: #c6d4e8;
          line-height: 1.7;
          font-size: 14px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 72px;
        }

        .rf-lead-card__footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: auto;
          padding-top: 10px;
          border-top: 1px solid rgba(148, 163, 184, 0.10);
          color: #96aad1;
          font-size: 13px;
          font-weight: 600;
        }

        .rf-empty {
          padding: 36px;
          border-radius: 26px;
          background:
            linear-gradient(180deg, rgba(14, 20, 33, 0.96), rgba(10, 16, 28, 0.90));
          box-shadow:
            0 22px 52px rgba(2, 8, 23, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.03);
          color: #9fb3cf;
          text-align: center;
        }

        @media (max-width: 1100px) {
          .rf-hero,
          .rf-workspace {
            grid-template-columns: 1fr;
          }

          .rf-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .rf-home {
            padding: 24px 14px 40px;
          }

          .rf-hero,
          .rf-section-card,
          .rf-stat-card,
          .rf-lead-card {
            border-radius: 20px;
          }

          .rf-hero {
            padding: 20px;
          }

          .rf-hero__cta {
            flex-direction: column;
          }

          .rf-button-link {
            width: 100%;
          }

          .rf-stats {
            grid-template-columns: 1fr;
          }

          .rf-lead-card__top,
          .rf-lead-card__footer {
            flex-direction: column;
            align-items: flex-start;
          }

          .rf-lead-card__badges,
          .rf-lead-card__meta {
            width: 100%;
            justify-content: flex-start;
          }

          .rf-lead-card__meta {
            grid-template-columns: 1fr;
          }

          .rf-leads-header {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      <div className="rf-home__container">
        <AutoRefresh enabled={hasPendingPipeline} intervalMs={5000} />

        <section className="rf-hero">
          <div className="rf-hero__left">
            <div className="rf-kicker">AI-assisted commercial workflow</div>
            <h1>RevenueFlow AI</h1>
            <p>
              A modern lead operations workspace that qualifies inbound demand,
              scores opportunities, drafts proposals, and pushes everything into
              a human approval flow with real operational visibility.
            </p>

            <div className="rf-hero__cta">
              <Link href="/dashboard" className="rf-button-link rf-button-link--primary">
                Open executive dashboard
              </Link>
              <Link
                href="/approvals"
                className="rf-button-link rf-button-link--secondary"
              >
                Open approval center
              </Link>
            </div>
          </div>

          <div className="rf-hero__right">
            <div className="rf-hero__panel">
              <p className="rf-hero__panel-title">What this workspace does well</p>
              <p className="rf-hero__panel-copy">
                This homepage is now designed to feel like a premium operations
                product instead of a raw internal tool.
              </p>

              <div className="rf-section-card__stack">
                <div className="rf-feature">
                  <div className="rf-feature__dot" />
                  <div>
                    <strong>Fast lead intake</strong>
                    <span>
                      Capture new opportunities instantly and push them into the
                      AI workflow without leaving the page.
                    </span>
                  </div>
                </div>

                <div className="rf-feature">
                  <div className="rf-feature__dot" />
                  <div>
                    <strong>Decision-ready pipeline</strong>
                    <span>
                      Turn raw lead text into structured insight, priority,
                      proposal drafts, and approval actions.
                    </span>
                  </div>
                </div>

                <div className="rf-feature">
                  <div className="rf-feature__dot" />
                  <div>
                    <strong>Executive visibility</strong>
                    <span>
                      Jump directly into the dashboard and approval queue from
                      the main workspace.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rf-stats">
          <div className="rf-stat-card">
            <span className="rf-stat-card__label">Total leads</span>
            <span className="rf-stat-card__value">{totalLeads}</span>
            <span className="rf-stat-card__hint">All records in the current workspace view</span>
          </div>

          <div className="rf-stat-card">
            <span className="rf-stat-card__label">Hot opportunities</span>
            <span className="rf-stat-card__value">{hotLeads}</span>
            <span className="rf-stat-card__hint">Leads currently classified as high-value</span>
          </div>

          <div className="rf-stat-card">
            <span className="rf-stat-card__label">Pending approvals</span>
            <span className="rf-stat-card__value">{pendingApprovals}</span>
            <span className="rf-stat-card__hint">Proposals waiting for a human decision</span>
          </div>

          <div className="rf-stat-card">
            <span className="rf-stat-card__label">In progress</span>
            <span className="rf-stat-card__value">{inProgress}</span>
            <span className="rf-stat-card__hint">Leads still moving through the async pipeline</span>
          </div>
        </section>

        <section className="rf-workspace">
          <CreateLeadForm />

          <div className="rf-section-card">
            <h2 className="rf-section-card__title">Pipeline controls</h2>
            <p className="rf-section-card__text">
              Filter the workspace by lead priority while keeping the interface
              clean, fast, and more enterprise-looking.
            </p>

            <div className="rf-section-card__stack">
              <LeadFilters initialTier={tier ?? ""} initialPriority={priority ?? ""} />

              <div className="rf-feature">
                <div className="rf-feature__dot" />
                <div>
                  <strong>Faster review flow</strong>
                  <span>
                    Focus instantly on hot or warm opportunities without digging
                    through raw records.
                  </span>
                </div>
              </div>

              <div className="rf-feature">
                <div className="rf-feature__dot" />
                <div>
                  <strong>Designed for portfolio impact</strong>
                  <span>
                    Cleaner hierarchy, premium cards, richer status badges, and
                    stronger product framing.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="rf-leads-header">
            <div>
              <h2>Lead workspace</h2>
              <p>Explore every opportunity with richer context, score visibility, and clearer status signals.</p>
            </div>
          </div>

          {leads.length === 0 ? (
            <div className="rf-empty">
              No leads found for the current filters.
            </div>
          ) : (
            <div className="rf-leads-grid">
              {leads.map((lead) => (
                <Link key={lead.id} href={`/leads/${lead.id}`} className="rf-lead-card">
                  <div className="rf-lead-card__top">
                    <div>
                      <h3 className="rf-lead-card__id">Lead #{lead.id}</h3>
                      <div className="rf-lead-card__sub">{lead.source}</div>
                    </div>

                    <div className="rf-lead-card__badges">
                      <Badge tone={statusTone(lead.status)}>
                        {statusLabel(lead.status)}
                      </Badge>

                      {lead.score?.tier ? (
                        <Badge tone={tierTone(lead.score.tier)}>
                          {lead.score.tier}
                        </Badge>
                      ) : null}

                      {lead.score?.priority ? (
                        <Badge tone={priorityTone(lead.score.priority)}>
                          {lead.score.priority}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="rf-lead-card__meta">
                    <div className="rf-mini-stat">
                      <span className="rf-mini-stat__label">Confidence</span>
                      <span className="rf-mini-stat__value">
                        {fmtConfidence(lead.score?.confidence)}
                      </span>
                    </div>

                    <div className="rf-mini-stat">
                      <span className="rf-mini-stat__label">Created at</span>
                      <span className="rf-mini-stat__value">
                        {new Date(lead.created_at).toLocaleString("en-US")}
                      </span>
                    </div>
                  </div>

                  <div className="rf-lead-card__summary">{lead.raw_content}</div>

                  <div className="rf-lead-card__footer">
                    <span>Open full lead workspace</span>
                    <span>→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}