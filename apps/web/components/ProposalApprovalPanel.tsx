"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function joinLines(items: string[] | null | undefined): string {
  return items?.join("\n") ?? "";
}

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ProposalApprovalPanel({
  leadId,
  proposal,
}: {
  leadId: number;
  proposal: {
    approval_status: string | null;
    review_notes: string | null;
    problem_summary: string | null;
    proposed_scope: string | null;
    deliverables: string[] | null;
    assumptions: string[] | null;
    next_steps: string[] | null;
    email_subject: string | null;
    email_body: string | null;
  };
}) {
  const router = useRouter();

  const [problemSummary, setProblemSummary] = useState(proposal.problem_summary ?? "");
  const [proposedScope, setProposedScope] = useState(proposal.proposed_scope ?? "");
  const [deliverables, setDeliverables] = useState(joinLines(proposal.deliverables));
  const [assumptions, setAssumptions] = useState(joinLines(proposal.assumptions));
  const [nextSteps, setNextSteps] = useState(joinLines(proposal.next_steps));
  const [emailSubject, setEmailSubject] = useState(proposal.email_subject ?? "");
  const [emailBody, setEmailBody] = useState(proposal.email_body ?? "");
  const [reviewNotes, setReviewNotes] = useState(proposal.review_notes ?? "");

  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function saveEdits() {
    setLoading("edit");
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/v1/leads/${leadId}/proposal`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_summary: problemSummary,
          proposed_scope: proposedScope,
          deliverables: splitLines(deliverables),
          assumptions: splitLines(assumptions),
          next_steps: splitLines(nextSteps),
          email_subject: emailSubject,
          email_body: emailBody,
          review_notes: reviewNotes || null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.detail ?? "Failed to save edits");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(null);
    }
  }

  async function runStatusAction(action: "approve" | "reject" | "send") {
    setLoading(action);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/v1/leads/${leadId}/proposal/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ review_notes: reviewNotes || null }),
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.detail ?? "Action failed");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="rf-approval-panel">
      <style>{`
        .rf-approval-panel {
          margin-top: 28px;
          padding: 24px;
          border-radius: 28px;
          background:
            linear-gradient(180deg, rgba(14, 20, 33, 0.96), rgba(10, 16, 28, 0.92));
          box-shadow:
            0 24px 60px rgba(2, 8, 23, 0.30),
            inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }

        .rf-approval-panel__title {
          margin: 0 0 18px;
          font-size: 28px;
          font-weight: 850;
          letter-spacing: -0.03em;
          color: #f8fbff;
        }

        .rf-approval-panel__status {
          margin: 0 0 18px;
          color: #a7bbd8;
          font-size: 14px;
        }

        .rf-approval-panel__grid {
          display: grid;
          gap: 16px;
        }

        .rf-approval-panel__label {
          display: grid;
          gap: 8px;
        }

        .rf-approval-panel__label span {
          color: #dbe7f6;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .rf-approval-panel__input,
        .rf-approval-panel__textarea {
          width: 100%;
          border: 0;
          border-radius: 18px;
          background:
            linear-gradient(180deg, rgba(8, 13, 24, 0.96), rgba(15, 23, 42, 0.92));
          color: #f8fbff;
          padding: 14px 16px;
          font: inherit;
          outline: none;
          box-sizing: border-box;
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.02);
        }

        .rf-approval-panel__input:focus,
        .rf-approval-panel__textarea:focus {
          box-shadow:
            inset 0 0 0 1px rgba(129, 140, 248, 0.55),
            0 0 0 4px rgba(99, 102, 241, 0.10);
        }

        .rf-approval-panel__textarea {
          min-height: 140px;
          resize: vertical;
          line-height: 1.7;
        }

        .rf-approval-panel__actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .rf-approval-panel__button {
          border: 0;
          border-radius: 16px;
          padding: 12px 16px;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
          color: white;
          transition: transform 0.18s ease, opacity 0.18s ease;
        }

        .rf-approval-panel__button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .rf-approval-panel__button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .rf-approval-panel__button--save {
          background: linear-gradient(135deg, #6366f1, #7c3aed);
        }

        .rf-approval-panel__button--approve {
          background: linear-gradient(135deg, #16a34a, #15803d);
        }

        .rf-approval-panel__button--reject {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
        }

        .rf-approval-panel__button--send {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
        }

        .rf-approval-panel__error {
          margin: 0;
          color: #fca5a5;
          font-size: 13px;
          font-weight: 700;
        }
      `}</style>

      <h2 className="rf-approval-panel__title">Approval Panel</h2>
      <p className="rf-approval-panel__status">
        <strong>Approval status:</strong> {proposal.approval_status ?? "-"}
      </p>

      <div className="rf-approval-panel__grid">
        <label className="rf-approval-panel__label">
          <span>Problem summary</span>
          <textarea
            className="rf-approval-panel__textarea"
            value={problemSummary}
            onChange={(e) => setProblemSummary(e.target.value)}
            rows={4}
          />
        </label>

        <label className="rf-approval-panel__label">
          <span>Proposed scope</span>
          <textarea
            className="rf-approval-panel__textarea"
            value={proposedScope}
            onChange={(e) => setProposedScope(e.target.value)}
            rows={4}
          />
        </label>

        <label className="rf-approval-panel__label">
          <span>Deliverables (one per line)</span>
          <textarea
            className="rf-approval-panel__textarea"
            value={deliverables}
            onChange={(e) => setDeliverables(e.target.value)}
            rows={5}
          />
        </label>

        <label className="rf-approval-panel__label">
          <span>Assumptions (one per line)</span>
          <textarea
            className="rf-approval-panel__textarea"
            value={assumptions}
            onChange={(e) => setAssumptions(e.target.value)}
            rows={5}
          />
        </label>

        <label className="rf-approval-panel__label">
          <span>Next steps (one per line)</span>
          <textarea
            className="rf-approval-panel__textarea"
            value={nextSteps}
            onChange={(e) => setNextSteps(e.target.value)}
            rows={5}
          />
        </label>

        <label className="rf-approval-panel__label">
          <span>Email subject</span>
          <input
            className="rf-approval-panel__input"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
          />
        </label>

        <label className="rf-approval-panel__label">
          <span>Email body</span>
          <textarea
            className="rf-approval-panel__textarea"
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            rows={8}
          />
        </label>

        <label className="rf-approval-panel__label">
          <span>Review notes</span>
          <textarea
            className="rf-approval-panel__textarea"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            rows={3}
          />
        </label>

        <div className="rf-approval-panel__actions">
          <button
            className="rf-approval-panel__button rf-approval-panel__button--save"
            onClick={saveEdits}
            disabled={loading !== null}
          >
            {loading === "edit" ? "Saving..." : "Save edits"}
          </button>

          <button
            className="rf-approval-panel__button rf-approval-panel__button--approve"
            onClick={() => runStatusAction("approve")}
            disabled={loading !== null}
          >
            {loading === "approve" ? "Approving..." : "Approve"}
          </button>

          <button
            className="rf-approval-panel__button rf-approval-panel__button--reject"
            onClick={() => runStatusAction("reject")}
            disabled={loading !== null}
          >
            {loading === "reject" ? "Rejecting..." : "Reject"}
          </button>

          <button
            className="rf-approval-panel__button rf-approval-panel__button--send"
            onClick={() => runStatusAction("send")}
            disabled={
              loading !== null ||
              !["approved", "edited"].includes(proposal.approval_status ?? "")
            }
          >
            {loading === "send" ? "Sending..." : "Mark as sent"}
          </button>
        </div>

        {error ? <p className="rf-approval-panel__error">{error}</p> : null}
      </div>
    </section>
  );
}