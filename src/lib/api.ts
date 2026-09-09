import type { ObligationCategory } from "./obligations";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const TOKEN_KEY = "multazim.token";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      setToken(null);
      if (!location.pathname.startsWith("/login")) location.href = "/login";
    }
    throw new ApiError(res.status, body.error ?? "حدث خطأ غير متوقع");
  }
  return body;
}

export type Office = {
  id: string;
  name: string;
  email: string;
  alertPhones: string;
  notifyOrgContacts: boolean;
  contactPhone: string;
  contactEmail: string;
  timezone: string;
  logoDataUrl: string | null;
  role: "office" | "admin";
  plan: "trial" | "basic" | "pro";
  status: "active" | "suspended";
  planExpiresAt: string | null;
  createdAt: string;
};

export const PLAN_LABEL: Record<Office["plan"], string> = { trial: "تجريبي", basic: "أساسي", pro: "احترافي" };

export type SiteContact = {
  supportPhone: string;
  supportWhatsapp: string;
  supportEmail: string;
  supportHours: string;
  announcement: string;
};

export type Ticket = {
  id: string;
  type: "issue" | "billing" | "question";
  subject: string;
  body: string;
  status: "open" | "answered" | "closed";
  reply: string;
  createdAt: string;
  updatedAt: string;
  office?: { id: string; name: string; email: string; contactPhone: string };
};

export const TICKET_TYPE: Record<Ticket["type"], string> = { issue: "خلل فني", billing: "اشتراك وفواتير", question: "استفسار" };
export const TICKET_STATUS: Record<Ticket["status"], string> = { open: "مفتوح", answered: "تم الرد", closed: "مغلق" };

export type AdminOffice = Office & {
  adminNote: string;
  waSession: { status: string; phone: string | null; connectedAt: string | null } | null;
  _count: { orgs: number; tickets: number };
};

export type Renewal = { id: string; previousDue: string; newDue: string; createdAt: string };

export type Item = {
  id: string;
  orgId: string;
  templateId: string;
  name: string;
  authority: string;
  category: ObligationCategory;
  dueDate: string;
  leadDays: number;
  cycleDays: number;
  estimatedCost: number;
  reference: string;
  note: string;
  done: boolean;
  renewals: Renewal[];
};

export type Org = {
  id: string;
  name: string;
  crNumber: string;
  city: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  alertPhones: string;
  notifyEnabled: boolean;
  items: Item[];
};

export type WaStatus = {
  status: "disconnected" | "connecting" | "qr" | "connected";
  qr: string | null;
  phone: string | null;
  lastError: string | null;
};

export type ReminderLog = {
  id: string;
  milestone: string;
  to: string;
  message: string;
  status: string;
  error: string | null;
  sentAt: string;
  item: { name: string; org: { name: string } } | null;
};
