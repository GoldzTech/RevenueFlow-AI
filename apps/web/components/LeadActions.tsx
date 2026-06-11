"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function LeadActions({
  leadId,
  extractionStatus,
}: {
  leadId: number;
  extractionStatus?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function runAction(
    action: "retry-extraction" | "retry-scoring" | "delete"
  ) {
    setLoading(action);
    setError("");

    try {
      let response: Response;

      if (action === "delete") {
        const confirmed = window.confirm(
          "Are you sure you want to delete this lead?"
        );
        if (!confirmed) {
          setLoading(null);
          return;
        }

        response = await fetch(`${API_URL}/api/v1/leads/${leadId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete lead");
        }

        router.push("/");
        router.refresh();
        return;
      }

      response = await fetch(`${API_URL}/api/v1/leads/${leadId}/${action}`, {
        method: "POST",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const detail =
          payload && typeof payload.detail === "string"
            ? payload.detail
            : "Request failed";
        throw new Error(detail);
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rf-inline-actions">
      <style>{`
        .rf-inline-actions {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }

        .rf-inline-actions__button {
          border: 0;
          border-radius: 16px;
          padding: 12px 16px;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
          color: white;
          transition: transform 0.18s ease, opacity 0.18s ease, box-shadow 0.18s ease;
        }

        .rf-inline-actions__button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .rf-inline-actions__button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .rf-inline-actions__button--primary {
          background: linear-gradient(135deg, #6366f1, #7c3aed);
          box-shadow: 0 14px 30px rgba(99, 102, 241, 0.24);
        }

        .rf-inline-actions__button--secondary {
          background: rgba(255, 255, 255, 0.05);
          color: #e5eefc;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
        }

        .rf-inline-actions__button--danger {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          box-shadow: 0 14px 30px rgba(220, 38, 38, 0.24);
        }

        .rf-inline-actions__error {
          margin: 0;
          color: #fca5a5;
          font-size: 13px;
          font-weight: 700;
        }
      `}</style>

      <button
        className="rf-inline-actions__button rf-inline-actions__button--secondary"
        onClick={() => runAction("retry-extraction")}
        disabled={loading !== null}
      >
        {loading === "retry-extraction"
          ? "Retrying extraction..."
          : "Retry extraction"}
      </button>

      <button
        className="rf-inline-actions__button rf-inline-actions__button--primary"
        onClick={() => runAction("retry-scoring")}
        disabled={loading !== null || extractionStatus !== "completed"}
      >
        {loading === "retry-scoring" ? "Retrying scoring..." : "Retry scoring"}
      </button>

      <button
        className="rf-inline-actions__button rf-inline-actions__button--danger"
        onClick={() => runAction("delete")}
        disabled={loading !== null}
      >
        {loading === "delete" ? "Deleting..." : "Delete lead"}
      </button>

      {error ? <p className="rf-inline-actions__error">{error}</p> : null}
    </div>
  );
}