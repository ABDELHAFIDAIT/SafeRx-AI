from __future__ import annotations
from sqlalchemy.orm import Session, selectinload
from backend.app.models.cds_alert import CdsAlert
from backend.app.models.drug import Drug, DciComponent
from backend.app.models.patient import Patient
from backend.app.models.prescription import Prescription, PrescriptionLine
from backend.app.models.user import User
from backend.app.schemas.clinical_schemas import PrescriptionCreate
from backend.app.services.cds_engine import analyse_prescription



def create_prescription( db: Session, payload: PrescriptionCreate, doctor: User ) -> Prescription:
    """
    1. Crée l'en-tête de prescription
    2. Crée les lignes de médicaments
    3. Lance l'analyse CDS sur chaque ligne
    4. Persiste les alertes
    5. Met à jour le status : 'safe' ou 'alerts'
    6. Retourne la prescription complète (lignes + alertes)
    """
    # ── Vérifier que le patient existe ───────────────────────────────────────
    patient: Patient | None = db.query(Patient).get(payload.patient_id)
    if not patient:
        raise ValueError(f"Patient {payload.patient_id} introuvable.")

    # ── Vérifier que tous les drug_id existent ───────────────────────────────
    requested_drug_ids = {line.drug_id for line in payload.lines}
    found_ids = {
        d.id for d in db.query(Drug.id).filter(Drug.id.in_(requested_drug_ids))
    }
    missing = requested_drug_ids - found_ids
    if missing:
        raise ValueError(f"Médicaments introuvables : {missing}")

    # ── Créer l'en-tête ──────────────────────────────────────────────────────
    prescription = Prescription(
        patient_id=payload.patient_id,
        doctor_id=doctor.id,
        fhir_bundle_id=payload.fhir_bundle_id,
        hook_event=payload.hook_event or "order-sign",
        status="draft",
    )
    db.add(prescription)
    db.flush()  # obtenir prescription.id sans commit

    # ── Créer les lignes ─────────────────────────────────────────────────────
    lines: list[PrescriptionLine] = []
    for line_data in payload.lines:
        line = PrescriptionLine(
            prescription_id=prescription.id,
            drug_id=line_data.drug_id,
            dci=line_data.dci,
            dose_mg=line_data.dose_mg,
            dose_unit_raw=line_data.dose_unit_raw,
            frequency=line_data.frequency,
            route=line_data.route,
            duration_days=line_data.duration_days,
        )
        db.add(line)
        lines.append(line)

    db.flush()  # obtenir les line.id

    # ── Moteur de règles CDS ─────────────────────────────────────────────────
    alerts = analyse_prescription(db=db, patient=patient, lines=lines)

    for alert in alerts:
        db.add(alert)

    # ── Mettre à jour le status de la prescription ───────────────────────────
    prescription.status = "alerts" if alerts else "safe"

    db.commit()

    # ── Recharger avec les relations pour la réponse ─────────────────────────
    db.refresh(prescription)
    prescription = (
        db.query(Prescription)
        .options(
            selectinload(Prescription.lines).selectinload(PrescriptionLine.alerts)
        )
        .filter(Prescription.id == prescription.id)
        .one()
    )

    return prescription



def get_prescription(db: Session, prescription_id: int) -> Prescription | None:
    return (
        db.query(Prescription)
        .options(
            selectinload(Prescription.lines).selectinload(PrescriptionLine.alerts)
        )
        .filter(Prescription.id == prescription_id)
        .first()
    )



def list_prescriptions_for_patient( db: Session, patient_id: int, skip: int = 0, limit: int = 20 ) -> list[Prescription]:
    return (
        db.query(Prescription)
        .filter(Prescription.patient_id == patient_id)
        .order_by(Prescription.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

