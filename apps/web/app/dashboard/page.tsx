import Link from "next/link";

import { DashboardFilters } from "../../components/DashboardFilters";

type MetricBucket = {
  label: string;
  value: number;
};

type DashboardCards = {
  leads_received: number;
  leads_processed: number;
  hot_leads: number;
  warm_leads: number;
  cold_leads: number;
  proposals_generated: number;
  pending_approvals: number;
  average_processing_time_seconds: number;
  estimated_cost_per_execution: number;
  total_estimated_ai_cost: number;
};

type DashboardRecentLead = {
  lead_id: number;
  source: string;
  status: string;
  created_at: string;
  company_name: string | null;
  tier: string | null;
  priority: string | null;
  approval_status: string | null;
};

type DashboardSummary = {
  cards: DashboardCards;
  tier_distribution: MetricBucket[];
  approval_distribution: MetricBucket[];
  recent_leads: DashboardRecentLead[];
};

const INTERNAL_API_URL =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

async function getDashboardSummary(params: {
  date_from?: string;
  date_to?: string;
  tier?: string;
  approval_status?: string;
  source?: string;
}): Promise<DashboardSummary | null> {
  try {
    const search = new URLSearchParams();

    if (params.date_from) search.set("date_from", params.date_from);
    if (params.date_to) search.set("date_to", params.date_to);
    if (params.tier) search.set("tier", params.tier);
    if (params.approval_status) search.set("approval_status", params.approval_status);
    if (params.source) search.set("source", params.source);

    const url = search.toString()
      ? `${INTERNAL_API_URL}/api/v1/dashboard/summary?${search.toString()}`
      : `${INTERNAL_API_URL}/api/v1/dashboard/summary`;

    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "-";

  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);

  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(3)}`;
}

function Card({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rf-dashboard-card">
      <span className="rf-dashboard-card__label">{title}</span>
      <strong className="rf-dashboard-card__value">{value}</strong>
    </div>
  );
}

function toneBadge(value: string | null | undefined) {
  if (value === "approved" || value === "sent") return "success";
  if (value === "rejected") return "danger";
  if (value === "pending" || value === "edited") return "warning";
  if (value === "hot") return "danger";
  if (value === "warm") return "warning";
  if (value === "cold") return "cool";
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{
    date_from?: string;
    date_to?: string;
    tier?: string;
    approval_status?: string;
    source?: string;
  }>;
}) {
  const sp = (await searchParams) ?? {};

  const summary = await getDashboardSummary(sp);

  if (!summary) {
    return (
      <main className="rf-dashboard">
        <div className="rf-dashboard__container">
          <Link href="/" className="rf-dashboard__link">
            ← Back
          </Link>
          <h1 className="rf-dashboard__title">Executive Dashboard</h1>
          <p>Failed to load dashboard data.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="rf-dashboard">
      <style>{`
        .rf-dashboard {
          min-height: 100vh;
          padding: 40px 20px 64px;
          font-family: Inter, Arial, sans-serif;
          background:
            radial-gradient(circle at top left, rgba(99, 102, 241, 0.14), transparent 28%),
            radial-gradient(circle at top right, rgba(16, 185, 129, 0.10), transparent 24%),
            linear-gradient(180deg, #07111f 0%, #0b1324 38%, #0f172a 100%);
          color: #e5eefc;
        }

        .rf-dashboard__container {
          max-width: 1240px;
          margin: 0 auto;
        }

        .rf-dashboard__hero {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .rf-dashboard__title {
          margin: 0;
          font-size: clamp(2.3rem, 4vw, 3.5rem);
          line-height: 1.04;
          letter-spacing: -0.04em;
          color: #f8fbff;
        }

        .rf-dashboard__text {
          margin: 12px 0 0;
          color: #9fb3cf;
          line-height: 1.7;
          max-width: 760px;
        }

        .rf-dashboard__nav {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .rf-dashboard__link {
          color: #c7d2fe;
          text-decoration: none;
          font-weight: 700;
          padding: 12px 16px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.04);
        }

        .rf-dashboard__cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
          margin-bottom: 24px;
        }

        .rf-dashboard-card {
          padding: 18px;
          border-radius: 24px;
          background:
            linear-gradient(180deg, rgba(14, 20, 33, 0.96), rgba(10, 16, 28, 0.90));
          box-shadow:
            0 22px 52px rgba(2, 8, 23, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.03);
          display: grid;
          gap: 10px;
        }

        .rf-dashboard-card__label {
          color: #8fa7c6;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .rf-dashboard-card__value {
          color: #f8fbff;
          font-size: 34px;
          font-weight: 850;
          letter-spacing: -0.04em;
        }

        .rf-dashboard__split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }

        .rf-dashboard__panel {
          padding: 22px;
          border-radius: 26px;
          background:
            linear-gradient(180deg, rgba(14, 20, 33, 0.96), rgba(10, 16, 28, 0.92));
          box-shadow:
            0 22px 56px rgba(2, 8, 23, 0.30),
            inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }

        .rf-dashboard__panel-title {
          margin: 0 0 16px;
          font-size: 18px;
          font-weight: 800;
          color: #f8fbff;
        }

        .rf-dashboard__metric-list {
          display: grid;
          gap: 10px;
        }

        .rf-dashboard__metric-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          color: #dce6f5;
        }

        .rf-dashboard__metric-row strong {
          color: #f8fbff;
        }

        .rf-dashboard__recent {
          padding: 22px;
          border-radius: 26px;
          background:
            linear-gradient(180deg, rgba(14, 20, 33, 0.96), rgba(10, 16, 28, 0.92));
          box-shadow:
            0 22px 56px rgba(2, 8, 23, 0.30),
            inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }

        .rf-dashboard__recent-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 14px;
        }

        .rf-dashboard__recent-card {
          text-decoration: none;
          color: inherit;
          padding: 18px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.03);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
          display: grid;
          gap: 10px;
          transition: transform 0.18s ease;
        }

        .rf-dashboard__recent-card:hover {
          transform: translateY(-2px);
        }

        .rf-dashboard__recent-title {
          margin: 0;
          color: #f8fbff;
          font-size: 18px;
          font-weight: 800;
        }

        .rf-dashboard__recent-line {
          color: #dce6f5;
          line-height: 1.6;
        }

        .rf-dashboard__badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
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
        }

        .rf-badge--success {
          color: #dcfce7;
          background: rgba(22, 101, 52, 0.35);
        }

        .rf-badge--warning {
          color: #fef3c7;
          background: rgba(146, 64, 14, 0.34);
        }

        .rf-badge--danger {
          color: #fee2e2;
          background: rgba(127, 29, 29, 0.40);
        }

        .rf-badge--cool {
          color: #dbeafe;
          background: rgba(30, 64, 175, 0.30);
        }

        @media (max-width: 900px) {
          .rf-dashboard__split {
            grid-template-columns: 1fr;
          }

          .rf-dashboard__hero {
            flex-direction: column;
          }
        }

        @media (max-width: 720px) {
          .rf-dashboard {
            padding: 24px 14px 40px;
          }
        }
      `}</style>

      <div className="rf-dashboard__container">
        <div className="rf-dashboard__hero">
          <div>
            <h1 className="rf-dashboard__title">Executive Dashboard</h1>
            <p className="rf-dashboard__text">
              Monitor pipeline throughput, proposal generation, approval load,
              and operational efficiency with a more executive-grade interface.
            </p>
          </div>

          <div className="rf-dashboard__nav">
            <Link href="/" className="rf-dashboard__link">
              Leads
            </Link>
            <Link href="/approvals" className="rf-dashboard__link">
              Approval center
            </Link>
          </div>
        </div>

        <DashboardFilters
          initialDateFrom={sp.date_from ?? ""}
          initialDateTo={sp.date_to ?? ""}
          initialTier={sp.tier ?? ""}
          initialApprovalStatus={sp.approval_status ?? ""}
          initialSource={sp.source ?? ""}
        />

        <section className="rf-dashboard__cards">
          <Card title="Leads received" value={summary.cards.leads_received} />
          <Card title="Leads processed" value={summary.cards.leads_processed} />
          <Card title="Proposals generated" value={summary.cards.proposals_generated} />
          <Card title="Pending approvals" value={summary.cards.pending_approvals} />
          <Card title="Hot leads" value={summary.cards.hot_leads} />
          <Card title="Warm leads" value={summary.cards.warm_leads} />
          <Card title="Cold leads" value={summary.cards.cold_leads} />
          <Card
            title="Avg processing time"
            value={formatDuration(summary.cards.average_processing_time_seconds)}
          />
          <Card
            title="Estimated cost / execution"
            value={formatCurrency(summary.cards.estimated_cost_per_execution)}
          />
          <Card
            title="Total estimated AI cost"
            value={formatCurrency(summary.cards.total_estimated_ai_cost)}
          />
        </section>

        <section className="rf-dashboard__split">
          <div className="rf-dashboard__panel">
            <h2 className="rf-dashboard__panel-title">Tier distribution</h2>
            <div className="rf-dashboard__metric-list">
              {summary.tier_distribution.map((item) => (
                <div key={item.label} className="rf-dashboard__metric-row">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="rf-dashboard__panel">
            <h2 className="rf-dashboard__panel-title">Approval distribution</h2>
            <div className="rf-dashboard__metric-list">
              {summary.approval_distribution.map((item) => (
                <div key={item.label} className="rf-dashboard__metric-row">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rf-dashboard__recent">
          <h2 className="rf-dashboard__panel-title">Recent leads</h2>

          {summary.recent_leads.length === 0 ? (
            <p>No leads found for the current filters.</p>
          ) : (
            <div className="rf-dashboard__recent-grid">
              {summary.recent_leads.map((lead) => (
                <Link
                  key={lead.lead_id}
                  href={`/leads/${lead.lead_id}`}
                  className="rf-dashboard__recent-card"
                >
                  <h3 className="rf-dashboard__recent-title">Lead #{lead.lead_id}</h3>

                  <div className="rf-dashboard__badges">
                    <Badge tone={toneBadge(lead.tier)}>{lead.tier ?? "-"}</Badge>
                    <Badge tone={toneBadge(lead.approval_status)}>
                      {lead.approval_status ?? "-"}
                    </Badge>
                  </div>

                  <div className="rf-dashboard__recent-line">
                    <strong>Company:</strong> {lead.company_name ?? "-"}
                  </div>
                  <div className="rf-dashboard__recent-line">
                    <strong>Status:</strong> {lead.status}
                  </div>
                  <div className="rf-dashboard__recent-line">
                    <strong>Tier / Priority:</strong> {lead.tier ?? "-"} /{" "}
                    {lead.priority ?? "-"}
                  </div>
                  <div className="rf-dashboard__recent-line">
                    <strong>Source:</strong> {lead.source}
                  </div>
                  <div className="rf-dashboard__recent-line">
                    <strong>Created at:</strong>{" "}
                    {new Date(lead.created_at).toLocaleString("en-US")}
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