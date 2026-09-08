"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Item, type Org } from "./api";

export type { Item, Org };

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function daysUntil(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${iso}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export type Status = "متأخر" | "قريب" | "تنبيه" | "آمن" | "منجز";

export function statusOf(item: Pick<Item, "done" | "dueDate" | "leadDays">): Status {
  if (item.done) return "منجز";
  const d = daysUntil(item.dueDate);
  if (d < 0) return "متأخر";
  if (d <= 14) return "قريب";
  if (d <= item.leadDays) return "تنبيه";
  return "آمن";
}

export const STATUS_STYLES: Record<Status, { bg: string; text: string; dot: string }> = {
  "متأخر": { bg: "#fdecee", text: "#b3212f", dot: "#d62839" },
  "قريب": { bg: "#fff4e0", text: "#9a5f00", dot: "#d98c0a" },
  "تنبيه": { bg: "#e8f1fb", text: "#16568f", dot: "#1d6fb8" },
  "آمن": { bg: "#e6f2e7", text: "#256628", dot: "#2e7d32" },
  "منجز": { bg: "#eef1ef", text: "#5f6f66", dot: "#8a9a91" },
};

type OrgInput = {
  name: string;
  crNumber?: string;
  city?: string;
  contactName?: string;
  contactPhone?: string;
};

export function useOrgs() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { orgs } = await api<{ orgs: Org[] }>("/orgs");
      setOrgs(orgs);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر تحميل البيانات");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addOrg = useCallback(async (input: OrgInput) => {
    const { org } = await api<{ org: Org }>("/orgs", { method: "POST", body: JSON.stringify(input) });
    setOrgs((prev) => [...prev, org]);
    return org;
  }, []);

  const updateOrg = useCallback(async (orgId: string, input: Partial<OrgInput>) => {
    const { org } = await api<{ org: Org }>(`/orgs/${orgId}`, { method: "PATCH", body: JSON.stringify(input) });
    setOrgs((prev) => prev.map((o) => (o.id === orgId ? org : o)));
  }, []);

  const removeOrg = useCallback(async (orgId: string) => {
    await api(`/orgs/${orgId}`, { method: "DELETE" });
    setOrgs((prev) => prev.filter((o) => o.id !== orgId));
  }, []);

  const addItem = useCallback(async (orgId: string, templateId: string, dueDate: string, note: string) => {
    const { item } = await api<{ item: Item }>(`/orgs/${orgId}/items`, {
      method: "POST",
      body: JSON.stringify({ templateId, dueDate, note }),
    });
    setOrgs((prev) => prev.map((o) => (o.id === orgId ? { ...o, items: [...o.items, item] } : o)));
  }, []);

  const replaceItem = (orgId: string, item: Item) =>
    setOrgs((prev) =>
      prev.map((o) => (o.id === orgId ? { ...o, items: o.items.map((it) => (it.id === item.id ? item : it)) } : o)),
    );

  const renewItem = useCallback(async (orgId: string, itemId: string) => {
    const { item } = await api<{ item: Item }>(`/orgs/${orgId}/items/${itemId}/renew`, { method: "POST" });
    replaceItem(orgId, item);
  }, []);

  const toggleDone = useCallback(async (orgId: string, itemId: string, done: boolean) => {
    const { item } = await api<{ item: Item }>(`/orgs/${orgId}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ done }),
    });
    replaceItem(orgId, item);
  }, []);

  const removeItem = useCallback(async (orgId: string, itemId: string) => {
    await api(`/orgs/${orgId}/items/${itemId}`, { method: "DELETE" });
    setOrgs((prev) =>
      prev.map((o) => (o.id === orgId ? { ...o, items: o.items.filter((it) => it.id !== itemId) } : o)),
    );
  }, []);

  return { orgs, loaded, error, refresh, addOrg, updateOrg, removeOrg, addItem, renewItem, toggleDone, removeItem };
}
