import json
from typing import Any

from openai import OpenAI

from app.core.config import settings
from app.schemas.lead_extraction import LeadExtractionRead
from app.schemas.lead_score import LeadScoreRead
from app.schemas.proposal import ProposalLLMOutput


PROPOSAL_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "problem_summary": {"type": "string"},
        "proposed_scope": {"type": "string"},
        "deliverables": {
            "type": "array",
            "items": {"type": "string"},
        },
        "assumptions": {
            "type": "array",
            "items": {"type": "string"},
        },
        "next_steps": {
            "type": "array",
            "items": {"type": "string"},
        },
        "email_subject": {"type": "string"},
        "email_body": {"type": "string"},
    },
    "required": [
        "problem_summary",
        "proposed_scope",
        "deliverables",
        "assumptions",
        "next_steps",
        "email_subject",
        "email_body",
    ],
}


TEMPLATES: dict[str, dict[str, str]] = {
    "general_b2b": {
        "version": "v1",
        "guidance": (
            "Write a concise B2B discovery-stage proposal draft. "
            "Focus on business pain, initial solution framing, likely deliverables, and a soft next-step CTA."
        ),
    },
    "logistics_ops": {
        "version": "v1",
        "guidance": (
            "Write a concise proposal draft for logistics/operations workflow improvement. "
            "Emphasize data flow, process reliability, operational visibility, and integration between systems."
        ),
    },
    "software_services": {
        "version": "v1",
        "guidance": (
            "Write a concise proposal draft for software/service teams. "
            "Emphasize workflow automation, integration, information accuracy, and scalable operations."
        ),
    },
}


def pick_template(segment: str | None) -> tuple[str, str, str]:
    normalized = (segment or "").strip().lower()

    if "logistics" in normalized:
        template_name = "logistics_ops"
    elif "software" in normalized or "saas" in normalized or "technology" in normalized:
        template_name = "software_services"
    else:
        template_name = "general_b2b"

    template = TEMPLATES[template_name]
    return template_name, template["version"], template["guidance"]


def build_payload(
    extraction: LeadExtractionRead,
    score: LeadScoreRead,
    template_name: str,
    template_version: str,
    template_guidance: str,
) -> dict[str, Any]:
    return {
        "template": {
            "name": template_name,
            "version": template_version,
            "guidance": template_guidance,
        },
        "lead_context": {
            "company_name": extraction.company_name,
            "contact_name": extraction.contact_name,
            "segment": extraction.segment,
            "need_summary": extraction.need_summary,
            "urgency": extraction.urgency,
            "budget_signal": extraction.budget_signal,
            "lead_quality_signals": extraction.lead_quality_signals or [],
            "extraction_confidence": extraction.confidence,
        },
        "scoring": {
            "tier": score.tier,
            "priority": score.priority,
            "confidence": score.confidence,
            "rationale": score.rationale,
            "heuristic_score": score.heuristic_score,
        },
    }


class ProposalGenerationService:
    def __init__(self) -> None:
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")

        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model

    def generate(
        self,
        extraction: LeadExtractionRead,
        score: LeadScoreRead,
    ) -> dict[str, Any]:
        template_name, template_version, template_guidance = pick_template(
            extraction.segment
        )

        payload = build_payload(
            extraction=extraction,
            score=score,
            template_name=template_name,
            template_version=template_version,
            template_guidance=template_guidance,
        )

        response = self.client.chat.completions.create(
            model=self.model,
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You generate B2B proposal drafts and reply emails from structured lead context. "
                        "Return only the JSON object that matches the provided schema. "
                        "Be commercially useful, concise, and realistic. "
                        "Do not add extra keys."
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
                    "name": "proposal_draft",
                    "strict": True,
                    "schema": PROPOSAL_JSON_SCHEMA,
                },
            },
        )

        content = response.choices[0].message.content
        if not content:
            raise RuntimeError("The model returned empty content")

        data = json.loads(content)
        output = ProposalLLMOutput.model_validate(data)

        return {
            "provider": "openai",
            "template_name": template_name,
            "template_version": template_version,
            "proposal": output,
        }