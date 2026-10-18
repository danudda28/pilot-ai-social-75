import { PLANS } from "@/lib/credits";

/** Piese recomandate pe lună. Planurile vechi rămân ca să nu se rupă conturile existente. */
export const PLAN_LIMITS: Record<string, number> = {
  free: 3,
  debut: 15,
  studio: 44,
  maison: 88,
  semnatura: 162,
  agentie: 700,
  basic: 10,
  pro: 50,
  business: 999,
};

export const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  ...Object.fromEntries(PLANS.map((plan) => [plan.id, plan.name])),
  basic: "Basic",
  pro: "Pro",
  business: "Business",
};
