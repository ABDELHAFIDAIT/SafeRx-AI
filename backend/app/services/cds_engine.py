from __future__ import annotations
import re
import unicodedata
from datetime import date
from typing import List
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.app.models.cds_alert import CdsAlert
from backend.app.models.drug import Drug, DciComponent
from backend.app.models.drug_interaction import DrugInteraction
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
    """Lowercase + strip — comparaison interne."""
    return dci.strip().lower()



def _normalize_for_ansm(dci: str) -> str:
    """
    Normalise une DCI pour matcher le Thésaurus ANSM.

    Le Thésaurus stocke en MAJUSCULES avec accents (ex: "MÉTOPROLOL").
    medicament.ma stocke en casse mixte (ex: "Métoprolol" ou "METOPROLOL").
    On passe en MAJUSCULES + on supprime les accents des deux côtés
    pour être robuste aux variantes d'encodage.

    Exemples :
      "métoprolol"           → "METOPROLOL"
      "BÉSILATE D'AMLODIPINE" → "BESILATE D'AMLODIPINE"
      "Acide acétylsalicylique" → "ACIDE ACETYLSALICYLIQUE"
    """
    nfd = unicodedata.normalize("NFD", dci.strip().upper())
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn")



def _parse_min_age_years(raw: str | None) -> int | None:
    if not raw:
        return None
    s = raw.lower().strip()
    if any(k in s for k in ("nouveau-né", "neonatal", "nourrisson")):
        return 0
    m = re.search(r"(\d+)\s*mois", s)
    if m:
        return max(0, int(m.group(1)) // 12)
    m = re.search(r"(\d+)\s*(?:ans?|years?)", s)
    if m:
        return int(m.group(1))
    m = re.search(r"^(\d+)$", s)
    if m:
        return int(m.group(1))
    return None



def _mentions_pregnancy(text: str | None) -> bool:
    if not text:
        return False
    kw = ("grossesse", "enceinte", "pregnant", "pregnancy",
          "tératogène", "teratogen", "foetus", "fœtus")
    return any(k in text.lower() for k in kw)



def _mentions_breastfeeding(text: str | None) -> bool:
    if not text:
        return False
    kw = ("allaitement", "allaiter", "breastfeed", "lactation", "lait maternel")
    return any(k in text.lower() for k in kw)



# ─────────────────────────────────────────────────────────────────────────────
#  Règle 6 — INTERACTION
# ─────────────────────────────────────────────────────────────────────────────


def _check_interactions( db: Session, lines: List[PrescriptionLine], primary_dcis: dict[int, List[str]], drugs_by_id: dict[int, Drug] ) -> List[CdsAlert]:
    """
    Détecte les interactions DCI×DCI en une seule requête SQL.

    Stratégie :
      1. Normaliser toutes les DCI de la prescription (ANSM format)
      2. SELECT * FROM drug_interactions
         WHERE UPPER(dci_a) IN (...) AND UPPER(dci_b) IN (...)
         → une seule requête quelle que soit la taille de la prescription
      3. Pour chaque interaction retournée, retrouver les lignes impliquées
         et créer l'alerte sur la ligne "partenaire"
    """
    alerts: List[CdsAlert] = []

    if len(lines) < 2:
        return alerts

    # ── Construire l'index line_id → {dci_ansm_normalisé} ────────────────
    line_dcis_ansm: dict[int, set[str]] = {}
    for line in lines:
        raw_dcis = primary_dcis.get(line.drug_id, [_normalize_dci(line.dci)])
        line_dcis_ansm[line.id] = {_normalize_for_ansm(d) for d in raw_dcis}

    all_dcis_ansm = set().union(*line_dcis_ansm.values())

    if len(all_dcis_ansm) < 2:
        return alerts

    # ── Requête SQL : chercher les paires dont les deux DCI sont présentes ─
    # drug_interactions.dci_a/dci_b sont déjà en majuscules (stockées par le loader)
    # On normalise aussi côté SQL avec UPPER() pour être sûr
    interactions = (
        db.query(DrugInteraction)
        .filter(
            func.upper(DrugInteraction.dci_a).in_(all_dcis_ansm),
            func.upper(DrugInteraction.dci_b).in_(all_dcis_ansm),
        )
        .all()
    )

    if not interactions:
        return alerts

    # ── Index inversé : dci_normalisé → ligne(s) ─────────────────────────
    ansm_to_lines: dict[str, List[PrescriptionLine]] = {}
    for line in lines:
        for dci_norm in line_dcis_ansm[line.id]:
            ansm_to_lines.setdefault(dci_norm, []).append(line)

    seen_pairs: set[frozenset] = set()

    for inter in interactions:
        dci_a_norm = _normalize_for_ansm(inter.dci_a)
        dci_b_norm = _normalize_for_ansm(inter.dci_b)

        lines_a = ansm_to_lines.get(dci_a_norm, [])
        lines_b = ansm_to_lines.get(dci_b_norm, [])

        for line_a in lines_a:
            for line_b in lines_b:
                if line_a.id == line_b.id:
                    continue

                # Éviter les alertes dupliquées pour la même paire de lignes
                pair_key = frozenset([line_a.id, line_b.id,
                                      inter.dci_a, inter.dci_b])
                if pair_key in seen_pairs:
                    continue
                seen_pairs.add(pair_key)

                drug_a = drugs_by_id.get(line_a.drug_id)
                drug_b = drugs_by_id.get(line_b.drug_id)
                name_a = drug_a.brand_name if drug_a else inter.dci_a
                name_b = drug_b.brand_name if drug_b else inter.dci_b

                # Construire le détail clinique
                detail_parts = [
                    f"{inter.level_fr} : {inter.dci_a} + {inter.dci_b}.",
                ]
                if inter.mechanism:
                    detail_parts.append(f"Risque : {inter.mechanism}")
                if inter.recommendation:
                    detail_parts.append(f"Conduite : {inter.recommendation}")

                # Alerte rattachée à la ligne "partenaire" (line_b)
                alerts.append(CdsAlert(
                    prescription_line_id=line_b.id,
                    alert_type="INTERACTION",
                    severity=inter.severity,
                    title=f"Interaction médicamenteuse — {name_a} / {name_b}",
                    detail=" ".join(detail_parts),
                ))

    return alerts



# ─────────────────────────────────────────────────────────────────────────────
#  Moteur principal
# ─────────────────────────────────────────────────────────────────────────────


def analyse_prescription( db: Session, patient: Patient, lines: List[PrescriptionLine] ) -> List[CdsAlert]:
    """
    Analyse toutes les lignes d'une prescription.
    Retourne la liste des CdsAlert à persister (sans commit).
    """
    alerts: List[CdsAlert] = []
    patient_age = _age_years(patient.birthdate) if patient.birthdate else None

    # ── Chargement en batch ───────────────────────────────────────────────
    drug_ids = [line.drug_id for line in lines]

    drugs_by_id: dict[int, Drug] = {
        d.id: d
        for d in db.query(Drug).filter(Drug.id.in_(drug_ids)).all()
    }

    primary_dcis: dict[int, List[str]] = {}
    for comp in (
        db.query(DciComponent).filter(DciComponent.drug_id.in_(drug_ids)).all()
    ):
        primary_dcis.setdefault(comp.drug_id, []).append(
            _normalize_dci(comp.dci)
        )

    patient_allergies: set[str] = set()
    if patient.known_allergies:
        patient_allergies = {_normalize_dci(a) for a in patient.known_allergies}

    dci_to_lines: dict[str, List[PrescriptionLine]] = {}
    for line in lines:
        for dci in primary_dcis.get(line.drug_id, [_normalize_dci(line.dci)]):
            dci_to_lines.setdefault(dci, []).append(line)

    # ── Règle 1 : ALLERGY ────────────────────────────────────────────────
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

    # ── Règle 2 : REDUNDANT_DCI ──────────────────────────────────────────
    seen_redondances: set[str] = set()
    for dci_norm, dup_lines in dci_to_lines.items():
        if len(dup_lines) > 1 and dci_norm not in seen_redondances:
            seen_redondances.add(dci_norm)
            drug_names = [drugs_by_id[l.drug_id].brand_name for l in dup_lines]
            for line in dup_lines[1:]:
                alerts.append(CdsAlert(
                    prescription_line_id=line.id,
                    alert_type="REDUNDANT_DCI",
                    severity="MODERATE",
                    title=f"Redondance de DCI — {line.dci}",
                    detail=(
                        f"La molécule '{dci_norm}' est présente dans plusieurs "
                        f"médicaments : {', '.join(drug_names)}."
                    ),
                ))

    # ── Règle 3 : POSOLOGY (âge minimal) ────────────────────────────────
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

    # ── Règle 4 : CONTRA_INDICATION (grossesse / allaitement) ────────────
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
                    "La fiche du médicament mentionne une contre-indication "
                    "liée à la grossesse."
                    + (f" Semaine gestationelle : {patient.gestational_weeks}."
                       if patient.gestational_weeks else "")
                ),
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

    # ── Règle 5 : PSYCHOACTIVE (informatif) ─────────────────────────────
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

    # ── Règle 6 : INTERACTION (Thésaurus ANSM) ───────────────────────────
    alerts.extend(
        _check_interactions(db, lines, primary_dcis, drugs_by_id)
    )

    return alerts

