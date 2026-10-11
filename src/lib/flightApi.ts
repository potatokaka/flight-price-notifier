// Client for the M1 subscription API (API Gateway → Lambda → DynamoDB).
// The browser holds no AWS credentials; it only calls these two routes.
//
// Set VITE_FLIGHT_API_URL (e.g. https://abc123.execute-api.us-east-1.amazonaws.com)
// once the backend exists. Until then the UI runs in preview mode: nothing is sent
// anywhere and subscriptions live only in the page's memory.

export type PlanName = "tokyo" | "seoul";

export interface Plan {
  name: PlanName;
  label: string;
  route: string;
  /** Recent cheapest one-way fare in TWD, shown as a hint for a sensible target. */
  referencePrice: number;
}

export const PLANS: Plan[] = [
  { name: "tokyo", label: "台北 ✈ 東京", route: "TPE-TYO", referencePrice: 9325 },
  { name: "seoul", label: "台北 ✈ 首爾", route: "TPE-SEL", referencePrice: 5989 },
];

export interface Subscription {
  route: string;
  plan_name: PlanName;
  target_price: number;
}

const API_URL = (import.meta.env.VITE_FLIGHT_API_URL as string | undefined)?.replace(/\/+$/, "");

export const isPreviewMode = !API_URL;

function toSubscription(row: Record<string, unknown>): Subscription | null {
  const plan = PLANS.find((p) => p.name === row.plan_name || p.route === row.route);
  const target = Number(row.target_price);
  if (!plan || !Number.isFinite(target)) return null;
  return { route: plan.route, plan_name: plan.name, target_price: target };
}

export async function listSubscriptions(email: string): Promise<Subscription[]> {
  if (!API_URL) return [];
  const res = await fetch(`${API_URL}/subscriptions?email=${encodeURIComponent(email)}`);
  if (!res.ok) throw new Error(`讀取訂閱失敗（${res.status}）`);
  const data: unknown = await res.json();
  const rows = Array.isArray(data)
    ? data
    : ((data as { items?: unknown[]; subscriptions?: unknown[] })?.items ??
      (data as { subscriptions?: unknown[] })?.subscriptions ??
      []);
  return rows
    .map((r) => toSubscription(r as Record<string, unknown>))
    .filter((s): s is Subscription => s !== null);
}

export async function saveSubscription(
  email: string,
  plan: Plan,
  targetPrice: number,
): Promise<Subscription> {
  const sub: Subscription = { route: plan.route, plan_name: plan.name, target_price: targetPrice };
  if (!API_URL) return sub;
  const res = await fetch(`${API_URL}/subscribe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, plan_name: plan.name, target_price: targetPrice }),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      detail = body.error ?? body.message ?? "";
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(detail || `儲存失敗（${res.status}）`);
  }
  return sub;
}
