import { useState, useEffect, useRef } from "react";
import {
    Stethoscope, Search, Plus, Trash2, Send, LogOut,
    ShieldAlert, ShieldCheck, AlertTriangle, Info,
    ChevronDown, ChevronRight, Pill, User, Calendar,
    Activity, Clock, FileText, X, CheckCircle2,
    AlertCircle, Zap, ArrowLeft, RefreshCw, FlaskConical,
    Heart, Baby, Brain, Siren, TriangleAlert
} from "lucide-react";
import authService from "../services/authService";
import api from "../api/api";
import CdsResultPanel from "../components/CdsResultPanel";

/* ─────────────────────────────────────────────
   CONSTANTES
───────────────────────────────────────────── */
const ROUTES = ["orale", "intraveineuse", "intramusculaire", "sous-cutanée",
    "cutanée", "inhalée", "sublinguale", "rectale", "ophtalmique", "nasale"];

const FREQ_OPTIONS = ["1x/jour", "2x/jour", "3x/jour", "4x/jour",
    "toutes les 8h", "toutes les 12h", "toutes les 6h", "si besoin"];

const SEVERITY_CONFIG = {
    MAJOR: { label: "Critique", bg: "bg-red-950/60", border: "border-red-500/40", text: "text-red-300", badge: "bg-red-500/20 text-red-300 border-red-500/30", icon: Siren },
    MODERATE: { label: "Modérée", bg: "bg-amber-950/60", border: "border-amber-500/40", text: "text-amber-300", badge: "bg-amber-500/20 text-amber-300 border-amber-500/30", icon: TriangleAlert },
    MINOR: { label: "Mineure", bg: "bg-blue-950/60", border: "border-blue-500/40", text: "text-blue-300", badge: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: Info },
};

const ALERT_TYPE_LABEL = {
    INTERACTION: "Interaction",
    ALLERGY: "Allergie",
    CONTRA_INDICATION: "Contre-indication",
    REDUNDANT_DCI: "Redondance DCI",
    POSOLOGY: "Posologie",
};

/* ─────────────────────────────────────────────
   HELPERS UI
───────────────────────────────────────────── */
const Spinner = ({ size = 16 }) => (
    <svg style={{ width: size, height: size }} className="animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
);

