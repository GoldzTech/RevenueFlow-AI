"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export function DashboardFilters({
  initialDateFrom,
  initialDateTo,
  initialTier,
  initialApprovalStatus,
  initialSource,
}: {
  initialDateFrom: string;
  initialDateTo: string;
  initialTier: string;
  initialApprovalStatus: string;
  initialSource: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [tier, setTier] = useState(initialTier);
  const [approvalStatus, setApprovalStatus] = useState(initialApprovalStatus);
  const [source, setSource] = useState(initialSource);

  const nextQuery = useMemo(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");

    if (dateFrom) params.set("date_from", dateFrom);
    else params.delete("date_from");

    if (dateTo) params.set("date_to", dateTo);
    else params.delete("date_to");

    if (tier) params.set("tier", tier);
    else params.delete("tier");

    if (approvalStatus) params.set("approval_status", approvalStatus);
    else params.delete("approval_status");

    if (source) params.set("source", source);
    else params.delete("source");

    const qs = params.toString();
    return qs ? `/dashboard?${qs}` : "/dashboard";
  }, [dateFrom, dateTo, tier, approvalStatus, source, searchParams]);

  return (
    <div className="rf-dashboard-filters">
      <style>{`
        .rf-dashboard-filters {
          display: grid;
          gap: 16px;
          padding: 22px;
          border-radius: 26px;
          background:
            linear-gradient(180deg, rgba(14, 20, 33, 0.96), rgba(10, 16, 28, 0.92));
          box-shadow:
            0 22px 56px rgba(2, 8, 23, 0.30),
            inset 0 1px 0 rgba(255, 255, 255, 0.03);
          margin-bottom: 24px;
        }

        .rf-dashboard-filters__title {
          margin: 0;
          color: #f8fbff;
          font-size: 20px;
          font-weight: 800;
        }

        .rf-dashboard-filters__subtitle {
          margin: 6px 0 0;
          color: #8fa7c6;
          font-size: 13px;
        }

        .rf-dashboard-filters__grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
        }

        .rf-dashboard-filters__label {
          display: grid;
          gap: 8px;
        }

        .rf-dashboard-filters__label span {
          color: #dbe7f6;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .rf-dashboard-filters__input,
        .rf-dashboard-filters__select {
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

        .rf-dashboard-filters__input:focus,
        .rf-dashboard-filters__select:focus {
          box-shadow:
            inset 0 0 0 1px rgba(129, 140, 248, 0.55),
            0 0 0 4px rgba(99, 102, 241, 0.10);
        }

        .rf-dashboard-filters__select option {
          background: #0b1220;
          color: #f8fbff;
        }

        .rf-dashboard-filters__actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .rf-dashboard-filters__button {
          border: 0;
          border-radius: 16px;
          padding: 12px 16px;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
          color: white;
          transition: transform 0.18s ease, opacity 0.18s ease;
        }

        .rf-dashboard-filters__button:hover {
          transform: translateY(-1px);
        }

        .rf-dashboard-filters__button--primary {
          background: linear-gradient(135deg, #6366f1, #7c3aed);
        }

        .rf-dashboard-filters__button--ghost {
          background: rgba(255, 255, 255, 0.05);
          color: #dbe7f6;
        }

        @media (max-width: 1100px) {
          .rf-dashboard-filters__grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .rf-dashboard-filters__grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div>
        <p className="rf-dashboard-filters__title">Performance filters</p>
        <p className="rf-dashboard-filters__subtitle">
          Slice metrics by date range, tier, approval state, and source.
        </p>
      </div>

      <div className="rf-dashboard-filters__grid">
        <label className="rf-dashboard-filters__label">
          <span>Date from</span>
          <input
            className="rf-dashboard-filters__input"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>

        <label className="rf-dashboard-filters__label">
          <span>Date to</span>
          <input
            className="rf-dashboard-filters__input"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>

        <label className="rf-dashboard-filters__label">
          <span>Tier</span>
          <select
            className="rf-dashboard-filters__select"
            value={tier}
            onChange={(e) => setTier(e.target.value)}
          >
            <option value="">All</option>
            <option value="hot">hot</option>
            <option value="warm">warm</option>
            <option value="cold">cold</option>
          </select>
        </label>

        <label className="rf-dashboard-filters__label">
          <span>Approval status</span>
          <select
            className="rf-dashboard-filters__select"
            value={approvalStatus}
            onChange={(e) => setApprovalStatus(e.target.value)}
          >
            <option value="">All</option>
            <option value="pending">pending</option>
            <option value="edited">edited</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="sent">sent</option>
          </select>
        </label>

        <label className="rf-dashboard-filters__label">
          <span>Source</span>
          <input
            className="rf-dashboard-filters__input"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="manual"
          />
        </label>
      </div>

      <div className="rf-dashboard-filters__actions">
        <button
          className="rf-dashboard-filters__button rf-dashboard-filters__button--primary"
          onClick={() => router.push(nextQuery)}
        >
          Apply filters
        </button>

        <button
          className="rf-dashboard-filters__button rf-dashboard-filters__button--ghost"
          onClick={() => {
            setDateFrom("");
            setDateTo("");
            setTier("");
            setApprovalStatus("");
            setSource("");
            router.push("/dashboard");
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}