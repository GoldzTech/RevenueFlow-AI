"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export function LeadFilters({
  initialTier,
  initialPriority,
}: {
  initialTier: string;
  initialPriority: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tier, setTier] = useState(initialTier);
  const [priority, setPriority] = useState(initialPriority);

  const nextQuery = useMemo(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");

    if (tier) params.set("tier", tier);
    else params.delete("tier");

    if (priority) params.set("priority", priority);
    else params.delete("priority");

    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }, [tier, priority, searchParams]);

  return (
    <div className="rf-filters">
      <style>{`
        .rf-filters {
          display: grid;
          gap: 16px;
          padding: 0;
        }

        .rf-filters__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .rf-filters__title {
          margin: 0;
          color: #f8fbff;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .rf-filters__subtitle {
          margin: 4px 0 0;
          color: #8fa7c6;
          font-size: 13px;
        }

        .rf-filters__shell {
          display: grid;
          gap: 16px;
          padding: 18px;
          border-radius: 22px;
          background:
            linear-gradient(180deg, rgba(12, 18, 30, 0.94), rgba(15, 23, 42, 0.88));
          box-shadow:
            0 18px 44px rgba(2, 8, 23, 0.26),
            inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }

        .rf-filters__grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .rf-filters__label {
          display: grid;
          gap: 8px;
        }

        .rf-filters__label span {
          color: #dbe7f6;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .rf-filters__select {
          width: 100%;
          border: 0;
          border-radius: 16px;
          background:
            linear-gradient(180deg, rgba(8, 13, 24, 0.96), rgba(15, 23, 42, 0.92));
          color: #f8fbff;
          padding: 13px 14px;
          font: inherit;
          outline: none;
          box-sizing: border-box;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          color-scheme: dark;
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.02);
        }

        .rf-filters__select:focus {
          box-shadow:
            inset 0 0 0 1px rgba(129, 140, 248, 0.55),
            0 0 0 4px rgba(99, 102, 241, 0.10);
        }

        .rf-filters__select option {
          background: #0b1220;
          color: #f8fbff;
        }

        .rf-filters__actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .rf-filters__button {
          border: 0;
          border-radius: 16px;
          padding: 12px 16px;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.18s ease, opacity 0.18s ease;
        }

        .rf-filters__button:hover {
          transform: translateY(-1px);
        }

        .rf-filters__button--primary {
          background: linear-gradient(135deg, #6366f1, #7c3aed);
          color: white;
          box-shadow: 0 14px 28px rgba(99, 102, 241, 0.24);
        }

        .rf-filters__button--ghost {
          background: rgba(255, 255, 255, 0.04);
          color: #dbe7f6;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
        }

        @media (max-width: 720px) {
          .rf-filters__grid {
            grid-template-columns: 1fr;
          }

          .rf-filters__actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>

      <div className="rf-filters__header">
        <div>
          <p className="rf-filters__title">Workspace filters</p>
          <p className="rf-filters__subtitle">
            Focus on the most relevant opportunities in a cleaner way.
          </p>
        </div>
      </div>

      <div className="rf-filters__shell">
        <div className="rf-filters__grid">
          <label className="rf-filters__label">
            <span>Tier</span>
            <select
              className="rf-filters__select"
              value={tier}
              onChange={(e) => setTier(e.target.value)}
            >
              <option value="">All tiers</option>
              <option value="hot">hot</option>
              <option value="warm">warm</option>
              <option value="cold">cold</option>
            </select>
          </label>

          <label className="rf-filters__label">
            <span>Priority</span>
            <select
              className="rf-filters__select"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="">All priorities</option>
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </select>
          </label>
        </div>

        <div className="rf-filters__actions">
          <button
            className="rf-filters__button rf-filters__button--primary"
            onClick={() => router.push(nextQuery)}
          >
            Apply filters
          </button>

          <button
            className="rf-filters__button rf-filters__button--ghost"
            onClick={() => {
              setTier("");
              setPriority("");
              router.push("/");
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}