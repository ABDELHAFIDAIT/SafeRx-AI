from __future__ import annotations
import re
from datetime import date
from typing import List, Tuple
from sqlalchemy.orm import Session
from backend.app.models.cds_alert import CdsAlert
from backend.app.models.drug import Drug, DciComponent
from backend.app.models.patient import Patient
from backend.app.models.prescription import PrescriptionLine



# ─────────────────────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────────────────────



def _age_years(birthdate: date) -> int:
    today = date.today()
    return today.year - birthdate.year - (
        (today.month, today.day) < (birthdate.month, birthdate.day)
    )



def _normalize_dci(dci: str) -> str:
    """Lowercase + strip pour comparaison insensible à la casse."""
    return dci.strip().lower()



def _parse_min_age_years(raw: str | None) -> int | None:
    """
    Tente d'extraire un âge minimal en années depuis la chaîne brute.
    Exemples : '2 ans', '6 mois', '12 years', '18', 'nourrisson'
    """
    if not raw:
        return None
    raw_lower = raw.lower().strip()

    # Nourrisson / nouveau-né => ~0 an
    if any(k in raw_lower for k in ("nouveau-né", "neonatal", "nourrisson")):
        return 0

    # "X mois"
    m = re.search(r"(\d+)\s*mois", raw_lower)
    if m:
        months = int(m.group(1))
        return max(0, months // 12)  # arrondi inférieur en années

    # "X ans" / "X years"
    m = re.search(r"(\d+)\s*(?:ans?|years?)", raw_lower)
    if m:
        return int(m.group(1))

    # Nombre seul → supposé en années
    m = re.search(r"^(\d+)$", raw_lower)
    if m:
        return int(m.group(1))

    return None



def _mentions_pregnancy(text: str | None) -> bool:
    if not text:
        return False
    keywords = ("grossesse", "enceinte", "pregnant", "pregnancy",
                "tératogène", "teratogen", "foetus", "fœtus")
    t = text.lower()
    return any(k in t for k in keywords)



def _mentions_breastfeeding(text: str | None) -> bool:
    if not text:
        return False
    keywords = ("allaitement", "allaiter", "breastfeed", "lactation",
                "lait maternel")
    t = text.lower()
    return any(k in t for k in keywords)



# ─────────────────────────────────────────────────────────────────────────────
#  Moteur principal
# ─────────────────────────────────────────────────────────────────────────────


AlertTuple = Tuple[str, str, str, str]  # (alert_type, severity, title, detail)


def analyse_prescription( db: Session, patient: Patient, lines: List[PrescriptionLine] ) -> List[CdsAlert]:
    """
    Analyse toutes les lignes d'une prescription et retourne la liste
    des CdsAlert à persister (sans commit — la responsabilité revient au caller).
    """
    alerts: List[CdsAlert] = []
    patient_age = _age_years(patient.birthdate) if patient.birthdate else None

    # Charger les médicaments en une seule requête
    drug_ids = [line.drug_id for line in lines]
    drugs_by_id: dict[int, Drug] = {
        d.id: d for d in db.query(Drug).filter(Drug.id.in_(drug_ids)).all()
    }

    # Charger les DCI primaires (position=1) pour les redondances
    primary_dcis: dict[int, List[str]] = {}
    components = (
        db.query(DciComponent)
        .filter(DciComponent.drug_id.in_(drug_ids))
        .all()
    )
    for comp in components:
        primary_dcis.setdefault(comp.drug_id, []).append(
            _normalize_dci(comp.dci)
        )

    # Allergies normalisées du patient
    patient_allergies: set[str] = set()
    if patient.known_allergies:
        patient_allergies = {_normalize_dci(a) for a in patient.known_allergies}

    # Index DCI → ligne(s) pour détecter les redondances
    dci_to_lines: dict[str, List[PrescriptionLine]] = {}
    for line in lines:
        for dci in primary_dcis.get(line.drug_id, [_normalize_dci(line.dci)]):
            dci_to_lines.setdefault(dci, []).append(line)

    # ── Règle 1 : ALLERGY ────────────────────────────────────────────────────
    for line in lines:
        line_dcis = primary_dcis.get(line.drug_id, [_normalize_dci(line.dci)])
        hit = patient_allergies & set(line_dcis)
        if hit:
            alerts.append(CdsAlert(
                prescription_line_id=line.id,
                alert_type="ALLERGY",
                severity="MAJOR",
                title=f"Allergie connue — {line.dci}",
                detail=(
                    f"Le patient a une allergie documentée à : "
                    f"{', '.join(hit)}. "
                    f"Médicament prescrit : {drugs_by_id[line.drug_id].brand_name}."
                ),
            ))

    # ── Règle 2 : REDUNDANT_DCI ──────────────────────────────────────────────
    seen_redondances: set[str] = set()
    for dci_norm, dup_lines in dci_to_lines.items():
        if len(dup_lines) > 1:
            key = dci_norm
            if key in seen_redondances:
                continue
            seen_redondances.add(key)
            drug_names = [
                drugs_by_id[l.drug_id].brand_name for l in dup_lines
            ]
            # Ajouter l'alerte sur la 2e ligne (et suivantes)
            for line in dup_lines[1:]:
                alerts.append(CdsAlert(
                    prescription_line_id=line.id,
                    alert_type="REDUNDANT_DCI",
                    severity="MODERATE",
                    title=f"Redondance de DCI — {line.dci}",
                    detail=(
                        f"La molécule '{dci_norm}' est présente dans plusieurs "
                        f"médicaments de la prescription : "
                        f"{', '.join(drug_names)}."
                    ),
                ))

    # ── Règle 3 : POSOLOGY (âge minimal) ─────────────────────────────────────
    if patient_age is not None:
        for line in lines:
            drug = drugs_by_id.get(line.drug_id)
            if not drug or not drug.min_age:
                continue
            min_years = _parse_min_age_years(drug.min_age)
            if min_years is not None and patient_age < min_years:
                alerts.append(CdsAlert(
                    prescription_line_id=line.id,
                    alert_type="POSOLOGY",
                    severity="MAJOR",
                    title=f"Âge insuffisant — {drug.brand_name}",
                    detail=(
                        f"Ce médicament est autorisé à partir de {drug.min_age}. "
                        f"Âge du patient : {patient_age} an(s)."
                    ),
                ))

    # ── Règle 4 : CONTRA_INDICATION (grossesse / allaitement) ────────────────
    for line in lines:
        drug = drugs_by_id.get(line.drug_id)
        if not drug:
            continue

        if patient.is_pregnant and _mentions_pregnancy(drug.contraindications):
            alerts.append(CdsAlert(
                prescription_line_id=line.id,
                alert_type="CONTRA_INDICATION",
                severity="MAJOR",
                title=f"Contre-indication grossesse — {drug.brand_name}",
                detail=(
                    f"La fiche du médicament mentionne une contre-indication "
                    f"liée à la grossesse. "
                    f"{'Semaine gestationelle : ' + str(patient.gestational_weeks) if patient.gestational_weeks else ''}"
                ).strip(),
            ))

        if patient.is_breastfeeding and _mentions_breastfeeding(drug.contraindications):
            alerts.append(CdsAlert(
                prescription_line_id=line.id,
                alert_type="CONTRA_INDICATION",
                severity="MODERATE",
                title=f"Contre-indication allaitement — {drug.brand_name}",
                detail=(
                    "La fiche du médicament mentionne une contre-indication "
                    "liée à l'allaitement."
                ),
            ))

    # ── Règle 5 : PSYCHOACTIVE (information) ─────────────────────────────────
    for line in lines:
        drug = drugs_by_id.get(line.drug_id)
        if drug and drug.is_psychoactive:
            alerts.append(CdsAlert(
                prescription_line_id=line.id,
                alert_type="POSOLOGY",
                severity="MINOR",
                title=f"Substance psychoactive — {drug.brand_name}",
                detail=(
                    "Ce médicament contient une ou plusieurs substances "
                    "psychoactives. Vérifier l'absence de co-prescription "
                    "sédative et informer le patient."
                ),
            ))

    return alerts

