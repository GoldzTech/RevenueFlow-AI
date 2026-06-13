# RevenueFlow AI

AI-powered lead qualification, proposal generation, and human approval workflow platform.

RevenueFlow AI transforms raw inbound lead messages into a structured commercial workflow. A lead enters the system, is extracted and scored by AI, converted into a proposal draft, and routed through human approval before any final action is taken.

Most AI projects stop at text generation. This one focuses on workflow value: it shows how AI can support a real business process end to end — qualification, prioritization, proposal drafting, approval, and reporting — backed by asynchronous processing, persistent workflow state, audit-friendly job tracking, and an executive dashboard.

## Demo

[![Watch the demo](https://img.youtube.com/vi/oaYHY2RZnbM/0.jpg)](https://youtu.be/oaYHY2RZnbM?si=Fdrrr_LMyfB60Zmy)

## Key features

* Lead intake from raw commercial messages
* AI extraction of structured business data
* Automatic lead scoring and prioritization
* Proposal and email draft generation
* Human-in-the-loop approval flow
* Background job processing
* Workflow event and error tracking
* Executive dashboard with operational metrics
* PostgreSQL persistence for core domain data

## Core workflow

1. A lead is created from a raw message or commercial note.
2. The API stores the lead and queues background work.
3. A worker extracts structured fields from the text.
4. The scoring engine classifies the lead as hot, warm, or cold.
5. The proposal engine drafts a commercial response.
6. A human reviews, edits, approves, rejects, or sends the proposal.
7. The dashboard surfaces operational metrics and recent activity.

## Architecture

```text
Frontend (Next.js)
        ↓
API (FastAPI)
        ↓
Redis Queue
        ↓
Celery Workers
        ↓
OpenAI
        ↓
PostgreSQL
```

### Main responsibilities

* The web app handles lead intake, dashboarding, and approval actions.
* The API stores the domain objects and exposes workflow endpoints.
* Celery workers process extraction, scoring, and proposal generation asynchronously.
* Redis manages the job queue.
* PostgreSQL stores the full workflow state, including jobs and events.

## Example workflow data

### Input

> We need help qualifying inbound leads and generating proposal drafts for our sales team.

### Example output

```json
{
  "company": "Unknown",
  "request_type": "lead_operations",
  "priority": "high",
  "confidence": 0.91,
  "next_step": "generate_proposal"
}
```

## Main domains

* `leads`
* `lead_extractions`
* `lead_scores`
* `proposals`
* `workflow_jobs`
* `workflow_events`

## Tech stack

* **Frontend:** Next.js
* **Backend:** FastAPI, SQLAlchemy, Psycopg
* **Async processing:** Celery
* **Queue / broker:** Redis
* **Database:** PostgreSQL
* **AI provider:** OpenAI (`gpt-4o-mini`)
* **Local deployment:** Docker Compose

## Screenshots

![Lead workspace](./assets/screenshots/home.png)

![Lead detail](./assets/screenshots/lead-detail.png)

![Approval center](./assets/screenshots/approval-center.png)

![Executive dashboard](./assets/screenshots/dashboard.png)

![Workflow audit trail](./assets/screenshots/workflow-log.png)

![PostgreSQL proof](./assets/screenshots/postgres-proof.png)

## Getting started

### Prerequisites

* Docker and Docker Compose
* Python 3.12+ (only needed for running the backend outside Docker)
* Node.js 18+ (only needed for running the frontend outside Docker)

### Run locally

```bash
docker compose up --build
```

Open:

* Web app: `http://localhost:3000`
* API: `http://localhost:8000`

### Environment variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Description |
|---|---|
| `API_HOST` | Host the API binds to (default `0.0.0.0`) |
| `API_PORT` | Port the API listens on (default `8000`) |
| `API_ENV` | Environment name (`development`, `production`, ...) |
| `API_DEBUG` | Enables debug mode |
| `POSTGRES_DB` | PostgreSQL database name |
| `POSTGRES_USER` | PostgreSQL user |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `POSTGRES_HOST` | PostgreSQL host |
| `POSTGRES_PORT` | PostgreSQL port |
| `DATABASE_URL` | Full SQLAlchemy/Postgres connection string |
| `REDIS_HOST` | Redis host |
| `REDIS_PORT` | Redis port |
| `REDIS_URL` | Redis connection string |
| `CELERY_BROKER_URL` | Celery broker (Redis) URL |
| `CELERY_RESULT_BACKEND` | Celery result backend (Redis) URL |
| `NEXT_PUBLIC_API_URL` | Public API URL used by the frontend |
| `INTERNAL_API_URL` | Internal API URL used for server-side requests |
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_MODEL` | OpenAI model used for extraction/generation (default `gpt-4o-mini`) |
| `EXTRACTION_PROVIDER` | AI provider used for extraction (`openai`) |

### Core backend dependencies

* FastAPI, Uvicorn
* SQLAlchemy, Psycopg
* Celery, Redis
* OpenAI SDK
* Pydantic / Pydantic Settings
* python-dotenv

## Roadmap

### V1

Portfolio-grade workflow with intake, extraction, scoring, proposal generation, approval flow, dashboard, and async execution. *(current status)*

### V2

Integrations, authentication, multi-user support, CRM writeback, email automation, and stronger operational controls.

### V3

Multi-tenant SaaS features, RBAC, billing hooks, advanced analytics, quality evaluation, and cloud production deployment.

## Contact

Miguel Ribeiro de Sousa — [LinkedIn](https://www.linkedin.com/in/miguel-ribeiro-de-sousa)