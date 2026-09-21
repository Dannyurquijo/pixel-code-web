"use client";

import { useMemo, useState } from "react";
import type { Answers, Diagnostic, ScoreCategory } from "./types";
import { initialAnswers } from "./types";
import { visibleLevel } from "./scoring";

const WEBSITE = "https://dupixelcode.com";
const CONTACT_URL = "https://api.whatsapp.com/send/?phone=524423479755&text=Hola%20DU%20Pixel%20Code%2C%20quiero%20dar%20seguimiento%20a%20mi%20Business%20Scan.&type=phone_number&app_absent=0";
const PRIVACY_URL = "";

type Stage = "intro" | "company" | "goals" | "operations" | "digital" | "context" | "contact" | "loading" | "result";

const stages: Stage[] = ["company", "goals", "operations", "digital", "context", "contact"];
const scoreLabels: Record<ScoreCategory, string> = {
  automation: "Automatización", sales: "Ventas", customerExperience: "Experiencia",
  data: "Datos", integrations: "Integraciones", ai: "IA",
};

const options = {
  industry: ["Servicios profesionales", "Comercio", "Manufactura", "Salud", "Educación", "Tecnología", "Construcción", "Otro"],
  companySize: ["1–5 personas", "6–20 personas", "21–50 personas", "51–200 personas", "Más de 200"],
  mainGoal: ["Generar más oportunidades", "Mejorar el seguimiento comercial", "Reducir tareas manuales", "Integrar sistemas", "Obtener mejores reportes", "Aplicar IA con sentido"],
  leadChannels: ["WhatsApp", "Sitio web", "Redes sociales", "Email", "Teléfono", "Referidos", "Marketplace"],
  tools: ["Excel / Hojas de cálculo", "CRM", "ERP", "Email", "WhatsApp Business", "Sistema propio", "Herramientas desconectadas", "Ninguna herramienta central"],
  manualProcesses: ["Seguimiento de prospectos", "Captura de información", "Elaboración de reportes", "Cotizaciones", "Agenda y recordatorios", "Atención de consultas", "Consolidación de datos", "Aprobaciones internas"],
  painPoints: ["Seguimiento inconsistente", "Información dispersa", "Datos duplicados", "Sistemas desconectados", "Reportes tardíos", "Respuesta lenta al cliente", "Falta de visibilidad", "Demasiadas tareas repetitivas"],
  automationLevel: ["Ninguno", "Bajo", "Intermedio", "Avanzado"],
  aiUsage: ["No usamos IA", "Pruebas aisladas", "Uso frecuente", "Uso avanzado"],
  urgency: ["Explorando opciones", "Este trimestre", "En los próximos 30 días", "Es prioritario ahora"],
};

function BrandIdentity({ compact = false }: { compact?: boolean }) {
  return <span className={`brand-identity ${compact ? "compact" : ""}`}>
    <span className="brand-logo-wrap"><img src="/du-logo-Cuadrado.png" width={compact ? 38 : 48} height={compact ? 38 : 48} alt="" /></span>
    <span><b>DU PIXEL CODE</b><small>BUSINESS SCAN</small></span>
  </span>;
}

function SingleChoice({ label, values, value, onChange }: { label: string; values: string[]; value: string; onChange: (value: string) => void }) {
  return <fieldset className="question"><legend>{label}</legend><div className="choice-grid">
    {values.map((item) => <button type="button" className={`choice ${value === item ? "selected" : ""}`} aria-pressed={value === item} onClick={() => onChange(item)} key={item}><span>{item}</span><b aria-hidden>→</b></button>)}
  </div></fieldset>;
}

function MultiChoice({ label, hint, values, selected, onChange, max = 5 }: { label: string; hint?: string; values: string[]; selected: string[]; onChange: (values: string[]) => void; max?: number }) {
  const toggle = (item: string) => selected.includes(item) ? onChange(selected.filter((v) => v !== item)) : selected.length < max && onChange([...selected, item]);
  return <fieldset className="question"><legend>{label}</legend>{hint && <p className="hint">{hint}</p>}<div className="chip-grid">
    {values.map((item) => <button type="button" className={`chip ${selected.includes(item) ? "selected" : ""}`} aria-pressed={selected.includes(item)} onClick={() => toggle(item)} key={item}>{selected.includes(item) ? "✓ " : "+ "}{item}</button>)}
  </div></fieldset>;
}

