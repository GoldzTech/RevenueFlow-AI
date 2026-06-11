import json
from typing import Any, Literal

from openai import OpenAI

from app.core.config import settings
from app.schemas.lead_extraction import LeadExtractionRead
from app.schemas.lead_score import LeadScoreLLMOutput


Tier = Literal["hot", "warm", "cold"]
Priority = Literal["high", "medium", "low"]

LEAD_SCORE_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "tier": {"type": "string", "enum": ["hot", "warm", "cold"]},
        "priority": {"type": "string", "enum": ["high", "medium", "low"]},
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        "rationale": {"type": "string"},
    },
    "required": ["tier", "priority", "confidence", "rationale"],
}


def clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


def heuristic_score(ex: LeadExtractionRead) -> tuple[int, dict[str, Any]]:
    score = 0
    details: dict[str, Any] = {"rules": {}}

    urgency_points = {"high": 25, "medium": 15, "low": 5, "unknown": 0}
    budget_points = {"high": 25, "medium": 15, "low": 5, "unknown": 0}

    u = (ex.urgency or "unknown").lower()
    b = (ex.budget_signal or "unknown").lower()

    up = urgency_points.get(u, 0)
    bp = budget_points.get(b, 0)

    score += up
    score += bp

    details["rules"]["urgency"] = {"value": u, "points": up}
    details["rules"]["budget_signal"] = {"value": b, "points": bp}

    if ex.company_name:
        score += 5
        details["rules"]["company_name"] = {"value": True, "points": 5}
    else:
        details["rules"]["company_name"] = {"value": False, "points": 0}

    if ex.contact_name:
        score += 5
        details["rules"]["contact_name"] = {"value": True, "points": 5}
    else:
        details["rules"]["contact_name"] = {"value": False, "points": 0}

    signals = ex.lead_quality_signals or []
    signal_points = min(20, 5 * len(signals))
    score += signal_points
    details["rules"]["lead_quality_signals"] = {
        "count": len(signals),
        "points": signal_points,
        "signals": signals[:8],
    }

    if ex.need_summary and len(ex.need_summary.strip()) >= 20:
        score += 10
        details["rules"]["need_summary_length"] = {"value": ">=20", "points": 10}
    else:
        details["rules"]["need_summary_length"] = {"value": "<20", "points": 0}

    details["total"] = score
    return score, details


def tier_from_score(score: int) -> Tier:
    if score >= 60:
        return "hot"
    if score >= 35:
        return "warm"
    return "cold"


def priority_from_score(score: int, urgency: str | None) -> Priority:
    u = (urgency or "unknown").lower()
    if score >= 65 or u == "high":
        return "high"
    if score >= 40:
        return "medium"
    return "low"


def heuristic_confidence(score: int) -> float:
    return clamp(0.35 + (score / 100.0) * 0.5)


def build_scoring_payload(
    extraction: LeadExtractionRead,
    h_score: int,
    h_tier: Tier,
    h_priority: Priority,
    h_conf: float,
    h_details: dict[str, Any],
) -> dict[str, Any]:
    """
    Build a JSON-safe payload explicitly.
    Do not include created_at / updated_at / any datetime field.
    """
    return {
        "extraction": {
            "company_name": extraction.company_name,
            "contact_name": extraction.contact_name,
            "segment": extraction.segment,
            "need_summary": extraction.need_summary,
            "urgency": extraction.urgency,
            "budget_signal": extraction.budget_signal,
            "lead_quality_signals": extraction.lead_quality_signals or [],
            "confidence": extraction.confidence,
        },
        "heuristic": {
            "score": h_score,
            "tier": h_tier,
            "priority": h_priority,
            "confidence": h_conf,
            "details": h_details,
        },
    }


class LeadScoringService:
    def __init__(self) -> None:
        self.model = settings.openai_model
        self.client = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None

    def score(self, extraction: LeadExtractionRead) -> dict[str, Any]:
        h_score, h_details = heuristic_score(extraction)
        h_tier = tier_from_score(h_score)
        h_priority = priority_from_score(h_score, extraction.urgency)
        h_conf = heuristic_confidence(h_score)

        result: dict[str, Any] = {
            "heuristic_score": h_score,
            "heuristic_details": h_details,
            "final": {
                "tier": h_tier,
                "priority": h_priority,
                "confidence": h_conf,
                "rationale": "Heuristic-based score (AI rationale unavailable).",
            },
            "ai": None,
        }

        if not self.client:
            return result

        payload = build_scoring_payload(
            extraction=extraction,
            h_score=h_score,
            h_tier=h_tier,
            h_priority=h_priority,
            h_conf=h_conf,
            h_details=h_details,
        )

        response = self.client.chat.completions.create(
            model=self.model,
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a sales ops scoring assistant. "
                        "Given structured lead extraction plus heuristic scoring, "
                        "output a short, audit-friendly rationale and a recommended tier, priority, and confidence. "
                        "Keep rationale under 240 characters. No extra keys."
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(payload, ensure_ascii=False),
                },
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "lead_score",
                    "strict": True,
                    "schema": LEAD_SCORE_JSON_SCHEMA,
                },
            },
        )

        content = response.choices[0].message.content
        if not content:
            return result

        ai_payload = json.loads(content)
        ai_out = LeadScoreLLMOutput.model_validate(ai_payload)

        tier_rank = {"cold": 0, "warm": 1, "hot": 2}
        if abs(tier_rank[ai_out.tier] - tier_rank[h_tier]) <= 1:
            final_tier = ai_out.tier
        else:
            final_tier = h_tier

        priority_rank = {"low": 0, "medium": 1, "high": 2}
        if abs(priority_rank[ai_out.priority] - priority_rank[h_priority]) <= 1:
            final_priority = ai_out.priority
        else:
            final_priority = h_priority

        final_conf = clamp((h_conf + ai_out.confidence) / 2.0)

        result["ai"] = ai_out.model_dump(mode="json")
        result["final"] = {
            "tier": final_tier,
            "priority": final_priority,
            "confidence": final_conf,
            "rationale": ai_out.rationale,
        }

        return result