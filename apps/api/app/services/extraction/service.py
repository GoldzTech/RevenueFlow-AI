import json
from typing import Any

from openai import OpenAI

from app.core.config import settings
from app.schemas.lead_extraction import LeadExtractionLLMOutput

# OpenAI Structured Outputs strict schema: explicitly disallow extra keys
# and require all top-level keys. See OpenAI docs examples. :contentReference[oaicite:1]{index=1}
LEAD_EXTRACTION_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "company_name": {"type": ["string", "null"]},
        "contact_name": {"type": ["string", "null"]},
        "segment": {"type": ["string", "null"]},
        "need_summary": {"type": "string"},
        "urgency": {"type": "string", "enum": ["low", "medium", "high", "unknown"]},
        "budget_signal": {"type": "string", "enum": ["low", "medium", "high", "unknown"]},
        "lead_quality_signals": {"type": "array", "items": {"type": "string"}},
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
    },
    "required": [
        "company_name",
        "contact_name",
        "segment",
        "need_summary",
        "urgency",
        "budget_signal",
        "lead_quality_signals",
        "confidence",
    ],
}


class LeadExtractionService:
    def __init__(self) -> None:
        if settings.extraction_provider != "openai":
            raise RuntimeError(
                f"Unsupported extraction provider: {settings.extraction_provider}"
            )

        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")

        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model

    def extract(self, raw_content: str) -> LeadExtractionLLMOutput:
        response = self.client.chat.completions.create(
            model=self.model,
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Extract structured sales lead data. "
                        "Return ONLY the JSON object that matches the provided schema. "
                        "If a field is unknown, use null when allowed. "
                        "Do not add extra keys."
                    ),
                },
                {"role": "user", "content": raw_content},
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "lead_extraction",
                    "strict": True,
                    "schema": LEAD_EXTRACTION_JSON_SCHEMA,
                },
            },
        )

        content = response.choices[0].message.content
        if not content:
            raise RuntimeError("The model returned empty content")

        payload = json.loads(content)
        return LeadExtractionLLMOutput.model_validate(payload)