export function BusinessScan() {
  const [stage, setStage] = useState<Stage>("intro");
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
  const [error, setError] = useState("");
  const currentIndex = stages.indexOf(stage);
  const progress = stage === "intro" ? 0 : stage === "result" ? 100 : Math.max(8, ((currentIndex + 1) / stages.length) * 100);
  const update = <K extends keyof Answers>(key: K, value: Answers[K]) => setAnswers((old) => ({ ...old, [key]: value }));

  const canContinue = useMemo(() => {
    if (stage === "company") return Boolean(answers.industry && answers.companySize);
    if (stage === "goals") return Boolean(answers.mainGoal && answers.leadChannels.length);
    if (stage === "operations") return answers.tools.length > 0 && answers.manualProcesses.length > 0 && answers.painPoints.length > 0;
    if (stage === "digital") return Boolean(answers.automationLevel && answers.aiUsage);
    if (stage === "context") return answers.primaryProblem.trim().length >= 10 && Boolean(answers.urgency);
    if (stage === "contact") return Boolean(answers.name.trim().length > 1 && answers.company.trim().length > 1 && /^\S+@\S+\.\S+$/.test(answers.email) && answers.role.trim().length > 1 && answers.consent);
    return false;
  }, [stage, answers]);

  const goNext = () => {
    const index = stages.indexOf(stage);
    if (index >= 0 && index < stages.length - 1) { setStage(stages[index + 1]); window.scrollTo({ top: 0, behavior: "smooth" }); }
  };
  const goBack = () => {
    const index = stages.indexOf(stage);
    setStage(index <= 0 ? "intro" : stages[index - 1]);
  };

  const submit = async () => {
    if (!canContinue) return;
    setError(""); setStage("loading");
    try {
      const response = await fetch("/api/business-scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(answers) });
      const data = await response.json();
      if (!response.ok || !data.diagnostic) throw new Error(data.error || "No fue posible completar el análisis.");
      setDiagnostic(data.diagnostic); setStage("result");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible completar el análisis."); setStage("contact");
    }
  };

  const reset = () => { setAnswers(initialAnswers); setDiagnostic(null); setError(""); setStage("intro"); };

  if (stage === "intro") return <main className="shell intro-shell">
    <header className="brand"><BrandIdentity /></header>
    <section className="hero">
      <div className="eyebrow"><span /> Infraestructura digital inteligente</div>
      <h1>Descubre oportunidades de <em>automatización e IA</em> en tu empresa</h1>
      <p className="hero-copy">Convierte procesos, herramientas y datos aislados en una primera ruta de acción clara. Recibe un diagnóstico ejecutivo alineado con la operación real de tu empresa.</p>
      <button className="primary hero-cta" onClick={() => setStage("company")}>Iniciar Business Scan <span>→</span></button>
      <div className="trust-row"><span><b>3–4</b> minutos</span><span><b>01</b> diagnóstico personalizado</span><span><b>PDF</b> ejecutivo gratuito</span></div>
      <div className="brand-principles" aria-label="Principios DU Pixel Code"><span>Interoperabilidad</span><span>Escalabilidad</span><span>Observabilidad</span><span>Control humano</span></div>
    </section>
    <aside className="orb" aria-hidden><div className="orb-core"><small>DIGITAL</small><strong>DU</strong><span>CORE</span></div><i /><i /><i /><b className="orb-label orb-label-one">AI</b><b className="orb-label orb-label-two">DATA</b><b className="orb-label orb-label-three">APIs</b></aside>
    <footer className="micro-footer">AI · AUTOMATION · CUSTOM SOFTWARE · DATA</footer>
  </main>;

  if (stage === "loading") return <main className="shell loading-shell"><div className="scan-loader"><div className="scan-ring" /><span className="brand-logo-wrap"><img src="/du-logo-Cuadrado.png" width={58} height={58} alt="" /></span></div><h1>Construyendo tu diagnóstico</h1><p>Estamos conectando tus respuestas con las oportunidades más relevantes.</p><div className="loading-steps"><span className="active">Analizando procesos</span><span>Priorizando oportunidades</span><span>Preparando reporte</span></div></main>;

  if (stage === "result" && diagnostic) return <Result diagnostic={diagnostic} answers={answers} onReset={reset} />;

  return <main className="shell scan-shell">
    <header className="topbar"><button className="logo-button" onClick={() => setStage("intro")} aria-label="Volver al inicio"><BrandIdentity compact /></button><span className="step-label">Paso {currentIndex + 1} de {stages.length}</span></header>
    <div className="progress" aria-label={`${Math.round(progress)}% completado`}><span style={{ width: `${progress}%` }} /></div>
    <section className="form-panel">
      {stage === "company" && <><div className="section-kicker">01 · TU EMPRESA</div><h1>Empecemos por el contexto</h1><p>Esto nos ayuda a dimensionar recomendaciones realistas para tu operación.</p><SingleChoice label="¿En qué sector opera tu empresa?" values={options.industry} value={answers.industry} onChange={(v) => update("industry", v)} /><SingleChoice label="¿Cuál es el tamaño de tu equipo?" values={options.companySize} value={answers.companySize} onChange={(v) => update("companySize", v)} /></>}
      {stage === "goals" && <><div className="section-kicker">02 · ENFOQUE COMERCIAL</div><h1>¿Qué quieres mejorar primero?</h1><p>La prioridad define qué señales tendrán mayor peso en el análisis.</p><SingleChoice label="Objetivo principal" values={options.mainGoal} value={answers.mainGoal} onChange={(v) => update("mainGoal", v)} /><MultiChoice label="¿Por dónde llegan tus prospectos o clientes?" hint="Selecciona hasta 5" values={options.leadChannels} selected={answers.leadChannels} onChange={(v) => update("leadChannels", v)} /></>}
      {stage === "operations" && <><div className="section-kicker">03 · OPERACIÓN</div><h1>Así fluye el trabajo hoy</h1><p>Buscamos fricción real, no tecnología por tecnología.</p><MultiChoice label="Herramientas que forman parte de tu operación" values={options.tools} selected={answers.tools} onChange={(v) => update("tools", v)} /><MultiChoice label="Procesos que todavía requieren trabajo manual" values={options.manualProcesses} selected={answers.manualProcesses} onChange={(v) => update("manualProcesses", v)} /><MultiChoice label="¿Qué situaciones generan más fricción?" values={options.painPoints} selected={answers.painPoints} onChange={(v) => update("painPoints", v)} /></>}
      {stage === "digital" && <><div className="section-kicker">04 · MADUREZ DIGITAL</div><h1>Tu punto de partida</h1><p>Un buen diagnóstico parte de lo que ya funciona y evita sobredimensionar la solución.</p><SingleChoice label="Nivel actual de automatización" values={options.automationLevel} value={answers.automationLevel} onChange={(v) => update("automationLevel", v)} /><SingleChoice label="Uso actual de inteligencia artificial" values={options.aiUsage} value={answers.aiUsage} onChange={(v) => update("aiUsage", v)} /></>}
      {stage === "context" && <><div className="section-kicker">05 · RETO PRINCIPAL</div><h1>Danos la señal que falta</h1><p>Descríbelo con tus palabras. No necesitas usar términos técnicos.</p><label className="text-label">¿Qué problema te gustaría resolver primero?<textarea maxLength={700} value={answers.primaryProblem} onChange={(e) => update("primaryProblem", e.target.value)} placeholder="Ejemplo: los prospectos llegan por WhatsApp, pero el seguimiento depende de hojas de cálculo y recordatorios manuales…" /><span>{answers.primaryProblem.length}/700</span></label><SingleChoice label="¿Cuándo te gustaría avanzar?" values={options.urgency} value={answers.urgency} onChange={(v) => update("urgency", v)} /></>}
      {stage === "contact" && <><div className="section-kicker">06 · TU REPORTE</div><h1>¿A nombre de quién preparamos el diagnóstico?</h1><p>Estos datos identifican tu reporte ejecutivo y permiten a DU Pixel Code dar seguimiento si lo autorizas.</p>{error && <div className="error" role="alert">{error}</div>}<div className="input-grid"><label>Nombre completo<input maxLength={100} autoComplete="name" value={answers.name} onChange={(e) => update("name", e.target.value)} /></label><label>Empresa<input maxLength={120} autoComplete="organization" value={answers.company} onChange={(e) => update("company", e.target.value)} /></label><label>Correo profesional<input type="email" maxLength={160} autoComplete="email" value={answers.email} onChange={(e) => update("email", e.target.value)} /></label><label>WhatsApp <small>(opcional)</small><input maxLength={30} inputMode="tel" autoComplete="tel" value={answers.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} /></label><label className="wide">Cargo o función<input maxLength={100} autoComplete="organization-title" value={answers.role} onChange={(e) => update("role", e.target.value)} /></label></div><label className="consent"><input type="checkbox" checked={answers.consent} onChange={(e) => update("consent", e.target.checked)} /><span>Acepto que DU Pixel Code trate la información proporcionada para generar este diagnóstico y pueda contactarme para dar seguimiento. No se venderán mis datos.</span></label>{PRIVACY_URL && <a className="privacy-link" href={PRIVACY_URL} target="_blank" rel="noreferrer">Consultar Aviso de Privacidad</a>}<input className="honeypot" tabIndex={-1} autoComplete="off" aria-hidden value={answers.website} onChange={(e) => update("website", e.target.value)} /></>}
    </section>
    <nav className="form-nav"><button className="secondary" onClick={goBack}>← Atrás</button>{stage === "contact" ? <button className="primary" disabled={!canContinue} onClick={submit}>Generar diagnóstico →</button> : <button className="primary" disabled={!canContinue} onClick={goNext}>Continuar →</button>}</nav>
  </main>;
}

function Result({ diagnostic, answers, onReset }: { diagnostic: Diagnostic; answers: Answers; onReset: () => void }) {
  const website = WEBSITE;
  const contactHref = CONTACT_URL;
  const downloadPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const gold: [number, number, number] = [197, 160, 89]; const ink: [number, number, number] = [17, 15, 11];
    pdf.setFillColor(5, 5, 5); pdf.rect(0, 0, 210, 297, "F");
    pdf.setFillColor(...gold); pdf.rect(0, 0, 5, 297, "F");
    pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(16); pdf.text("DU PIXEL CODE", 16, 20);
    pdf.setTextColor(...gold); pdf.setFontSize(9); pdf.text("DIGITAL OPPORTUNITY REPORT", 16, 28);
    pdf.setTextColor(175, 185, 198); pdf.setFont("helvetica", "normal"); pdf.text(new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" }), 194, 20, { align: "right" });
    pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(24); pdf.text(answers.company.slice(0, 36), 16, 43);
    const block = (title: string, content: string, y: number, maxLines: number) => { pdf.setTextColor(...gold); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.text(title.toUpperCase(), 16, y); pdf.setTextColor(235, 240, 246); pdf.setFont("helvetica", "normal"); pdf.setFontSize(9.5); const lines = pdf.splitTextToSize(content, 174).slice(0, maxLines); pdf.text(lines, 16, y + 6, { lineHeightFactor: 1.35 }); return y + 7 + lines.length * 4.3; };
    let y = block("Diagnóstico ejecutivo", diagnostic.executiveSummary, 57, 8) + 4;
    pdf.setFillColor(...ink); pdf.roundedRect(13, y - 3, 184, 34, 3, 3, "F");
    pdf.setTextColor(...gold); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.text("PRINCIPAL OPORTUNIDAD", 18, y + 4);
    pdf.setTextColor(255, 255, 255); pdf.setFontSize(13); pdf.text(diagnostic.mainOpportunity.title, 18, y + 12);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.text(pdf.splitTextToSize(diagnostic.mainOpportunity.description, 168).slice(0, 3), 18, y + 19, { lineHeightFactor: 1.3 });
    y += 40; pdf.setTextColor(...gold); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.text("OPORTUNIDADES DETECTADAS", 16, y); y += 7;
    diagnostic.opportunities.slice(0, 3).forEach((op, index) => { pdf.setTextColor(...gold); pdf.setFontSize(10); pdf.text(String(index + 1).padStart(2, "0"), 16, y); pdf.setTextColor(255, 255, 255); pdf.setFontSize(10); pdf.text(op.title, 28, y); pdf.setTextColor(176, 187, 201); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.4); const lines = pdf.splitTextToSize(op.description, 160).slice(0, 2); pdf.text(lines, 28, y + 5, { lineHeightFactor: 1.25 }); pdf.setFont("helvetica", "bold"); y += 17; });
    y = block("Próximo paso", diagnostic.nextStep, Math.max(y + 2, 220), 4);
    pdf.setFillColor(...gold); pdf.roundedRect(13, 254, 184, 18, 2, 2, "F"); pdf.setTextColor(5, 5, 5); pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.text("Convierte estas oportunidades en soluciones reales.", 105, 265, { align: "center" });
    pdf.setTextColor(160, 171, 184); pdf.setFontSize(8); pdf.text("DU PIXEL CODE  ·  AI · AUTOMATION · SOFTWARE · DATA", 16, 284); pdf.text(website.replace(/^https?:\/\//, ""), 194, 284, { align: "right" });
    const safeCompany = answers.company.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "Empresa";
    pdf.save(`DU-Business-Scan-${safeCompany}.pdf`);
  };
  return <main className="shell result-shell"><header className="topbar"><div className="logo-button"><BrandIdentity compact /></div><span className={`source-tag ${diagnostic.source}`}>{diagnostic.source === "gemini" ? "Análisis asistido por IA" : "Motor de diagnóstico DU"}</span></header><section className="result-hero"><div><div className="section-kicker">DIAGNÓSTICO COMPLETADO</div><h1>{answers.company}, aquí está tu mapa de oportunidades.</h1><p>{diagnostic.executiveSummary}</p></div><div className="result-actions"><button className="primary" onClick={downloadPdf}>Descargar PDF ↓</button><a className="secondary" href={contactHref} target="_blank" rel="noreferrer">Hablar con DU →</a></div></section><section className="score-board"><h2>Potencial detectado</h2><div className="score-grid">{Object.entries(diagnostic.scores).map(([key, score]) => <div className="score-item" key={key}><div><span>{scoreLabels[key as ScoreCategory]}</span><b>{visibleLevel(score)}</b></div><div className="score-track"><i style={{ width: `${score}%` }} /></div></div>)}</div></section><section className="main-opportunity"><div><span>{diagnostic.mainOpportunity.status}</span><small>Principal oportunidad</small><h2>{diagnostic.mainOpportunity.title}</h2><p>{diagnostic.mainOpportunity.description}</p></div><div className="op-number">01</div></section><section className="opportunities"><div className="section-heading"><span>OPORTUNIDADES COMPLEMENTARIAS</span><h2>Un camino gradual, no una transformación de golpe.</h2></div><div className="op-grid">{diagnostic.opportunities.map((op, index) => <article key={op.title}><span>0{index + 2}</span><small>{op.status} · {op.category}</small><h3>{op.title}</h3><p>{op.description}</p></article>)}</div></section><section className="next-step"><div><small>PRÓXIMO PASO RECOMENDADO</small><h2>De oportunidad a piloto.</h2><p>{diagnostic.nextStep}</p></div><a className="primary" href={contactHref} target="_blank" rel="noreferrer">Convierte estas oportunidades en soluciones reales →</a></section><footer className="result-footer"><span>DU PIXEL CODE</span><span>AI · AUTOMATION · SOFTWARE · DATA</span><a href={website} target="_blank" rel="noreferrer">{website.replace(/^https?:\/\//, "")}</a><button onClick={onReset}>Realizar otro diagnóstico</button></footer></main>;
}
