from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.dashboard import DashboardSummaryRead
from app.services.dashboard.metrics import build_dashboard_summary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryRead)
def dashboard_summary(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    tier: str | None = Query(default=None),
    approval_status: str | None = Query(default=None),
    source: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> DashboardSummaryRead:
    return build_dashboard_summary(
        db,
        date_from=date_from,
        date_to=date_to,
        tier=tier,
        approval_status=approval_status,
        source=source,
    )