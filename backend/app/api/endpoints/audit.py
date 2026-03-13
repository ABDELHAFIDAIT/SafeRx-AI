from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.app.api.deps import get_current_user, get_db
from backend.app.models.audit_cds_hook import AuditCdsHook
from backend.app.models.cds_alert import CdsAlert
from backend.app.models.user import User, Role
from backend.app.schemas.audit_schemas import AuditCreate, AuditBulkCreate, AuditOut



router = APIRouter()



@router.post( "/", response_model=AuditOut, status_code=status.HTTP_201_CREATED, summary="Logger la décision du praticien sur une alerte CDS" )
def create_audit_entry( payload: AuditCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user) ):
    # Vérifier que l'alerte existe
    alert = db.query(CdsAlert).filter(CdsAlert.id == payload.alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alerte {payload.alert_id} introuvable.",
        )

    entry = AuditCdsHook(
        alert_id        = payload.alert_id,
        prescription_id = payload.prescription_id,
        doctor_id       = current_user.id,
        decision        = payload.decision,
        # Snapshot de l'alerte au moment de la décision
        alert_type      = alert.alert_type,
        alert_severity  = alert.severity,
        alert_title     = alert.title,
        justification   = payload.justification,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry




@router.post( "/bulk", response_model=list[AuditOut], status_code=status.HTTP_201_CREATED, summary="Logger toutes les décisions d'une prescription en une fois" )
def create_bulk_audit( payload: AuditBulkCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user) ):
    entries = []
    for decision in payload.decisions:
        alert = db.query(CdsAlert).filter(CdsAlert.id == decision.alert_id).first()
        if not alert:
            continue  # On skip les alertes inconnues sans bloquer

        entry = AuditCdsHook(
            alert_id        = decision.alert_id,
            prescription_id = payload.prescription_id,
            doctor_id       = current_user.id,
            decision        = decision.decision,
            alert_type      = alert.alert_type,
            alert_severity  = alert.severity,
            alert_title     = alert.title,
            justification   = decision.justification,
        )
        db.add(entry)
        entries.append(entry)

    db.commit()
    for e in entries:
        db.refresh(e)
    return entries




@router.get( "/prescription/{prescription_id}", response_model=list[AuditOut], summary="Historique d'audit d'une prescription" )
def get_audit_for_prescription( prescription_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user) ):
    return (
        db.query(AuditCdsHook)
        .filter(AuditCdsHook.prescription_id == prescription_id)
        .order_by(AuditCdsHook.created_at.desc())
        .all()
    )




@router.get( "/recent", response_model=list[AuditOut], summary="Flux d'audit récent — admin uniquement" )
def get_recent_audit( limit: int = Query(default=50, le=200), db: Session = Depends(get_db), current_user: User = Depends(get_current_user) ):
    if current_user.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs.",
        )
    return (
        db.query(AuditCdsHook)
        .order_by(AuditCdsHook.created_at.desc())
        .limit(limit)
        .all()
    )