const Tag = ({ children, color = "slate" }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
        ${color === "blue" ? "bg-blue-500/15 text-blue-300 border border-blue-500/25" :
            color === "emerald" ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25" :
                color === "red" ? "bg-red-500/15 text-red-300 border border-red-500/25" :
                    color === "amber" ? "bg-amber-500/15 text-amber-300 border border-amber-500/25" :
                        "bg-slate-500/15 text-slate-400 border border-slate-500/25"}`}>
        {children}
    </span>
);

/* ─────────────────────────────────────────────
   COMPOSANT : Résultats CDS
───────────────────────────────────────────── */
// function CdsResultPanel({ result, onClose, onNewPrescription }) {
//     const [expanded, setExpanded] = useState({});
//     const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

//     const majorAlerts = result.alerts.filter(a => a.severity === "MAJOR");
//     const moderateAlerts = result.alerts.filter(a => a.severity === "MODERATE");
//     const minorAlerts = result.alerts.filter(a => a.severity === "MINOR");
//     const isSafe = result.alert_count === 0;

//     return (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
//             style={{ background: "rgba(2,8,20,0.85)", backdropFilter: "blur(8px)" }}>
//             <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-700/60 flex flex-col"
//                 style={{ background: "#0d1520" }}>

//                 {/* Header */}
//                 <div className={`px-6 py-4 flex items-center justify-between border-b
//                     ${isSafe ? "border-emerald-700/40 bg-emerald-950/40" : "border-red-700/30 bg-red-950/30"}`}>
//                     <div className="flex items-center gap-3">
//                         {isSafe
//                             ? <ShieldCheck size={22} className="text-emerald-400" />
//                             : <ShieldAlert size={22} className="text-red-400" />}
//                         <div>
//                             <h2 className={`font-semibold text-base ${isSafe ? "text-emerald-300" : "text-red-300"}`}>
//                                 {isSafe ? "Prescription sûre" : `${result.alert_count} alerte${result.alert_count > 1 ? "s" : ""} détectée${result.alert_count > 1 ? "s" : ""}`}
//                             </h2>
//                             <p className="text-xs text-slate-500">
//                                 Prescription #{result.prescription_id} · Analyse CDS complète
//                             </p>
//                         </div>
//                     </div>
//                     <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
//                         <X size={18} />
//                     </button>
//                 </div>

//                 {/* Summary bar */}
//                 {!isSafe && (
//                     <div className="px-6 py-3 flex items-center gap-3 border-b border-slate-700/40 bg-slate-900/30">
//                         {majorAlerts.length > 0 && (
//                             <span className="flex items-center gap-1.5 text-xs font-medium text-red-300 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
//                                 <Siren size={11} /> {majorAlerts.length} critique{majorAlerts.length > 1 ? "s" : ""}
//                             </span>
//                         )}
//                         {moderateAlerts.length > 0 && (
//                             <span className="flex items-center gap-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
//                                 <TriangleAlert size={11} /> {moderateAlerts.length} modérée{moderateAlerts.length > 1 ? "s" : ""}
//                             </span>
//                         )}
//                         {minorAlerts.length > 0 && (
//                             <span className="flex items-center gap-1.5 text-xs font-medium text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">
//                                 <Info size={11} /> {minorAlerts.length} mineure{minorAlerts.length > 1 ? "s" : ""}
//                             </span>
//                         )}
//                     </div>
//                 )}

//                 {/* Alerts list */}
//                 <div className="overflow-y-auto flex-1 px-4 py-4 space-y-2">
//                     {isSafe ? (
//                         <div className="flex flex-col items-center justify-center py-12 text-center">
//                             <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
//                                 <ShieldCheck size={28} className="text-emerald-400" />
//                             </div>
//                             <p className="text-emerald-300 font-medium mb-1">Aucune interaction détectée</p>
//                             <p className="text-slate-500 text-sm">Cette prescription est conforme aux règles CDS SafeRx.</p>
//                         </div>
//                     ) : (
//                         result.alerts.map((alert) => {
//                             const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.MINOR;
//                             const Icon = cfg.icon;
//                             const isExpanded = expanded[alert.id];
//                             return (
//                                 <div key={alert.id}
//                                     className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden transition-all`}>
//                                     <button
//                                         onClick={() => toggle(alert.id)}
//                                         className="w-full px-4 py-3 flex items-start gap-3 text-left">
//                                         <Icon size={15} className={`${cfg.text} mt-0.5 shrink-0`} />
//                                         <div className="flex-1 min-w-0">
//                                             <div className="flex items-center gap-2 flex-wrap">
//                                                 <span className={`text-sm font-medium ${cfg.text}`}>{alert.title}</span>
//                                                 <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${cfg.badge}`}>
//                                                     {ALERT_TYPE_LABEL[alert.alert_type] || alert.alert_type}
//                                                 </span>
//                                             </div>
//                                         </div>
//                                         <ChevronDown size={13} className={`text-slate-500 shrink-0 mt-0.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
//                                     </button>
//                                     {isExpanded && (
//                                         <div className="px-4 pb-3 text-xs text-slate-400 border-t border-white/5 pt-3 leading-relaxed">
//                                             {alert.detail}
//                                         </div>
//                                     )}
//                                 </div>
//                             );
//                         })
//                     )}
//                 </div>

//                 {/* Footer */}
//                 <div className="px-6 py-4 border-t border-slate-700/40 flex gap-3 justify-end bg-slate-900/20">
//                     <button
//                         onClick={onNewPrescription}
//                         className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-300 border border-slate-600/50 hover:border-slate-500/70 hover:text-white transition-all">
//                         <Plus size={14} /> Nouvelle prescription
//                     </button>
//                     <button
//                         onClick={onClose}
//                         className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-all">
//                         <FileText size={14} /> Voir les détails
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// }

/* ─────────────────────────────────────────────
   COMPOSANT : Recherche de médicament
───────────────────────────────────────────── */
function DrugSearchInput({ onSelect }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    useEffect(() => {
        if (query.length < 2) { setResults([]); return; }
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await api.get(`/drugs/search?q=${encodeURIComponent(query)}&limit=8`);
                setResults(res.data || []);
                setOpen(true);
            } catch {
                // Fallback : mock pour démo sans backend
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (drug) => {
        onSelect(drug);
        setQuery("");
        setResults([]);
        setOpen(false);
    };

    return (
        <div ref={ref} className="relative">
            <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-600/40 rounded-xl px-3 py-2.5 focus-within:border-blue-500/50 transition-colors">
                {loading ? <Spinner size={14} /> : <Search size={14} className="text-slate-500" />}
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => results.length > 0 && setOpen(true)}
                    placeholder="Rechercher un médicament (nom ou DCI)…"
                    className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
                />
            </div>
            {open && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border border-slate-600/50 overflow-hidden shadow-2xl z-30"
                    style={{ background: "#111c2d" }}>
                    {results.map((drug) => (
                        <button key={drug.id} onClick={() => handleSelect(drug)}
                            className="w-full px-4 py-3 text-left hover:bg-slate-700/40 transition-colors border-b border-slate-700/30 last:border-0">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm font-medium text-slate-200">{drug.brand_name}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{drug.dci} · {drug.presentation}</p>
                                </div>
                                {drug.is_psychoactive && (
                                    <Tag color="amber"><Brain size={10} /> Psychoactif</Tag>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────
   COMPOSANT PRINCIPAL : Dashboard Médecin
───────────────────────────────────────────── */
export default function DoctorDashboard() {
    const user = authService.getUser();

    // ── État : patient ────────────────────────────────────────────────────
    const [patientId, setPatientId] = useState("");
    const [patientData, setPatientData] = useState(null);
    const [patientLoad, setPatientLoad] = useState(false);
    const [patientErr, setPatientErr] = useState("");

    // ── État : lignes de prescription ────────────────────────────────────
    const [lines, setLines] = useState([]);

    // ── État : soumission ─────────────────────────────────────────────────
    const [submitting, setSubmitting] = useState(false);
    const [cdsResult, setCdsResult] = useState(null);
    const [submitErr, setSubmitErr] = useState("");

    // ── État : historique ─────────────────────────────────────────────────
    const [history, setHistory] = useState([]);
    const [historyLoad, setHistoryLoad] = useState(false);
    const [activeTab, setActiveTab] = useState("new"); // "new" | "history"

    /* ── Charger le patient ─────────────────────────────────────────────── */
    const loadPatient = async () => {
        if (!patientId.trim()) return;
        setPatientLoad(true);
        setPatientErr("");
        setPatientData(null);
        try {
            const res = await api.get(`/patients/${patientId}`);
            setPatientData(res.data);
        } catch (e) {
            setPatientErr(e.response?.status === 404
                ? "Patient introuvable."
                : "Erreur lors du chargement.");
        } finally {
            setPatientLoad(false);
        }
    };

    /* ── Charger l'historique ───────────────────────────────────────────── */
    const loadHistory = async () => {
        if (!patientData) return;
        setHistoryLoad(true);
        try {
            const res = await api.get(`/prescriptions/patient/${patientData.id}`);
            setHistory(res.data || []);
        } catch {
            setHistory([]);
        } finally {
            setHistoryLoad(false);
        }
    };

    useEffect(() => { if (activeTab === "history" && patientData) loadHistory(); }, [activeTab, patientData]);

    /* ── Gestion des lignes ─────────────────────────────────────────────── */
    const addLine = (drug) => {
        setLines(prev => [...prev, {
            _id: Date.now(),
            drug_id: drug.id,
            brand_name: drug.brand_name,
            dci: drug.dci || "",
            dose_mg: "",
            dose_unit_raw: "mg",
            frequency: "1x/jour",
            route: drug.route || "orale",
            duration_days: 7,
        }]);
    };

    const updateLine = (id, field, value) => {
        setLines(prev => prev.map(l => l._id === id ? { ...l, [field]: value } : l));
    };

    const removeLine = (id) => setLines(prev => prev.filter(l => l._id !== id));

    /* ── Soumettre la prescription ──────────────────────────────────────── */
    const submit = async () => {
        if (!patientData) { setSubmitErr("Veuillez sélectionner un patient."); return; }
        if (lines.length === 0) { setSubmitErr("Ajoutez au moins un médicament."); return; }
        const incomplete = lines.find(l => !l.dose_mg || isNaN(parseFloat(l.dose_mg)));
        if (incomplete) { setSubmitErr(`Dosage manquant pour ${incomplete.brand_name}.`); return; }

        setSubmitting(true);
        setSubmitErr("");
        try {
            const payload = {
                patient_id: patientData.id,
                hook_event: "order-sign",
                lines: lines.map(l => ({
                    drug_id: l.drug_id,
                    dci: l.dci,
                    dose_mg: parseFloat(l.dose_mg),
                    dose_unit_raw: l.dose_unit_raw,
                    frequency: l.frequency,
                    route: l.route,
                    duration_days: parseInt(l.duration_days) || 7,
                })),
            };
            const res = await api.post("/prescriptions/", payload);
            setCdsResult(res.data);
        } catch (e) {
            setSubmitErr(e.response?.data?.detail || "Erreur lors de l'analyse CDS.");
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setLines([]);
        setCdsResult(null);
        setSubmitErr("");
    };

    /* ── Calcul âge ─────────────────────────────────────────────────────── */
    const getAge = (birthdate) => {
        if (!birthdate) return "?";
        const d = new Date(birthdate);
        const age = new Date().getFullYear() - d.getFullYear();
        return age;
    };

    /* ─────────────────────────────────────────────────────────────────────
       RENDER
    ───────────────────────────────────────────────────────────────────── */
    return (
        <div className="min-h-screen flex" style={{ background: "#080f1a", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

            {/* ── Sidebar ──────────────────────────────────────────────── */}
            <aside className="w-16 flex flex-col items-center py-6 gap-6 border-r border-slate-800/60 shrink-0"
                style={{ background: "#060d18" }}>
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
                    <Stethoscope size={18} className="text-white" />
                </div>
                <div className="flex-1 flex flex-col items-center gap-2 mt-4">
                    {[
                        { icon: Activity, active: true },
                        { icon: FileText, active: false },
                        { icon: Clock, active: false },
                    ].map(({ icon: Icon, active }, i) => (
                        <button key={i}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all
                                    ${active
                                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                                    : "text-slate-600 hover:text-slate-400 hover:bg-slate-800/40"}`}>
                            <Icon size={18} />
                        </button>
                    ))}
                </div>
                <button
                    onClick={authService.logout}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <LogOut size={16} />
                </button>
            </aside>

            {/* ── Main ─────────────────────────────────────────────────── */}
            <main className="flex-1 flex flex-col overflow-hidden">

                {/* Header */}
                <header className="px-8 py-4 border-b border-slate-800/60 flex items-center justify-between shrink-0"
                    style={{ background: "#060d18" }}>
                    <div>
                        <h1 className="text-base font-semibold text-slate-100">Analyse de prescription</h1>
                        <p className="text-xs text-slate-500 mt-0.5">Moteur CDS SafeRx — 6 règles actives</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs text-emerald-400 font-medium">CDS actif</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/40">
                            <User size={13} className="text-slate-400" />
                            <span className="text-xs text-slate-300 font-medium">
                                Dr. {user?.first_name} {user?.last_name}
                            </span>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-hidden flex gap-0">

                    {/* ── Colonne gauche : formulaire ─────────────────── */}
                    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">

                        {/* Section Patient */}
                        <section>
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <User size={12} /> Patient
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={patientId}
                                    onChange={e => setPatientId(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && loadPatient()}
                                    placeholder="ID du patient…"
                                    className="flex-1 bg-slate-800/60 border border-slate-600/40 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500/50 transition-colors"
                                />
                                <button
                                    onClick={loadPatient}
                                    disabled={patientLoad}
                                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50">
                                    {patientLoad ? <Spinner size={14} /> : <Search size={14} />}
                                    Charger
                                </button>
                            </div>

                            {patientErr && (
                                <p className="mt-2 text-xs text-red-400 flex items-center gap-1.5">
                                    <AlertCircle size={12} /> {patientErr}
                                </p>
                            )}

                            {patientData && (
                                <div className="mt-3 p-4 rounded-xl border border-slate-700/40 bg-slate-800/30">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                                                <User size={18} className="text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-100">
                                                    Patient #{patientData.id}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    {getAge(patientData.birthdate)} ans · {patientData.gender === "M" ? "Homme" : patientData.gender === "F" ? "Femme" : "Autre"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                            {patientData.is_pregnant && <Tag color="red"><Baby size={10} /> Enceinte</Tag>}
                                            {patientData.is_breastfeeding && <Tag color="amber">Allaitement</Tag>}
                                            {patientData.known_allergies?.length > 0 && (
                                                <Tag color="red">⚠ {patientData.known_allergies.length} allergie{patientData.known_allergies.length > 1 ? "s" : ""}</Tag>
                                            )}
                                        </div>
                                    </div>

                                    {/* Tabs */}
                                    <div className="mt-4 flex gap-1 p-1 bg-slate-900/50 rounded-lg">
                                        {[["new", "Nouvelle prescription"], ["history", "Historique"]].map(([tab, label]) => (
                                            <button key={tab} onClick={() => setActiveTab(tab)}
                                                className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all
                                                        ${activeTab === tab
                                                        ? "bg-slate-700 text-slate-200 shadow-sm"
                                                        : "text-slate-500 hover:text-slate-300"}`}>
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Historique */}
                        {activeTab === "history" && patientData && (
                            <section>
                                {historyLoad ? (
                                    <div className="flex justify-center py-8"><Spinner size={20} /></div>
                                ) : history.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500 text-sm">Aucune prescription trouvée.</div>
                                ) : (
                                    <div className="space-y-2">
                                        {history.map(p => {
                                            const alertCount = p.lines?.reduce((n, l) => n + (l.alerts?.length || 0), 0) || 0;
                                            return (
                                                <div key={p.id} className="p-4 rounded-xl border border-slate-700/40 bg-slate-800/20">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-200">
                                                                Prescription #{p.id}
                                                            </p>
                                                            <p className="text-xs text-slate-500 mt-0.5">
                                                                {new Date(p.created_at).toLocaleString("fr-FR")} · {p.lines?.length || 0} médicament(s)
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {alertCount > 0
                                                                ? <Tag color="red"><ShieldAlert size={10} /> {alertCount} alerte{alertCount > 1 ? "s" : ""}</Tag>
                                                                : <Tag color="emerald"><ShieldCheck size={10} /> Sûr</Tag>
                                                            }
                                                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium
                                                                ${p.status === "safe" ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" :
                                                                    p.status === "alerts" ? "text-amber-300 border-amber-500/30 bg-amber-500/10" :
                                                                        "text-slate-400 border-slate-600/40 bg-slate-700/20"}`}>
                                                                {p.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        )}

                        {/* Nouvelle prescription */}
                        {activeTab === "new" && (
                            <>
                                {/* Recherche médicament */}
                                {patientData && (
                                    <section>
                                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Pill size={12} /> Ajouter un médicament
                                        </label>
                                        <DrugSearchInput onSelect={addLine} />
                                    </section>
                                )}

                                {/* Lignes de prescription */}
                                {lines.length > 0 && (
                                    <section>
                                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2 justify-between">
                                            <span className="flex items-center gap-2"><FlaskConical size={12} /> Lignes de prescription</span>
                                            <span className="text-slate-600 font-normal normal-case">{lines.length} médicament{lines.length > 1 ? "s" : ""}</span>
                                        </label>
                                        <div className="space-y-3">
                                            {lines.map((line, idx) => (
                                                <div key={line._id}
                                                    className="p-4 rounded-xl border border-slate-700/40 bg-slate-800/20 group">
                                                    {/* En-tête ligne */}
                                                    <div className="flex items-start justify-between gap-2 mb-3">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-mono text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">
                                                                    {String(idx + 1).padStart(2, "0")}
                                                                </span>
                                                                <p className="text-sm font-semibold text-slate-100">{line.brand_name}</p>
                                                            </div>
                                                            <p className="text-xs text-slate-500 mt-0.5 ml-7">{line.dci}</p>
                                                        </div>
                                                        <button onClick={() => removeLine(line._id)}
                                                            className="text-slate-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>

                                                    {/* Champs */}
                                                    <div className="grid grid-cols-2 gap-2 ml-7">
                                                        {/* Dose */}
                                                        <div>
                                                            <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Dose</label>
                                                            <div className="flex gap-1">
                                                                <input
                                                                    type="number"
                                                                    value={line.dose_mg}
                                                                    onChange={e => updateLine(line._id, "dose_mg", e.target.value)}
                                                                    placeholder="0"
                                                                    className="flex-1 min-w-0 bg-slate-800/80 border border-slate-600/40 rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-blue-500/50 transition-colors"
                                                                />
                                                                <select
                                                                    value={line.dose_unit_raw}
                                                                    onChange={e => updateLine(line._id, "dose_unit_raw", e.target.value)}
                                                                    className="bg-slate-800/80 border border-slate-600/40 rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-blue-500/50 transition-colors">
                                                                    {["mg", "µg", "g", "ml", "UI", "mg/kg"].map(u => <option key={u}>{u}</option>)}
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* Fréquence */}
                                                        <div>
                                                            <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Fréquence</label>
                                                            <select
                                                                value={line.frequency}
                                                                onChange={e => updateLine(line._id, "frequency", e.target.value)}
                                                                className="w-full bg-slate-800/80 border border-slate-600/40 rounded-lg px-3 py-1.5 text-sm text-slate-300 outline-none focus:border-blue-500/50 transition-colors">
                                                                {FREQ_OPTIONS.map(f => <option key={f}>{f}</option>)}
                                                            </select>
                                                        </div>

                                                        {/* Voie */}
                                                        <div>
                                                            <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Voie</label>
                                                            <select
                                                                value={line.route}
                                                                onChange={e => updateLine(line._id, "route", e.target.value)}
                                                                className="w-full bg-slate-800/80 border border-slate-600/40 rounded-lg px-3 py-1.5 text-sm text-slate-300 outline-none focus:border-blue-500/50 transition-colors">
                                                                {ROUTES.map(r => <option key={r}>{r}</option>)}
                                                            </select>
                                                        </div>

                                                        {/* Durée */}
                                                        <div>
                                                            <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Durée (jours)</label>
                                                            <input
                                                                type="number"
                                                                value={line.duration_days}
                                                                onChange={e => updateLine(line._id, "duration_days", e.target.value)}
                                                                min="1"
                                                                className="w-full bg-slate-800/80 border border-slate-600/40 rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-blue-500/50 transition-colors"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Erreur + Soumettre */}
                                {patientData && (
                                    <section>
                                        {submitErr && (
                                            <div className="mb-3 px-4 py-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                                                <AlertCircle size={13} /> {submitErr}
                                            </div>
                                        )}
                                        <button
                                            onClick={submit}
                                            disabled={submitting || lines.length === 0}
                                            className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all
                                                bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white
                                                disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-900/30">
                                            {submitting ? (
                                                <><Spinner size={16} /> Analyse en cours…</>
                                            ) : (
                                                <><Zap size={16} /> Analyser avec SafeRx CDS</>
                                            )}
                                        </button>
                                    </section>
                                )}
                            </>
                        )}
                    </div>

                    {/* ── Colonne droite : résumé patient + règles actives ── */}
                    <aside className="w-72 shrink-0 border-l border-slate-800/60 overflow-y-auto px-5 py-6 space-y-5"
                        style={{ background: "#060d18" }}>

                        {/* Règles CDS */}
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <ShieldCheck size={12} /> Règles CDS actives
                            </p>
                            <div className="space-y-1.5">
                                {[
                                    { label: "Allergies", color: "text-red-400", dot: "bg-red-400" },
                                    { label: "Interactions", color: "text-red-400", dot: "bg-red-400" },
                                    { label: "Contre-indications", color: "text-amber-400", dot: "bg-amber-400" },
                                    { label: "Redondance DCI", color: "text-amber-400", dot: "bg-amber-400" },
                                    { label: "Posologie / âge", color: "text-blue-400", dot: "bg-blue-400" },
                                    { label: "Psychoactifs", color: "text-slate-400", dot: "bg-slate-400" },
                                ].map(({ label, color, dot }) => (
                                    <div key={label} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-800/30">
                                        <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                                        <span className={`text-xs ${color}`}>{label}</span>
                                        <CheckCircle2 size={11} className="text-slate-700 ml-auto" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Info patient (si chargé) */}
                        {patientData && (
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Heart size={12} /> Profil de risque
                                </p>
                                <div className="space-y-2">
                                    {[
                                        ["Âge", `${getAge(patientData.birthdate)} ans`],
                                        ["Genre", patientData.gender === "M" ? "Homme" : patientData.gender === "F" ? "Femme" : "Autre"],
                                        ["Grossesse", patientData.is_pregnant ? "Oui ⚠️" : "Non"],
                                        ["Allaitement", patientData.is_breastfeeding ? "Oui ⚠️" : "Non"],
                                        ["Allergies", patientData.known_allergies?.length > 0 ? patientData.known_allergies.join(", ") : "Aucune"],
                                    ].map(([k, v]) => (
                                        <div key={k} className="flex items-start justify-between gap-2 text-xs">
                                            <span className="text-slate-500 shrink-0">{k}</span>
                                            <span className="text-slate-300 text-right">{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Résumé prescription en cours */}
                        {lines.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Pill size={12} /> Prescription en cours
                                </p>
                                <div className="space-y-1.5">
                                    {lines.map((line, i) => (
                                        <div key={line._id} className="flex items-center gap-2 text-xs text-slate-400">
                                            <span className="text-slate-700 font-mono">{i + 1}.</span>
                                            <span className="text-slate-300 truncate">{line.brand_name}</span>
                                            <span className="ml-auto text-slate-600 shrink-0">{line.dose_mg || "—"} {line.dose_unit_raw}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-800/60 flex justify-between text-xs">
                                    <span className="text-slate-500">Paires à vérifier</span>
                                    <span className="text-slate-300 font-medium">
                                        {lines.length > 1 ? `${lines.length * (lines.length - 1) / 2} interaction${lines.length * (lines.length - 1) / 2 > 1 ? "s" : ""}` : "—"}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Source des données */}
                        <div className="pt-4 border-t border-slate-800/40">
                            <p className="text-[10px] text-slate-600 leading-relaxed">
                                Base interactions : Thésaurus ANSM sept. 2023 · 3 168 paires DCI<br />
                                Base médicaments : medicament.ma · 5 006 spécialités
                            </p>
                        </div>
                    </aside>
                </div>
            </main>

            {/* ── Modal résultats CDS ───────────────────────────────── */}
            {cdsResult && (
                <CdsResultPanel
                    result={cdsResult}
                    onClose={() => setCdsResult(null)}
                    onNewPrescription={resetForm}
                />
            )}
        </div>
    );
}