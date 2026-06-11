"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function ApprovalQueueActions({
  leadId,
  approvalStatus,
}: {
  leadId: number;
  approvalStatus: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function runAction(action: "approve" | "reject" | "send") {
    setLoading(action);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/v1/leads/${leadId}/proposal/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ review_notes: null }),
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.detail ?? "Request failed");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rf-approval-actions">
      <style>{`
        .rf-approval-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .rf-approval-actions__button {
          border: 0;
          border-radius: 14px;
          padding: 10px 14px;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
          color: white;
          transition: transform 0.18s ease, opacity 0.18s ease;
        }

        .rf-approval-actions__button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .rf-approval-actions__button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .rf-approval-actions__button--approve {
          background: linear-gradient(135deg, #16a34a, #15803d);
        }

        .rf-approval-actions__button--reject {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
        }

        .rf-approval-actions__button--send {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
        }

        .rf-approval-actions__error {
          color: #fca5a5;
          font-size: 13px;
          font-weight: 700;
        }
      `}</style>

      <button
        className="rf-approval-actions__button rf-approval-actions__button--approve"
        onClick={() => runAction("approve")}
        disabled={loading !== null}
      >
        {loading === "approve" ? "Approving..." : "Approve"}
      </button>

      <button
        className="rf-approval-actions__button rf-approval-actions__button--reject"
        onClick={() => runAction("reject")}
        disabled={loading !== null}
      >
        {loading === "reject" ? "Rejecting..." : "Reject"}
      </button>

      <button
        className="rf-approval-actions__button rf-approval-actions__button--send"
        onClick={() => runAction("send")}
        disabled={
          loading !== null || !["approved", "edited"].includes(approvalStatus ?? "")
        }
      >
        {loading === "send" ? "Sending..." : "Mark as sent"}
      </button>

      {error ? <span className="rf-approval-actions__error">{error}</span> : null}
    </div>
  );
}