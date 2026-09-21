import type { Answers, Scores } from "./types";

type ValidScan = Answers;

const cap = (value: number) => Math.min(100, Math.max(0, value));
const hasAny = (values: string[], needles: string[]) =>
  values.some((value) => needles.some((needle) => value.toLowerCase().includes(needle)));

export function calculateScores(input: ValidScan): Scores {
  const manualCount = input.manualProcesses.length;
  const lowAutomation = input.automationLevel === "Bajo" || input.automationLevel === "Ninguno";
  const disconnected = hasAny(input.painPoints, ["desconect", "duplic", "información dispersa"]);
  const spreadsheet = hasAny(input.tools, ["excel", "hojas"]);
  const crm = hasAny(input.tools, ["crm"]);
  const erp = hasAny(input.tools, ["erp"]);
  const whatsapp = hasAny(input.leadChannels, ["whatsapp"]);
  const manualFollowup = hasAny(input.painPoints, ["seguimiento", "prospectos"]);
  const reports = hasAny(input.manualProcesses, ["reporte", "captura", "consolidación"]);
  const dataPain = hasAny(input.painPoints, ["dato", "reporte", "visibilidad", "información"]);
  const aiNone = input.aiUsage === "No usamos IA";

  return {
    automation: cap(20 + manualCount * 13 + (lowAutomation ? 22 : 0)),
    sales: cap(18 + (whatsapp ? 24 : 0) + (manualFollowup ? 30 : 0) + (!crm ? 12 : 0)),
    customerExperience: cap(18 + (whatsapp ? 16 : 0) + (hasAny(input.painPoints, ["respuesta", "cliente", "demora"]) ? 34 : 0)),
    data: cap(18 + (spreadsheet ? 22 : 0) + (reports ? 26 : 0) + (dataPain ? 24 : 0)),
    integrations: cap(15 + (disconnected ? 42 : 0) + ((erp || crm) && input.tools.length > 1 ? 24 : 0)),
    ai: cap(20 + (aiNone ? 18 : 30) + manualCount * 7 + (input.aiUsage === "Uso avanzado" ? -28 : 0)),
  };
}

export function visibleLevel(score: number): "Bajo" | "Moderado" | "Alto potencial" {
  if (score >= 68) return "Alto potencial";
  if (score >= 40) return "Moderado";
  return "Bajo";
}
