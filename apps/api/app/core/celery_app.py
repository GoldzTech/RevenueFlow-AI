from celery import Celery

from app.core.config import settings

celery = Celery(
    "revenueflow",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "app.workers.extraction_tasks",
        "app.workers.scoring_tasks",
        "app.workers.proposal_tasks",
    ],
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Sao_Paulo",
    enable_utc=False,
)