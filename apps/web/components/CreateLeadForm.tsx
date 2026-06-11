"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function CreateLeadForm() {
  const router = useRouter();
  const [source, setSource] = useState("manual");
  const [rawContent, setRawContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/v1/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source,
          raw_content: rawContent,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create lead");
      }

      setSource("manual");
      setRawContent("");
      router.refresh();
    } catch {
      setError("Could not create the lead.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rf-create-card">
      <style>{`
        .rf-create-card {
          position: relative;
          overflow: hidden;
          padding: 26px;
          border-radius: 28px;
          background:
            linear-gradient(180deg, rgba(17, 25, 40, 0.96), rgba(12, 18, 30, 0.92));
          box-shadow:
            0 24px 60px rgba(2, 8, 23, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }

        .rf-create-card::before {
          content: "";
          position: absolute;
          inset: -20% auto auto -10%;
          width: 220px;
          height: 220px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.18), transparent 70%);
          pointer-events: none;
        }

        .rf-create-card__header {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 8px;
          margin-bottom: 20px;
        }

        .rf-create-card__eyebrow {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(99, 102, 241, 0.12);
          color: #c7d2fe;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .rf-create-card__title {
          margin: 0;
          font-size: 30px;
          font-weight: 850;
          letter-spacing: -0.04em;
          color: #f8fbff;
        }

        .rf-create-card__text {
          margin: 0;
          color: #96aac8;
          line-height: 1.72;
          font-size: 14px;
          max-width: 720px;
        }

        .rf-create-form {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 18px;
        }

        .rf-create-form__grid {
          display: grid;
          gap: 18px;
        }

        .rf-create-form__label {
          display: grid;
          gap: 9px;
        }

        .rf-create-form__label span {
          color: #dbe7f6;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .rf-create-form__input,
        .rf-create-form__textarea {
          width: 100%;
          border: 0;
          border-radius: 18px;
          background:
            linear-gradient(180deg, rgba(8, 13, 24, 0.96), rgba(15, 23, 42, 0.92));
          color: #f8fbff;
          padding: 15px 17px;
          font: inherit;
          outline: none;
          box-sizing: border-box;
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.02);
          transition:
            box-shadow 0.18s ease,
            transform 0.18s ease,
            background 0.18s ease;
        }

        .rf-create-form__input::placeholder,
        .rf-create-form__textarea::placeholder {
          color: #6f83a2;
        }

        .rf-create-form__input:focus,
        .rf-create-form__textarea:focus {
          background:
            linear-gradient(180deg, rgba(9, 15, 27, 0.98), rgba(16, 24, 44, 0.94));
          box-shadow:
            inset 0 0 0 1px rgba(129, 140, 248, 0.55),
            0 0 0 4px rgba(99, 102, 241, 0.10),
            0 10px 24px rgba(15, 23, 42, 0.24);
        }

        .rf-create-form__textarea {
          min-height: 190px;
          resize: vertical;
          line-height: 1.75;
        }

        .rf-create-form__footer {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: center;
          flex-wrap: wrap;
        }

        .rf-create-form__hint {
          color: #8397b6;
          font-size: 13px;
          line-height: 1.7;
          max-width: 540px;
        }

        .rf-create-form__button {
          min-width: 190px;
          border: 0;
          border-radius: 18px;
          padding: 15px 20px;
          font: inherit;
          font-weight: 800;
          color: white;
          cursor: pointer;
          background: linear-gradient(135deg, #6366f1, #7c3aed 55%, #2563eb);
          box-shadow:
            0 18px 35px rgba(99, 102, 241, 0.26),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
          transition: transform 0.18s ease, opacity 0.18s ease, box-shadow 0.18s ease;
        }

        .rf-create-form__button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 24px 44px rgba(99, 102, 241, 0.32),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }

        .rf-create-form__button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }

        .rf-create-form__error {
          margin: 0;
          color: #fca5a5;
          font-size: 13px;
          font-weight: 700;
        }

        @media (max-width: 720px) {
          .rf-create-card {
            padding: 20px;
            border-radius: 22px;
          }

          .rf-create-card__title {
            font-size: 24px;
          }

          .rf-create-form__footer {
            flex-direction: column;
            align-items: stretch;
          }

          .rf-create-form__button {
            width: 100%;
          }
        }
      `}</style>

      <div className="rf-create-card__header">
        <span className="rf-create-card__eyebrow">Lead intake</span>
        <h2 className="rf-create-card__title">Create a new lead</h2>
        <p className="rf-create-card__text">
          Add a raw inbound message, commercial note, or client request and let
          RevenueFlow AI transform it into structured insight, scoring, proposal
          drafting, and approval-ready output.
        </p>
      </div>

      <form className="rf-create-form" onSubmit={handleSubmit}>
        <div className="rf-create-form__grid">
          <label className="rf-create-form__label">
            <span>Source</span>
            <input
              className="rf-create-form__input"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="manual"
            />
          </label>

          <label className="rf-create-form__label">
            <span>Raw content</span>
            <textarea
              className="rf-create-form__textarea"
              value={rawContent}
              onChange={(e) => setRawContent(e.target.value)}
              placeholder="Example: Delray Logistics wants to improve information flow between departments, reduce data loss across tools, evaluate pricing, and book a call before Q3."
              rows={7}
            />
          </label>
        </div>

        <div className="rf-create-form__footer">
          <div className="rf-create-form__hint">
            Better input quality produces stronger extraction, scoring, proposal
            drafts, and approval outcomes.
          </div>

          <button
            className="rf-create-form__button"
            type="submit"
            disabled={loading || !rawContent.trim()}
          >
            {loading ? "Creating lead..." : "Create lead"}
          </button>
        </div>

        {error ? <p className="rf-create-form__error">{error}</p> : null}
      </form>
    </section>
  );
}