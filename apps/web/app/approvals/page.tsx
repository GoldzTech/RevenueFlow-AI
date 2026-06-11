import Link from "next/link";

import { ApprovalQueueActions } from "../../components/ApprovalQueueActions";
import { AutoRefresh } from "../../components/AutoRefresh";

type ApprovalItem = {
  lead_id: number;
  lead_status: string;
  created_at: string;
  company_name: string | null;
  segment: string | null;
  tier: string | null;
  priority: string | null;
  approval_status: string | null;
  email_subject: string | null;
  template_name: string | null;
  template_version: string | null;
};

const INTERNAL_API_URL =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

async function getApprovalQueue(): Promise<ApprovalItem[]> {
  try {
    const response = await fetch(`${INTERNAL_API_URL}/api/v1/approvals`, {
      cache: "no-store",
    });

    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
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

export default async function ApprovalsPage() {
  const items = await getApprovalQueue();

  return (
    <main className="rf-approvals">
      <style>{`
        .rf-approvals {
          min-height: 100vh;
          padding: 40px 20px 64px;
          font-family: Inter, Arial, sans-serif;
          background:
            radial-gradient(circle at top left, rgba(99, 102, 241, 0.14), transparent 28%),
            radial-gradient(circle at top right, rgba(16, 185, 129, 0.10), transparent 24%),
            linear-gradient(180deg, #07111f 0%, #0b1324 38%, #0f172a 100%);
          color: #e5eefc;
        }

        .rf-approvals__container {
          max-width: 1240px;
          margin: 0 auto;
        }

        .rf-approvals__hero {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .rf-approvals__title {
          margin: 0;
          font-size: clamp(2.3rem, 4vw, 3.5rem);
          line-height: 1.04;
          letter-spacing: -0.04em;
          color: #f8fbff;
        }

        .rf-approvals__text {
          margin: 12px 0 0;
          max-width: 720px;
          color: #9fb3cf;
          line-height: 1.7;
        }

        .rf-approvals__back {
          color: #c7d2fe;
          text-decoration: none;
          font-weight: 700;
          padding: 12px 16px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.04);
        }

        .rf-approvals__grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 16px;
        }

        .rf-approval-card {
          padding: 22px;
          border-radius: 26px;
          background:
            linear-gradient(180deg, rgba(14, 20, 33, 0.96), rgba(10, 16, 28, 0.92));
          box-shadow:
            0 22px 56px rgba(2, 8, 23, 0.30),
            inset 0 1px 0 rgba(255, 255, 255, 0.03);
          display: grid;
          gap: 16px;
        }

        .rf-approval-card__top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .rf-approval-card__title {
          margin: 0;
          color: #f8fbff;
          font-size: 22px;
          font-weight: 850;
          letter-spacing: -0.03em;
        }

        .rf-approval-card__meta {
          display: grid;
          gap: 10px;
        }

        .rf-approval-card__line {
          color: #dce6f5;
          line-height: 1.6;
        }

        .rf-approval-card__line strong {
          color: #f8fbff;
        }

        .rf-approval-card__badges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: flex-end;
        }

        .rf-approval-card__footer {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
        }

        .rf-approval-card__link {
          color: #c7d2fe;
          text-decoration: none;
          font-weight: 700;
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

        @media (max-width: 720px) {
          .rf-approvals {
            padding: 24px 14px 40px;
          }

          .rf-approvals__hero,
          .rf-approval-card__top {
            flex-direction: column;
          }

          .rf-approval-card__badges {
            justify-content: flex-start;
          }
        }
      `}</style>

      <div className="rf-approvals__container">
        <AutoRefresh enabled={items.length > 0} intervalMs={5000} />

        <div className="rf-approvals__hero">
          <div>
            <h1 className="rf-approvals__title">Approval Center</h1>
            <p className="rf-approvals__text">
              Review AI-generated proposals, validate commercial readiness, and
              move opportunities forward with a cleaner executive workflow.
            </p>
          </div>

          <Link href="/" className="rf-approvals__back">
            ← Back to leads
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="rf-empty">
            No actionable proposals in the approval queue.
          </div>
        ) : (
          <div className="rf-approvals__grid">
            {items.map((item) => (
              <div key={item.lead_id} className="rf-approval-card">
                <div className="rf-approval-card__top">
                  <div>
                    <h2 className="rf-approval-card__title">Lead #{item.lead_id}</h2>
                  </div>

                  <div className="rf-approval-card__badges">
                    <Badge tone={toneBadge(item.approval_status)}>
                      {item.approval_status ?? "unknown"}
                    </Badge>
                    <Badge tone={toneBadge(item.tier)}>
                      {item.tier ?? "-"}
                    </Badge>
                  </div>
                </div>

                <div className="rf-approval-card__meta">
                  <div className="rf-approval-card__line">
                    <strong>Company:</strong> {item.company_name ?? "-"}
                  </div>
                  <div className="rf-approval-card__line">
                    <strong>Segment:</strong> {item.segment ?? "-"}
                  </div>
                  <div className="rf-approval-card__line">
                    <strong>Score:</strong> {item.tier ?? "-"} / {item.priority ?? "-"}
                  </div>
                  <div className="rf-approval-card__line">
                    <strong>Email subject:</strong> {item.email_subject ?? "-"}
                  </div>
                  <div className="rf-approval-card__line">
                    <strong>Template:</strong> {item.template_name ?? "-"} / {item.template_version ?? "-"}
                  </div>
                </div>

                <div className="rf-approval-card__footer">
                  <Link
                    href={`/leads/${item.lead_id}`}
                    className="rf-approval-card__link"
                  >
                    Open details
                  </Link>

                  <ApprovalQueueActions
                    leadId={item.lead_id}
                    approvalStatus={item.approval_status}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}