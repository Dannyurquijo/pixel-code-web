export const scoreCategories = [
  "automation",
  "sales",
  "customerExperience",
  "data",
  "integrations",
  "ai",
] as const;

export type ScoreCategory = (typeof scoreCategories)[number];

export type Answers = {
  industry: string;
  companySize: string;
  mainGoal: string;
  leadChannels: string[];
  tools: string[];
  manualProcesses: string[];
  painPoints: string[];
  automationLevel: string;
  aiUsage: string;
  primaryProblem: string;
  urgency: string;
  name: string;
  company: string;
  email: string;
  whatsapp: string;
  role: string;
  consent: boolean;
  website?: string;
};

export type Scores = Record<ScoreCategory, number>;

export type Opportunity = {
  category: string;
  title: string;
  description: string;
  status: "Detectado" | "Potencial" | "Por validar";
};

export type Diagnostic = {
  executiveSummary: string;
  mainOpportunity: Opportunity;
  opportunities: Opportunity[];
  nextStep: string;
  scores: Scores;
  source: "gemini" | "rules";
};

export const initialAnswers: Answers = {
  industry: "",
  companySize: "",
  mainGoal: "",
  leadChannels: [],
  tools: [],
  manualProcesses: [],
  painPoints: [],
  automationLevel: "",
  aiUsage: "",
  primaryProblem: "",
  urgency: "",
  name: "",
  company: "",
  email: "",
  whatsapp: "",
  role: "",
  consent: false,
  website: "",
};
