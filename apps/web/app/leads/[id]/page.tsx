import Link from "next/link";
import { notFound } from "next/navigation";

import { AutoRefresh } from "../../../components/AutoRefresh";
import { LeadActions } from "../../../components/LeadActions";
import { ProposalApprovalPanel } from "../../../components/ProposalApprovalPanel";

type LeadExtraction = {
  id: number;
  lead_id: number;
  status: string;
  provider: string;
  company_name: string | null;
  contact_name: string | null;
  segment: string | null;
  need_summary: string | null;
  urgency: string | null;
  budget_signal: string | null;
  lead_quality_signals: string[] | null;
  confidence: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type LeadScore = {
  id: number;
  lead_id: number;
  status: string;
  provider: string;
  tier: string | null;
  priority: string | null;
  confidence: number | null;
  rationale: string | null;
  heuristic_score: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type Proposal = {
  id: number;
  lead_id: number;
  status: string;
  provider: string;
  template_name: string;
  template_version: string;
  approval_status: string | null;
  review_notes: string | null;
  problem_summary: string | null;
  proposed_scope: string | null;
  deliverables: string[] | null;
  assumptions: string[] | null;
  next_steps: string[] | null;
  email_subject: string | null;
  email_body: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type WorkflowJob = {
  id: number;
  lead_id: number;
  job_type: string;
  status: string;
  attempts: number;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

type WorkflowEvent = {
  id: number;
  lead_id: number;
  event_name: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type Lead = {
  id: number;
  source: string;
  raw_content: string;
  status: string;
  created_at: string;
  extraction: LeadExtraction | null;
  score: LeadScore | null;
  proposal: Proposal | null;
  workflow_jobs: WorkflowJob[];
  workflow_events: WorkflowEvent[];
};

const INTERNAL_API_URL =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

async function getLead(id: string): Promise<{
  lead: Lead | null;
  notFound: boolean;
  error: string | null;
}> {
  try {
    const response = await fetch(`${INTERNAL_API_URL}/api/v1/leads/${id}`, {
      cache: "no-store",
    });

    if (response.status === 404) {
      return { lead: null, notFound: true, error: null };
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "Unknown API error");
      return {
        lead: null,
        notFound: false,
        error: `API error ${response.status}: ${text}`,
      };
    }

    const data = (await response.json()) as Lead;
    return { lead: data, notFound: false, error: null };
  } catch (err) {
    return {
      lead: null,
      notFound: false,
      error: err instanceof Error ? err.message : "Unexpected fetch error",
    };
  }
}

function formatConfidence(value: number | null): string {
  if (value === null || value === undefined) return "-";
  return `${Math.round(value * 100)}%`;
}

function renderList(items: string[] | null | undefined) {
  if (!items || items.length === 0) {
    return <p style={{ marginTop: 8, color: "#96aad1" }}>-</p>;
  }

  return (
    <ul style={{ marginTop: 8, color: "#dce6f5", lineHeight: 1.7 }}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function toneBadge(value: string | null | undefined) {
  if (!value) return "neutral";
  if (value === "approved" || value === "sent" || value === "completed")
    return "success";
  if (value === "rejected" || value.includes("failed")) return "danger";
  if (value === "pending" || value === "edited" || value.includes("pending"))
    return "warning";
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

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rf-detail-card">
      <h2 className="rf-detail-card__title">{title}</h2>
      {children}
    </section>
  );
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getLead(id);

  if (result.notFound) {
    notFound();
  }

  if (result.error || !result.lead) {
    return (
      <main className="rf-detail">
        <div className="rf-detail__container">
          <Link href="/" className="rf-detail__back">
            ← Back
          </Link>

          <h1 className="rf-detail__title">Lead detail failed to load</h1>
          <pre className="rf-detail__error">
            {result.error ?? "Unknown error"}
          </pre>
        </div>
      </main>
    );
  }

  const lead = result.lead;

  const autoRefreshEnabled =
    ["extraction_pending", "scoring_pending", "proposal_pending"].includes(
      lead.status
    ) ||
    lead.workflow_jobs.some((job) =>
      ["queued", "running", "retrying"].includes(job.status)
    );

  return (
    <main className="rf-detail">
      <style>{`
        .rf-detail {
          min-height: 100vh;
          padding: 40px 20px 64px;
          font-family: Inter, Arial, sans-serif;
          background:
            radial-gradient(circle at top left, rgba(99, 102, 241, 0.14), transparent 28%),
            radial-gradient(circle at top right, rgba(16, 185, 129, 0.10), transparent 24%),
            linear-gradient(180deg, #07111f 0%, #0b1324 38%, #0f172a 100%);
          color: #e5eefc;
        }

        .rf-detail__container {
          max-width: 1240px;
          margin: 0 auto;
        }

        .rf-detail__topbar {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .rf-detail__back {
          color: #c7d2fe;
          text-decoration: none;
          font-weight: 700;
          padding: 12px 16px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.04);
        }

        .rf-detail__hint {
          color: #90a6c5;
          font-size: 14px;
        }

        .rf-detail__hero {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: flex-start;
          margin-bottom: 22px;
          flex-wrap: wrap;
        }

        .rf-detail__title {
          margin: 0;
          font-size: clamp(2.2rem, 4vw, 3.4rem);
          letter-spacing: -0.04em;
          line-height: 1.04;
          color: #f8fbff;
        }

        .rf-detail__subtitle {
          margin: 10px 0 0;
          color: #9fb3cf;
          max-width: 760px;
          line-height: 1.7;
        }

        .rf-detail__hero-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .rf-detail__grid {
          display: grid;
          gap: 18px;
        }

        .rf-detail-card {
          padding: 24px;
          border-radius: 28px;
          background:
            linear-gradient(180deg, rgba(14, 20, 33, 0.96), rgba(10, 16, 28, 0.92));
          box-shadow:
            0 24px 60px rgba(2, 8, 23, 0.30),
            inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }

        .rf-detail-card__title {
          margin: 0 0 18px;
          font-size: 28px;
          font-weight: 850;
          letter-spacing: -0.03em;
          color: #f8fbff;
        }

        .rf-detail__facts {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }

        .rf-detail__fact {
          padding: 14px 16px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.03);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
        }

        .rf-detail__fact-label {
          display: block;
          margin-bottom: 8px;
          color: #8fa7c6;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .rf-detail__fact-value {
          color: #f8fbff;
          font-weight: 700;
          line-height: 1.6;
        }

        .rf-detail__content-box {
          background:
            linear-gradient(180deg, rgba(8, 13, 24, 0.96), rgba(15, 23, 42, 0.92));
          color: #dce6f5;
          padding: 18px;
          border-radius: 20px;
          white-space: pre-wrap;
          word-break: break-word;
          line-height: 1.8;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
        }

        .rf-detail__rows {
          display: grid;
          gap: 12px;
        }

        .rf-detail__row {
          display: grid;
          gap: 6px;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .rf-detail__row strong {
          color: #f8fbff;
        }

        .rf-detail__row span,
        .rf-detail__row div {
          color: #dce6f5;
          line-height: 1.7;
        }

        .rf-detail__split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }

        .rf-detail__stack {
          display: grid;
          gap: 14px;
        }

        .rf-detail__mini-card {
          padding: 18px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.03);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
          display: grid;
          gap: 8px;
        }

        .rf-detail__mini-title {
          margin: 0;
          color: #f8fbff;
          font-size: 18px;
          font-weight: 800;
        }

        .rf-detail__mini-line {
          color: #dce6f5;
          line-height: 1.7;
        }

        .rf-detail__error {
          white-space: pre-wrap;
          word-break: break-word;
          background: rgba(127, 29, 29, 0.28);
          padding: 16px;
          border-radius: 16px;
          color: #fecaca;
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

        @media (max-width: 960px) {
          .rf-detail__facts,
          .rf-detail__split {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .rf-detail {
            padding: 24px 14px 40px;
          }
        }
      `}</style>

      <div className="rf-detail__container">
        <AutoRefresh enabled={autoRefreshEnabled} intervalMs={4000} />

        <div className="rf-detail__topbar">
          <Link href="/" className="rf-detail__back">
            ← Back
          </Link>
          <span className="rf-detail__hint">
            Auto-refresh is active while background processing is in progress.
          </span>
        </div>

        <div className="rf-detail__hero">
          <div>
            <h1 className="rf-detail__title">Lead #{lead.id}</h1>
            <p className="rf-detail__subtitle">
              Review the full AI processing flow, proposal lifecycle, approval
              controls, job history, and operational event tracking in one place.
            </p>
          </div>

          <div className="rf-detail__hero-badges">
            <Badge tone={toneBadge(lead.status)}>{statusLabel(lead.status)}</Badge>
            {lead.score?.tier ? (
              <Badge tone={toneBadge(lead.score.tier)}>{lead.score.tier}</Badge>
            ) : null}
            {lead.proposal?.approval_status ? (
              <Badge tone={toneBadge(lead.proposal.approval_status)}>
                {lead.proposal.approval_status}
              </Badge>
            ) : null}
          </div>
        </div>

        <LeadActions
          leadId={lead.id}
          extractionStatus={lead.extraction?.status ?? null}
        />

        <div className="rf-detail__grid">
          <SectionCard title="Lead Overview">
            <div className="rf-detail__facts">
              <div className="rf-detail__fact">
                <span className="rf-detail__fact-label">Source</span>
                <span className="rf-detail__fact-value">{lead.source}</span>
              </div>

              <div className="rf-detail__fact">
                <span className="rf-detail__fact-label">Lead status</span>
                <span className="rf-detail__fact-value">{lead.status}</span>
              </div>

              <div className="rf-detail__fact">
                <span className="rf-detail__fact-label">Created at</span>
                <span className="rf-detail__fact-value">
                  {new Date(lead.created_at).toLocaleString("en-US")}
                </span>
              </div>
            </div>

            <div className="rf-detail__content-box">{lead.raw_content}</div>
          </SectionCard>

          <SectionCard title="Structured Extraction">
            {!lead.extraction ? (
              <p>No extraction record found.</p>
            ) : (
              <div className="rf-detail__rows">
                <div className="rf-detail__row">
                  <strong>Extraction status</strong>
                  <span>{lead.extraction.status}</span>
                </div>
                <div className="rf-detail__row">
                  <strong>Provider</strong>
                  <span>{lead.extraction.provider}</span>
                </div>
                <div className="rf-detail__row">
                  <strong>Company name</strong>
                  <span>{lead.extraction.company_name ?? "-"}</span>
                </div>
                <div className="rf-detail__row">
                  <strong>Contact name</strong>
                  <span>{lead.extraction.contact_name ?? "-"}</span>
                </div>
                <div className="rf-detail__row">
                  <strong>Segment</strong>
                  <span>{lead.extraction.segment ?? "-"}</span>
                </div>
                <div className="rf-detail__row">
                  <strong>Need summary</strong>
                  <span>{lead.extraction.need_summary ?? "-"}</span>
                </div>
                <div className="rf-detail__row">
                  <strong>Urgency</strong>
                  <span>{lead.extraction.urgency ?? "-"}</span>
                </div>
                <div className="rf-detail__row">
                  <strong>Budget signal</strong>
                  <span>{lead.extraction.budget_signal ?? "-"}</span>
                </div>
                <div className="rf-detail__row">
                  <strong>Confidence</strong>
                  <span>{formatConfidence(lead.extraction.confidence)}</span>
                </div>
                <div className="rf-detail__row">
                  <strong>Lead quality signals</strong>
                  <div>{renderList(lead.extraction.lead_quality_signals)}</div>
                </div>

                {lead.extraction.error_message ? (
                  <pre className="rf-detail__error">
                    {lead.extraction.error_message}
                  </pre>
                ) : null}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Score">
            {!lead.score ? (
              <p>No score record found yet.</p>
            ) : (
              <div className="rf-detail__rows">
                <div className="rf-detail__row">
                  <strong>Status</strong>
                  <span>{lead.score.status}</span>
                </div>
                <div className="rf-detail__row">
                  <strong>Tier / Priority</strong>
                  <span>
                    {lead.score.tier ?? "-"} / {lead.score.priority ?? "-"}
                  </span>
                </div>
                <div className="rf-detail__row">
                  <strong>Confidence</strong>
                  <span>
                    {lead.score.confidence != null
                      ? `${Math.round(lead.score.confidence * 100)}%`
                      : "-"}
                  </span>
                </div>
                <div className="rf-detail__row">
                  <strong>Heuristic score</strong>
                  <span>{lead.score.heuristic_score ?? "-"}</span>
                </div>
                <div className="rf-detail__row">
                  <strong>Rationale</strong>
                  <span>{lead.score.rationale ?? "-"}</span>
                </div>

                {lead.score.error_message ? (
                  <pre className="rf-detail__error">{lead.score.error_message}</pre>
                ) : null}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Proposal Draft">
            {!lead.proposal ? (
              <p>No proposal record found yet.</p>
            ) : (
              <div className="rf-detail__rows">
                <div className="rf-detail__row">
                  <strong>Status</strong>
                  <span>{lead.proposal.status}</span>
                </div>
                <div className="rf-detail__row">
                  <strong>Approval status</strong>
                  <span>{lead.proposal.approval_status ?? "-"}</span>
                </div>
                <div className="rf-detail__row">
                  <strong>Provider</strong>
                  <span>{lead.proposal.provider}</span>
                </div>
                <div className="rf-detail__row">
                  <strong>Template</strong>
                  <span>
                    {lead.proposal.template_name} / {lead.proposal.template_version}
                  </span>
                </div>
                <div className="rf-detail__row">
                  <strong>Problem summary</strong>
                  <span>{lead.proposal.problem_summary ?? "-"}</span>
                </div>
                <div className="rf-detail__row">
                  <strong>Proposed scope</strong>
                  <span>{lead.proposal.proposed_scope ?? "-"}</span>
                </div>
                <div className="rf-detail__row">
                  <strong>Initial deliverables</strong>
                  <div>{renderList(lead.proposal.deliverables)}</div>
                </div>
                <div className="rf-detail__row">
                  <strong>Assumptions</strong>
                  <div>{renderList(lead.proposal.assumptions)}</div>
                </div>
                <div className="rf-detail__row">
                  <strong>Next steps</strong>
                  <div>{renderList(lead.proposal.next_steps)}</div>
                </div>
                <div className="rf-detail__row">
                  <strong>Email subject</strong>
                  <span>{lead.proposal.email_subject ?? "-"}</span>
                </div>
                <div className="rf-detail__row">
                  <strong>Email body</strong>
                  <div className="rf-detail__content-box">
                    {lead.proposal.email_body ?? "-"}
                  </div>
                </div>
                <div className="rf-detail__row">
                  <strong>Review notes</strong>
                  <span>{lead.proposal.review_notes ?? "-"}</span>
                </div>

                {lead.proposal.error_message ? (
                  <pre className="rf-detail__error">
                    {lead.proposal.error_message}
                  </pre>
                ) : null}
              </div>
            )}
          </SectionCard>

          {lead.proposal && lead.proposal.status === "completed" ? (
            <ProposalApprovalPanel
              leadId={lead.id}
              proposal={{
                approval_status: lead.proposal.approval_status,
                review_notes: lead.proposal.review_notes,
                problem_summary: lead.proposal.problem_summary,
                proposed_scope: lead.proposal.proposed_scope,
                deliverables: lead.proposal.deliverables,
                assumptions: lead.proposal.assumptions,
                next_steps: lead.proposal.next_steps,
                email_subject: lead.proposal.email_subject,
                email_body: lead.proposal.email_body,
              }}
            />
          ) : null}

          <div className="rf-detail__split">
            <SectionCard title="Workflow Jobs">
              {lead.workflow_jobs.length === 0 ? (
                <p>No workflow jobs found.</p>
              ) : (
                <div className="rf-detail__stack">
                  {[...lead.workflow_jobs]
                    .sort(
                      (a, b) =>
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                    )
                    .map((job) => (
                      <div key={job.id} className="rf-detail__mini-card">
                        <h3 className="rf-detail__mini-title">{job.job_type}</h3>
                        <div className="rf-detail__mini-line">
                          <strong>Status:</strong> {job.status}
                        </div>
                        <div className="rf-detail__mini-line">
                          <strong>Attempts:</strong> {job.attempts}
                        </div>
                        <div className="rf-detail__mini-line">
                          <strong>Started:</strong>{" "}
                          {job.started_at
                            ? new Date(job.started_at).toLocaleString("en-US")
                            : "-"}
                        </div>
                        <div className="rf-detail__mini-line">
                          <strong>Finished:</strong>{" "}
                          {job.finished_at
                            ? new Date(job.finished_at).toLocaleString("en-US")
                            : "-"}
                        </div>

                        {job.error_message ? (
                          <pre className="rf-detail__error">{job.error_message}</pre>
                        ) : null}
                      </div>
                    ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Event Log">
              {lead.workflow_events.length === 0 ? (
                <p>No workflow events found.</p>
              ) : (
                <div className="rf-detail__stack">
                  {[...lead.workflow_events]
                    .sort(
                      (a, b) =>
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                    )
                    .map((event) => (
                      <div key={event.id} className="rf-detail__mini-card">
                        <h3 className="rf-detail__mini-title">{event.event_name}</h3>
                        <div className="rf-detail__mini-line">
                          {new Date(event.created_at).toLocaleString("en-US")}
                        </div>
                        {event.payload ? (
                          <pre className="rf-detail__content-box">
                            {JSON.stringify(event.payload, null, 2)}
                          </pre>
                        ) : null}
                      </div>
                    ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </div>
    </main>
  );
}